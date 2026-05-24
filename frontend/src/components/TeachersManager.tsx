import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Pencil, Trash2, Loader2, Search, Eye, ChevronDown, ChevronRight, BookOpen, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  employee_id: z.string().trim().min(1).max(40),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  department_id: z.string().min(1).nullable().or(z.literal("")).transform(v => v === "" ? null : v),
  qualification: z.string().trim().max(120).optional().or(z.literal("")),
  salary: z.number().min(0).max(10000000).nullable(),
});

type Teacher = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  qualification: string | null;
  salary: number | null;
};

const empty = {
  employee_id: "",
  full_name: "",
  email: "",
  phone: "",
  department_id: null as string | null,
  qualification: "",
  salary: null as number | null,
};

export default function TeachersManager() {
  const { role, loading } = useAuth();

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailTeacher, setDetailTeacher] = useState<Teacher | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const { data: depts = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      (await mern.from("departments").select("id,name,code").order("name")).data ?? [],
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () =>
      (await mern.from("courses").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () =>
      (await mern.from("students").select("id,full_name,email,roll_number,courses").order("full_name")).data ?? [],
  });

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await mern
        .from("teachers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Teacher[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = schema.parse({
        ...form,
        phone: form.phone || "",
        qualification: form.qualification || "",
      });
      const data = {
        ...payload,
        phone: payload.phone || null,
        qualification: payload.qualification || null,
      };
      if (editing) {
        const { error } = await mern.from("teachers").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await mern.from("teachers").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
      toast.success(editing ? "Teacher updated" : "Teacher added");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await mern.from("teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Teacher deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="p-6 text-center text-muted-foreground animate-fade-in py-16">
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm font-light">Only administrators can access or manage the faculty registry.</p>
      </div>
    );
  }

  const filtered = teachers.filter(
    (t) =>
      !search ||
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({
      employee_id: t.employee_id,
      full_name: t.full_name,
      email: t.email,
      phone: t.phone ?? "",
      department_id: t.department_id,
      qualification: t.qualification ?? "",
      salary: t.salary,
    });
    setOpen(true);
  };

  const openDetails = (t: Teacher) => {
    setDetailTeacher(t);
    setExpandedCourse(null);
    setDetailsOpen(true);
  };

  // Derive assigned courses and enrolled students for the selected teacher
  const teacherCourses = detailTeacher
    ? allCourses.filter((c: any) => c.teacher_id === detailTeacher.id)
    : [];

  const getStudentsForCourse = (courseId: string) =>
    allStudents.filter((s: any) => s.courses && s.courses.includes(courseId));

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground mt-1">{teachers.length} total faculty members.</p>
        </div>
        <Button
          onClick={openAdd}
          className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Teacher
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="shadow-[var(--shadow-soft)] border-border/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emp #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Qualification</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No teachers yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const dept = depts.find((d) => d.id === t.department_id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.employee_id}</TableCell>
                    <TableCell className="font-medium">{t.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.email}</TableCell>
                    <TableCell>
                      {dept ? <Badge variant="secondary">{dept.code}</Badge> : "—"}
                    </TableCell>
                    <TableCell>{t.qualification ?? "—"}</TableCell>
                    <TableCell>
                      {t.salary ? `$${Number(t.salary).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetails(t)} title="View assigned courses">
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirm(`Delete ${t.full_name}?`) && delMut.mutate(t.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit teacher" : "Add teacher"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Employee ID</Label>
                <Input
                  required
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                />
              </div>
              <div>
                <Label>Full name</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Department</Label>
              <Select
                value={form.department_id ?? ""}
                onValueChange={(v) => setForm({ ...form, department_id: v || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {depts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qualification</Label>
                <Input
                  placeholder="MS, PhD…"
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                />
              </div>
              <div>
                <Label>Salary</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.salary ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, salary: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Teacher Details Dialog */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(v) => {
          setDetailsOpen(v);
          if (!v) {
            setDetailTeacher(null);
            setExpandedCourse(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-primary" />
              {detailTeacher?.full_name} — Assigned Courses
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-2">
            {teacherCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No courses assigned to this teacher yet.</p>
                <p className="text-xs mt-1">Go to <span className="font-semibold text-primary">Courses → Assign Courses</span> to assign.</p>
              </div>
            ) : (
              teacherCourses.map((course: any) => {
                const enrolled = getStudentsForCourse(course.id);
                const isExpanded = expandedCourse === course.id;
                const dept = depts.find((d: any) => d.id === course.department_id);
                return (
                  <div key={course.id} className="border border-border/60 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 hover:bg-secondary/40 transition-colors text-left"
                      onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {course.code}
                            </span>
                            <span className="font-semibold text-sm">{course.title}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>Credit: {course.credit_hours}</span>
                            <span>Sem: {course.semester ?? "—"}</span>
                            {dept && <Badge variant="outline" className="text-[10px] py-0">{dept.code}</Badge>}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        <Users className="h-3 w-3 mr-1" />
                        {enrolled.length} student{enrolled.length !== 1 ? "s" : ""}
                      </Badge>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/40 bg-secondary/10">
                        {enrolled.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">
                            No students enrolled in this course yet.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs h-8">Roll #</TableHead>
                                <TableHead className="text-xs h-8">Name</TableHead>
                                <TableHead className="text-xs h-8">Email</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {enrolled.map((s: any) => (
                                <TableRow key={s.id} className="hover:bg-secondary/20">
                                  <TableCell className="font-mono text-xs py-2">{s.roll_number}</TableCell>
                                  <TableCell className="text-xs font-medium py-2">{s.full_name}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground py-2">{s.email}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
