import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarClock,
  Wallet,
  FolderKanban,
  MessageSquare,
  Settings,
  GraduationCap as Logo,
  Calendar,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AppRole } from "@/hooks/use-auth";

const groups: Record<
  AppRole,
  { label: string; items: { title: string; url: string; icon: any }[] }[]
> = {
  admin: [
    { label: "Overview", items: [{ title: "Dashboard", url: "/app", icon: LayoutDashboard }] },
    {
      label: "Academics",
      items: [
        { title: "Students", url: "/app/students", icon: GraduationCap },
        { title: "Teachers", url: "/app/teachers", icon: Users },
        { title: "Courses", url: "/app/courses", icon: BookOpen },
        { title: "Degrees", url: "/app/degrees", icon: Logo },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Attendance", url: "/app/attendance", icon: CalendarClock },
        { title: "Timetable", url: "/app/timetable", icon: Calendar },
        { title: "Fees & Payment", url: "/app/fees", icon: Wallet },
        { title: "FYP Portal", url: "/app/fyp", icon: FolderKanban },
        { title: "Complaints", url: "/app/complaints", icon: MessageSquare },
      ],
    },
    { label: "Account", items: [{ title: "Settings", url: "/app/settings", icon: Settings }] },
  ],
  teacher: [
    { label: "Overview", items: [{ title: "Dashboard", url: "/app", icon: LayoutDashboard }] },
    {
      label: "Teaching",
      items: [
        { title: "My Courses", url: "/app/courses", icon: BookOpen },
        { title: "Students", url: "/app/students", icon: GraduationCap },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Attendance", url: "/app/attendance", icon: CalendarClock },
        { title: "Timetable", url: "/app/timetable", icon: Calendar },
        { title: "FYP Groups", url: "/app/fyp", icon: FolderKanban },
        { title: "Complaints", url: "/app/complaints", icon: MessageSquare },
      ],
    },
    { label: "Account", items: [{ title: "Settings", url: "/app/settings", icon: Settings }] },
  ],
  student: [
    { label: "Overview", items: [{ title: "Dashboard", url: "/app", icon: LayoutDashboard }] },
    {
      label: "Academics",
      items: [
        { title: "Courses", url: "/app/courses", icon: BookOpen },
        { title: "Timetable", url: "/app/timetable", icon: Calendar },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Attendance", url: "/app/attendance", icon: CalendarClock },
        { title: "Fee & Billing", url: "/app/fees", icon: Wallet },
        { title: "FYP Progress", url: "/app/fyp", icon: FolderKanban },
        { title: "Complaints", url: "/app/complaints", icon: MessageSquare },
      ],
    },
    { label: "Account", items: [{ title: "Settings", url: "/app/settings", icon: Settings }] },
  ],
};

export function AppSidebar({ role }: { role: AppRole }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/app" ? pathname === "/app" : pathname.startsWith(p));

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 bg-sidebar/85 backdrop-blur-xl"
    >
      <SidebarHeader className="border-b border-border/30 p-4 bg-transparent">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="relative h-10 w-10 flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105">
            {/* Glow backing */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-red-600 opacity-20 blur-xs animate-pulse" />
            {/* Spinning progress border */}
            <div
              className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-600 via-transparent to-red-600 animate-spin"
              style={{ animationDuration: "3s" }}
            />
            {/* Inner masking ring */}
            <div className="absolute -inset-[0.5px] rounded-full bg-sidebar transition-colors duration-500" />
            {/* Image content */}
            <div className="relative h-9 w-9 rounded-full bg-white flex items-center justify-center p-1 border border-border/30">
              <img src="/logo.png" alt="PGC Logo" className="h-full w-full object-contain" />
            </div>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-display font-black tracking-wide text-foreground">
                Punjab Colleges
              </p>
              <p className="text-[9px] uppercase tracking-widest text-primary font-bold">
                {role} portal
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-4 bg-transparent">
        {groups[role].map((g) => (
          <SidebarGroup key={g.label} className="py-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.25em] font-bold text-muted-foreground/75 mb-2 px-3">
                {g.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {g.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={`h-10 rounded-xl transition-all duration-300 flex items-center gap-3 px-3 cursor-pointer group/btn ${
                          active
                            ? "bg-secondary text-primary font-bold shadow-sm border-l-[3px] border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 w-full">
                          <item.icon
                            className={`h-4.5 w-4.5 shrink-0 transition-all duration-300 group-hover/btn:scale-110 ${active ? "scale-105 text-primary" : "text-muted-foreground group-hover/btn:text-foreground"}`}
                          />
                          {!collapsed && (
                            <span className="text-xs tracking-wide">{item.title}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/30 p-4 bg-transparent">
        {!collapsed ? (
          <div className="px-2 py-1.5 rounded-xl bg-secondary/65 border border-border/60 flex items-center justify-between gap-2 shadow-sm">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/80 font-bold">
              Sandbox
            </span>
            <span className="text-[9px] font-semibold text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded-md">
              v1.0 · Phase 1
            </span>
          </div>
        ) : (
          <div className="h-6 w-6 rounded-lg bg-secondary/80 border border-border/60 grid place-items-center text-[8px] font-bold text-primary shadow-sm">
            V1
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
