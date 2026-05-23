import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, Plus, Award, ChevronRight, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/degrees")({
  component: DegreesRoute,
});

function DegreesRoute() {
  const { session, role } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Active mapping selection
  const [activeDegreeCode, setActiveDegreeCode] = useState<string>("BSCS");
  const [activeSemester, setActiveSemester] = useState<number>(1);

  // New Degree Form
  const [degName, setDegName] = useState("");
  const [degCode, setDegCode] = useState("");
  const [degDuration, setDegDuration] = useState("4");

  // 1. Fetch Degrees
  const { data: degrees } = useQuery({
    queryKey: ["degrees"],
    queryFn: async () => {
      const { data } = await mern.from("degrees").select("*");
      return data ?? [];
    },
  });

  // 2. Fetch Courses
  const { data: courses } = useQuery({
    queryKey: ["degree-courses"],
    queryFn: async () => {
      const { data } = await mern.from("courses").select("*");
      return data ?? [];
    },
  });

  // 3. Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ["degree-departments"],
    queryFn: async () => {
      const { data } = await mern.from("departments").select("*");
      return data ?? [];
    },
  });

  // Add degree mutation
  const addDegreeMutation = useMutation({
    mutationFn: async (payload: any) => {
      await mern.from("degrees").insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["degrees"] });
      toast.success("Degree program registered successfully!");
      setIsOpen(false);
      setDegName("");
      setDegCode("");
    },
    onError: () => {
      toast.error("Failed to add degree program");
    },
  });

  // Remove degree mutation
  const deleteDegreeMutation = useMutation({
    mutationFn: async (id: string) => {
      await mern.from("degrees").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["degrees"] });
      toast.success("Degree program deleted");
    },
    onError: () => {
      toast.error("Failed to delete degree program");
    },
  });

  // Course mapping mutation (updates course's degree and semester)
  const mapCourseMutation = useMutation({
    mutationFn: async (payload: { courseId: string; degree: string; semester: number }) => {
      await mern
        .from("courses")
        .update({
          degree: payload.degree,
          semester: payload.semester,
        })
        .eq("id", payload.courseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["degree-courses"] });
      toast.success("Course curriculum mapping updated");
    },
    onError: () => {
      toast.error("Failed to update course curriculum mapping");
    },
  });

  const handleAddDegree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!degName || !degCode) {
      toast.warning("Please enter degree name and program code");
      return;
    }
    addDegreeMutation.mutate({
      name: degName,
      code: degCode.toUpperCase(),
      duration_years: parseInt(degDuration),
    });
  };

  const handleDeleteDegree = (id: string) => {
    if (
      confirm(
        "Are you sure you want to remove this degree? All mapped timetables might be affected.",
      )
    ) {
      deleteDegreeMutation.mutate(id);
    }
  };

  const handleMapCourse = (courseId: string, degree: string, semester: number) => {
    mapCourseMutation.mutate({ courseId, degree, semester });
  };

  const mappedCourses =
    courses?.filter((c) => c.degree === activeDegreeCode && c.semester === activeSemester) ?? [];
  const unmappedCourses =
    courses?.filter((c) => c.degree !== activeDegreeCode || c.semester !== activeSemester) ?? [];

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic Curriculum</h1>
          <p className="text-muted-foreground mt-1">
            Configure registered degree programs, catalog departments, and map courses to semesters.
          </p>
        </div>
        {role === "admin" && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Register Degree
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Register Degree Program</DialogTitle>
                <DialogDescription>
                  Create a new degree program in the institution syllabus database.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDegree} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Degree Title
                  </label>
                  <Input
                    placeholder="e.g. Bachelor of Science in Software Engineering"
                    value={degName}
                    onChange={(e) => setDegName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Program Code
                    </label>
                    <Input
                      placeholder="e.g. BSSE"
                      value={degCode}
                      onChange={(e) => setDegCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Duration (Years)
                    </label>
                    <select
                      value={degDuration}
                      onChange={(e) => setDegDuration(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none shadow-sm"
                    >
                      <option value="2">2 Years (Associate)</option>
                      <option value="4">4 Years (Bachelor)</option>
                      <option value="2">2 Years (Master)</option>
                      <option value="3">3 Years (PhD)</option>
                    </select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={addDegreeMutation.isPending} className="w-full">
                    {addDegreeMutation.isPending ? "Registering..." : "Confirm Program"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Degree list registry */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Degree Programs
          </p>
          {degrees?.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border rounded-xl">
              No degrees registered.
            </div>
          ) : (
            degrees?.map((deg) => (
              <Card
                key={deg.id}
                className={`shadow-sm hover:border-primary/50 transition-colors ${activeDegreeCode === deg.code ? "border-primary bg-primary/5" : "border-border/70"}`}
              >
                <CardHeader className="p-4 flex flex-row justify-between items-start gap-4">
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => {
                      setActiveDegreeCode(deg.code);
                      setActiveSemester(1);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm">{deg.code}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{deg.name}</p>
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {deg.duration_years} Years Program
                    </Badge>
                  </div>
                  {role === "admin" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 h-8 px-2 shrink-0"
                      onClick={() => handleDeleteDegree(deg.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Right: Semester Mapper board */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-border/60">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" /> Semester Curriculum Mapper
                </CardTitle>
                <CardDescription>
                  Select a degree program and semester block to map courses.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <select
                  value={activeDegreeCode}
                  onChange={(e) => {
                    setActiveDegreeCode(e.target.value);
                    setActiveSemester(1);
                  }}
                  className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold shadow-sm focus:outline-none"
                >
                  {degrees?.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code}
                    </option>
                  ))}
                </select>

                <select
                  value={activeSemester}
                  onChange={(e) => setActiveSemester(parseInt(e.target.value))}
                  className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold shadow-sm focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mapped Courses */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" /> Course Curriculum (
                  {activeDegreeCode} · Semester {activeSemester})
                </p>
                {mappedCourses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                    No courses mapped to this semester yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappedCourses.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 border rounded-xl bg-card flex justify-between items-center gap-3"
                      >
                        <div>
                          <p className="font-semibold text-sm">{c.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.code} · {c.credit_hours} Cr. Hrs
                          </p>
                        </div>
                        {role === "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/20 hover:bg-destructive/5"
                            onClick={() => handleMapCourse(c.id, "", 0)}
                          >
                            Unmap Course
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unmapped / Other Courses (Admin only can re-map) */}
              {role === "admin" && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unmapped Course Catalog
                  </p>
                  {unmappedCourses.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      All database courses are mapped.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {unmappedCourses.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 border rounded-xl bg-muted/30 flex justify-between items-center gap-3"
                        >
                          <div>
                            <p className="font-semibold text-xs">{c.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {c.code}{" "}
                              {c.degree
                                ? `(Currently: ${c.degree} Sem ${c.semester})`
                                : "(Unassigned)"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleMapCourse(c.id, activeDegreeCode, activeSemester)}
                          >
                            Map Here
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
