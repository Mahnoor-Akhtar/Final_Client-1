import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mern } from "@/integrations/mern/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet,
  DollarSign,
  Clock,
  CheckCircle2,
  CreditCard,
  Search,
  ArrowDownToLine,
  Receipt,
  ShieldCheck,
  Landmark,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/app/fees")({
  component: FeesRoute,
});

function FeesRoute() {
  const { session, role, loading } = useAuth();

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentGateway, setPaymentGateway] = useState<"Easypaisa" | "JazzCash" | "Bank">(
    "Easypaisa",
  );
  const [walletNumber, setWalletNumber] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // New Invoice Form State (Admin)
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // 1. Fetch Students
  const { data: students } = useQuery({
    queryKey: ["fee-students"],
    queryFn: async () => {
      const { data } = await mern.from("students").select("*");
      return data ?? [];
    },
  });

  // 2. Fetch Fees
  const { data: invoices } = useQuery({
    queryKey: ["fee-invoices"],
    queryFn: async () => {
      const { data } = await mern.from("fees").select("*");
      return data ?? [];
    },
  });

  // Mutation to pay invoice
  const payInvoiceMutation = useMutation({
    mutationFn: async (payload: { id: string; method: string }) => {
      await mern
        .from("fees")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          method: payload.method,
        })
        .eq("id", payload.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-invoices"] });
      toast.success("Payment completed successfully!");
      setIsOpen(false);
      setSelectedInvoice(null);
    },
    onError: () => {
      toast.error("Failed to process payment");
    },
  });

  // Mutation to create new invoice (Admin)
  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: {
      student_id: string;
      title: string;
      amount: number;
      due_date: string;
    }) => {
      await mern.from("fees").insert({
        student_id: payload.student_id,
        title: payload.title,
        amount: payload.amount,
        due_date: payload.due_date,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-invoices"] });
      toast.success("Invoice created successfully");
      setNewTitle("");
      setNewAmount("");
      setNewDueDate("");
      setSelectedStudentId("");
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin" && role !== "student") {
    return (
      <div className="p-6 text-center text-muted-foreground animate-fade-in py-16">
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm font-light">Only students and administrators can view fee records.</p>
      </div>
    );
  }

  const handlePayClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsOpen(true);
  };

  const handleProcessPayment = () => {
    if (!walletNumber && paymentGateway !== "Bank") {
      toast.warning("Please enter your wallet number");
      return;
    }
    setPaymentLoading(true);

    setTimeout(() => {
      setPaymentLoading(false);
      payInvoiceMutation.mutate({
        id: selectedInvoice.id,
        method: paymentGateway,
      });
    }, 1500); // Simulated payment gateway lag
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !newTitle || !newAmount || !newDueDate) {
      toast.warning("Please fill all invoice fields");
      return;
    }
    createInvoiceMutation.mutate({
      student_id: selectedStudentId,
      title: newTitle,
      amount: parseInt(newAmount),
      due_date: newDueDate,
    });
  };

  const handleDownloadReceipt = (invoice: any) => {
    const studentName = students?.find((s: any) => s.id === invoice.student_id)?.full_name ?? "N/A";
    const rollNumber  = students?.find((s: any) => s.id === invoice.student_id)?.roll_number ?? "";
    toast.success(`Generating receipt for ${invoice.title}`);

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Fee Slip - ${invoice.title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              *{box-sizing:border-box;margin:0;padding:0}
              body{font-family:'Plus Jakarta Sans',sans-serif;background:#F8FAFC;display:flex;justify-content:center;padding:40px 16px}
              .slip{background:#fff;border-radius:24px;max-width:600px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.08)}
              .top{background:linear-gradient(135deg,#2563EB 0%,#1d4ed8 100%);padding:36px 40px;color:#fff;position:relative}
              .top::after{content:'FEE SLIP';position:absolute;right:32px;top:50%;transform:translateY(-50%);font-size:11px;
                          font-weight:900;letter-spacing:.3em;opacity:.25;font-family:'Outfit',sans-serif}
              .top h1{font-family:'Outfit',sans-serif;font-size:22px;font-weight:900;letter-spacing:-.5px}
              .top p{font-size:11px;text-transform:uppercase;letter-spacing:.2em;margin-top:4px;opacity:.8}
              .body{padding:32px 40px}
              .row{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid #F1F5F9;font-size:13.5px}
              .row:last-of-type{border-bottom:none}
              .lbl{color:#64748B;font-weight:500}
              .val{color:#0F172A;font-weight:700;text-align:right}
              .val.big{color:#2563EB;font-size:20px;font-family:'Outfit',sans-serif}
              .stamp-wrap{display:flex;justify-content:center;margin:24px 0 8px}
              .stamp{border:2.5px solid #16A34A;color:#16A34A;font-weight:900;font-size:13px;
                     text-transform:uppercase;letter-spacing:.12em;padding:6px 22px;
                     border-radius:8px;transform:rotate(-3deg);background:rgba(22,163,74,.04);
                     font-family:'Outfit',sans-serif}
              .footer{text-align:center;font-size:11px;color:#94A3B8;padding:0 40px 32px;line-height:1.8}
              @media print{body{padding:0;background:#fff}.slip{box-shadow:none;border-radius:0}button{display:none}}
            </style>
          </head>
          <body>
            <div class="slip">
              <div class="top">
                <h1>Punjab Group of Colleges</h1>
                <p>Official Fee Payment Receipt</p>
              </div>
              <div class="body">
                <div class="row"><span class="lbl">Invoice ID</span><span class="val">${invoice.id}</span></div>
                <div class="row"><span class="lbl">Student Name</span><span class="val">${studentName}</span></div>
                ${rollNumber ? `<div class="row"><span class="lbl">Roll Number</span><span class="val">${rollNumber}</span></div>` : ""}
                <div class="row"><span class="lbl">Description</span><span class="val">${invoice.title}</span></div>
                <div class="row"><span class="lbl">Amount Paid</span><span class="val big">PKR ${Number(invoice.amount).toLocaleString()}</span></div>
                <div class="row"><span class="lbl">Payment Method</span><span class="val">${invoice.method || "Electronic Checkout"}</span></div>
                <div class="row"><span class="lbl">Due Date</span><span class="val">${invoice.due_date ?? "-"}</span></div>
                <div class="row"><span class="lbl">Paid On</span><span class="val">${invoice.paid_at ? new Date(invoice.paid_at).toLocaleString() : "-"}</span></div>
                <div class="stamp-wrap"><div class="stamp">✓ Verified Paid</div></div>
              </div>
              <div class="footer">This is a computer-generated receipt from the Punjab Colleges Student Portal.<br>No physical signature is required.</div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  // Calculated Stats
  const pendingInvoices = invoices?.filter((i) => i.status === "pending") ?? [];
  const totalOutstanding = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);

  const paidInvoices = invoices?.filter((i) => i.status === "paid") ?? [];
  const totalCollected = paidInvoices.reduce((sum, i) => sum + i.amount, 0);

  if (role === "student") {
    const student = students?.find((s) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
    const myInvoices = invoices?.filter((i) => i.student_id === student?.id) ?? [];

    return (
      <div className="space-y-8 max-w-7xl animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
              Student Registry
            </span>
            <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
              Billing & Fees
            </h1>
            <p className="text-sm text-muted-foreground font-light font-sans">
              Review outstanding tuition fee invoices and pay online securely.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Pending Dues
                  </p>
                  <p className="text-3xl font-display font-black text-amber-600 mt-2">
                    Rs.{" "}
                    {myInvoices
                      .filter((i) => i.status === "pending")
                      .reduce((s, i) => s + i.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl grid place-items-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Paid Tuition
                  </p>
                  <p className="text-3xl font-display font-black text-emerald-600 mt-2">
                    Rs.{" "}
                    {myInvoices
                      .filter((i) => i.status === "paid")
                      .reduce((s, i) => s + i.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl grid place-items-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Payment Status
                  </p>
                  <p className="text-xs font-bold text-foreground mt-2 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> 100% Encrypted Gateway
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 font-light">
                    Direct Easypaisa / JazzCash / IBAN
                  </p>
                </div>
                <div className="h-10 w-10 bg-primary/10 border border-primary/20 text-primary rounded-xl grid place-items-center">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-serif font-bold text-foreground">
              Tuition Ledger
            </CardTitle>
            <CardDescription className="text-xs font-light font-sans">
              Comprehensive statement of academic invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {myInvoices.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm font-light">
                No billing records found.
              </div>
            ) : (
              <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/45 border-b border-border/50">
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Title
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Due Date
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {myInvoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-4 font-bold text-xs text-foreground">{inv.title}</td>
                        <td className="p-4 text-xs font-medium text-foreground">
                          Rs. {inv.amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground font-light">
                          {inv.due_date}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={inv.status === "paid" ? "default" : "outline"}
                            className={`text-[9px] uppercase tracking-wider font-bold rounded-lg px-2.5 py-0.5 ${
                              inv.status === "paid"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20"
                            }`}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {inv.status === "pending" ? (
                            <Button
                              onClick={() => handlePayClick(inv)}
                              size="sm"
                              className="h-8 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
                              style={{ background: "var(--gradient-brand)" }}
                            >
                              Pay Now
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleDownloadReceipt(inv)}
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 rounded-xl text-xs font-bold border-border/80 hover:bg-secondary transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ArrowDownToLine className="h-3.5 w-3.5 text-primary" /> Receipt
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* payment gateway dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/80 rounded-3xl p-6 shadow-2xl">
            <DialogHeader className="border-b border-border/40 pb-4">
              <DialogTitle className="flex items-center gap-2 font-serif font-bold text-foreground text-lg">
                <Landmark className="h-5 w-5 text-primary" /> Secure Checkout Gateway
              </DialogTitle>
              <DialogDescription className="text-xs font-light text-muted-foreground mt-1">
                Amount to authorize:{" "}
                <span className="font-bold text-primary">
                  Rs. {selectedInvoice?.amount.toLocaleString()}
                </span>{" "}
                for {selectedInvoice?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="flex gap-2">
                {["Easypaisa", "JazzCash", "Bank"].map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={paymentGateway === method ? "default" : "outline"}
                    className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                      paymentGateway === method
                        ? "bg-primary text-white"
                        : "border-border/80 hover:bg-secondary text-muted-foreground"
                    }`}
                    onClick={() => setPaymentGateway(method as any)}
                  >
                    {method}
                  </Button>
                ))}
              </div>

              {paymentGateway !== "Bank" ? (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {paymentGateway} Mobile Account Number
                  </label>
                  <Input
                    placeholder="e.g. 03001234567"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    className="rounded-xl border border-border/80 bg-background/50 text-xs shadow-sm focus-visible:ring-primary/45 h-10"
                  />
                </div>
              ) : (
                <div className="p-4 bg-secondary/35 border border-border/60 rounded-2xl text-xs space-y-2 font-light">
                  <p className="flex justify-between border-b border-border/40 pb-1">
                    <strong className="font-medium text-foreground">Receiving Bank:</strong>{" "}
                    <span className="font-mono">Habib Bank Limited (HBL)</span>
                  </p>
                  <p className="flex justify-between border-b border-border/40 pb-1">
                    <strong className="font-medium text-foreground">Account Title:</strong>{" "}
                    <span className="font-mono">Punjab Colleges Portal</span>
                  </p>
                  <p className="flex justify-between">
                    <strong className="font-medium text-foreground">IBAN:</strong>{" "}
                    <span className="font-mono text-primary font-semibold">
                      PK89HBLA00001234567890
                    </span>
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border/40 pt-4">
              <Button
                onClick={handleProcessPayment}
                disabled={paymentLoading}
                className="w-full h-11 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer"
                style={{ background: "var(--gradient-brand)" }}
              >
                {paymentLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing Secure Payment Gateway...
                  </span>
                ) : (
                  `Authorize Payment of Rs. ${selectedInvoice?.amount.toLocaleString()}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Admin Ledger Dashboard
  return (
    <div className="space-y-8 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary block">
            Financial Operations
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
            Institutional Finance
          </h1>
          <p className="text-sm text-muted-foreground font-light font-sans">
            Generate invoices, trace pending dues, and view payment receipt logs.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardContent className="p-6 relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Total Billing Dues
              </p>
              <p className="text-3xl font-display font-black text-amber-600 mt-2">
                Rs. {totalOutstanding.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl grid place-items-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardContent className="p-6 relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Revenue Collected
              </p>
              <p className="text-3xl font-display font-black text-emerald-600 mt-2">
                Rs. {totalCollected.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl grid place-items-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardContent className="p-6 relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Collection Ratio
              </p>
              <p className="text-3xl font-display font-black text-foreground mt-2">
                {invoices && invoices.length > 0
                  ? `${Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)}%`
                  : "0%"}
              </p>
            </div>
            <div className="h-10 w-10 bg-primary/10 border border-primary/20 text-primary rounded-xl grid place-items-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice Generator Form (Admin only) */}
        {role === "admin" && (
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden h-fit">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-serif font-bold text-foreground">
                Generate Invoice
              </CardTitle>
              <CardDescription className="text-xs font-light font-sans">
                Issue tuition or sports invoice to student.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Select Student
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/40 backdrop-blur-md text-foreground transition-all duration-300"
                  >
                    <option value="" className="bg-background text-foreground">
                      -- Choose Student --
                    </option>
                    {students?.map((s) => (
                      <option key={s.id} value={s.id} className="bg-background text-foreground">
                        {s.full_name} ({s.roll_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Invoice Description
                  </label>
                  <Input
                    placeholder="Tuition fee - Sem 2"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="rounded-xl border border-border/80 bg-background/50 text-xs shadow-sm focus-visible:ring-primary/45 h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Fee Amount (PKR)
                  </label>
                  <Input
                    type="number"
                    placeholder="85000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="rounded-xl border border-border/80 bg-background/50 text-xs shadow-sm focus-visible:ring-primary/45 h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="rounded-xl border border-border/80 bg-background/50 text-xs shadow-sm focus-visible:ring-primary/45 h-10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="w-full h-10 rounded-xl text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-primary/10 active:scale-95 cursor-pointer mt-2"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {createInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Institutional Ledger Log */}
        <Card className="lg:col-span-2 bg-card/45 backdrop-blur-xl border border-border/80 rounded-3xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4">
            <div>
              <CardTitle className="text-base font-serif font-bold text-foreground">
                Institutional Fee Ledger
              </CardTitle>
              <CardDescription className="text-xs font-light">
                Consolidated ledger log of issued student invoices.
              </CardDescription>
            </div>
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ledger..."
                className="pl-10 rounded-xl border border-border/80 bg-background/40 focus-visible:ring-primary/45 h-10 text-xs shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {invoices?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm font-light font-sans">
                No institutional records.
              </div>
            ) : (
              <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/45 border-b border-border/50">
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Student
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Title
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {invoices
                      ?.filter((i) => {
                        const s = students?.find((st) => st.id === i.student_id);
                        const matchStudent = s
                          ? s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                          : false;
                        return (
                          i.title.toLowerCase().includes(searchTerm.toLowerCase()) || matchStudent
                        );
                      })
                      .map((inv: any) => {
                        const s = students?.find((st) => st.id === inv.student_id);
                        return (
                          <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-xs text-foreground">
                                {s?.full_name || "Unknown student"}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {s?.roll_number}
                              </p>
                            </td>
                            <td className="p-4 text-xs text-muted-foreground font-light">
                              {inv.title}
                            </td>
                            <td className="p-4 text-xs font-bold text-foreground">
                              PKR {inv.amount.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={inv.status === "paid" ? "default" : "outline"}
                                className={`text-[9px] uppercase tracking-wider font-bold rounded-lg px-2.5 py-0.5 ${
                                  inv.status === "paid"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                                }`}
                              >
                                {inv.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-xs text-muted-foreground capitalize font-light">
                              {inv.method || "—"}
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
      </div>
    </div>
  );
}
