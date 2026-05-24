import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Plus, Trash2, Pencil, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/app/departments")({
  component: DepartmentsRoute,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  code: z.string().trim().min(1, "Code is required").max(20),
});

type Department = {
  id: string;
  name: string;
  code: string;
};

const empty = { name: "", code: "" };

function DepartmentsRoute() {
  const { role, loading } = useAuth();

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [search, setSearch] = useState("");

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await mern
        .from("departments")
        .select("id,name,code")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Department[];
    },
  });

  // Counts of students/teachers/courses per department for richer UI
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-depts"],
    queryFn: async () =>
      (await mern.from("students").select("id,department_id")).data ?? [],
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-for-depts"],
    queryFn: async () =>
      (await mern.from("teachers").select("id,department_id")).data ?? [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["courses-for-depts"],
    queryFn: async () =>
      (await mern.from("courses").select("id,department_id")).data ?? [],
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const payload = { name: parsed.name, code: parsed.code.toUpperCase() };
      if (editing) {
        const { error } = await mern
          .from("departments")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await mern.from("departments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
      toast.success(editing ? "Department updated" : "Department added");
    },
    onError: (e: any) =>
      toast.error(e?.issues?.[0]?.message ?? e?.message ?? "Failed to save"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await mern.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="p-6 text-center text-muted-foreground animate-fade-in py-16">
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm font-light">Only administrators can access or manage department configurations.</p>
      </div>
    );
  }

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code });
    setOpen(true);
  };

  const filtered = departments.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()),
  );

  const countFor = (deptId: string, arr: any[]) =>
    arr.filter((x: any) => x.department_id === deptId).length;

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
            Academic Registry
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
            Departments
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            {departments.length} active{" "}
            {departments.length === 1 ? "department" : "departments"} configured.
          </p>
        </div>
        {role === "admin" && (
          <Button
            onClick={openAdd}
            className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Department
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
        <Input
          className="pl-9 h-10 bg-card border border-border/80 hover:border-foreground/10 focus-visible:ring-primary rounded-xl text-xs transition-colors"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/40 hover:bg-transparent">
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Code
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Students
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Teachers
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Courses
              </TableHead>
              {role === "admin" && (
                <TableHead className="w-28 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/40">
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={role === "admin" ? 6 : 5}
                  className="text-center py-12 text-muted-foreground text-sm font-light"
                >
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-primary" />
                  Loading Departments…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={role === "admin" ? 6 : 5}
                  className="text-center py-12 text-muted-foreground text-sm font-light"
                >
                  No departments found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow
                  key={d.id}
                  className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                >
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-secondary/80 border-border/80 font-bold rounded-lg px-2.5 py-0.5"
                    >
                      {d.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary/80" />
                      {d.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {countFor(d.id, students)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {countFor(d.id, teachers)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {countFor(d.id, courses)}
                  </TableCell>
                  {role === "admin" && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(d)}
                          className="h-8 w-8 rounded-lg hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            confirm(
                              `Delete department "${d.name}"? Linked students/teachers/courses will remain but lose this reference.`,
                            ) && delMut.mutate(d.id)
                          }
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(empty);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display font-black tracking-tight text-xl text-foreground">
              {editing ? "Modify Department" : "Register New Department"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Department Name
              </Label>
              <Input
                required
                placeholder="e.g. Computer Science"
                className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Department Code
              </Label>
              <Input
                required
                placeholder="e.g. CS"
                className="rounded-xl border border-border/80 focus-visible:ring-primary text-xs bg-background/50 h-10 uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-10 text-xs font-semibold"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMut.isPending}
                className="rounded-xl h-10 text-xs font-bold text-white shadow-md hover:shadow-primary/10 transition-all cursor-pointer"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saveMut.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editing ? "Save Changes" : "Add Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
