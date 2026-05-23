import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  Check,
  X,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  ChevronRight,
  UserX,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/attendance")({
  component: AttendanceRoute,
});

function AttendanceRoute() {
  const { session, role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Temp marking state: maps studentId -> status ("present" | "absent" | "late")
  const [markingSheet, setMarkingSheet] = useState<Record<string, "present" | "absent" | "late">>(
    {},
  );

  // 1. Fetch Students
  const { data: students } = useQuery({
    queryKey: ["attendance-students"],
    queryFn: async () => {
      const { data } = await mern.from("students").select("*");
      return data ?? [];
    },
  });

  // 2. Fetch Courses
  const { data: courses } = useQuery({
    queryKey: ["attendance-courses"],
    queryFn: async () => {
      const { data } = await mern.from("courses").select("*");
      return data ?? [];
    },
  });

  // Find teacher record for the current user (for filtering courses)
  const { data: myTeacher } = useQuery({
    queryKey: ["my-teacher-record", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await mern.from("teachers").select("id").eq("user_id", session.user.id);
      return data?.[0] ?? null;
    },
    enabled: role === "teacher" && !!session?.user?.id,
  });

  // For teachers, only show their assigned courses; for admin show all
  const availableCourses = role === "teacher" && myTeacher
    ? (courses ?? []).filter((c: any) => c.teacher_id === myTeacher.id)
    : courses ?? [];

  // 3. Fetch All Attendance
  const { data: attendanceRecords } = useQuery({
    queryKey: ["attendance-records"],
    queryFn: async () => {
      const { data } = await mern.from("attendance").select("*");
      return data ?? [];
    },
  });

  // Mutation to save/update attendance
  const saveAttendanceMutation = useMutation({
    mutationFn: async (payload: {
      date: string;
      courseId: string;
      list: { studentId: string; status: "present" | "absent" | "late" }[];
    }) => {
      // For each item, check if there's an existing record for this date + student + course
      const existing = await mern
        .from("attendance")
        .select("*")
        .eq("date", payload.date)
        .eq("course_id", payload.courseId);
      const existingList = existing.data ?? [];

      const promises = payload.list.map((item) => {
        const match = existingList.find((e) => e.student_id === item.studentId);
        if (match) {
          return mern.from("attendance").update({ status: item.status }).eq("id", match.id);
        } else {
          return mern.from("attendance").insert({
            date: payload.date,
            student_id: item.studentId,
            course_id: payload.courseId,
            status: item.status,
          });
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success("Attendance saved successfully");
    },
    onError: (err) => {
      toast.error("Failed to save attendance");
      console.error(err);
    },
  });

  // Initialize marking sheet when course is selected
  const handleLoadClass = () => {
    if (!selectedCourse) {
      toast.warning("Please select a course first");
      return;
    }
    const matchingRecords =
      attendanceRecords?.filter((r) => r.course_id === selectedCourse && r.date === selectedDate) ??
      [];

    // Only load students enrolled in the selected course
    const enrolledStudents = students?.filter(
      (s: any) => s.courses && s.courses.includes(selectedCourse)
    ) ?? [];

    const newSheet: Record<string, "present" | "absent" | "late"> = {};

    // Auto-populate from database if records exist, otherwise default to "present"
    enrolledStudents.forEach((student: any) => {
      const match = matchingRecords.find((mr) => mr.student_id === student.id);
      newSheet[student.id] = match ? match.status : "present";
    });

    setMarkingSheet(newSheet);
    toast.info(`Loaded student sheet for ${selectedDate}`);
  };

  const handleToggleStatus = (studentId: string, status: "present" | "absent" | "late") => {
    setMarkingSheet((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = () => {
    if (!selectedCourse) return;
    const list = Object.entries(markingSheet).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    if (list.length === 0) {
      toast.warning("No student sheet is loaded");
      return;
    }

    saveAttendanceMutation.mutate({
      date: selectedDate,
      courseId: selectedCourse,
      list,
    });
  };

  const handleMockPdfExport = () => {
    window.print();
  };

  // Student specific view
  if (role === "student") {
    const email = session?.user?.email;
    const currentStudent = students?.find((s) => s.email?.toLowerCase() === email?.toLowerCase());
    if (!currentStudent) {
      return (
        <div className="text-center py-12 text-muted-foreground">Student profile not found.</div>
      );
    }

    // Filter attendance records for current student
    const studentAttendance =
      attendanceRecords?.filter((r) => r.student_id === currentStudent.id) ?? [];
    const totalClasses = studentAttendance.length;
    const presentCount = studentAttendance.filter((a) => a.status === "present").length;
    const lateCount = studentAttendance.filter((a) => a.status === "late").length;
    const absentCount = studentAttendance.filter((a) => a.status === "absent").length;
    const attPercentage =
      totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 100;

    // Only show courses the student is enrolled in
    const enrolledCourses = (courses ?? []).filter(
      (c: any) => currentStudent.courses && currentStudent.courses.includes(c.id)
    );

    return (
      <div className="space-y-8 max-w-7xl animate-fade-in">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
            Student Registry
          </span>
          <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">
            Attendance Record
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Detailed track of your class attendance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Attendance Rate
              </p>
              <p className="mt-2 text-4xl font-serif font-black text-foreground">
                {attPercentage}%
              </p>
              <Badge
                variant="outline"
                className={`mt-3 font-semibold rounded-lg text-[10px] tracking-wide ${attPercentage >= 75 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-destructive/10 border-destructive/20 text-destructive"}`}
              >
                {attPercentage >= 75 ? "Good Standing" : "Shortage Warning"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Classes Attended
              </p>
              <p className="mt-2 text-4xl font-serif font-black text-emerald-600">{presentCount}</p>
              <p className="text-[10px] text-muted-foreground font-light mt-2">
                Full Presence lectures
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Classes Late
              </p>
              <p className="mt-2 text-4xl font-serif font-black text-amber-600">{lateCount}</p>
              <p className="text-[10px] text-muted-foreground font-light mt-2">
                Counts as half present
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Classes Missed
              </p>
              <p className="mt-2 text-4xl font-serif font-black text-rose-600">{absentCount}</p>
              <p className="text-[10px] text-muted-foreground font-light mt-2">
                Unexcused absences
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-serif font-bold text-foreground">
              Course-wise Breakdown
            </CardTitle>
            <CardDescription className="text-xs font-light">
              Click on any course to view your date-wise attendance detail.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {enrolledCourses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm font-light">
                  No courses assigned yet. Contact your administrator.
                </div>
              ) : (
                enrolledCourses.map((course: any) => {
                  const courseAtt = studentAttendance.filter(
                    (a) => a.course_id === course.id || a.course_id === course.code,
                  );
                  const cTotal = courseAtt.length;
                  const cPresent =
                    courseAtt.filter((a) => a.status === "present").length +
                    courseAtt.filter((a) => a.status === "late").length * 0.5;
                  const cPercentage = cTotal > 0 ? Math.round((cPresent / cTotal) * 100) : 100;
                  const isExpanded = selectedCourse === course.id;

                  // Sort attendance records by date descending
                  const sortedAtt = [...courseAtt].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                  );

                  return (
                    <div key={course.id} className="border border-border/50 rounded-2xl overflow-hidden transition-all duration-300">
                      {/* Clickable Course Header */}
                      <button
                        type="button"
                        onClick={() => setSelectedCourse(isExpanded ? "" : course.id)}
                        className="w-full p-5 bg-secondary/15 hover:bg-secondary/30 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 ${isExpanded ? "bg-primary/15 rotate-90" : "bg-secondary/80"}`}>
                            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{course.title}</p>
                            <p className="text-xs text-muted-foreground font-light mt-0.5">
                              {course.code} · {course.credit_hours} Credits · {cTotal} classes recorded
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 self-end sm:self-center">
                          <div className="text-right">
                            <p className={`text-sm font-bold ${cPercentage >= 75 ? "text-emerald-600" : "text-rose-600"}`}>{cPercentage}%</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-light">
                              {courseAtt.filter((a) => a.status === "present").length}P / {courseAtt.filter((a) => a.status === "late").length}L / {courseAtt.filter((a) => a.status === "absent").length}A
                            </p>
                          </div>
                          <div className="w-24 bg-secondary h-2 rounded-full overflow-hidden shrink-0 border border-border/40">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${cPercentage >= 75 ? "bg-emerald-500" : "bg-destructive"}`}
                              style={{ width: `${cPercentage}%` }}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Expanded Date-wise Detail Panel */}
                      {isExpanded && (
                        <div className="border-t border-border/40 bg-background/50 animate-fade-in">
                          {sortedAtt.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-xs font-light">
                              No attendance records found for this course yet.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                  <tr className="bg-secondary/30 border-b border-border/40">
                                    <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">#</th>
                                    <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Date</th>
                                    <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Day</th>
                                    <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {sortedAtt.map((record: any, idx: number) => {
                                    const dateObj = new Date(record.date + "T00:00:00");
                                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                                    const formattedDate = dateObj.toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    });

                                    const statusConfig = {
                                      present: {
                                        label: "Present",
                                        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                                        classes: "bg-emerald-500/10 border-emerald-500/25 text-emerald-600",
                                      },
                                      late: {
                                        label: "Late",
                                        icon: <Clock className="h-3.5 w-3.5" />,
                                        classes: "bg-amber-500/10 border-amber-500/25 text-amber-600",
                                      },
                                      absent: {
                                        label: "Absent",
                                        icon: <X className="h-3.5 w-3.5" />,
                                        classes: "bg-rose-500/10 border-rose-500/25 text-rose-600",
                                      },
                                    };

                                    const config = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.absent;

                                    return (
                                      <tr key={record.id || idx} className="hover:bg-secondary/15 transition-colors">
                                        <td className="p-4 text-xs text-muted-foreground font-mono">{sortedAtt.length - idx}</td>
                                        <td className="p-4 text-xs font-semibold text-foreground">{formattedDate}</td>
                                        <td className="p-4 text-xs text-muted-foreground">{dayName}</td>
                                        <td className="p-4">
                                          <Badge
                                            variant="outline"
                                            className={`font-bold text-[10px] tracking-wide rounded-lg px-2.5 py-1 gap-1.5 ${config.classes}`}
                                          >
                                            {config.icon}
                                            {config.label}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin/Teacher Workspace layout
  return (
    <div className="space-y-8 max-w-7xl animate-fade-in print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
            Operations Portal
          </span>
          <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">
            Attendance Control
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Initialize academic registers, log class roll states, and print reports.
          </p>
        </div>
        <Button
          onClick={handleMockPdfExport}
          variant="outline"
          className="h-10 rounded-xl text-xs font-bold border border-border/60 hover:bg-secondary transition-all cursor-pointer shadow-sm"
        >
          <FileText className="h-4 w-4 mr-2 text-primary" /> Export / Print Report
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Mark Attendance controls */}
        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden print:hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-serif font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-primary" /> Setup Attendance Roll
            </CardTitle>
            <CardDescription className="text-xs font-light">
              Select course and date to initialize sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
                Select Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/40 backdrop-blur-md text-foreground transition-all duration-300"
              >
                <option value="" className="bg-background text-foreground">
                  -- Choose Course --
                </option>
                {availableCourses.map((course: any) => (
                  <option
                    key={course.id}
                    value={course.id}
                    className="bg-background text-foreground"
                  >
                    {course.title} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
                Select Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-border/80 bg-background/50 text-xs shadow-sm focus-visible:ring-primary/45 h-10"
              />
            </div>

            <Button
              onClick={handleLoadClass}
              className="w-full h-10 rounded-xl text-xs font-bold border border-border/60 hover:bg-secondary/80 bg-secondary/50 text-primary transition-all duration-300 shadow-sm cursor-pointer"
              variant="outline"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" /> Load Attendance Roll
            </Button>
          </CardContent>
        </Card>

        {/* Right Side: Interactive Attendance Marking sheet */}
        <Card className="lg:col-span-2 bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-transparent">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4 print:mb-6">
            <div>
              <CardTitle className="text-base font-serif font-bold text-foreground">
                Active Class Sheet
              </CardTitle>
              <CardDescription className="text-xs font-light">
                {selectedCourse
                  ? `Marking: ${courses?.find((c) => c.id === selectedCourse)?.title} on ${selectedDate}`
                  : "Please select a course on the left panel to load class roll."}
              </CardDescription>
            </div>
            {Object.keys(markingSheet).length > 0 && (
              <Button
                onClick={handleSaveAttendance}
                disabled={saveAttendanceMutation.isPending}
                className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer print:hidden"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saveAttendanceMutation.isPending ? "Saving..." : "Save Roll State"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {Object.keys(markingSheet).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm font-light">
                No active roll sheet loaded. Select a course and date.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center relative max-w-sm mb-2 print:hidden">
                  <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students in class..."
                    className="pl-10 rounded-xl border border-border/80 bg-background/40 focus-visible:ring-primary/45 h-10 text-xs shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/45 border-b border-border/50">
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Roll No
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Student Name
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground print:table-cell">
                          Status Toggle
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {students
                        ?.filter((s: any) =>
                          // Only show students enrolled in the selected course
                          markingSheet[s.id] !== undefined &&
                          s.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
                        )
                        .map((student: any) => {
                          const status = markingSheet[student.id] || "present";
                          return (
                            <tr
                              key={student.id}
                              className="hover:bg-secondary/20 transition-colors"
                            >
                              <td className="p-4 font-mono text-xs text-muted-foreground">
                                {student.roll_number}
                              </td>
                              <td className="p-4 font-bold text-xs text-foreground">
                                {student.full_name}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 print:hidden">
                                  <Button
                                    size="sm"
                                    variant={status === "present" ? "default" : "outline"}
                                    className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                      status === "present"
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                        : "border-border hover:bg-secondary/60 text-muted-foreground"
                                    }`}
                                    onClick={() => handleToggleStatus(student.id, "present")}
                                  >
                                    <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Present
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={status === "late" ? "default" : "outline"}
                                    className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                      status === "late"
                                        ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                                        : "border-border hover:bg-secondary/60 text-muted-foreground"
                                    }`}
                                    onClick={() => handleToggleStatus(student.id, "late")}
                                  >
                                    <Clock className="h-3.5 w-3.5 mr-1.5" /> Late
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={status === "absent" ? "default" : "outline"}
                                    className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                      status === "absent"
                                        ? "bg-rose-500 hover:bg-rose-600 text-white border-transparent"
                                        : "border-border hover:bg-secondary/60 text-muted-foreground"
                                    }`}
                                    onClick={() => handleToggleStatus(student.id, "absent")}
                                  >
                                    <UserX className="h-3.5 w-3.5 mr-1.5" /> Absent
                                  </Button>
                                </div>
                                <span className="hidden print:inline font-semibold capitalize text-xs">
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
