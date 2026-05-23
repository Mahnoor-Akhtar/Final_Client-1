import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Users,
  BookOpen,
  Calendar,
  Wallet,
  ClipboardCheck,
  FolderKanban,
  BarChart3,
  ShieldCheck,
  GraduationCap,
  ArrowRight,
  Play,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Phone,
  MessageCircle,
  Mail,
  MessageSquare,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Punjab Group of Colleges — Premium Campus Portal" },
      {
        name: "description",
        content:
          "Experience institutional excellence. A unified college management system for PGC.",
      },
      { property: "og:title", content: "Punjab Group of Colleges — Premium Campus Portal" },
      {
        property: "og:description",
        content: "Spacious, interactive, and beautifully unified campus suite.",
      },
    ],
  }),
  component: Landing,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const hoverScale: Variants = {
  hover: { scale: 1.03, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 35 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.12,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
  hover: {
    scale: 1.04,
    y: -8,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

const portalData = {
  student: {
    title: "Student Hub",
    subtitle: "Empowering students with modern academic control and clarity.",
    features: [
      {
        icon: Calendar,
        title: "Dynamic Timetables",
        desc: "View real-time course schedules, rooms, and instructor sessions.",
      },
      {
        icon: Wallet,
        title: "Financial Ledger",
        desc: "Track tuition billing, review receipts, and settle dues online.",
      },
      {
        icon: FolderKanban,
        title: "FYP Coordinator",
        desc: "Submit project proposals, upload milestones, and track approvals.",
      },
    ],
  },
  faculty: {
    title: "Faculty Workspace",
    subtitle: "Enabling instructors to manage courses, attendance, and workloads.",
    features: [
      {
        icon: ClipboardCheck,
        title: "Smart Attendance",
        desc: "Mark course logs easily and export monthly performance metrics.",
      },
      {
        icon: BookOpen,
        title: "Course Allocation",
        desc: "Review assigned sections, syllabus files, and credit-hour weightages.",
      },
      {
        icon: Users,
        title: "Class Directory",
        desc: "Access student profiles, grade spreadsheets, and registration indices.",
      },
    ],
  },
  admin: {
    title: "Administrative Suite",
    subtitle: "Providing comprehensive institutional oversight and operations.",
    features: [
      {
        icon: BarChart3,
        title: "Executive Analytics",
        desc: "Monitor campus indicators including cashflows, attendance, and admissions.",
      },
      {
        icon: ShieldCheck,
        title: "Registry Audits",
        desc: "Review teacher allocations, course registers, and billing structures.",
      },
      {
        icon: Sparkles,
        title: "Admissions Desk",
        desc: "Oversee the incoming student funnel and process new applicants.",
      },
    ],
  },
};

type PortalRole = keyof typeof portalData;

export default function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<PortalRole>("student");
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  const words = ["Learn", "Teach", "Govern", "Collaborate"];
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/app" });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    const duration = 1200; // 1.2s splash screen
    const intervalTime = 20;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => setShowSplash(false), 200);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  if (showSplash) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 select-none overflow-hidden transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
      >
        {/* Soft Glowing Brand Accents */}
        <div
          className={`absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse transition-colors duration-500 ${isDark ? "bg-blue-600/10" : "bg-blue-600/5"}`}
          style={{ animationDuration: "6s" }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse transition-colors duration-500 ${isDark ? "bg-red-600/10" : "bg-red-600/5"}`}
          style={{ animationDuration: "8s" }}
        />

        <div className="relative z-10 animate-fade-in">
          {/* Logo Frame with Dual Rotating Rings */}
          <div className="relative flex items-center justify-center">
            {/* Glow backing */}
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-600 to-red-600 opacity-20 blur-xl animate-pulse" />
            {/* Spinning progress border */}
            <div
              className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-600 via-transparent to-red-600 animate-spin"
              style={{ animationDuration: "3s" }}
            />
            {/* Inner masking ring */}
            <div
              className={`absolute -inset-0.5 rounded-full transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-white"}`}
            />
            {/* Image content */}
            <div
              className={`relative h-28 w-28 rounded-full bg-white shadow-2xl flex items-center justify-center p-4 border transition-colors duration-500 ${isDark ? "border-slate-800" : "border-slate-100"}`}
            >
              <img
                src="/logo.png"
                alt="Punjab Group of Colleges"
                className="h-20 w-20 object-contain animate-pulse"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
      {/* GLASS HEADER */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-40 bg-background/50 backdrop-blur-xl border-b border-border/40"
      >
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
              {/* Glow backing */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-red-600 opacity-20 blur-xs animate-pulse" />
              {/* Spinning progress border */}
              <div
                className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-600 via-transparent to-red-600 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              {/* Inner masking ring */}
              <div
                className={`absolute -inset-[0.5px] rounded-full transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-white"}`}
              />
              {/* Image content */}
              <div className="relative h-10 w-10 rounded-full bg-white flex items-center justify-center p-1 shadow-md border border-border/30">
                <img src={logo} alt="PGC" className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg tracking-wide text-primary font-bold">
                Punjab Group <span className="text-[var(--brand-red)]">of Colleges</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-medium">
                Campus Portal
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-sm font-medium tracking-wide">
            <a href="#about" className="hover:text-primary transition-colors text-muted-foreground">
              About
            </a>
            <a
              href="#portals"
              className="hover:text-primary transition-colors text-muted-foreground"
            >
              Portals
            </a>
            <a
              href="#statistics"
              className="hover:text-primary transition-colors text-muted-foreground"
            >
              Stats
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-amber-400" />
              ) : (
                <Moon className="h-5 w-5 text-slate-700" />
              )}
            </button>
            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm font-semibold text-muted-foreground hover:text-primary transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold px-6 h-11 rounded-lg text-white shadow-lg transition-transform duration-200 active:scale-95"
              style={{ background: "var(--gradient-brand)" }}
            >
              Get Started <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* LUXURY CINEMATIC HERO */}
      <section className="relative h-screen w-screen flex items-center pt-20 bg-background overflow-hidden">
        {/* Dynamic Video Overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
          {/* Custom color-overlay matching the theme for absolute readability */}
          <div
            className={`absolute inset-0 transition-colors duration-500 ${isDark
                ? "bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-900/60"
                : "bg-gradient-to-r from-white/95 via-white/85 to-slate-50/50"
              }`}
          />
        </div>

        {/* Ambient Decorative Accents */}
        <div
          className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-[var(--brand-red)]/5 rounded-full blur-[100px] pointer-events-none animate-pulse"
          style={{ animationDuration: "10s" }}
        />

        <div className="container mx-auto px-6 relative z-10 w-full py-16 grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-8 max-w-4xl">
            <motion.div
              initial="hidden"
              animate="visible"
              custom={0}
              variants={fadeUp}
              className={`inline-flex items-center gap-2 rounded-full border px-4.5 py-1.5 text-[9px] tracking-[0.22em] uppercase font-bold shadow-sm transition-colors duration-500 ${isDark
                  ? 'border-primary/20 bg-primary/5 text-primary-foreground/95'
                  : 'border-primary/30 bg-primary/10 text-primary-foreground/95'
                }`}
              style={{ color: "var(--color-primary)" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              The Future of Campus Management
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={fadeUp}
              className="text-5xl sm:text-6xl md:text-7xl font-serif leading-[1.08] tracking-tight text-foreground font-black"
            >
              The unified portal to
              <br />
              <span className="inline-block min-w-[280px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={words[wordIdx]}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="bg-gradient-to-r from-primary via-[oklch(0.7_0.14_235)] to-[var(--brand-red)] bg-clip-text text-transparent italic"
                  >
                    {words[wordIdx]}.
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>



            <motion.div
              initial="hidden"
              animate="visible"
              custom={3}
              variants={fadeUp}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 h-14 rounded-xl text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
                style={{ background: "var(--gradient-brand)" }}
              >
                Launch Campus Suite <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#portals"
                className="inline-flex items-center justify-center px-8 h-14 rounded-xl text-sm font-semibold border border-border bg-card/40 backdrop-blur-md hover:bg-secondary hover:border-foreground/20 transition-all duration-300 active:scale-95"
              >
                Explore Portals
              </a>
            </motion.div>
          </div>

          {/* Right Dashboard Mockup Column */}
          <div className="lg:col-span-5 hidden lg:block relative">
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              className="relative w-full aspect-square max-w-[420px] mx-auto"
            >
              {/* Glass container */}
              <div className="w-full h-full rounded-[2.5rem] bg-card/45 backdrop-blur-xl border border-border/80 shadow-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                {/* Simulated Glow */}
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[var(--brand-red)]/15 rounded-full blur-3xl pointer-events-none" />

                {/* Dashboard Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-4 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      Live Campus Portal
                    </span>
                  </div>
                  <div className="h-6 w-16 bg-secondary/80 border border-border/60 rounded-full flex items-center justify-center text-[9px] font-bold text-primary">
                    MERN v1.0
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-4 my-auto relative z-10">
                  {/* User row */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-sm">
                      MA
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Muhammad Ali</div>
                      <div className="text-[9px] text-muted-foreground font-light">Roll No: BCS-0419</div>
                    </div>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-secondary/40 border border-border/60 p-3 rounded-2xl flex flex-col justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                        Attendance
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-base font-serif font-black text-foreground">94.5%</span>
                        <span className="text-[8px] text-emerald-500 font-bold">Good</span>
                      </div>
                    </div>
                    <div className="bg-secondary/40 border border-border/60 p-3 rounded-2xl flex flex-col justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                        Tuition Status
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-base font-serif font-black text-[var(--brand-red)]">Clear</span>
                      </div>
                    </div>
                  </div>

                  {/* Course logs list */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold block mb-1">
                      Today's Schedule
                    </span>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/35 border border-border/40 text-[10px]">
                      <span className="font-semibold text-foreground">Data Structures & Algo</span>
                      <span className="text-muted-foreground font-light">09:00 AM · Room 102</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/35 border border-border/40 text-[10px]">
                      <span className="font-semibold text-foreground">Web Application Dev</span>
                      <span className="text-muted-foreground font-light">11:00 AM · Lab 2</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Footer */}
                <div className="flex items-center justify-between border-t border-border/40 pt-4 relative z-10 text-[9px] text-muted-foreground">
                  <span className="font-light">SSO Session Active</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    System Secure
                  </span>
                </div>
              </div>

              {/* Floating Badge 1 - Top Right */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-card border border-border/80 shadow-lg rounded-2xl p-3 flex items-center gap-2.5 z-20 backdrop-blur-md"
              >
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="leading-tight pr-1">
                  <div className="text-[9px] font-bold text-foreground">Fees Settle</div>
                  <div className="text-[8px] text-muted-foreground font-light">JazzCash instant</div>
                </div>
              </motion.div>

              {/* Floating Badge 2 - Bottom Left */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 2 }}
                className="absolute -bottom-4 -left-8 bg-card border border-border/80 shadow-lg rounded-2xl p-3 flex items-center gap-2.5 z-20 backdrop-blur-md"
              >
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="leading-tight pr-1">
                  <div className="text-[9px] font-bold text-foreground">Timetable Sync</div>
                  <div className="text-[8px] text-muted-foreground font-light">Real-time alerts</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CORE PHILOSOPHY / ABOUT SECTION */}
      <section
        id="about"
        className="py-32 container mx-auto px-6 relative z-10 border-t border-border/30"
      >
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slideInLeft}
            className="space-y-6 max-w-xl"
          >
            <span className="text-xs uppercase font-semibold tracking-[0.22em] text-[var(--brand-red)]">
              Core Philosophy
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight font-bold">
              Simple Administration. Rich Experiences.
            </h2>
            <p className="text-muted-foreground leading-relaxed font-light">
              We design digital infrastructure that speaks simplicity. The PGC Portal simplifies
              complex campus workflows into elegant actions, ensuring students, teachers, and admins
              collaborate in perfect synergy.
            </p>
            <div className="space-y-3.5 pt-4">
              {[
                "Highly-optimized academic planner schemas.",
                "JazzCash & Easypaisa secure ledger records.",
                "Robust sandbox safety and secure token authorizations.",
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-foreground/80 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative flex justify-center"
          >
            {/* Elegant luxury background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-[var(--brand-red)]/10 blur-[80px] rounded-3xl" />
            <div className="relative bg-card/70 backdrop-blur-xl border border-border/80 p-8 sm:p-10 rounded-3xl shadow-xl w-full max-w-lg space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Institutional Status
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> Secure Sandbox
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                Leveraging next-generation server technology and JWT encryption to coordinate
                academic modules, attendance checkpoints, and student timetables instantly.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="bg-secondary/40 border border-border/60 p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow duration-300"
                >
                  <div className="text-xl font-bold font-serif text-primary">99.9%</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mt-1">
                    Uptime SLA
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="bg-secondary/40 border border-border/60 p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow duration-300"
                >
                  <div className="text-xl font-bold font-serif text-[var(--brand-red)]">
                    256-bit
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mt-1">
                    Auth Guard
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LUXURY INTERACTIVE PORTAL TABS SWITCHER */}
      <section id="portals" className="py-32 bg-secondary/35 border-y border-border/30 relative">
        <div className="container mx-auto px-6 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs uppercase font-semibold tracking-[0.25em] text-primary">
              Interactive Hub
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight font-bold">
              Select Your Workspace
            </h2>
            <p className="text-muted-foreground font-light max-w-2xl mx-auto text-sm sm:text-base">
              Switch between roles to explore customizable dashboards designed for each member of
              the Punjab Group of Colleges community.
            </p>
          </div>

          {/* Premium Tab Buttons */}
          <div className="flex justify-center">
            <div className="inline-flex bg-card border border-border/80 p-1.5 rounded-2xl shadow-sm gap-1">
              {(Object.keys(portalData) as PortalRole[]).map((role) => {
                const isActive = activeTab === role;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveTab(role)}
                    className={`px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer relative ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-secondary rounded-xl border border-border"
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {role === "student" && <Users className="h-3.5 w-3.5" />}
                      {role === "faculty" && <GraduationCap className="h-3.5 w-3.5" />}
                      {role === "admin" && <ShieldCheck className="h-3.5 w-3.5" />}
                      {portalData[role].title.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated Tab Contents */}
          <div className="max-w-6xl mx-auto pt-6 min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-10"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-serif font-bold text-foreground">
                    {portalData[activeTab].title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-light">
                    {portalData[activeTab].subtitle}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {portalData[activeTab].features.map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div
                        key={idx}
                        custom={idx}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover="hover"
                        className="bg-card hover:bg-card/90 border border-border/60 p-8 rounded-2xl shadow-sm flex flex-col justify-between group transition-colors duration-300 relative overflow-hidden cursor-pointer"
                      >
                        {/* Glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="space-y-4 relative z-10">
                          <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                            <Icon className="h-5 w-5" />
                          </div>
                          <h4 className="font-serif text-lg font-bold text-foreground">
                            {feature.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed font-light">
                            {feature.desc}
                          </p>
                        </div>

                        <div className="pt-6 relative z-10 flex items-center text-xs font-semibold text-primary/80 group-hover:text-primary transition-colors">
                          Learn Details{" "}
                          <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* MINIMAL STATS ACCENT SHOWCASE */}
      <section id="statistics" className="py-24 container mx-auto px-6 relative z-10 text-center">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: "400K+", label: "Success Alumni Stories", border: "border-primary/20" },
              {
                num: "150+",
                label: "Academic Campus Sites",
                border: "border-[var(--brand-red)]/20",
              },
              {
                num: "98%",
                label: "Acceptance Enrollment Rate",
                border: "border-[var(--gold)]/30",
              },
              { num: "1,500+", label: "Distinguished Instructors", border: "border-primary/20" },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05, y: -4 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`p-6 border-l-2 ${stat.border} text-left bg-secondary/15 rounded-r-xl cursor-pointer hover:shadow-md transition-shadow duration-300`}
              >
                <div className="text-4xl font-serif font-extrabold bg-gradient-to-r from-primary to-[var(--brand-red)] bg-clip-text text-transparent">
                  {stat.num}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-2.5">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LUXURY CTA BANNER */}
      <section className="py-28 bg-background border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-center shadow-2xl border border-white/10"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-elegant)" }}
          >
            {/* Luxury Background Shapes */}
            <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-[var(--brand-red)]/20 blur-3xl pointer-events-none" />

            <div className="relative space-y-6">
              <div className="relative size-16 mx-auto mb-4 flex items-center justify-center transition-transform duration-300 hover:scale-105">
                {/* Glow backing */}
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500 to-red-500 opacity-30 blur-md animate-pulse" />
                {/* Spinning progress border */}
                <div
                  className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-600 via-transparent to-red-600 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
                {/* Inner masking ring */}
                <div className="absolute -inset-[0.5px] rounded-full bg-slate-950" />
                {/* Image content */}
                <div className="relative size-14 rounded-full bg-white flex items-center justify-center p-2.5 shadow-lg">
                  <img src={logo} alt="PGC Logo" className="h-full w-full object-contain" />
                </div>
              </div>
              <h2 className="font-serif text-3xl md:text-5xl text-white leading-tight font-black">
                Ready to Experience <span className="italic">Excellence?</span>
              </h2>
              <p className="text-white/80 text-sm max-w-xl mx-auto font-light leading-relaxed">
                Connect and manage your course programs, timetables, and college billing directories
                immediately in our premium environment.
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <Link
                  to="/register"
                  className="px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest font-bold text-primary bg-white hover:bg-white/95 transition-all duration-300 active:scale-95 shadow-md hover:scale-105"
                >
                  Create Portal Account
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest font-bold text-white border border-white/30 hover:bg-white/10 transition-all duration-300 active:scale-95 hover:scale-105"
                >
                  Access Dashboard
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 bg-secondary/15 pt-20 pb-10">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 md:grid-cols-2 lg:grid-cols-4 pb-16 border-b border-border/40 text-sm">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105">
                {/* Glow backing */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-red-600 opacity-20 blur-xs animate-pulse" />
                {/* Spinning progress border */}
                <div
                  className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-600 via-transparent to-red-600 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
                {/* Inner masking ring */}
                <div
                  className={`absolute -inset-[0.5px] rounded-full transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-white"}`}
                />
                {/* Image content */}
                <div className="relative h-9 w-9 rounded-full bg-white flex items-center justify-center p-1 shadow-sm border border-border/30">
                  <img src={logo} alt="PGC" className="h-full w-full object-contain" />
                </div>
              </div>
              <span className="font-serif text-primary font-bold text-base">
                Punjab Group <span className="text-[var(--brand-red)]">of Colleges</span>
              </span>
            </div>
            <p className="text-muted-foreground text-xs font-light leading-relaxed max-w-xs">
              Providing standard-setting education and technology integrations across Pakistan's premier college campus network.
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Contact & Support
            </h4>
            <ul className="space-y-3 text-xs text-muted-foreground font-light">
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-medium text-foreground block">Toll Free</span>
                  <a href="tel:080078608" className="hover:text-primary transition-colors">0800 78608</a>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-medium text-foreground block">WhatsApp</span>
                  <a href="https://wa.me/923111786522" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 transition-colors">0311-1786522</a>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-medium text-foreground block">Email Support</span>
                  <a href="mailto:info@pgc.edu" className="hover:text-primary transition-colors">info@pgc.edu</a>
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Resources
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-light">
              <li>
                <a href="#about" className="hover:text-primary transition-colors">About Portal</a>
              </li>
              <li>
                <a href="#portals" className="hover:text-primary transition-colors">Select Portal</a>
              </li>
              <li>
                <a href="#statistics" className="hover:text-primary transition-colors">Statistics</a>
              </li>
              <li className="pt-2 border-t border-border/40 flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-[var(--brand-red)] shrink-0" />
                <div>
                  <span className="font-medium text-foreground block">Complaint Portal</span>
                  <a href="https://complaint.pgc.edu" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--brand-red)] font-bold transition-colors">complaint.pgc.edu</a>
                </div>
              </li>
            </ul>
          </div>

          {/* Campus Services */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Portal Services
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-light">
              <li>Academic Planner & Slots</li>
              <li>Tuition Billing Ledger</li>
              <li>Fyp milestones tracking</li>
              <li>Secure JWT SSO Sandbox</li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="mx-auto max-w-7xl px-6 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <p className="font-light">
            © {new Date().getFullYear()} Punjab Group of Colleges. All rights reserved. Secure MERN Portal.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
