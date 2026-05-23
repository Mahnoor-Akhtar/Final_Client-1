import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Search, Sun, Moon } from "lucide-react";
import { mern } from "@/integrations/mern/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session?.user) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(API_URL);

    // Join rooms for userId, email, and role
    socket.emit("join", session.user.id);
    if (session.user.email) {
      socket.emit("join", session.user.email);
    }
    if (role) {
      socket.emit("join", role);
    }

    // Also fetch Student/Teacher profile to join by student/teacher database ID
    const joinProfileRoom = async () => {
      try {
        if (role === "student" && session.user.email) {
          const { data: students } = await mern.from("students").select("*").eq("email", session.user.email);
          const student = students?.[0];
          if (student) {
            socket.emit("join", student.id);
          }
        } else if (role === "teacher" && session.user.email) {
          const { data: teachers } = await mern.from("teachers").select("*").eq("email", session.user.email);
          const teacher = teachers?.[0];
          if (teacher) {
            socket.emit("join", teacher.id);
          }
        }
      } catch (err) {
        console.error("Failed to join database profile room:", err);
      }
    };
    joinProfileRoom();

    socket.on("notification", (notif: any) => {
      toast.info(notif.message, {
        description: notif.title,
        duration: 6000,
        position: "top-right",
      });

      // Invalidate queries to instantly update UI lists and stats in real-time
      queryClient.invalidateQueries({ queryKey: ["settings-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["fyp-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["fyp-groups"] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fyp-students"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [session, role, queryClient]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      mern.auth.setSession(token);
      navigate({ to: "/app", replace: true });
    } else if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">No role assigned</h1>
          <p className="text-muted-foreground text-sm">
            Your account doesn't have a role yet. Contact your administrator or re-register.
          </p>
          <Button
            onClick={async () => {
              await mern.auth.signOut();
              navigate({ to: "/login" });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await mern.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-500">
        <AppSidebar role={role} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border/40 bg-card/45 backdrop-blur-xl sticky top-0 z-30 px-6">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="h-9 w-9 hover:bg-secondary rounded-lg" />
              <div className="relative max-w-xs flex-1 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                <Input
                  className="pl-9 h-9 bg-secondary/30 border border-border/60 hover:border-foreground/10 focus-visible:ring-primary rounded-xl text-xs"
                  placeholder="Search records, courses…"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-xl hover:bg-secondary"
                title="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-4.5 w-4.5 text-amber-400" />
                ) : (
                  <Moon className="h-4.5 w-4.5 text-slate-700" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-4.5 w-4.5" />
              </Button>

              <div className="h-8 w-px bg-border/60 mx-1 hidden md:block" />

              <Link
                to="/app"
                className="hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-secondary/50 border border-border/60 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {session.user.email}
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="h-9 rounded-xl text-xs font-bold border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all px-3 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 sm:p-8 bg-background/30">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
