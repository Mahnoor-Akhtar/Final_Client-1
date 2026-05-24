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
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  code: z.string().trim().min(2).max(20),
  title: z.string().trim().min(2).max(200),
  credit_hours: z.number().int().min(1).max(10),
  semester: z.number().int().min(1).max(12).nullable(),
  degree: z.string().trim().max(40).optional().or(z.literal("")),
  department_id: z.string().min(1).nullable().or(z.literal("")).transform(v => v === "" ? null : v),
  teacher_id: z.string().min(1).nullable(),
});

type Course = {
  id: string;
  code: string;
  title: string;
  credit_hours: number;
  semester: number | null;
  degree: string | null;
  department_id: string | null;
  teacher_id: string | null;
};

const empty = {
  code: "",
  title: "",
  credit_hours: 3,
  semester: 1 as number | null,
  degree: "BSCS",
  department_id: null as string | null,
  teacher_id: null as string | null,
};

export default function CoursesManager() {
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [search, setSearch] = useState("");

  // Assignment states
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const { data: depts = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      (await mern.from("departments").select("id,name,code").order("name")).data ?? [],
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-min"],
    queryFn: async () =>
      (await mern.from("teachers").select("id,full_name").order("full_name")).data ?? [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ["assign-students"],
    queryFn: async () =>
      (await mern.from("students").select("id,full_name,email,courses").order("full_name")).data ?? [],
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await mern
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
  });

  // Find teacher record for the currently logged-in teacher user
  const { data: myTeacher } = useQuery({
    queryKey: ["my-teacher-record", session?.user?.email],
    queryFn: async () => {
      if (!session?.user?.email) return null;
      const { data } = await mern.from("teachers").select("id").eq("email", session.user.email.toLowerCase());
      return data?.[0] ?? null;
    },
    enabled: role === "teacher" && !!session?.user?.email,
  });

  // Find student record for the currently logged-in student user
  const { data: myStudent } = useQuery({
    queryKey: ["my-student-record", session?.user?.email],
    queryFn: async () => {
      if (!session?.user?.email) return null;
      const { data } = await mern.from("students").select("id,courses").eq("email", session.user.email.toLowerCase());
      return data?.[0] ?? null;
    },
    enabled: role === "student" && !!session?.user?.email,
  });

  // For teachers: filter to only their assigned courses
  // For students: filter to only courses assigned to them
  const visibleCourses = role === "teacher" && myTeacher
    ? courses.filter((c) => c.teacher_id === myTeacher.id)
    : role === "student" && myStudent
      ? courses.filter((c) => (myStudent.courses || []).includes(c.id))
      : courses;

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = schema.parse({ ...form, degree: form.degree || "" });
      const data = { ...payload, degree: payload.degree || null };
      if (editing) {
        const { error } = await mern.from("courses").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await mern.from("courses").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
      toast.success(editing ? "Course updated" : "Course added");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await mern.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Course deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignTeacherMut = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherId) throw new Error("Please select a teacher");
      if (selectedCourseIds.length === 0) throw new Error("Please select at least one course");

      const results = await Promise.all(
        selectedCourseIds.map(async (courseId) => {
          const res = await mern.from("courses").update({ teacher_id: selectedTeacherId }).eq("id", courseId);
          return res;
        })
      );

      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) throw new Error(firstError.message ?? "Backend error during teacher assignment");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Courses assigned to teacher successfully!");
      setAssignOpen(false);
      setSelectedCourseIds([]);
      setSelectedTeacherId("");
    },
    onError: (e: any) => toast.error(e.message ?? "Assignment failed"),
  });

  const assignStudentsMut = useMutation({
    mutationFn: async () => {
      if (selectedStudentIds.length === 0) throw new Error("Please select at least one student");
      if (selectedCourseIds.length === 0) throw new Error("Please select at least one course");

      const results = await Promise.all(
        selectedStudentIds.map(async (studentId) => {
          const student = students.find((s) => s.id === studentId);
          if (!student) return { ok: true };
          const currentCourses = student.courses || [];
          const updatedCourses = Array.from(new Set([...currentCourses, ...selectedCourseIds]));
          const res = await mern.from("students").update({ courses: updatedCourses }).eq("id", studentId);
          return res;
        })
      );

      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) throw new Error(firstError.message ?? "Backend error during student enrollment");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["assign-students"] });
      toast.success("Courses assigned to students successfully!");
      setAssignOpen(false);
      setSelectedCourseIds([]);
      setSelectedStudentIds([]);
    },
    onError: (e: any) => toast.error(e.message ?? "Assignment failed"),
  });

  const filtered = visibleCourses.filter(
    (c) =>
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      code: c.code,
      title: c.title,
      credit_hours: c.credit_hours,
      semester: c.semester,
      degree: c.degree ?? "",
      department_id: c.department_id,
      teacher_id: c.teacher_id,
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
          <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">
            Course Directory
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            {visibleCourses.length} total active courses{role === "teacher" ? " assigned to you" : role === "student" ? " assigned to you" : " across all degree programs"}.
          </p>
        </div>
        <div className="flex gap-2">
          {role === "admin" && (
            <Button
              onClick={() => setAssignOpen(true)}
              className="h-10 px-5 rounded-xl text-xs font-bold border border-border/80 bg-background hover:bg-secondary hover:text-primary transition-all active:scale-95 cursor-pointer"
              variant="outline"
            >
              Assign Courses
            </Button>
          )}
          {role === "admin" && (
            <Button
              onClick={openAdd}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Course
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
        <Input
          className="pl-9 h-10 bg-card border border-border/80 hover:border-foreground/10 focus-visible:ring-primary rounded-xl text-xs"
          placeholder="Search by code or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/40 hover:bg-transparent">
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Code
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Title
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                CH
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Sem
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Degree
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Dept
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Teacher
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
                  Loading Course Catalog…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground text-sm font-light"
                >
                  No courses registered in this category.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const dept = depts.find((d) => d.id === c.department_id);
                const t = teachers.find((x) => x.id === c.teacher_id);
                return (
                  <TableRow
                    key={c.id}
                    className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-primary font-bold">
                      {c.code}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-foreground">{c.title}</TableCell>
                    <TableCell className="text-xs font-semibold">{c.credit_hours}</TableCell>
                    <TableCell className="text-xs">{c.semester ?? "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{c.degree ?? "—"}</TableCell>
                    <TableCell>
                      {dept ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-secondary/80 border-border/80 font-bold rounded-lg px-2.5 py-0.5"
                        >
                          {dept.code}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-light">
                      {t?.full_name ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {role === "admin" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(c)}
                              className="h-8 w-8 rounded-lg hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirm(`Delete ${c.title}?`) && delMut.mutate(c.id)}
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
            <DialogTitle className="font-serif font-black tracking-tight text-xl text-foreground">
              {editing ? "Modify Course Profile" : "Register New Course"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Course Code
                </Label>
                <Input
                  required
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Course Title
                </Label>
                <Input
                  required
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Credit Hours
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  required
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs"
                  value={form.credit_hours}
                  onChange={(e) => setForm({ ...form, credit_hours: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Semester
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs"
                  value={form.semester ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, semester: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Degree Program
                </Label>
                <Input
                  className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs"
                  value={form.degree}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Academic Department
              </Label>
              <Select
                value={form.department_id ?? ""}
                onValueChange={(v) => setForm({ ...form, department_id: v || null })}
              >
                <SelectTrigger className="rounded-xl border border-border/80 text-xs h-10">
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
                Assigned Faculty Member
              </Label>
              <Select
                value={form.teacher_id ?? ""}
                onValueChange={(v) => setForm({ ...form, teacher_id: v || null })}
              >
                <SelectTrigger className="rounded-xl border border-border/80 text-xs h-10">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border/80">
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="rounded-xl h-10 text-xs font-bold text-white shadow-md hover:shadow-primary/10"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Course details
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignOpen}
        onOpenChange={(v) => {
          setAssignOpen(v);
          if (!v) {
            setSelectedCourseIds([]);
            setSelectedTeacherId("");
            setSelectedStudentIds([]);
            setCourseSearch("");
            setStudentSearch("");
          }
        }}
      >
        <DialogContent className="max-w-4xl w-[90vw] rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="font-serif font-black tracking-tight text-2xl text-foreground">
              Course Assignment Workspace
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 h-[60vh] max-h-[500px]">
            {/* Left Column: Select Courses */}
            <div className="flex flex-col space-y-3 h-full overflow-hidden">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                  Step 1: Select Courses ({selectedCourseIds.length})
                </Label>
                {courses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allVisibleFilteredIds = courses
                        .filter(
                          (c) =>
                            !courseSearch ||
                            c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
                            c.code.toLowerCase().includes(courseSearch.toLowerCase())
                        )
                        .map((c) => c.id);
                      const allSelected = allVisibleFilteredIds.every((id) =>
                        selectedCourseIds.includes(id)
                      );
                      if (allSelected) {
                        setSelectedCourseIds(
                          selectedCourseIds.filter((id) => !allVisibleFilteredIds.includes(id))
                        );
                      } else {
                        setSelectedCourseIds(
                          Array.from(new Set([...selectedCourseIds, ...allVisibleFilteredIds]))
                        );
                      }
                    }}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    Select All
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/80" />
                <Input
                  className="pl-9 h-9 bg-background/50 border border-border/80 focus-visible:ring-primary text-xs rounded-xl"
                  placeholder="Search courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto border border-border/80 rounded-xl p-3 bg-background/30 space-y-1">
                {courses.filter(
                  (c) =>
                    !courseSearch ||
                    c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
                    c.code.toLowerCase().includes(courseSearch.toLowerCase())
                ).length === 0 ? (
                  <p className="text-xs text-muted-foreground font-light text-center py-8">
                    No courses match search
                  </p>
                ) : (
                  courses
                    .filter(
                      (c) =>
                        !courseSearch ||
                        c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
                        c.code.toLowerCase().includes(courseSearch.toLowerCase())
                    )
                    .map((course) => {
                      const isChecked = selectedCourseIds.includes(course.id);
                      const currentTeacherName = teachers.find((t) => t.id === course.teacher_id)?.full_name;
                      return (
                        <label
                          key={course.id}
                          className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer hover:bg-secondary/40 p-2 rounded-lg transition-colors border border-transparent hover:border-border/40"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCourseIds([...selectedCourseIds, course.id]);
                              } else {
                                setSelectedCourseIds(
                                  selectedCourseIds.filter((id) => id !== course.id)
                                );
                              }
                            }}
                            className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                {course.code}
                              </span>
                              <span className="font-bold truncate">{course.title}</span>
                            </div>
                            {currentTeacherName && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Current Lecturer: {currentTeacherName}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right Column: Assignee Selector via Tabs */}
            <div className="flex flex-col h-full overflow-hidden">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
                Step 2: Assign To
              </Label>
              <Tabs defaultValue="teacher" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid grid-cols-2 rounded-xl h-10 p-1 bg-muted">
                  <TabsTrigger value="teacher" className="rounded-lg text-xs font-semibold">
                    Faculty Member
                  </TabsTrigger>
                  <TabsTrigger value="students" className="rounded-lg text-xs font-semibold">
                    Students Registry
                  </TabsTrigger>
                </TabsList>

                {/* Teacher Assignment Tab */}
                <TabsContent
                  value="teacher"
                  className="flex-1 flex flex-col justify-between overflow-hidden pt-3 mt-0"
                >
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">
                      Assign the selected courses to a faculty member. This updates the course
                      lecturer and makes the courses visible on the teacher's schedule.
                    </p>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Select Teacher
                      </Label>
                      <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                        <SelectTrigger className="rounded-xl border border-border/80 text-xs h-10 bg-background/50">
                          <SelectValue placeholder="Choose a teacher..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-border/80">
                          {teachers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/40 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl h-10 text-xs font-semibold"
                      onClick={() => setAssignOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={assignTeacherMut.isPending}
                      onClick={() => assignTeacherMut.mutate()}
                      className="rounded-xl h-10 text-xs font-bold text-white shadow-md hover:shadow-primary/10 transition-all cursor-pointer"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {assignTeacherMut.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Assign to Lecturer
                    </Button>
                  </div>
                </TabsContent>

                {/* Students Assignment Tab */}
                <TabsContent
                  value="students"
                  className="flex-1 flex flex-col overflow-hidden pt-3 mt-0"
                >
                  <div className="flex-1 flex flex-col space-y-3 overflow-hidden min-h-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-light leading-normal">
                        Enroll selected students in the selected courses.
                      </p>
                      {students.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const allVisibleFilteredIds = students
                              .filter(
                                (s) =>
                                  !studentSearch ||
                                  s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                  s.email.toLowerCase().includes(studentSearch.toLowerCase())
                              )
                              .map((s) => s.id);
                            const allSelected = allVisibleFilteredIds.every((id) =>
                              selectedStudentIds.includes(id)
                            );
                            if (allSelected) {
                              setSelectedStudentIds(
                                selectedStudentIds.filter((id) => !allVisibleFilteredIds.includes(id))
                              );
                            } else {
                              setSelectedStudentIds(
                                Array.from(new Set([...selectedStudentIds, ...allVisibleFilteredIds]))
                              );
                            }
                          }}
                          className="text-[10px] text-primary font-bold hover:underline"
                        >
                          Select All
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/80" />
                      <Input
                        className="pl-9 h-9 bg-background/50 border border-border/80 focus-visible:ring-primary text-xs rounded-xl"
                        placeholder="Search students..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto border border-border/80 rounded-xl p-3 bg-background/30 space-y-1">
                      {students.filter(
                        (s) =>
                          !studentSearch ||
                          s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.email.toLowerCase().includes(studentSearch.toLowerCase())
                      ).length === 0 ? (
                        <p className="text-xs text-muted-foreground font-light text-center py-8">
                          No students match search
                        </p>
                      ) : (
                        students
                          .filter(
                            (s) =>
                              !studentSearch ||
                              s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                              s.email.toLowerCase().includes(studentSearch.toLowerCase())
                          )
                          .map((student: any) => {
                            const isChecked = selectedStudentIds.includes(student.id);
                            const enrolledCount = student.courses?.length ?? 0;
                            return (
                              <label
                                key={student.id}
                                className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer hover:bg-secondary/40 p-2 rounded-lg transition-colors border border-transparent hover:border-border/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudentIds([...selectedStudentIds, student.id]);
                                    } else {
                                      setSelectedStudentIds(
                                        selectedStudentIds.filter((id) => id !== student.id)
                                      );
                                    }
                                  }}
                                  className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold truncate block">{student.full_name}</span>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {student.email} · {enrolledCount} enrolled
                                  </p>
                                </div>
                              </label>
                            );
                          })
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/40 flex justify-end gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl h-10 text-xs font-semibold"
                      onClick={() => setAssignOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={assignStudentsMut.isPending}
                      onClick={() => assignStudentsMut.mutate()}
                      className="rounded-xl h-10 text-xs font-bold text-white shadow-md hover:shadow-primary/10 transition-all cursor-pointer"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {assignStudentsMut.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Assign to Students
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
