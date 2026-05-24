import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, MessageSquare } from 'lucide-react-native';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { getComplaintReply, getComplaintTitle, getTeacherComplaints, getTeacherCourseIds, getTeacherProfile } from '../../lib/teacherData';

const TABS = ['all', 'pending', 'in_progress', 'resolved'] as const;

export default function ComplaintsScreen() {
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const { data: complaints = [] } = useQuery({ queryKey: ['complaints'], queryFn: () => dataApi.getAll('complaints') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const [tab, setTab] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: '', teacher_id: '' });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [replyModal, setReplyModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [reply, setReply] = useState('');

  const myStudent = students.find((s: any) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
  const myTeacher = getTeacherProfile(teachers, session?.user?.email, session?.user?.id);
  const myTeacherCourseIds = useMemo(() => getTeacherCourseIds(courses, myTeacher?.id), [courses, myTeacher]);

  const filtered = useMemo(() => {
    let list = complaints;
    if (role === 'student' && myStudent) list = list.filter((c: any) => c.student_id === myStudent.id);
    if (role === 'teacher' && myTeacher) list = getTeacherComplaints(list, students, myTeacherCourseIds, myTeacher.id);
    if (tab !== 'all') list = list.filter((c: any) => c.status === tab);
    return list;
  }, [complaints, tab, role, myStudent, myTeacher, students, myTeacherCourseIds]);

  const getStudentName = (id: string) => students.find((s: any) => s.id === id)?.full_name ?? '';
  const getTeacherName = (id: string) => teachers.find((t: any) => t.id === id)?.full_name ?? 'Select teacher...';
  const statusVariant = (s: string) => s === 'resolved' ? 'success' : s === 'in_progress' ? 'warning' : 'muted';

  const createMut = useMutation({
    mutationFn: () => dataApi.create('complaints', { title: form.subject, category: form.category, description: form.description, teacher_id: form.teacher_id || undefined, student_id: myStudent?.id, status: 'pending' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); setModalVisible(false); setForm({ subject: '', description: '', category: '', teacher_id: '' }); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const replyMut = useMutation({
    mutationFn: () => dataApi.update('complaints', replyTarget.id, { reply, status: 'resolved' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); setReplyModal(false); },
  });

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.heading}>Complaints</Text>
        {role === 'student' && (
          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal data={TABS as any} keyExtractor={(t: string) => t} showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        renderItem={({ item: t }: { item: string }) => (
          <TouchableOpacity style={[styles.tabChip, tab === t && styles.tabChipActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item: any, i) => item.id ?? String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No complaints" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => {
            if (role !== 'student') { setReplyTarget(item); setReply(getComplaintReply(item) ?? ''); setReplyModal(true); }
          }}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{getComplaintTitle(item)}</Text>
              <Badge label={item.status ?? 'pending'} variant={statusVariant(item.status ?? 'pending')} />
            </View>
            {role !== 'student' && <Text style={styles.studentLabel}>{getStudentName(item.student_id)}</Text>}
            <Text style={styles.meta} numberOfLines={2}>{item.description}</Text>
            {!!getComplaintReply(item) && <Text style={styles.replyText}>Reply: {getComplaintReply(item)}</Text>}
          </TouchableOpacity>
        )}
      />

      {/* New complaint modal (student) */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Complaint</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {['subject', 'category', 'description'].map((k) => (
              <View key={k} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{k.toUpperCase()}</Text>
                <TextInput
                  style={[styles.fieldInput, k === 'description' && { height: 100, textAlignVertical: 'top' }]}
                  value={(form as any)[k]}
                  onChangeText={(v) => setForm({ ...form, [k]: v })}
                  multiline={k === 'description'}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TEACHER</Text>
              <TouchableOpacity style={styles.fieldInput} onPress={() => setPickerVisible(true)}>
                <Text style={{ color: form.teacher_id ? colors.textPrimary : colors.textMuted }}>{getTeacherName(form.teacher_id)}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => createMut.mutate()}>
              <Text style={styles.saveBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Teacher picker modal */}
      <Modal visible={pickerVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerVisible(false)} />
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <Text style={styles.modalTitle}>Select Teacher</Text>
            <FlatList
              data={teachers}
              keyExtractor={(t: any) => t.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => { setForm({ ...form, teacher_id: item.id }); setPickerVisible(false); }}>
                  <Text style={{ color: colors.textPrimary, fontSize: fontSize.md }}>{item.full_name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Reply modal (admin/teacher) */}
      <Modal visible={replyModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setReplyModal(false)} 
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {replyTarget?.status === 'resolved' ? 'Complaint Resolution' : 'Reply to Complaint'}
            </Text>
            <Text style={styles.meta}>{getComplaintTitle(replyTarget)}</Text>
            
            {replyTarget?.status === 'resolved' ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.fieldLabel}>ADMIN RESOLUTION</Text>
                <View style={styles.resolvedBox}>
                  <Text style={styles.resolvedText}>{getComplaintReply(replyTarget) || 'No reply text'}</Text>
                </View>
              </View>
            ) : (
              <TextInput 
                style={[styles.fieldInput, { height: 100, textAlignVertical: 'top', marginTop: spacing.md }]} 
                value={reply} 
                onChangeText={setReply} 
                multiline 
                placeholderTextColor={colors.textMuted} 
                placeholder="Type your reply..." 
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReplyModal(false)}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              {replyTarget?.status !== 'resolved' && (
                <TouchableOpacity style={styles.saveBtn} onPress={() => replyMut.mutate()}>
                  <Text style={styles.saveBtnText}>Send & Resolve</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary },
  fab: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tabRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm },
  tabChip: { 
    paddingHorizontal: spacing.md, 
    height: 32, 
    borderRadius: borderRadius.sm, 
    borderWidth: 1, 
    borderColor: colors.border, 
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  studentLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary, marginTop: 2 },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  replyText: { fontSize: fontSize.sm, color: colors.success, marginTop: spacing.xs, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xxl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs },
  fieldInput: { backgroundColor: colors.background, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, fontSize: fontSize.md, color: colors.textPrimary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  resolvedBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  resolvedText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  pickerItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
