import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Settings,
  User,
  Bell,
  Shield,
  Check,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { session, role } = useAuth();
  const queryClient = useQueryClient();
  const [activePane, setActivePane] = useState<"profile" | "notifications" | "security">("profile");

  // Profile Edit State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [degree, setDegree] = useState("");
  const [semester, setSemester] = useState("");
  const [qualification, setQualification] = useState("");

  // Security Form State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // 1. Fetch Students
  const { data: students } = useQuery({
    queryKey: ["settings-students"],
    queryFn: async () => {
      const { data } = await mern.from("students").select("*");
      return data ?? [];
    },
  });

  // 2. Fetch Teachers
  const { data: teachers } = useQuery({
    queryKey: ["settings-teachers"],
    queryFn: async () => {
      const { data } = await mern.from("teachers").select("*");
      return data ?? [];
    },
  });

  // 3. Fetch Notifications
  const { data: notifications } = useQuery({
    queryKey: ["settings-notifications"],
    queryFn: async () => {
      const { data } = await mern
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // 4. Fetch Departments
  const { data: departments = [] } = useQuery({
    queryKey: ["settings-departments"],
    queryFn: async () => {
      const { data } = await mern.from("departments").select("*");
      return data ?? [];
    },
  });

  // Get active profiles
  const studentProfile =
    role === "student" ? students?.find((s) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase()) : null;
  const teacherProfile =
    role === "teacher" ? teachers?.find((t) => t.email?.toLowerCase() === session?.user?.email?.toLowerCase()) : null;

  // Sync profile details once queries return data
  useEffect(() => {
    if (studentProfile) {
      setName(studentProfile.full_name || "");
      setPhone(studentProfile.phone || "");
      setAddress(studentProfile.address || "");
      setDepartmentId(studentProfile.department_id || "");
      setDegree(studentProfile.degree || "");
      setSemester(String(studentProfile.semester || "1"));
    } else if (teacherProfile) {
      setName(teacherProfile.full_name || "");
      setPhone(teacherProfile.phone || "");
      setAddress("");
      setDepartmentId(teacherProfile.department_id || "");
      setQualification(teacherProfile.qualification || "");
    } else if (role === "admin" && session?.user) {
      setName(session.user.user_metadata?.full_name || "");
    }
  }, [studentProfile, teacherProfile, role, session]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      phone: string;
      address?: string;
      departmentId?: string;
      degree?: string;
      semester?: string;
      qualification?: string;
    }) => {
      if (role === "student" && studentProfile) {
        await mern
          .from("students")
          .update({
            full_name: payload.name,
            phone: payload.phone,
            address: payload.address,
            department_id: payload.departmentId,
            degree: payload.degree,
            semester: Number(payload.semester),
          })
          .eq("id", studentProfile.id);
      } else if (role === "teacher" && teacherProfile) {
        await mern
          .from("teachers")
          .update({
            full_name: payload.name,
            phone: payload.phone,
            department_id: payload.departmentId,
            qualification: payload.qualification,
          })
          .eq("id", teacherProfile.id);
      } else if (role === "admin") {
        await mern
          .from("users")
          .update({
            raw_user_meta_data: { full_name: payload.name }
          })
          .eq("id", session?.user?.id);

        const localSession = localStorage.getItem("mock_session");
        if (localSession) {
          const parsed = JSON.parse(localSession);
          if (parsed.user) {
            parsed.user.user_metadata = { ...parsed.user.user_metadata, full_name: payload.name };
            localStorage.setItem("mock_session", JSON.stringify(parsed));
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-students"] });
      queryClient.invalidateQueries({ queryKey: ["settings-teachers"] });
      toast.success("Profile details updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  // Notifications Mutations
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await mern.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const list = notifications ?? [];
      const promises = list.map((item) =>
        mern.from("notifications").update({ read: true }).eq("id", item.id),
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await mern.from("notifications").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-notifications"] });
      toast.success("Notification deleted");
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.warning("Name cannot be empty");
      return;
    }
    updateProfileMutation.mutate({
      name,
      phone,
      address,
      departmentId,
      degree,
      semester,
      qualification,
    });
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.warning("Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    // Mock success
    toast.success("Password updated successfully!");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
          User Preferences
        </span>
        <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Manage profile information, secure your credentials, and read system notices.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Left side nav panel */}
        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden p-2">
          <CardContent className="p-1.5 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible">
            {[
              { label: "Edit Profile", value: "profile", icon: User },
              { label: "System Notices", value: "notifications", icon: Bell },
              { label: "Login & Security", value: "security", icon: Shield },
            ].map((pane) => {
              const active = activePane === pane.value;
              return (
                <Button
                  key={pane.value}
                  variant="ghost"
                  className={`justify-start gap-3 h-10 font-bold px-4 shrink-0 rounded-2xl transition-all duration-300 w-full cursor-pointer ${
                    active
                      ? "bg-secondary text-primary shadow-sm border-l-[3px] border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                  onClick={() => setActivePane(pane.value as any)}
                >
                  <pane.icon
                    className={`h-4.5 w-4.5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span className="text-xs tracking-wide">{pane.label}</span>
                  {pane.value === "notifications" &&
                    notifications &&
                    notifications.filter((n) => !n.read).length > 0 && (
                      <Badge className="ml-auto bg-destructive text-destructive-foreground hover:bg-destructive font-mono text-[9px] px-1.5 py-0.5 rounded-full">
                        {notifications.filter((n) => !n.read).length}
                      </Badge>
                    )}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Right side active panes */}
        <div className="lg:col-span-3">
          {activePane === "profile" && (
            <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden p-6 space-y-6 relative group">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">
                  Profile Information
                </h2>
                <p className="text-xs text-muted-foreground">Update your personal details below.</p>
              </div>
              <CardContent className="p-0">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Full Name
                      </label>
                      <Input
                        placeholder="e.g. Ahmad Raza"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10"
                      />
                    </div>
                    <div className="space-y-1.5 font-medium">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                        <Input
                          disabled
                          value={session?.user?.email}
                          className="pl-9 rounded-xl border border-border/80 text-xs bg-muted/40 h-10 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                        <Input
                          placeholder="+92 300 1234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-9 rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10"
                        />
                      </div>
                    </div>

                    {role === "student" && studentProfile && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Academic Roll Number
                        </label>
                        <Input
                          disabled
                          value={studentProfile.roll_number}
                          className="rounded-xl border border-border/80 text-xs bg-muted/40 h-10 cursor-not-allowed font-mono"
                        />
                      </div>
                    )}

                    {role === "teacher" && teacherProfile && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Employee Registration ID
                        </label>
                        <Input
                          disabled
                          value={teacherProfile.employee_id}
                          className="rounded-xl border border-border/80 text-xs bg-muted/40 h-10 cursor-not-allowed font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {role === "student" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Postal Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/80" />
                        <Input
                          placeholder="Sector G-11, Islamabad"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="pl-9 rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10"
                        />
                      </div>
                    </div>
                  )}

                  {role === "student" && studentProfile && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Department */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Department
                        </label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                          <SelectTrigger className="rounded-xl border border-border/80 text-xs bg-background/50 h-10">
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
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Degree Program
                        </label>
                        <Input
                          placeholder="e.g. BSCS"
                          value={degree}
                          onChange={(e) => setDegree(e.target.value)}
                          className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10"
                        />
                      </div>

                      {/* Semester */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Semester
                        </label>
                        <Select value={semester} onValueChange={setSemester}>
                          <SelectTrigger className="rounded-xl border border-border/80 text-xs bg-background/50 h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-border/80 font-medium">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                Semester {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {role === "teacher" && teacherProfile && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Department */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Department
                        </label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                          <SelectTrigger className="rounded-xl border border-border/80 text-xs bg-background/50 h-10">
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
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Qualification
                        </label>
                        <Input
                          placeholder="e.g. PhD Computer Science"
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                          className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="h-10 px-6 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {updateProfileMutation.isPending ? "Saving changes..." : "Save details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activePane === "notifications" && (
            <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden p-6 space-y-6 relative group">
              <div className="flex flex-row justify-between items-center border-b border-border/40 pb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">
                    System Notifications
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Official notices and transaction alerts.
                  </p>
                </div>
                {notifications && notifications.filter((n) => !n.read).length > 0 && (
                  <Button
                    onClick={() => markAllReadMutation.mutate()}
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs font-bold border-border/80 hover:bg-secondary flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="h-4 w-4 text-primary" /> Mark all read
                  </Button>
                )}
              </div>
              <CardContent className="p-0">
                {notifications?.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-xs font-light">
                    No notices in your inbox.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications?.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 flex gap-3 rounded-2xl hover:bg-secondary/40 border border-transparent hover:border-border/40 transition-all cursor-pointer ${
                          !n.read ? "bg-primary/5 border-primary/20" : ""
                        }`}
                        onClick={() => !n.read && markReadMutation.mutate(n.id)}
                      >
                        <div
                          className={`h-2 w-2 rounded-full mt-2 shrink-0 ${!n.read ? "bg-primary animate-pulse" : "bg-transparent"}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center gap-2">
                            <h4 className="font-bold text-xs text-foreground">{n.title}</h4>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 self-center transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(n.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activePane === "security" && (
            <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden p-6 space-y-6 relative group">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Login & Security</h2>
                <p className="text-xs text-muted-foreground">
                  Secure your academic account credentials.
                </p>
              </div>
              <CardContent className="p-0">
                <form onSubmit={handlePasswordReset} className="max-w-md space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPass ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground transition-colors"
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 hover:border-foreground/10 transition-colors h-10"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="h-10 px-6 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
