import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, UserPlus } from 'lucide-react-native';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function CoursesScreen() {
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [form, setForm] = useState({ title: '', code: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Assignment states
  const [assignType, setAssignType] = useState<'student' | 'teacher'>('student');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  const filtered = courses.filter((c: any) =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const getTeacherName = (id: string) => teachers.find((t: any) => t.id === id)?.full_name ?? 'Unassigned';

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editId) return dataApi.update('courses', editId, form);
      return dataApi.create('courses', form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setModalVisible(false); setForm({ title: '', code: '' }); setEditId(null); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const assignMut = useMutation({
    mutationFn: async () => {
      if (selectedStudents.length === 0 || selectedCourses.length === 0) throw new Error('Select courses and students');
      await Promise.all(selectedStudents.map(async (sid) => {
        const student = students.find((s: any) => s.id === sid);
        if (!student) return;
        const current = Array.isArray(student.courses) ? student.courses : [];
        const updated = Array.from(new Set([...current, ...selectedCourses]));
        return dataApi.update('students', sid, { courses: updated });
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      Alert.alert('Success', 'Courses assigned to students!');
      setAssignModal(false);
      setSelectedCourses([]);
      setSelectedStudents([]);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const assignTeacherMut = useMutation({
    mutationFn: async () => {
      if (!selectedTeacher || selectedCourses.length === 0) throw new Error('Select courses and a teacher');
      await Promise.all(selectedCourses.map(async (cid) => {
        return dataApi.update('courses', cid, { teacher_id: selectedTeacher });
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      Alert.alert('Success', 'Courses assigned to teacher!');
      setAssignModal(false);
      setSelectedCourses([]);
      setSelectedTeacher(null);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const toggleSelect = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  };

  const renderCourse = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onLongPress={() => {
      Alert.alert('Actions', item.title, [
        { text: 'Edit', onPress: () => { setForm({ title: item.title, code: item.code }); setEditId(item.id); setModalVisible(true); } },
        { text: 'Delete', style: 'destructive', onPress: () => dataApi.remove('courses', item.id).then(() => qc.invalidateQueries({ queryKey: ['courses'] })) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }}>
      <Badge label={item.code ?? ''} variant="primary" />
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSub}>Lecturer: {getTeacherName(item.teacher_id)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.heading}>Courses</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity style={[styles.fab, { backgroundColor: colors.success }]} onPress={() => setAssignModal(true)}>
            <UserPlus size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => { setForm({ title: '', code: '' }); setEditId(null); setModalVisible(true); }}>
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color={colors.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Search courses..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <FlatList data={filtered} keyExtractor={(item: any) => item.id} renderItem={renderCourse} contentContainerStyle={styles.list} ListEmptyComponent={<EmptyState title="No courses found" />} />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Course' : 'Add Course'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {['title', 'code'].map((key) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{key.toUpperCase()}</Text>
                <TextInput style={styles.fieldInput} value={(form as any)[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} placeholderTextColor={colors.textMuted} />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveMut.mutate()}>
              <Text style={styles.saveBtnText}>{editId ? 'Update' : 'Add Course'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={assignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Courses</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>

            {/* Toggle Segment */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity style={[styles.toggleBtn, assignType === 'student' && styles.toggleBtnActive]} onPress={() => setAssignType('student')}>
                <Text style={[styles.toggleText, assignType === 'student' && styles.toggleTextActive]}>Students</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, assignType === 'teacher' && styles.toggleBtnActive]} onPress={() => setAssignType('teacher')}>
                <Text style={[styles.toggleText, assignType === 'teacher' && styles.toggleTextActive]}>Teacher</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.sectionLabel}>SELECT COURSES</Text>
              {courses.map((c: any) => (
                <TouchableOpacity key={c.id} style={[styles.checkRow, selectedCourses.includes(c.id) && styles.checkRowActive]} onPress={() => toggleSelect(c.id, selectedCourses, setSelectedCourses)}>
                  <View style={[styles.checkbox, selectedCourses.includes(c.id) && styles.checkboxActive]} />
                  <Text style={styles.checkLabel}>{c.code} — {c.title}</Text>
                </TouchableOpacity>
              ))}
              
              {assignType === 'student' ? (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>SELECT STUDENTS</Text>
                  {students.map((s: any) => (
                    <TouchableOpacity key={s.id} style={[styles.checkRow, selectedStudents.includes(s.id) && styles.checkRowActive]} onPress={() => toggleSelect(s.id, selectedStudents, setSelectedStudents)}>
                      <View style={[styles.checkbox, selectedStudents.includes(s.id) && styles.checkboxActive]} />
                      <Text style={styles.checkLabel}>{s.full_name} · {s.roll_number}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>SELECT TEACHER</Text>
                  {teachers.map((t: any) => (
                    <TouchableOpacity key={t.id} style={[styles.checkRow, selectedTeacher === t.id && styles.checkRowActive]} onPress={() => setSelectedTeacher(t.id)}>
                      <View style={[styles.checkbox, styles.radiobox, selectedTeacher === t.id && styles.checkboxActive]} />
                      <Text style={styles.checkLabel}>{t.full_name}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.success }]} 
              onPress={() => assignType === 'student' ? assignMut.mutate() : assignTeacherMut.mutate()}
            >
              <Text style={styles.saveBtnText}>
                {assignType === 'student' ? 'Assign to Students' : 'Assign to Teacher'}
              </Text>
            </TouchableOpacity>
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
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: spacing.lg, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, fontSize: fontSize.md, color: colors.textPrimary },
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.xs },
  cardSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xxl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs },
  fieldInput: { backgroundColor: colors.background, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, fontSize: fontSize.md, color: colors.textPrimary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, marginBottom: 4 },
  checkRowActive: { backgroundColor: colors.primaryLight },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.border, marginRight: spacing.md },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: fontSize.md, color: colors.textPrimary },
  toggleContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: borderRadius.md, padding: 4, marginBottom: spacing.md },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm },
  toggleBtnActive: { backgroundColor: colors.card, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  toggleText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  toggleTextActive: { color: colors.primary },
  radiobox: { borderRadius: 10 },
});
