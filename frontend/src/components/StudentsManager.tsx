import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  roll_number: z.string().trim().min(1).max(40),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  department_id: z.string().uuid().nullable(),
  degree: z.string().trim().max(40).optional().or(z.literal("")),
  semester: z.number().int().min(1).max(12).nullable(),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  courses: z.array(z.string()).optional(),
});

type Student = {
  id: string;
  roll_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  degree: string | null;
  semester: number | null;
  address: string | null;
  courses?: string[];
};

const empty = {
  roll_number: "",
  full_name: "",
  email: "",
  phone: "",
  department_id: null as string | null,
  degree: "BSCS",
  semester: 1 as number | null,
  address: "",
  courses: [] as string[],
};

export default function StudentsManager() {
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const { data: depts = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await mern
        .from("departments")
        .select("id,name,code")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["students-courses"],
    queryFn: async () => {
      const { data } = await mern.from("courses").select("id,code,title");
      return data ?? [];
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await mern
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Student[];
    },
  });

  // Find teacher record for the currently logged-in teacher user
  const { data: myTeacher } = useQuery({
    queryKey: ["my-teacher-record", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await mern.from("teachers").select("id").eq("user_id", session.user.id);
      return data?.[0] ?? null;
    },
    enabled: role === "teacher" && !!session?.user?.id,
  });

  // Get full course data assigned to this teacher
  const { data: teacherCourses = [] } = useQuery({
    queryKey: ["my-courses-full", myTeacher?.id],
    queryFn: async () => {
      if (!myTeacher?.id) return [];
      const { data } = await mern.from("courses").select("id,code,title").eq("teacher_id", myTeacher.id);
      return data ?? [];
    },
    enabled: role === "teacher" && !!myTeacher?.id,
  });

  const teacherCourseIds = teacherCourses.map((c: any) => c.id);

  // For teachers: filter by selected course, or show all their students
  const visibleStudents = role === "teacher"
    ? courseFilter !== "all"
      ? students.filter((s) => s.courses && s.courses.includes(courseFilter))
      : teacherCourseIds.length > 0
        ? students.filter((s) => s.courses && s.courses.some((cId) => teacherCourseIds.includes(cId)))
        : []
    : students;

  const saveMut = useMutation({
    mutationFn: async (payload: typeof empty & { id?: string }) => {
      const parsed = schema.parse({
        ...payload,
        phone: payload.phone || "",
        address: payload.address || "",
        degree: payload.degree || "",
      });
      const data = {
        ...parsed,
        phone: parsed.phone || null,
        address: parsed.address || null,
        degree: parsed.degree || null,
        courses: parsed.courses || [],
      };
      if (editing) {
        const { error } = await mern.from("students").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await mern.from("students").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
      toast.success(editing ? "Student updated" : "Student added");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await mern.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Student deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = visibleStudents.filter((s) => {
    const matchSearch =
      !search ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = role === "teacher" || deptFilter === "all" || s.department_id === deptFilter;
    return matchSearch && matchDept;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      roll_number: s.roll_number,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone ?? "",
      department_id: s.department_id,
      degree: s.degree ?? "",
      semester: s.semester,
      address: s.address ?? "",
      courses: s.courses ?? [],
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
            Academic Registry
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
            Student Directory
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            {filtered.length} {role === "teacher"
              ? courseFilter !== "all"
                ? `students enrolled in ${teacherCourses.find((c: any) => c.id === courseFilter)?.title ?? "this course"}`
                : "students in your courses"
              : "registered students in active sections"}.
          </p>
        </div>
          <Button
            onClick={openAdd}
            className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Student
          </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
          <Input
            className="pl-9 h-10 bg-card border border-border/80 hover:border-foreground/10 focus-visible:ring-primary rounded-xl text-xs transition-colors"
            placeholder="Search by name, roll number, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {role === "teacher" ? (
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-64 rounded-xl border border-border/80 text-xs h-10 bg-card">
              <SelectValue placeholder="Filter by course…" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border/80">
              <SelectItem value="all">All my courses</SelectItem>
              {teacherCourses.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-56 rounded-xl border border-border/80 text-xs h-10 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border/80">
              <SelectItem value="all">All departments</SelectItem>
              {depts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/40 hover:bg-transparent">
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Roll #
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Department
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Degree
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Sem
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Courses
              </TableHead>
              <TableHead className="w-24 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/40">
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground text-sm font-light"
                >
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-primary" />
                  Loading Student Registry…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground text-sm font-light"
                >
                  No student records found in this category.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const dept = depts.find((d) => d.id === s.department_id);
                return (
                  <TableRow
                    key={s.id}
                    className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-primary font-bold">
                      {s.roll_number}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-foreground">
                      {s.full_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-light">
                      {s.email}
                    </TableCell>
                    <TableCell>
                      {dept ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-secondary/80 border-border/80 font-bold rounded-lg px-2.5 py-0.5"
                        >
                          {dept.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{s.degree ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.semester ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {s.courses && s.courses.length > 0 ? (
                        <Badge variant="secondary" className="font-bold rounded-lg text-[10px] px-2 py-0.5">
                          {s.courses.length} Assigned
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs font-light">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {role !== "teacher" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(s)}
                              className="h-8 w-8 rounded-lg hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirm(`Delete ${s.full_name}?`) && delMut.mutate(s.id)}
                              className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(empty);
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display font-black tracking-tight text-xl text-foreground">
              {editing ? "Modify Student Profile" : "Register New Student"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Roll Number
                </Label>
                <Input
                  required
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                  value={form.roll_number}
                  onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  required
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  type="email"
                  required
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Phone Number
                </Label>
                <Input
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Department
                </Label>
                <Select
                  value={form.department_id ?? ""}
                  onValueChange={(v) => setForm({ ...form, department_id: v || null })}
                >
                  <SelectTrigger className="rounded-xl border border-border/80 text-xs h-10 bg-background/50">
                    <SelectValue placeholder="Select Department…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border/80">
                    {depts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Semester
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                  value={form.semester ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, semester: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Degree Program
              </Label>
              <Input
                placeholder="BSCS, BSIT, BBA…"
                className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                value={form.degree}
                onChange={(e) => setForm({ ...form, degree: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Residential Address
              </Label>
              <Input
                className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-10 text-xs font-semibold"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMut.isPending}
                className="rounded-xl h-10 text-xs font-bold text-white shadow-md hover:shadow-primary/10 transition-all cursor-pointer"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Student details
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
