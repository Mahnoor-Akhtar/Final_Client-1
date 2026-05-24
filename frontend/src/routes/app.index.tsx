import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  TrendingUp,
  Calendar,
  Wallet,
  FolderKanban,
  MessageSquare,
  CheckCircle2,
  Award,
  ArrowUpRight,
  Settings,
  ArrowRight,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="bg-card/45 backdrop-blur-xl border border-border/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {label}
          </p>
          <p className="text-3xl font-display font-black tracking-tight text-foreground">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground font-light pt-1">{hint}</p>}
          {trend && (
            <p className="text-[10px] text-emerald-500 font-bold mt-1.5 flex items-center gap-1">
              <span className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {trend}
              </span>
            </p>
          )}
        </div>
        <div className="h-11 w-11 rounded-xl bg-secondary/80 text-primary border border-border/60 grid place-items-center transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const { session, role } = useAuth();
  const navigate = useNavigate();

  // Admin Query
  const { data: adminData } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    enabled: role === "admin",
    queryFn: async () => {
      const [s, t, c, d, comp, notif] = await Promise.all([
        mern.from("students").select("*"),
        mern.from("teachers").select("*"),
        mern.from("courses").select("*"),
        mern.from("departments").select("*"),
        mern.from("complaints").select("*"),
        mern.from("notifications").select("*"),
      ]);

      return {
        students: s.data?.length ?? 0,
        teachers: t.data?.length ?? 0,
        courses: c.data?.length ?? 0,
        departments: d.data?.length ?? 0,
        pendingComplaints: comp.data?.filter((x: any) => x.status === "pending") ?? [],
        recentNotifications: notif.data?.slice(0, 4) ?? [],
      };
    },
  });

  // Teacher Query
  const { data: teacherData } = useQuery({
    queryKey: ["teacher-dashboard-stats", session?.user?.email],
    enabled: role === "teacher",
    queryFn: async () => {
      const email = session?.user?.email?.toLowerCase();
      if (!email) return null;
      const { data: teachers } = await mern.from("teachers").select("*").eq("email", email);
      const teacher = teachers?.[0];
      if (!teacher) return null;

      const [c, fyp, tt, depts] = await Promise.all([
        mern.from("courses").select("*").eq("teacher_id", teacher.id),
        mern.from("fyp_groups").select("*").eq("supervisor_id", teacher.id),
        mern.from("timetables").select("*").eq("teacher_id", teacher.id),
        teacher.department_id ? mern.from("departments").select("*").eq("id", teacher.department_id) : Promise.resolve({ data: [] }),
      ]);

      return {
        profile: teacher,
        courses: c.data ?? [],
        fypGroups: fyp.data ?? [],
        timetable: tt.data ?? [],
        department: depts.data?.[0] || null,
      };
    },
  });

  // Student Query
  const { data: studentData } = useQuery({
    queryKey: ["student-dashboard-stats", session?.user?.email],
    enabled: role === "student",
    queryFn: async () => {
      const email = session?.user?.email?.toLowerCase();
      if (!email) return null;
      const { data: students } = await mern.from("students").select("*").eq("email", email);
      const student = students?.[0];
      if (!student) return null;

      const [att, fees, fyp, tt, c, depts] = await Promise.all([
        mern.from("attendance").select("*").eq("student_id", student.id),
        mern.from("fees").select("*").eq("student_id", student.id),
        mern.from("fyp_groups").select("*"),
        mern.from("timetables").select("*").eq("department_id", student.department_id),
        mern.from("courses").select("*"),
        student.department_id ? mern.from("departments").select("*").eq("id", student.department_id) : Promise.resolve({ data: [] }),
      ]);

      const myFyp = fyp.data?.find((g: any) => g.members?.includes(student.id)) || null;

      const allCourses = c.data ?? [];
      const studentCourses = allCourses.filter((course: any) =>
        student.courses && student.courses.length > 0
          ? student.courses.includes(course.id)
          : course.department_id === student.department_id
      );

      return {
        profile: student,
        attendance: att.data ?? [],
        fees: fees.data ?? [],
        fypGroup: myFyp,
        timetable: tt.data ?? [],
        courses: studentCourses,
        department: depts.data?.[0] || null,
      };
    },
  });

  // Charts Data
  const monthlyAdmissions = [
    { m: "Jan", admissions: 12 },
    { m: "Feb", admissions: 18 },
    { m: "Mar", admissions: 22 },
    { m: "Apr", admissions: 17 },
    { m: "May", admissions: 28 },
    { m: "Jun", admissions: 34 },
    { m: "Jul", admissions: 41 },
    { m: "Aug", admissions: 52 },
    { m: "Sep", admissions: 38 },
  ];

  const weeklyAttendance = [
    { d: "Mon", pct: 92 },
    { d: "Tue", pct: 88 },
    { d: "Wed", pct: 95 },
    { d: "Thu", pct: 90 },
    { d: "Fri", pct: 86 },
  ];

  // ================= ADMIN DASHBOARD =================
  if (role === "admin") {
    const stats = adminData;
    return (
      <div className="space-y-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary">
              Overview Dashboard
            </span>
            <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
              Admin Control Panel
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Institutional operations, course registries, and logs.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              asChild
              size="sm"
              className="h-10 rounded-xl text-xs font-bold border border-border/60 hover:bg-secondary transition-all cursor-pointer"
              variant="outline"
            >
              <Link to="/app/students">Manage Students</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Link to="/app/complaints">
                Complaints Inbox
                {stats && stats.pendingComplaints.length > 0 && (
                  <Badge className="ml-2 bg-white text-primary border border-white hover:bg-white text-[10px] h-5 px-1.5 font-bold">
                    {stats.pendingComplaints.length}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={GraduationCap}
            label="Enrolled Students"
            value={stats?.students ?? "—"}
            hint="Active campus directory"
            trend="4% this semester"
            delay={0}
          />
          <StatCard
            icon={Users}
            label="Faculty Strength"
            value={stats?.teachers ?? "—"}
            hint="PhD & MS professors"
            trend="2 new recruits"
            delay={1}
          />
          <StatCard
            icon={BookOpen}
            label="Curriculum Courses"
            value={stats?.courses ?? "—"}
            hint="Across all semesters"
            delay={2}
          />
          <StatCard
            icon={Building2}
            label="Departments"
            value={stats?.departments ?? "—"}
            hint="CS, IT, BBA, EE"
            delay={3}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Admissions Chart */}
          <Card className="lg:col-span-2 bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-serif font-bold text-foreground">
                <TrendingUp className="h-4.5 w-4.5 text-primary" /> Student Admission Rate
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Visual stats of student admissions month over month.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyAdmissions}>
                  <defs>
                    <linearGradient id="adminG1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="m" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="admissions"
                    stroke="oklch(0.62 0.18 255)"
                    fill="url(#adminG1)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Attendance Chart */}
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-base font-serif font-bold text-foreground">
                Institutional Attendance
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Average weekly classes presence rate.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="d" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} domain={[60, 100]} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                    }}
                  />
                  <Bar
                    dataKey="pct"
                    fill="oklch(0.62 0.18 255)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Complaints */}
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-serif font-bold text-foreground">
                  Recent Student Complaints
                </CardTitle>
                <CardDescription className="text-xs font-light">
                  Open inquiries waiting response.
                </CardDescription>
              </div>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg text-xs font-bold text-primary hover:bg-secondary"
              >
                <Link to="/app/complaints">
                  View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {stats?.pendingComplaints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2 opacity-80" />
                    All student complaints resolved!
                  </div>
                ) : (
                  stats?.pendingComplaints.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-4 border border-border/50 rounded-2xl bg-secondary/25 hover:bg-secondary/40 transition-colors flex justify-between items-center gap-4"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">{c.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 font-light">
                          {c.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-amber-600 capitalize shrink-0 text-[10px] font-bold rounded-lg px-2.5 py-0.5"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base font-serif font-bold text-foreground">
                Administration Shortcuts
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Quick database action modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Create Timetable", icon: Calendar, path: "/app/timetable" },
                  { label: "Departments", icon: Award, path: "/app/departments" },
                  { label: "Check Fee Dues", icon: Wallet, path: "/app/fees" },
                  { label: "System Settings", icon: Settings, path: "/app/settings" },
                ].map((item) => (
                  <Button
                    key={item.label}
                    variant="outline"
                    className="h-24 flex flex-col justify-center items-center gap-2.5 border-border/80 hover:border-primary/40 hover:bg-primary/5 rounded-2xl transition-all duration-300 group cursor-pointer"
                    onClick={() => navigate({ to: item.path as any })}
                  >
                    <div className="h-10 w-10 rounded-xl bg-secondary border border-border/50 grid place-items-center group-hover:scale-105 group-hover:text-primary transition-transform">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{item.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ================= TEACHER DASHBOARD =================
  if (role === "teacher") {
    const tStats = teacherData;
    const coursesCount = tStats?.courses?.length ?? 0;
    const fypCount = tStats?.fypGroups?.length ?? 0;
    const scheduleCount = tStats?.timetable?.length ?? 0;

    return (
      <div className="space-y-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary">
              Academic Faculty
            </span>
            <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
              Faculty Dashboard
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Welcome back,{" "}
              <span className="font-semibold text-foreground">
                {tStats?.profile?.full_name || "Professor"}
              </span>{" "}
              (ID:{" "}
              <span className="font-mono text-primary font-bold">
                {tStats?.profile?.employee_id || "—"}
              </span>
              {tStats?.profile?.qualification && `, ${tStats.profile.qualification}`}
              {tStats?.department?.name && `, Dept of ${tStats.department.name}`}
              ).
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              asChild
              size="sm"
              className="h-10 rounded-xl text-xs font-bold border border-border/60 hover:bg-secondary transition-all cursor-pointer"
              variant="outline"
            >
              <Link to="/app/fyp">FYP Supervisor Hub</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Link to="/app/attendance">Mark Attendance</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={BookOpen}
            label="Assigned Courses"
            value={coursesCount}
            hint="Active lecturing courses"
            delay={0}
          />
          <StatCard
            icon={FolderKanban}
            label="FYP Groups Supervised"
            value={fypCount}
            hint="Active student projects"
            delay={1}
          />
          <StatCard
            icon={Calendar}
            label="Weekly Lectures"
            value={scheduleCount}
            hint="Lectures scheduled in timetable"
            delay={2}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lecture Schedule */}
          <Card className="lg:col-span-2 bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base font-serif font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-primary" /> Weekly Teaching Schedule
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Your weekly scheduled lecture hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!tStats?.timetable?.length ? (
                <div className="text-center py-10 text-muted-foreground text-sm font-light">
                  No lectures scheduled in the timetable database yet.
                </div>
              ) : (
                <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/45 border-b border-border/50">
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Day
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Slot
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Room
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Course ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {tStats?.timetable?.map((slot: any) => (
                        <tr key={slot.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="p-4 font-medium text-foreground">{slot.day}</td>
                          <td className="p-4 text-muted-foreground text-xs">{slot.slot}</td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-secondary/80 border-border/80 font-bold rounded-lg px-2.5 py-0.5"
                            >
                              {slot.room}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono text-xs text-primary font-bold">
                            {slot.course_id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supervised FYP groups */}
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base font-serif font-bold text-foreground">
                FYP Groups Supervised
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Active Final Year Projects overview.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {!tStats?.fypGroups?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm font-light">
                    No active FYP groups assigned.
                  </div>
                ) : (
                  tStats?.fypGroups?.map((g: any) => (
                    <div
                      key={g.id}
                      className="p-4 border border-border/50 rounded-2xl bg-secondary/20 hover:bg-secondary/35 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <p className="font-bold text-sm text-foreground">{g.group_name}</p>
                        <p className="text-xs font-medium text-primary mt-1 line-clamp-1">
                          {g.title}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/30">
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase tracking-wider font-bold bg-green-500/10 border-green-500/20 text-green-600 rounded-lg px-2.5 py-0.5"
                        >
                          {g.status}
                        </Badge>
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2.5 rounded-lg text-primary hover:bg-secondary"
                        >
                          <Link to="/app/fyp" className="flex items-center gap-0.5">
                            Manage <ChevronRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ================= STUDENT DASHBOARD =================
  if (role === "student") {
    const sStats = studentData;

    // Calculate dynamic attendance rate
    const studentAttendance = sStats?.attendance || [];
    const totalClasses = studentAttendance.length;
    const presentClasses = studentAttendance.filter(
      (a: any) => a.status === "present" || a.status === "late",
    ).length;
    const attPercentage =
      totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;

    // Calculate outstanding fees
    const outstandingFees = sStats?.fees?.filter((f: any) => f.status === "pending") ?? [];
    const outstandingAmount = outstandingFees.reduce((sum: number, f: any) => sum + f.amount, 0);

    return (
      <div className="space-y-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
              Student Portal
            </span>
            <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
              Student Workspace
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Welcome back,{" "}
              <span className="font-semibold text-foreground">
                {sStats?.profile?.full_name || "Student"}
              </span>{" "}
              (Roll No:{" "}
              <span className="font-mono text-primary font-bold">
                {sStats?.profile?.roll_number || "—"}
              </span>
              {sStats?.profile?.degree && `, ${sStats.profile.degree}`}
              {sStats?.department?.name && `, Dept of ${sStats.department.name}`}
              ).
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              asChild
              size="sm"
              className="h-10 rounded-xl text-xs font-bold border border-border/60 hover:bg-secondary transition-all cursor-pointer"
              variant="outline"
            >
              <Link to="/app/complaints">Submit Feedback</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Link to="/app/fees">Pay Tuition Dues</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon={BookOpen}
            label="Registered Courses"
            value={sStats?.courses?.length ?? 0}
            hint="Current Semester"
            delay={0}
          />
          <StatCard
            icon={Activity}
            label="Attendance Rate"
            value={`${attPercentage}%`}
            hint={`${presentClasses} of ${totalClasses} lectures present`}
            delay={1}
          />
          <StatCard
            icon={Wallet}
            label="Outstanding Fees"
            value={`Rs. ${outstandingAmount.toLocaleString()}`}
            hint={`${outstandingFees.length} Pending Invoice(s)`}
            delay={2}
          />
          <StatCard
            icon={FolderKanban}
            label="FYP Status"
            value={
              sStats?.fypGroup
                ? sStats.fypGroup.status === "approved"
                  ? "Active"
                  : "Pending"
                : "No Group"
            }
            hint={sStats?.fypGroup ? sStats.fypGroup.group_name : "Not Registered"}
            delay={3}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Timetable schedule grid */}
          <Card className="lg:col-span-2 bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base font-serif font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-primary" /> Classes Timetable
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Weekly scheduled lectures for your department/degree program.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!sStats?.timetable?.length ? (
                <div className="text-center py-10 text-muted-foreground text-sm font-light">
                  No timetable slots scheduled for your department.
                </div>
              ) : (
                <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/45 border-b border-border/50">
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Day
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Slot
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Room
                        </th>
                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Course
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {sStats?.timetable?.map((slot: any) => {
                        const matchingCourse = sStats?.courses?.find(
                          (c: any) => c.id === slot.course_id || c.code === slot.course_id,
                        );
                        return (
                          <tr key={slot.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="p-4 font-medium text-foreground">{slot.day}</td>
                            <td className="p-4 text-muted-foreground text-xs">{slot.slot}</td>
                            <td className="p-4">
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-secondary/80 border-border/80 font-bold rounded-lg px-2.5 py-0.5"
                              >
                                {slot.room}
                              </Badge>
                            </td>
                            <td className="p-4 font-bold text-xs text-primary">
                              {matchingCourse?.title || slot.course_id}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tasks */}
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base font-serif font-bold text-foreground">
                Quick Shortcuts
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Academic & student shortcuts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {[
                {
                  label: "View Fee Receipt History",
                  desc: "Download paid bills",
                  path: "/app/fees",
                },
                { label: "FYP Documents", desc: "Submit SRS or proposal draft", path: "/app/fyp" },
                {
                  label: "Notification Inbox",
                  desc: "Check alerts and updates",
                  path: "/app/settings",
                },
                {
                  label: "Edit Personal Details",
                  desc: "Update profile & password",
                  path: "/app/settings",
                },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  className="w-full h-auto py-3.5 px-4 flex justify-between items-center text-left border-border hover:border-primary/45 hover:bg-primary/5 rounded-2xl transition-all duration-300 group cursor-pointer"
                  onClick={() => navigate({ to: item.path as any })}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-light">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all shrink-0" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-[60vh] grid place-items-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
