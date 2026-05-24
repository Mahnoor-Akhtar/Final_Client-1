import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Platform, Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronDown, Check, X, CreditCard,
  Smartphone, Landmark, Receipt, Download,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const TABS = ['all', 'paid', 'pending', 'overdue'] as const;
const PAYMENT_METHODS = [
  { key: 'Easypaisa', label: 'Easypaisa', icon: Smartphone, color: '#00B050' },
  { key: 'JazzCash',  label: 'JazzCash',  icon: Smartphone, color: '#C8102E' },
  { key: 'Bank',      label: 'Bank Transfer', icon: Landmark, color: '#2563EB' },
] as const;

type PayMethod = 'Easypaisa' | 'JazzCash' | 'Bank';

export default function FeesScreen() {
  const { session, role } = useAuth();
  const qc = useQueryClient();

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: fees = [] }     = useQuery({ queryKey: ['fees'],     queryFn: () => dataApi.getAll('fees') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<string>('all');

  // Admin: generate invoice
  const [generateOpen,     setGenerateOpen]     = useState(false);
  const [studentPickerOpen,setStudentPickerOpen] = useState(false);
  const [selectedStudentId,setSelectedStudentId] = useState('');
  const [feeTitle,         setFeeTitle]          = useState('');
  const [feeAmount,        setFeeAmount]         = useState('');
  const [dueDate,          setDueDate]           = useState('');

  // Student: pay fee
  const [payOpen,       setPayOpen]       = useState(false);
  const [payingFee,     setPayingFee]     = useState<any>(null);
  const [payMethod,     setPayMethod]     = useState<PayMethod>('Easypaisa');
  const [walletNumber,  setWalletNumber]  = useState('');
  const [payProcessing, setPayProcessing] = useState(false);

  // Slip preview
  const [slipOpen,  setSlipOpen]  = useState(false);
  const [slipFee,   setSlipFee]   = useState<any>(null);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getFutureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const myStudent = students.find((s: any) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
  const getStudentName = (id: string) => students.find((s: any) => s.id === id)?.full_name ?? '';
  const statusVariant  = (s: string) => s === 'paid' ? 'success' : s === 'overdue' ? 'accent' : 'warning';

  const filtered = useMemo(() => {
    let list = fees;
    if (role === 'student' && myStudent) list = list.filter((f: any) => f.student_id === myStudent.id);
    if (tab !== 'all') list = list.filter((f: any) => f.status === tab);
    return list;
  }, [fees, tab, role, myStudent]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  // Admin: create invoice
  const createInvoiceMut = useMutation({
    mutationFn: (payload: { student_id: string; title: string; amount: number; due_date: string }) =>
      dataApi.create('fees', { ...payload, status: 'pending' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      setGenerateOpen(false);
      setSelectedStudentId(''); setFeeTitle(''); setFeeAmount('');
    },
  });

  // Student: pay invoice
  const payInvoiceMut = useMutation({
    mutationFn: (payload: { id: string; method: string }) =>
      dataApi.update('fees', payload.id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        method: payload.method,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      setPayOpen(false);
      setPayProcessing(false);
      // open slip immediately after payment
      const paid = fees.find((f: any) => f.id === vars.id);
      if (paid) openSlip({ ...paid, status: 'paid', method: vars.method, paid_at: new Date().toISOString() });
    },
    onError: () => { setPayProcessing(false); },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleGenerateInvoice = () => {
    if (!selectedStudentId || !feeTitle || !feeAmount || !dueDate) return;
    const amt = parseFloat(feeAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return;
    createInvoiceMut.mutate({ student_id: selectedStudentId, title: feeTitle, amount: amt, due_date: dueDate });
  };

  const handlePayNow = (fee: any) => {
    setPayingFee(fee);
    setWalletNumber('');
    setPayMethod('Easypaisa');
    setPayOpen(true);
  };

  const handleProcessPayment = () => {
    if (!payingFee) return;
    if (payMethod !== 'Bank' && !walletNumber.trim()) return;
    setPayProcessing(true);
    // simulate 1.5 s gateway delay
    setTimeout(() => {
      payInvoiceMut.mutate({ id: payingFee.id, method: payMethod });
    }, 1500);
  };

  // ─── Slip ─────────────────────────────────────────────────────────────────

  const openSlip = (fee: any) => {
    if (Platform.OS === 'web') {
      const studentName = getStudentName(fee.student_id);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(buildSlipHtml(fee, studentName));
        win.document.close();
      }
      return;
    }
    setSlipFee(fee);
    setSlipOpen(true);
  };

  const buildSlipHtml = (fee: any, studentName: string) => `
    <html>
      <head>
        <title>Fee Slip - ${fee.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'Plus Jakarta Sans',sans-serif;background:#F8FAFC;display:flex;justify-content:center;padding:40px 16px}
          .slip{background:#fff;border-radius:24px;max-width:600px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.08)}
          .top{background:linear-gradient(135deg,#2563EB 0%,#1d4ed8 100%);padding:36px 40px;color:#fff}
          .top h1{font-family:'Outfit',sans-serif;font-size:22px;font-weight:900;letter-spacing:-.5px}
          .top p{font-size:11px;text-transform:uppercase;letter-spacing:.2em;margin-top:4px;opacity:.8}
          .body{padding:32px 40px}
          .row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F1F5F9;font-size:13.5px}
          .row:last-child{border-bottom:none}
          .row .lbl{color:#64748B;font-weight:500}
          .row .val{color:#0F172A;font-weight:700;text-align:right}
          .amount-row .val{color:#2563EB;font-size:20px;font-family:'Outfit',sans-serif}
          .stamp-wrap{display:flex;justify-content:center;margin:24px 0 8px}
          .stamp{border:2.5px solid #16A34A;color:#16A34A;font-weight:900;font-size:13px;text-transform:uppercase;
                 letter-spacing:.12em;padding:6px 22px;border-radius:8px;transform:rotate(-3deg);
                 background:rgba(22,163,74,.04);font-family:'Outfit',sans-serif}
          .footer{text-align:center;font-size:11px;color:#94A3B8;padding:0 40px 32px;line-height:1.8}
          @media print{body{padding:0}.slip{box-shadow:none;border-radius:0}}
        </style>
      </head>
      <body>
        <div class="slip">
          <div class="top">
            <h1>Punjab Group of Colleges</h1>
            <p>Official Fee Payment Receipt</p>
          </div>
          <div class="body">
            <div class="row"><span class="lbl">Invoice ID</span><span class="val">${fee.id}</span></div>
            <div class="row"><span class="lbl">Student Name</span><span class="val">${studentName || 'N/A'}</span></div>
            <div class="row"><span class="lbl">Description</span><span class="val">${fee.title ?? '-'}</span></div>
            <div class="row amount-row"><span class="lbl">Amount Paid</span><span class="val">PKR ${Number(fee.amount).toLocaleString()}</span></div>
            <div class="row"><span class="lbl">Payment Method</span><span class="val">${fee.method ?? 'N/A'}</span></div>
            <div class="row"><span class="lbl">Due Date</span><span class="val">${fee.due_date ?? '-'}</span></div>
            <div class="row"><span class="lbl">Paid On</span><span class="val">${fee.paid_at ? new Date(fee.paid_at).toLocaleString() : '-'}</span></div>
            <div class="stamp-wrap"><div class="stamp">✓ Verified Paid</div></div>
          </div>
          <div class="footer">This is a computer-generated receipt.<br>No physical signature is required.</div>
        </div>
        <script>window.print();</script>
      </body>
    </html>`;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper scroll={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Fees &amp; Payments</Text>
        </View>
        {role === 'admin' && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => { setDueDate(getFutureDate(7)); setGenerateOpen(true); }}
          >
            <Plus size={16} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.headerBtnText}>Generate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <FlatList
        horizontal data={TABS} keyExtractor={(t) => t}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        renderItem={({ item: t }) => (
          <TouchableOpacity style={[styles.tabChip, tab === t && styles.tabChipActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Fee Cards */}
      <FlatList
        data={filtered}
        keyExtractor={(item: any, i) => item.id ?? String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No fee records" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                {role === 'admin' && (
                  <Text style={styles.studentLabel}>{getStudentName(item.student_id)}</Text>
                )}
                <Text style={styles.amount}>Rs. {Number(item.amount ?? 0).toLocaleString()}</Text>
                <Text style={styles.meta}>{item.title ?? '-'}</Text>
                <Text style={styles.meta}>Due: {item.due_date ?? '-'}</Text>
                {item.method && <Text style={styles.meta}>Via: {item.method}</Text>}
              </View>
              <Badge label={item.status ?? 'pending'} variant={statusVariant(item.status ?? 'pending')} />
            </View>

            {/* Student action buttons */}
            {role === 'student' && (
              <View style={styles.actionRow}>
                {item.status !== 'paid' && (
                  <TouchableOpacity style={styles.payBtn} onPress={() => handlePayNow(item)}>
                    <CreditCard size={14} color={colors.white} style={{ marginRight: 5 }} />
                    <Text style={styles.payBtnText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'paid' && (
                  <TouchableOpacity style={styles.slipBtn} onPress={() => openSlip(item)}>
                    <Receipt size={14} color={colors.primary} style={{ marginRight: 5 }} />
                    <Text style={styles.slipBtnText}>View Slip</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      />

      {/* ─── ADMIN: Generate Invoice Modal ─────────────────────────── */}
      <Modal visible={generateOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setGenerateOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Invoice</Text>
              <TouchableOpacity onPress={() => setGenerateOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.label}>SELECT STUDENT</Text>
              <TouchableOpacity style={styles.formSelector} onPress={() => setStudentPickerOpen(true)}>
                <Text style={styles.formSelectorText}>
                  {selectedStudentId ? students.find((s: any) => s.id === selectedStudentId)?.full_name : 'Choose Student…'}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>DESCRIPTION / TITLE</Text>
              <TextInput style={styles.input} value={feeTitle} onChangeText={setFeeTitle}
                placeholder="e.g. Tuition fee – Sem 2" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>AMOUNT (PKR)</Text>
              <TextInput style={styles.input} value={feeAmount} onChangeText={setFeeAmount}
                placeholder="e.g. 85000" keyboardType="numeric" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>DUE DATE (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate}
                placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

              <View style={styles.quickDateRow}>
                <TouchableOpacity style={styles.quickDateBtn} onPress={() => setDueDate(getFutureDate(7))}>
                  <Text style={styles.quickDateBtnText}>In 7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickDateBtn} onPress={() => setDueDate(getFutureDate(30))}>
                  <Text style={styles.quickDateBtnText}>In 30 Days</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleGenerateInvoice} disabled={createInvoiceMut.isPending}>
                <Text style={styles.submitBtnText}>
                  {createInvoiceMut.isPending ? 'Generating…' : 'Generate Invoice'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Student Picker */}
      <Modal visible={studentPickerOpen} animationType="fade" transparent>
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setStudentPickerOpen(false)} />
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Student</Text>
              <TouchableOpacity onPress={() => setStudentPickerOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={students} keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => {
                const isSelected = selectedStudentId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => { setSelectedStudentId(item.id); setStudentPickerOpen(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemCode, isSelected && styles.pickerItemTextActive]}>{item.roll_number}</Text>
                      <Text style={[styles.pickerItemTitle, isSelected && styles.pickerItemTextActive]}>{item.full_name}</Text>
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ─── STUDENT: Pay Now Modal ─────────────────────────────────── */}
      <Modal visible={payOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !payProcessing && setPayOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay Invoice</Text>
              <TouchableOpacity onPress={() => !payProcessing && setPayOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Invoice summary */}
              <View style={styles.invoiceSummary}>
                <Text style={styles.invoiceSummaryTitle}>{payingFee?.title ?? '-'}</Text>
                <Text style={styles.invoiceSummaryAmount}>Rs. {Number(payingFee?.amount ?? 0).toLocaleString()}</Text>
                <Text style={styles.invoiceSummaryDue}>Due: {payingFee?.due_date ?? '-'}</Text>
              </View>

              {/* Payment method picker */}
              <Text style={styles.label}>SELECT PAYMENT METHOD</Text>
              <View style={styles.methodRow}>
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = payMethod === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.methodCard, active && { borderColor: m.color, backgroundColor: m.color + '12' }]}
                      onPress={() => setPayMethod(m.key)}
                    >
                      <Icon size={22} color={active ? m.color : colors.textMuted} />
                      <Text style={[styles.methodLabel, active && { color: m.color }]}>{m.label}</Text>
                      {active && (
                        <View style={[styles.methodCheck, { backgroundColor: m.color }]}>
                          <Check size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Wallet/account number (not for bank) */}
              {payMethod !== 'Bank' && (
                <>
                  <Text style={styles.label}>{payMethod.toUpperCase()} MOBILE NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    value={walletNumber}
                    onChangeText={setWalletNumber}
                    placeholder="e.g. 03001234567"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textMuted}
                    editable={!payProcessing}
                  />
                </>
              )}
              {payMethod === 'Bank' && (
                <View style={styles.bankInfo}>
                  <Landmark size={20} color={colors.primary} />
                  <Text style={styles.bankInfoText}>
                    Bank transfers are processed manually within 1-2 business days.
                    You will receive a confirmation once verified.
                  </Text>
                </View>
              )}

              {/* Pay button */}
              <TouchableOpacity
                style={[styles.submitBtn, payProcessing && { opacity: 0.7 }]}
                onPress={handleProcessPayment}
                disabled={payProcessing}
              >
                {payProcessing ? (
                  <Text style={styles.submitBtnText}>Processing…</Text>
                ) : (
                  <Text style={styles.submitBtnText}>
                    Authorize Payment · Rs. {Number(payingFee?.amount ?? 0).toLocaleString()}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.secureNote}>🔒 Secure encrypted payment gateway</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── STUDENT: Fee Slip (Native only) ──────────────────────── */}
      <Modal visible={slipOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSlipOpen(false)} />
          <View style={[styles.modalContent, { minHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fee Payment Slip</Text>
              <TouchableOpacity onPress={() => setSlipOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {slipFee && (
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Slip header */}
                <View style={styles.slipHeader}>
                  <Text style={styles.slipCollegeName}>Punjab Group of Colleges</Text>
                  <Text style={styles.slipSubtitle}>OFFICIAL PAYMENT RECEIPT</Text>
                </View>

                {/* Slip rows */}
                {[
                  ['Invoice ID',      slipFee.id],
                  ['Student',         getStudentName(slipFee.student_id) || 'N/A'],
                  ['Description',     slipFee.title ?? '-'],
                  ['Amount Paid',     `PKR ${Number(slipFee.amount).toLocaleString()}`],
                  ['Payment Method',  slipFee.method ?? '-'],
                  ['Due Date',        slipFee.due_date ?? '-'],
                  ['Paid On',         slipFee.paid_at ? new Date(slipFee.paid_at).toLocaleString() : '-'],
                ].map(([lbl, val]) => (
                  <View key={lbl} style={styles.slipRow}>
                    <Text style={styles.slipLabel}>{lbl}</Text>
                    <Text style={[styles.slipValue, lbl === 'Amount Paid' && styles.slipAmountValue]}>{val}</Text>
                  </View>
                ))}

                {/* Paid stamp */}
                <View style={styles.stampWrap}>
                  <View style={styles.stamp}>
                    <Text style={styles.stampText}>✓ VERIFIED PAID</Text>
                  </View>
                </View>

                <Text style={styles.slipFooter}>
                  This is a computer-generated receipt.{'\n'}No physical signature is required.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────────────────────
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary },
  headerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  headerBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },

  tabRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, alignItems: 'center' },
  tabChip: { paddingHorizontal: spacing.md, height: 32, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  tabChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },

  list: { padding: spacing.lg, paddingBottom: 100 },

  // ── Fee Card ────────────────────────────────────────────────────────────────
  card: { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  studentLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  amount: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },

  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.sm },
  payBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },

  slipBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary + '40' },
  slipBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },

  // ── Modals ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '90%', minHeight: '45%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },

  // ── Form ────────────────────────────────────────────────────────────────────
  label: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.textPrimary, backgroundColor: colors.background, marginBottom: spacing.xs },
  formSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.xs },
  formSelectorText: { fontSize: fontSize.md, color: colors.textPrimary },
  quickDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, marginBottom: spacing.md, gap: spacing.sm },
  quickDateBtn: { flex: 1, paddingVertical: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, alignItems: 'center' },
  quickDateBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  submitBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },

  // ── Invoice summary (pay modal) ──────────────────────────────────────────────
  invoiceSummary: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.primary + '30' },
  invoiceSummaryTitle: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  invoiceSummaryAmount: { fontSize: 28, fontWeight: '900', color: colors.primary },
  invoiceSummaryDue: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // ── Payment methods ──────────────────────────────────────────────────────────
  methodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  methodCard: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background, position: 'relative', gap: 6 },
  methodLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  methodCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  bankInfo: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.xs, borderWidth: 1, borderColor: colors.primary + '30', alignItems: 'flex-start' },
  bankInfoText: { flex: 1, fontSize: fontSize.sm, color: colors.primary, lineHeight: 20 },

  secureNote: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.md },

  // ── Picker ──────────────────────────────────────────────────────────────────
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerModalContent: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl, width: '85%', maxHeight: '60%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  pickerItemActive: { backgroundColor: colors.primaryLight },
  pickerItemCode: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  pickerItemTitle: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 2 },
  pickerItemTextActive: { color: colors.primary },

  // ── Slip (native) ────────────────────────────────────────────────────────────
  slipHeader: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg },
  slipCollegeName: { fontSize: fontSize.lg, fontWeight: '900', color: colors.white, letterSpacing: -0.5 },
  slipSubtitle: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' },
  slipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  slipLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '500', flex: 1 },
  slipValue: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '700', flex: 1.4, textAlign: 'right' },
  slipAmountValue: { color: colors.primary, fontSize: fontSize.lg },
  stampWrap: { alignItems: 'center', marginVertical: spacing.xl },
  stamp: { borderWidth: 2.5, borderColor: colors.success, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, transform: [{ rotate: '-3deg' }] },
  stampText: { color: colors.success, fontWeight: '900', fontSize: fontSize.sm, letterSpacing: 2 },
  slipFooter: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 20, marginTop: spacing.xs },
});
