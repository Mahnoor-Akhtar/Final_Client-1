import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Send,
  CornerDownRight,
  Inbox,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { motion } from "framer-motion";

export const Route = createFileRoute("/app/complaints")({
  component: ComplaintsRoute,
});

function ComplaintsRoute() {
  const { session, role } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"pending" | "resolved" | "all">("all");
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Student Form State
  const [compTitle, setCompTitle] = useState("");
  const [compCategory, setCompCategory] = useState("Facilities");
  const [compDesc, setCompDesc] = useState("");

  // Resolve Form State
  const [adminReply, setAdminReply] = useState("");

  // 1. Fetch Students
  const { data: students } = useQuery({
    queryKey: ["complaint-students"],
    queryFn: async () => {
      const { data } = await mern.from("students").select("*");
      return data ?? [];
    },
  });

  // 2. Fetch Complaints
  const { data: complaints } = useQuery({
    queryKey: ["complaints"],
    queryFn: async () => {
      const { data } = await mern
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Lodge complaint mutation
  const lodgeComplaintMutation = useMutation({
    mutationFn: async (payload: any) => {
      await mern.from("complaints").insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint submitted successfully!");
      setCompTitle("");
      setCompDesc("");
    },
    onError: () => {
      toast.error("Failed to submit complaint");
    },
  });

  // Resolve complaint mutation
  const resolveComplaintMutation = useMutation({
    mutationFn: async (payload: { id: string; reply: string }) => {
      await mern
        .from("complaints")
        .update({
          reply: payload.reply,
          status: "resolved",
        })
        .eq("id", payload.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint resolved and reply dispatched");
      setIsResolveOpen(false);
      setSelectedComplaint(null);
      setAdminReply("");
    },
    onError: () => {
      toast.error("Failed to resolve complaint");
    },
  });

  const handleLodgeComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students?.find((s) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    if (!student) return;

    if (!compTitle || !compDesc) {
      toast.warning("Please fill out the title and description");
      return;
    }

    lodgeComplaintMutation.mutate({
      student_id: student.id,
      title: compTitle,
      category: compCategory,
      description: compDesc,
      status: "pending",
    });
  };

  const handleResolveClick = (comp: any) => {
    setSelectedComplaint(comp);
    setIsResolveOpen(true);
  };

  const handleSaveResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !adminReply) {
      toast.warning("Please enter a response message");
      return;
    }
    resolveComplaintMutation.mutate({
      id: selectedComplaint.id,
      reply: adminReply,
    });
  };

  // Student specific view
  if (role === "student") {
    const student = students?.find((s) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    const myComplaints = complaints?.filter((c) => c.student_id === student?.id) ?? [];

    return (
      <div className="space-y-8 max-w-7xl animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary">
              Support & Feedback
            </span>
            <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">
              Student Helpline
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Submit formal complaints or feedback directly to the administration.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Submit panel */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden h-fit"
          >
            <div className="p-6 md:p-7 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary grid place-items-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-foreground">Submit Ticket</h2>
                  <p className="text-xs text-muted-foreground font-light">
                    File a request. We aim to respond within 24 hours.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-7">
              <form onSubmit={handleLodgeComplaint} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Category
                  </label>
                  <select
                    value={compCategory}
                    onChange={(e) => setCompCategory(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border/80 bg-background/50 px-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  >
                    {["Facilities", "Academic", "Administration", "Transportation", "Other"].map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ticket Title
                  </label>
                  <Input
                    placeholder="Brief description of issue..."
                    value={compTitle}
                    onChange={(e) => setCompTitle(e.target.value)}
                    className="h-11 rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Detailed Description
                  </label>
                  <Textarea
                    placeholder="Explain the problem in detail so the admin team can investigate..."
                    rows={5}
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={lodgeComplaintMutation.isPending}
                  className="w-full h-11 rounded-xl text-white font-bold transition-all duration-300 shadow-md hover:shadow-primary/10 active:scale-95 cursor-pointer"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {lodgeComplaintMutation.isPending ? "Submitting Ticket..." : "File Ticket"}
                </Button>
              </form>
            </div>
          </motion.div>

          {/* History list */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
              <h2 className="text-lg font-serif font-bold text-foreground">Support History</h2>
              <p className="text-xs text-muted-foreground font-light">
                Trace and view responses of your previous submissions.
              </p>
            </div>
            <div className="p-6">
              {myComplaints.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm font-light">
                  No tickets lodged yet. Fill out the submit panel to file a ticket.
                </div>
              ) : (
                <div className="space-y-4">
                  {myComplaints.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-5 border border-border/60 rounded-2xl bg-secondary/20 hover:bg-secondary/35 transition-colors space-y-3 relative group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h3 className="font-serif font-bold text-sm text-foreground">
                            {comp.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-light">
                            Category:{" "}
                            <span className="font-bold text-foreground">{comp.category}</span> ·
                            Lodged on {new Date(comp.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={comp.status === "resolved" ? "default" : "outline"}
                          className={`font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 rounded-full ${
                            comp.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/10"
                          }`}
                        >
                          {comp.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground font-light leading-relaxed">
                        {comp.description}
                      </p>

                      {comp.reply && (
                        <div className="p-4 bg-card/65 border border-border/80 rounded-xl text-xs space-y-1.5 shadow-inner">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />{" "}
                            Response from Administration:
                          </p>
                          <p className="text-muted-foreground pl-5 leading-relaxed font-light">
                            {comp.reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Admin / Faculty inbox view
  const inboxList =
    complaints?.filter((c) => {
      if (activeTab === "all") return true;
      return c.status === activeTab;
    }) ?? [];

  return (
    <div className="space-y-8 max-w-7xl animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary">
            Administration
          </span>
          <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">
            Support Helpdesk
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Review student issues, write replies, and resolve help tickets.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="inline-flex rounded-xl border border-border/80 p-1 bg-secondary/50 backdrop-blur-md shrink-0">
          {[
            { label: "All Tickets", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Resolved", value: "resolved" },
          ].map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={activeTab === tab.value ? "secondary" : "ghost"}
              className={`h-8 text-xs font-bold px-4 rounded-lg transition-all ${
                activeTab === tab.value
                  ? "bg-card text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab.value as any)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <div>
            <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" /> Ticket Queue
            </h2>
            <p className="text-xs text-muted-foreground font-light">
              Trace inquiries and log administrative status reports.
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-primary/5 text-primary font-mono border-primary/20 text-xs px-2.5 py-0.5 rounded-full"
          >
            {inboxList.length} Tickets
          </Badge>
        </div>
        <div className="p-0">
          {inboxList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm font-light">
              No complaints found matching this filter.
            </div>
          ) : (
            <div className="divide-y divide-border/45">
              {inboxList.map((comp) => {
                const s = students?.find((st) => st.id === comp.student_id);
                return (
                  <div
                    key={comp.id}
                    className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-5 hover:bg-secondary/25 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-[9px] uppercase font-bold px-2 py-0 border-border/60"
                        >
                          {comp.category}
                        </Badge>
                        <Badge
                          variant={comp.status === "resolved" ? "default" : "outline"}
                          className={`font-bold uppercase tracking-wider text-[9px] px-2 py-0 rounded-full ${
                            comp.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/10"
                          }`}
                        >
                          {comp.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-light">
                          Lodged on {new Date(comp.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-base text-foreground leading-snug">
                        {comp.title}
                      </h4>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed max-w-3xl">
                        {comp.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <span className="font-bold text-foreground">Submitted by:</span>
                        <span className="font-light">
                          {s?.full_name || "Unknown Student"} ({s?.roll_number || "—"})
                        </span>
                      </div>

                      {comp.reply && (
                        <div className="mt-3 p-4 bg-card/65 border border-border/80 rounded-xl text-xs space-y-1.5 shadow-inner">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />{" "}
                            Resolution Remarks:
                          </p>
                          <p className="text-muted-foreground pl-5 leading-relaxed font-light">
                            {comp.reply}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center">
                      {comp.status === "pending" && role !== "student" && (
                        <Button
                          onClick={() => handleResolveClick(comp)}
                          size="sm"
                          className="h-9 rounded-xl text-white font-bold text-xs shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
                          style={{ background: "var(--gradient-brand)" }}
                        >
                          Reply & Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Resolve Dialog */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="font-serif font-bold text-xl text-foreground">
              Resolve Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-light">
              Submit response message for student ticket:{" "}
              <span className="font-bold text-foreground">{selectedComplaint?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveResolution} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Resolution remarks
              </label>
              <Textarea
                placeholder="Write official resolution details or reply to student..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                rows={5}
                className="rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={resolveComplaintMutation.isPending}
                className="w-full h-11 rounded-xl text-white font-bold transition-all duration-300 shadow-md hover:shadow-primary/10 active:scale-95 cursor-pointer"
                style={{ background: "var(--gradient-brand)" }}
              >
                {resolveComplaintMutation.isPending ? "Resolving..." : "Save Resolution & Dispatch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
