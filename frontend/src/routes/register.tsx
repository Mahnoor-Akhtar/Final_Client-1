import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} 
from "@/components/ui/select";
import {
  GraduationCap,
  Loader2,
  User,
  Mail,
  Lock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Home,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

function RegisterPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [rollNumber, setRollNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [degree, setDegree] = useState("BSCS");
  const [semester, setSemester] = useState("1");
  const [employeeId, setEmployeeId] = useState("");
  const [qualification, setQualification] = useState("");

  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  // Fetch departments dynamically
  const { data: departments = [] } = useQuery({
    queryKey: ["register-departments"],
    queryFn: async () => {
      const { data } = await mern.from("departments").select("*");
      return data ?? [];
    },
  });

  const emailLower = form.email.toLowerCase();
  const isStudent = emailLower.endsWith("@student.com");
  const isTeacher = emailLower.endsWith("@teacher.com");

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/app" });
  }, [authLoading, session, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    if (isStudent) {
      if (!rollNumber.trim()) return toast.error("Roll number is required");
      if (!departmentId) return toast.error("Department is required");
      if (!degree.trim()) return toast.error("Degree is required");
      if (!semester) return toast.error("Semester is required");
    } else if (isTeacher) {
      if (!employeeId.trim()) return toast.error("Employee ID is required");
      if (!departmentId) return toast.error("Department is required");
      if (!qualification.trim()) return toast.error("Qualification is required");
    }

    setLoading(true);
    const { data, error } = await mern.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: form.fullName,
          ...(isStudent ? {
            roll_number: rollNumber,
            department_id: departmentId,
            degree: degree,
            semester: Number(semester),
          } : {}),
          ...(isTeacher ? {
            employee_id: employeeId,
            department_id: departmentId,
            qualification: qualification,
          } : {}),
        },
      },
    });
    setLoading(false);
    if (error) {
      return toast.error(error.message);
    }

    toast.success("Account created! You can sign in now.");
    
    setForm({ fullName: "", email: "", password: "" });
    setRollNumber("");
    setDepartmentId("");
    setDegree("BSCS");
    setSemester("1");
    setEmployeeId("");
    setQualification("");

    if (data.session) navigate({ to: "/app" });
    else navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
      {/* LEFT PANEL - CINEMATIC BRANDING */}
      <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 overflow-hidden border-r border-border/40 bg-slate-950">
        {/* Background video overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-70">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            poster="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80"
          >
            <source src="/mp_.mp4" type="video/mp4" />
            <source
              src="https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50" />
        </div>

        {/* Ambient Blur circles */}
        <div
          className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full blur-[80px] bg-primary/10 animate-pulse pointer-events-none"
          style={{ animationDuration: "6s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full blur-[80px] bg-[var(--brand-red)]/10 animate-pulse pointer-events-none"
          style={{ animationDuration: "8s" }}
        />

        {/* Top Header Row */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
              {/* Glow backing */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-red-600 opacity-20 blur-xs animate-pulse" />
              {/* Spinning progress border */}
              <div
                className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-600 via-transparent to-red-600 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              {/* Inner masking ring */}
              <div className="absolute -inset-[0.5px] rounded-full bg-slate-950" />
              {/* Image content */}
              <div className="relative h-9 w-9 rounded-full bg-white flex items-center justify-center p-1 border border-border/30">
                <img src={logo} alt="PGC" className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="font-serif text-sm tracking-wide text-white font-bold">
                Punjab Group <span className="text-[var(--brand-red)]">of Colleges</span>
              </div>
              <div className="text-[8px] uppercase tracking-[0.25em] text-slate-400 font-medium">
                Campus Portal
              </div>
            </div>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-lg backdrop-blur-md"
          >
            <Home className="h-3.5 w-3.5" /> Home
          </Link>
        </div>

        {/* Branding Info */}
        <div className="relative z-10 space-y-6 my-auto pt-20">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4.5 py-1.5 text-[9px] tracking-[0.22em] uppercase text-[var(--gold-light)] font-bold shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
            Empowering PGC Members
          </motion.div>
          <motion.h2
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-serif font-black text-white leading-tight"
          >
            Begin your digital
            <br />
            <span className="bg-gradient-to-r from-primary via-[oklch(0.7_0.14_235)] to-[var(--brand-red)] bg-clip-text text-transparent italic">
              campus journey.
            </span>
          </motion.h2>
          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="text-slate-300 text-sm leading-relaxed max-w-md font-light"
          >
            Create your account to manage lectures, billing files, attendance rosters, and
            collaborate seamlessly within the PGC MERN system.
          </motion.p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6">
          <span className="text-[10px] text-slate-400 font-light">Secure SSO · TLS Encrypted</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3 w-3" /> Sandbox Active
          </span>
        </div>
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="lg:col-span-7 flex flex-col min-h-screen relative">
        {/* Floating background lights */}
        <div className="absolute top-10 right-10 w-[300px] h-[300px] rounded-full blur-[100px] bg-primary/5 dark:bg-primary/5 pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full blur-[100px] bg-[var(--brand-red)]/5 dark:bg-[var(--brand-red)]/5 pointer-events-none" />

        {/* Theme Toggle header */}
        <div className="flex justify-end p-6 relative z-10">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer border border-border/40"
            title="Toggle Theme"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700" />
            )}
          </button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
          <div className="w-full max-w-md bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl p-8 sm:p-10 shadow-xl space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">
                Create account
              </h1>
              <p className="text-xs text-muted-foreground font-light">
                Pick your campus role and enter credentials to register.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="text-xs uppercase tracking-wider font-bold text-muted-foreground"
                >
                  Full Name
                </Label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 text-muted-foreground/60 h-4.5 w-4.5" />
                  <Input
                    id="fullName"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="pl-11 h-12 bg-secondary/30 border border-border/60 hover:border-foreground/20 focus-visible:ring-primary rounded-xl"
                    placeholder="Muhammad Ali"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs uppercase tracking-wider font-bold text-muted-foreground"
                >
                  Email Address
                </Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 text-muted-foreground/60 h-4.5 w-4.5" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-11 h-12 bg-secondary/30 border border-border/60 hover:border-foreground/20 focus-visible:ring-primary rounded-xl"
                    placeholder="name@pgc.edu.pk"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs uppercase tracking-wider font-bold text-muted-foreground"
                >
                  Password
                </Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-muted-foreground/60 h-4.5 w-4.5" />
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-11 h-12 bg-secondary/30 border border-border/60 hover:border-foreground/20 focus-visible:ring-primary rounded-xl"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <AnimatePresence>
                {isStudent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden pt-2"
                  >
                    {/* Roll Number */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        Roll Number
                      </Label>
                      <Input
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        className="h-12 bg-secondary/30 border border-border/60 hover:border-foreground/20 focus-visible:ring-primary rounded-xl text-xs"
                        placeholder="e.g. 2026-CS-123"
                      />
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        Department
                      </Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger className="h-12 bg-secondary/30 border border-border/60 rounded-xl text-xs">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-border/80">
                          {departments.map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Degree */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        Degree Program
                      </Label>
                      <Input
                        required
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        className="h-12 bg-secondary/30 border border-border/60 hover:border-foreground/20 focus-visible:ring-primary rounded-xl text-xs"
                        placeholder="e.g. BSCS"
                      />
                    </div>

                    {/* Semester */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        Current Semester
                      </Label>
                      <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger className="h-12 bg-secondary/30 border border-border/60 rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-border/80">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              Semester {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}

                {isTeacher && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden pt-2"
                  >
                    {/* Employee ID */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        Employee ID
                      </Label>
                      <Input
                        required
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="h-12 bg-secondary/30 border border-border/60 hover:border-foreground/20 focus-visible:ring-primary rounded-xl text-xs"
                        placeholder="e.g. EMP-101"
                      />
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        Department
                      </Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger className="h-12 bg-secondary/30 border border-border/60 rounded-xl text-xs">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-border/80">
                          {departments.map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Qualification */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        Qualification
                      </Label>
                      <Input
                        required
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className="h-12 bg-secondary/30 border border-border/60 hover:border-foreground/20 focus-visible:ring-primary rounded-xl text-xs"
                        placeholder="e.g. PhD Computer Science"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create account button */}
              <Button
                type="submit"
                className="w-full h-12 text-xs uppercase tracking-widest font-bold text-white shadow-lg transition-transform duration-200 active:scale-95 cursor-pointer rounded-xl"
                style={{ background: "var(--gradient-brand)" }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <>
                    Create Account <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground font-light">
              Already registered?{" "}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
