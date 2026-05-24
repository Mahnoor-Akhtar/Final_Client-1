import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, Plus, Clock, MapPin, User, BookOpen, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/app/timetable")({
  component: TimetableRoute,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = [
  "09:00 AM - 10:30 AM",
  "11:00 AM - 12:30 PM",
  "01:00 PM - 02:30 PM",
  "02:30 PM - 04:00 PM",
];

function TimetableRoute() {
  const { session, role } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isOpen, setIsOpen] = useState(false);

  // New Slot State
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [selectedSlot, setSelectedSlot] = useState("09:00 AM - 10:30 AM");
  const [selectedRoom, setSelectedRoom] = useState("Room 101");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("dept-cs");

  // 1. Fetch timetables
  const { data: timetables } = useQuery({
    queryKey: ["timetables"],
    queryFn: async () => {
      const { data } = await mern.from("timetables").select("*");
      return data ?? [];
    },
  });

  // 2. Fetch courses
  const { data: courses } = useQuery({
    queryKey: ["timetable-courses"],
    queryFn: async () => {
      const { data } = await mern.from("courses").select("*");
      return data ?? [];
    },
  });

  // 3. Fetch teachers
  const { data: teachers } = useQuery({
    queryKey: ["timetable-teachers"],
    queryFn: async () => {
      const { data } = await mern.from("teachers").select("*");
      return data ?? [];
    },
  });

  // 4. Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["timetable-departments"],
    queryFn: async () => {
      const { data } = await mern.from("departments").select("*");
      return data ?? [];
    },
  });

  // 5. Fetch students
  const { data: students } = useQuery({
    queryKey: ["timetable-students"],
    queryFn: async () => {
      const { data } = await mern.from("students").select("*");
      return data ?? [];
    },
  });

  // Create slot mutation
  const createSlotMutation = useMutation({
    mutationFn: async (payload: any) => {
      await mern.from("timetables").insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
      toast.success("Schedule slot created successfully!");
      setIsOpen(false);
      setSelectedCourseId("");
      setSelectedTeacherId("");
    },
    onError: () => {
      toast.error("Failed to schedule slot");
    },
  });

  // Delete slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      await mern.from("timetables").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
      toast.success("Schedule slot removed");
    },
    onError: () => {
      toast.error("Failed to delete slot");
    },
  });

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !selectedTeacherId || !selectedRoom) {
      toast.warning("Please fill all fields");
      return;
    }
    // Check conflicts (same day, slot, and room / teacher)
    const conflict = timetables?.find(
      (t) =>
        t.day === selectedDay &&
        t.slot === selectedSlot &&
        (t.room === selectedRoom || t.teacher_id === selectedTeacherId),
    );

    if (conflict) {
      toast.error("Schedule conflict: Room or Teacher is already booked for this slot!");
      return;
    }

    createSlotMutation.mutate({
      day: selectedDay,
      slot: selectedSlot,
      room: selectedRoom,
      course_id: selectedCourseId,
      teacher_id: selectedTeacherId,
      department_id: selectedDeptId,
    });
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm("Are you sure you want to delete this schedule slot?")) {
      deleteSlotMutation.mutate(id);
    }
  };

  // Filter schedules based on logged-in role
  let filteredSchedules = timetables ?? [];
  if (role === "teacher") {
    const activeTeacher = teachers?.find((t) => t.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    filteredSchedules = timetables?.filter((t) => t.teacher_id === activeTeacher?.id) ?? [];
  } else if (role === "student") {
    const activeStudent = students?.find((s) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    const studentCourses = activeStudent?.courses || [];
    filteredSchedules =
      timetables?.filter((t) => studentCourses.includes(t.course_id)) ?? [];
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
            Operations Portal
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-foreground">Class Schedules</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            {role === "admin"
              ? "Plan weekly classes, assign rooms, and schedule lecturers."
              : role === "teacher"
                ? "Your personalized lecture schedule for the week."
                : "Weekly course schedule for your department."}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-xl border border-border/80 p-1 bg-card shrink-0">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              className="h-8 rounded-lg text-xs font-bold"
              onClick={() => setViewMode("grid")}
            >
              Weekly Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              className="h-8 rounded-lg text-xs font-bold"
              onClick={() => setViewMode("list")}
            >
              Slots List
            </Button>
          </div>

          {role === "admin" && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Schedule Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="font-display font-black tracking-tight text-xl text-foreground">Add Class Slot</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-light">
                    Assign a lecturer and lecture room to a course slot.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSlot} className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Day
                      </label>
                      <select
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Time Slot
                      </label>
                      <select
                        value={selectedSlot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
                      >
                        {SLOTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Lecture Room
                      </label>
                      <select
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
                      >
                        {["Room 101", "Room 102", "Room 201", "Lab 1", "Lab 2"].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Department
                      </label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
                      >
                        {departments?.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Select Course
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
                    >
                      <option value="">-- Choose Course --</option>
                      {courses?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Select Lecturer
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
                    >
                      <option value="">-- Choose Lecturer --</option>
                      {teachers?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      className="w-full rounded-xl h-10 text-xs font-bold text-white shadow-md hover:shadow-primary/10 transition-all cursor-pointer"
                      style={{ background: "var(--gradient-brand)" }}
                      disabled={createSlotMutation.isPending}
                    >
                      {createSlotMutation.isPending ? "Creating Slot..." : "Confirm Schedule"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === "grid" ? (
        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-6 border-b bg-muted/40 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                <div className="p-4 border-r">Time Slot</div>
                {DAYS.map((day) => (
                  <div key={day} className="p-4 text-center border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="divide-y">
                {SLOTS.map((slot) => (
                  <div key={slot} className="grid grid-cols-6 items-stretch">
                    <div className="p-4 border-r flex items-center bg-muted/10">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" /> {slot.split(" - ")[0]}
                      </span>
                    </div>

                    {DAYS.map((day) => {
                      const classes = filteredSchedules.filter(
                        (c) => c.day === day && c.slot === slot,
                      );
                      return (
                        <div
                          key={day}
                          className="p-3 border-r last:border-r-0 flex flex-col gap-2 min-h-[110px] bg-card/30"
                        >
                          {classes.map((cl) => {
                            const crs = courses?.find((c) => c.id === cl.course_id);
                            const t = teachers?.find((tc) => tc.id === cl.teacher_id);
                            return (
                              <div
                                key={cl.id}
                                className="relative group p-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col justify-between h-full"
                              >
                                <div>
                                  <p className="font-semibold text-xs text-foreground line-clamp-2">
                                    {crs?.title || cl.course_id}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                    {crs?.code}
                                  </p>
                                </div>
                                <div className="mt-3 space-y-1">
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                                    <span>{cl.room}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <User className="h-3 w-3 text-primary shrink-0" />
                                    <span className="line-clamp-1">
                                      {t?.full_name || "Lecturer"}
                                    </span>
                                  </div>
                                </div>
                                {role === "admin" && (
                                  <button
                                    onClick={() => handleDeleteSlot(cl.id)}
                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-destructive hover:bg-destructive/10 rounded-md"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                No timetable slots found.
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-border/40">
                    <tr>
                      <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Day
                      </th>
                      <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Time Slot
                      </th>
                      <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Course
                      </th>
                      <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Room
                      </th>
                      <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Lecturer
                      </th>
                      {role === "admin" && <th className="p-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredSchedules.map((slot: any) => {
                      const crs = courses?.find((c) => c.id === slot.course_id);
                      const t = teachers?.find((tc) => tc.id === slot.teacher_id);
                      return (
                        <tr key={slot.id} className="hover:bg-muted/10">
                          <td className="p-3 font-semibold">{slot.day}</td>
                          <td className="p-3 font-mono text-xs">{slot.slot}</td>
                          <td className="p-3">
                            <p className="font-semibold text-sm">{crs?.title || slot.course_id}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {crs?.code}
                            </p>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{slot.room}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{t?.full_name || "Faculty"}</td>
                          {role === "admin" && (
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
