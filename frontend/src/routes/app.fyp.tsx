import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import {
  FolderKanban,
  Plus,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  User,
  MessageSquare,
  Award,
  FileSpreadsheet,
  PlusCircle,
  Github,
  ExternalLink,
  Upload,
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

export const Route = createFileRoute("/app/fyp")({
  component: FYPRoute,
});

function FYPRoute() {
  const { session, role } = useAuth();
  const queryClient = useQueryClient();

  // Dialog opens
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  // Group Registration Form
  const [groupName, setGroupName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  // Document Submission Form
  const [subTitle, setSubTitle] = useState("");
  const [subFileName, setSubFileName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [githubLink, setGithubLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Grading Form
  const [gradeComment, setGradeComment] = useState("");
  const [gradeLetter, setGradeLetter] = useState("A");

  // 1. Fetch Students
  const { data: students } = useQuery({
    queryKey: ["fyp-students"],
    queryFn: async () => {
      const { data } = await mern.from("students").select("*");
      return data ?? [];
    },
  });

  // 2. Fetch Teachers
  const { data: teachers } = useQuery({
    queryKey: ["fyp-teachers"],
    queryFn: async () => {
      const { data } = await mern.from("teachers").select("*");
      return data ?? [];
    },
  });

  // 3. Fetch Groups
  const { data: groups } = useQuery({
    queryKey: ["fyp-groups"],
    queryFn: async () => {
      const { data } = await mern.from("fyp_groups").select("*");
      return data ?? [];
    },
  });

  // 4. Fetch Submissions
  const { data: submissions } = useQuery({
    queryKey: ["fyp-submissions"],
    queryFn: async () => {
      const { data } = await mern.from("fyp_submissions").select("*");
      return data ?? [];
    },
  });

  // Group registration mutation
  const registerGroupMutation = useMutation({
    mutationFn: async (payload: any) => {
      await mern.from("fyp_groups").insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fyp-groups"] });
      toast.success("FYP group registered! Awaiting supervisor approval.");
      setGroupName("");
      setProjectTitle("");
      setAbstract("");
      setPartnerId("");
      setSupervisorId("");
    },
    onError: () => {
      toast.error("Failed to register group");
    },
  });

  // Group deletion mutation for clearing rejected requests
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await mern.from("fyp_groups").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fyp-groups"] });
      toast.success("FYP request cleared. You can now register again.");
    },
    onError: () => {
      toast.error("Failed to delete group request");
    },
  });

  // Document Submission mutation
  const submitDocMutation = useMutation({
    mutationFn: async (payload: any) => {
      await mern.from("fyp_submissions").insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fyp-submissions"] });
      toast.success("Document submitted successfully!");
      setIsSubmitOpen(false);
      setSubTitle("");
      setSubFileName("");
      setPdfFile(null);
      setGithubLink("");
    },
    onError: () => {
      toast.error("Failed to submit document");
    },
  });

  // Approve/Reject mutation (Admin)
  const setGroupStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string }) => {
      await mern.from("fyp_groups").update({ status: payload.status }).eq("id", payload.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fyp-groups"] });
      toast.success("FYP group status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Grading mutation (Supervisor)
  const gradeSubmissionMutation = useMutation({
    mutationFn: async (payload: { id: string; grade: string; comments: string }) => {
      await mern
        .from("fyp_submissions")
        .update({
          grade: payload.grade,
          comments: payload.comments,
        })
        .eq("id", payload.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fyp-submissions"] });
      toast.success("Submission graded & feedback logged!");
      setIsGradeOpen(false);
      setSelectedSub(null);
      setGradeComment("");
    },
    onError: () => {
      toast.error("Failed to grade submission");
    },
  });

  const handleRegisterGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students?.find((s) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    if (!student) return;

    if (!groupName || !projectTitle || !abstract || !supervisorId) {
      toast.warning("Please fill out group name, title, abstract and supervisor");
      return;
    }

    const membersList = [student.id];
    if (partnerId) membersList.push(partnerId);

    registerGroupMutation.mutate({
      group_name: groupName,
      title: projectTitle,
      abstract: abstract,
      members: membersList,
      supervisor_id: supervisorId,
      status: "pending",
    });
  };

  const handleDocumentSubmit = async (e: React.FormEvent, groupId: string) => {
    e.preventDefault();
    if (!subTitle) {
      toast.warning("Please choose a milestone to submit");
      return;
    }
    if (!pdfFile && !githubLink.trim()) {
      toast.warning("Please upload a PDF file or enter a GitHub link to show progress");
      return;
    }

    setIsUploading(true);
    let uploadedFilePath = "";
    let finalFileName = "";

    try {
      if (pdfFile) {
        const formData = new FormData();
        formData.append("file", pdfFile);

        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload PDF file");
        }

        const resData = await response.json();
        if (resData.error) {
          throw new Error(resData.error.message || "Upload error");
        }

        uploadedFilePath = resData.data.file_path;
        finalFileName = resData.data.file_name || pdfFile.name;
      } else {
        finalFileName = "GitHub Link";
      }

      await submitDocMutation.mutateAsync({
        group_id: groupId,
        title: subTitle,
        file_name: finalFileName,
        file_path: uploadedFilePath,
        github_link: githubLink.trim(),
        submitted_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong during submission");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGradeClick = (sub: any) => {
    setSelectedSub(sub);
    setIsGradeOpen(true);
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    gradeSubmissionMutation.mutate({
      id: selectedSub.id,
      grade: gradeLetter,
      comments: gradeComment,
    });
  };

  // Student Flow
  if (role === "student") {
    const currentStudent = students?.find((s) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    const myGroup = groups?.find((g) => g.members?.includes(currentStudent?.id)) || null;
    const mySubmissions = myGroup
      ? (submissions?.filter((s) => s.group_id === myGroup.id) ?? [])
      : [];

    return (
      <div className="space-y-8 max-w-7xl animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary">
              Final Year Project
            </span>
            <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
              Student Project Workspace
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Register project groups, submit documents, and review milestones.
            </p>
          </div>
        </div>

        {!myGroup ? (
          /* Register Group Form */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden"
          >
            <div className="p-6 md:p-8 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary grid place-items-center">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-foreground">
                    Register FYP Group
                  </h2>
                  <p className="text-xs text-muted-foreground font-light">
                    Assemble your project team, submit your abstract, and select a supervisor.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <form onSubmit={handleRegisterGroup} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Group Name
                    </label>
                    <Input
                      placeholder="e.g. Team Campus"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="h-11 rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Select Partner (Optional)
                    </label>
                    <select
                      value={partnerId}
                      onChange={(e) => setPartnerId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border/80 bg-background/50 px-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- No Partner --</option>
                      {students
                        ?.filter((s) => s.id !== currentStudent?.id)
                        .map((s) => {
                          const hasGroup = groups?.some((g) => g.members?.includes(s.id));
                          return (
                            <option key={s.id} value={s.id} disabled={hasGroup}>
                              {s.full_name} ({s.roll_number}){hasGroup ? " - Already in a group" : ""}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Project Title
                  </label>
                  <Input
                    placeholder="e.g. AI-based Campus Management Portal"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="h-11 rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Project Proposal Abstract
                  </label>
                  <Textarea
                    placeholder="Describe the scope, tech stack, and problem statement of your FYP..."
                    rows={4}
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className="rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Proposed Supervisor
                  </label>
                  <select
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border/80 bg-background/50 px-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">-- Choose Supervisor --</option>
                    {teachers?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.qualification})
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={registerGroupMutation.isPending}
                  className="w-full h-11 rounded-xl text-white font-bold transition-all duration-300 shadow-md hover:shadow-primary/10 active:scale-95 cursor-pointer"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {registerGroupMutation.isPending
                    ? "Submitting Registration..."
                    : "Submit Registration Pitch"}
                </Button>
              </form>
            </div>
          </motion.div>
        ) : (
          /* Active Group Workspace */
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Group Metadata info card */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm p-6 space-y-6 h-fit relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex justify-between items-start gap-2 relative z-10 border-b border-border/40 pb-4">
                <div>
                  <h2 className="text-xl font-display font-black tracking-tight text-foreground">
                    {myGroup.group_name}
                  </h2>
                  <Badge
                    variant={myGroup.status === "approved" ? "default" : "outline"}
                    className={`mt-2.5 font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 rounded-full ${
                      myGroup.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : myGroup.status === "rejected"
                          ? "bg-red-500/10 text-red-500 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}
                  >
                    {myGroup.status === "approved"
                      ? "Group Active"
                      : myGroup.status === "rejected"
                        ? "Request Rejected"
                        : "Pending Approval"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Project Title
                  </p>
                  <p className="text-sm font-serif font-bold text-foreground leading-snug">
                    {myGroup.title}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Abstract Proposal
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 font-light">
                    {myGroup.abstract}
                  </p>
                </div>
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Supervisor
                  </p>
                  <div className="flex items-center gap-3 bg-secondary/40 border border-border/60 p-3 rounded-xl">
                    <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-full text-primary grid place-items-center shrink-0">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {teachers?.find((t) => t.id === myGroup.supervisor_id)?.full_name ||
                          "Assigned Supervisor"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {teachers?.find((t) => t.id === myGroup.supervisor_id)?.qualification ||
                          "Faculty Advisor"}
                      </p>
                    </div>
                  </div>
                </div>
                {myGroup.status === "rejected" && (
                  <div className="pt-4 border-t border-border/40 space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Supervision Request Rejected</p>
                        <p className="text-[11px] leading-relaxed text-red-500/80 font-light">
                          Your final year project registration request has been rejected by the proposed supervisor.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full h-10 rounded-xl text-xs font-bold transition-all duration-300 shadow-md hover:shadow-red-500/10 active:scale-95 cursor-pointer"
                      onClick={() => deleteGroupMutation.mutate(myGroup.id)}
                      disabled={deleteGroupMutation.isPending}
                    >
                      {deleteGroupMutation.isPending ? "Clearing..." : "Remove Request & Try Again"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right: Submission log & upload */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-foreground">
                      Document Deliverables
                    </h2>
                    <p className="text-xs text-muted-foreground font-light">
                      Milestone checklist (Proposal, SRS, Architecture Design, Thesis).
                    </p>
                  </div>
                  {myGroup.status === "approved" && (
                    <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="h-9 rounded-xl text-white font-bold text-xs shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
                          style={{ background: "var(--gradient-brand)" }}
                        >
                          <Plus className="h-4 w-4 mr-1.5" /> Submit Document
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-lg">
                        <DialogHeader>
                          <DialogTitle className="font-serif font-bold text-xl text-foreground">
                            Submit FYP Deliverable
                          </DialogTitle>
                          <DialogDescription className="text-xs text-muted-foreground font-light">
                            Upload PDF documents to your supervisor for review & grading.
                          </DialogDescription>
                        </DialogHeader>
                        <form
                          onSubmit={(e) => handleDocumentSubmit(e, myGroup.id)}
                          className="space-y-5 py-3"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Document Milestone
                            </label>
                            <select
                              value={subTitle}
                              onChange={(e) => setSubTitle(e.target.value)}
                              className="w-full h-11 rounded-xl border border-border/80 bg-background/50 px-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                            >
                              <option value="">-- Choose Milestone --</option>
                              <option value="Project Proposal Draft">Project Proposal Draft</option>
                              <option value="Software Requirement Specification">
                                Software Requirement Specification
                              </option>
                              <option value="System Architecture Design">
                                System Architecture Design
                              </option>
                              <option value="Final Thesis & Code Submission">
                                Final Thesis & Code Submission
                              </option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Upload Progress Report (PDF)
                            </label>
                            <div
                              onClick={() => document.getElementById("pdf-file-upload")?.click()}
                              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                                pdfFile
                                  ? "border-primary/60 bg-primary/5"
                                  : "border-border/80 bg-background/30 hover:border-primary/50 hover:bg-secondary/20"
                              }`}
                            >
                              <input
                                type="file"
                                id="pdf-file-upload"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    if (file.type !== "application/pdf") {
                                      toast.error("Please upload a PDF file only");
                                      return;
                                    }
                                    setPdfFile(file);
                                  }
                                }}
                              />
                              {pdfFile ? (
                                <div className="flex flex-col items-center gap-1.5">
                                  <FileText className="h-8 w-8 text-primary" />
                                  <p className="text-sm font-semibold text-foreground truncate max-w-full">
                                    {pdfFile.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPdfFile(null);
                                      const input = document.getElementById("pdf-file-upload") as HTMLInputElement;
                                      if (input) input.value = "";
                                    }}
                                    className="mt-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20"
                                  >
                                    Remove File
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                                  <Upload className="h-8 w-8 text-muted-foreground/60 mb-1" />
                                  <p className="text-xs font-medium">
                                    Drag & drop or click to choose PDF
                                  </p>
                                  <p className="text-[10px] font-light">
                                    PDF file up to 10MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              GitHub Repository Link
                            </label>
                            <div className="relative">
                              <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="url"
                                placeholder="https://github.com/your-username/repo"
                                value={githubLink}
                                onChange={(e) => setGithubLink(e.target.value)}
                                className="h-11 pl-10 rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                              />
                            </div>
                          </div>

                          <DialogFooter className="pt-2">
                            <Button
                              type="submit"
                              disabled={isUploading || submitDocMutation.isPending}
                              className="w-full h-11 rounded-xl text-white font-bold transition-all duration-300 shadow-md hover:shadow-primary/10 active:scale-95 cursor-pointer"
                              style={{ background: "var(--gradient-brand)" }}
                            >
                              {isUploading
                                ? "Uploading PDF..."
                                : submitDocMutation.isPending
                                  ? "Submitting..."
                                  : "Send Submission"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="p-6">
                  {mySubmissions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm font-light">
                      No deliverables uploaded yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mySubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-5 border border-border/60 rounded-2xl bg-secondary/20 hover:bg-secondary/35 transition-colors space-y-3 relative group"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <h3 className="font-serif font-bold text-sm text-foreground">
                                  {sub.title}
                                </h3>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-light">
                                File:{" "}
                                <span className="font-mono text-[10px] text-foreground bg-secondary px-1.5 py-0.5 rounded">
                                  {sub.file_name}
                                </span>{" "}
                                · Submitted on {new Date(sub.submitted_at).toLocaleDateString()}
                              </p>
                              {(sub.file_path || sub.github_link) && (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                  {sub.file_path && (
                                    <a
                                      href={sub.file_path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      View PDF
                                    </a>
                                  )}
                                  {sub.github_link && (
                                    <a
                                      href={sub.github_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground hover:bg-secondary/80 bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                                    >
                                      <Github className="h-3.5 w-3.5" />
                                      GitHub Code
                                      <ExternalLink className="h-3 w-3 opacity-60" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            {sub.grade ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10 font-bold text-xs px-2.5 py-0.5 rounded-full">
                                Grade: {sub.grade}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium text-xs px-2.5 py-0.5 rounded-full"
                              >
                                Awaiting Grade
                              </Badge>
                            )}
                          </div>

                          {sub.comments && (
                            <div className="p-4 bg-card/65 border border-border/80 rounded-xl text-xs flex gap-3 shadow-inner">
                              <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-foreground">Supervisor Remarks</p>
                                <p className="text-muted-foreground mt-1 leading-relaxed font-light">
                                  {sub.comments}
                                </p>
                              </div>
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
        )}
      </div>
    );
  }

  // Teacher Flow (Supervisor)
  if (role === "teacher") {
    const activeTeacher = teachers?.find((t) => t.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    const supervisedGroups = groups?.filter((g) => g.supervisor_id === activeTeacher?.id) ?? [];
    const activeGroups = supervisedGroups.filter((g) => g.status === "approved");
    const pendingGroups = supervisedGroups.filter((g) => g.status === "pending");
    const rejectedGroups = supervisedGroups.filter((g) => g.status === "rejected");

    return (
      <div className="space-y-8 max-w-7xl animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary">
              FYP Portal
            </span>
            <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
              Supervisor Hub
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Review student deliverables, provide structural feedback and assign project grades.
            </p>
          </div>
        </div>

        {supervisedGroups.length === 0 ? (
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground text-sm font-light">
              You are not supervising any project groups yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left list of groups */}
            <div className="space-y-6">
              {pendingGroups.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-amber-500 pl-1">
                    Pending Supervision Requests
                  </p>
                  {pendingGroups.map((group) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-500/5 border border-amber-500/25 p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-serif font-bold text-sm text-foreground">
                            {group.group_name}
                          </h3>
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/25 uppercase font-bold py-0">
                            Pending
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground font-bold leading-snug">
                          {group.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                          {group.abstract}
                        </p>
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {group.members?.map((mId: string) => {
                            const stud = students?.find((st) => st.id === mId);
                            return (
                              <Badge
                                key={mId}
                                variant="outline"
                                className="text-[9px] px-2 py-0 border-border/60 hover:bg-transparent font-medium"
                              >
                                {stud?.full_name || mId}
                              </Badge>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 flex-1 transition-colors cursor-pointer"
                            onClick={() =>
                              setGroupStatusMutation.mutate({ id: group.id, status: "approved" })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 rounded-lg text-xs font-bold px-3 flex-1 transition-colors cursor-pointer"
                            onClick={() =>
                              setGroupStatusMutation.mutate({ id: group.id, status: "rejected" })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground pl-1">
                  Active Supervised Groups
                </p>
                {activeGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-light pl-1">No active supervised groups.</p>
                ) : (
                  activeGroups.map((group) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -1 }}
                      className="bg-card/45 backdrop-blur-xl border border-border/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative z-10 space-y-3">
                        <div>
                          <h3 className="font-serif font-bold text-sm text-foreground">
                            {group.group_name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-light line-clamp-2 mt-0.5 leading-relaxed">
                            {group.title}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap pt-2 border-t border-border/30">
                          {group.members?.map((mId: string) => {
                            const stud = students?.find((st) => st.id === mId);
                            return (
                              <Badge
                                key={mId}
                                variant="outline"
                                className="text-[9px] px-2 py-0 border-border/60 hover:bg-transparent font-medium"
                              >
                                {stud?.full_name || mId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {rejectedGroups.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-red-500 pl-1">
                    Rejected Requests
                  </p>
                  {rejectedGroups.map((group) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/5 border border-red-500/25 p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-serif font-bold text-sm text-foreground">
                            {group.group_name}
                          </h3>
                          <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-500 border-red-500/25 uppercase font-bold py-0">
                            Rejected
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground font-bold leading-snug">
                          {group.title}
                        </p>
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {group.members?.map((mId: string) => {
                            const stud = students?.find((st) => st.id === mId);
                            return (
                              <Badge
                                key={mId}
                                variant="outline"
                                className="text-[9px] px-2 py-0 border-border/60 hover:bg-transparent font-medium"
                              >
                                {stud?.full_name || mId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Submissions awaiting review */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                  <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" /> Deliverables Queue
                  </h2>
                  <p className="text-xs text-muted-foreground font-light">
                    Submitted documents from your project groups.
                  </p>
                </div>
                <div className="p-6">
                  {submissions?.filter((s) => activeGroups.some((g) => g.id === s.group_id))
                    .length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm font-light">
                      No submissions in queue.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submissions
                        ?.filter((s) => activeGroups.some((g) => g.id === s.group_id))
                        .map((sub) => {
                          const group = activeGroups.find((g) => g.id === sub.group_id);
                          return (
                            <div
                              key={sub.id}
                              className="p-5 border border-border/60 rounded-2xl bg-secondary/20 hover:bg-secondary/35 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            >                               <div className="space-y-1">
                                <h3 className="font-serif font-bold text-sm text-foreground">
                                  {sub.title}
                                </h3>
                                <p className="text-xs text-muted-foreground font-light">
                                  Group:{" "}
                                  <span className="font-bold text-foreground">
                                    {group?.group_name}
                                  </span>{" "}
                                  · File:{" "}
                                  <span className="underline font-mono text-[11px] text-foreground">
                                    {sub.file_name}
                                  </span>
                                </p>
                                {(sub.file_path || sub.github_link) && (
                                  <div className="flex gap-2 mt-2.5 flex-wrap">
                                    {sub.file_path && (
                                      <a
                                        href={sub.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        View PDF Progress
                                      </a>
                                    )}
                                    {sub.github_link && (
                                      <a
                                        href={sub.github_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground hover:bg-secondary/80 bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                                      >
                                        <Github className="h-3.5 w-3.5" />
                                        GitHub Code
                                        <ExternalLink className="h-3 w-3 opacity-60" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                {sub.comments && (
                                  <div className="mt-2.5 p-3 bg-card/65 border border-border/60 rounded-xl text-xs text-muted-foreground italic font-light">
                                    "{sub.comments}"
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-3">
                                {sub.grade ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10 font-bold text-xs px-2.5 py-0.5 rounded-full">
                                    Grade: {sub.grade}
                                  </Badge>
                                ) : (
                                  <Button
                                    onClick={() => handleGradeClick(sub)}
                                    size="sm"
                                    className="h-8 rounded-lg text-xs font-bold border border-border/60 hover:bg-secondary transition-all cursor-pointer"
                                    variant="outline"
                                  >
                                    Grade Doc
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
            </div>
          </div>
        )}

        {/* Grade Dialog */}
        <Dialog open={isGradeOpen} onOpenChange={setIsGradeOpen}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-lg">
            <DialogHeader>
              <DialogTitle className="font-serif font-bold text-xl text-foreground">
                Grade Submission
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-light">
                Review details and assign grade for milestone{" "}
                <span className="font-bold text-foreground">{selectedSub?.title}</span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveGrade} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Grade
                </label>
                <select
                  value={gradeLetter}
                  onChange={(e) => setGradeLetter(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border/80 bg-background/50 px-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                >
                  {["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Feedback Comments
                </label>
                <Textarea
                  placeholder="Provide brief review feedback for changes or grade rationale..."
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  rows={4}
                  className="rounded-xl border border-border/80 bg-background/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={gradeSubmissionMutation.isPending}
                  className="w-full h-11 rounded-xl text-white font-bold transition-all duration-300 shadow-md hover:shadow-primary/10 active:scale-95 cursor-pointer"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {gradeSubmissionMutation.isPending ? "Saving Evaluation..." : "Submit Evaluation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Admin Flow
  return (
    <div className="space-y-8 max-w-7xl animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary">
            Administration
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
            Projects Registry
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Approve FYP group applications and monitor supervisor allocations.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <h2 className="text-lg font-serif font-bold text-foreground">FYP Group Applications</h2>
          <p className="text-xs text-muted-foreground font-light">
            Pending & active final year project groups.
          </p>
        </div>
        <div className="p-6">
          {groups?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-light text-sm">
              No groups registered yet.
            </div>
          ) : (
            <div className="border border-border/60 rounded-2xl overflow-hidden shadow-inner bg-secondary/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/50">
                      <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                        Group Details
                      </th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                        Project Title
                      </th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                        Supervisor
                      </th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/45">
                    {groups?.map((g) => {
                      const supervisor = teachers?.find((t) => t.id === g.supervisor_id);
                      return (
                        <tr key={g.id} className="hover:bg-secondary/25 transition-colors">
                          <td className="p-4">
                            <p className="font-serif font-bold text-sm text-foreground">
                              {g.group_name}
                            </p>
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {g.members?.map((mId: string) => {
                                const s = students?.find((st) => st.id === mId);
                                return (
                                  <Badge
                                    key={mId}
                                    variant="outline"
                                    className="text-[9px] px-2 py-0 border-border/60 font-medium"
                                  >
                                    {s?.full_name || mId}
                                  </Badge>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground font-light max-w-xs truncate">
                            {g.title}
                          </td>
                          <td className="p-4 text-sm font-semibold text-foreground">
                            {supervisor?.full_name || "Unassigned"}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={g.status === "approved" ? "default" : "outline"}
                              className={`font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 rounded-full ${
                                g.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10"
                                  : g.status === "rejected"
                                    ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/10"
                                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/10"
                              }`}
                            >
                              {g.status === "pending" ? "Awaiting Supervisor" : g.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
