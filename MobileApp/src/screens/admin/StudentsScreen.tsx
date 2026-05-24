import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Search, X } from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function StudentsScreen() {
  const qc = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => dataApi.getAll('departments') });
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', roll_number: '', phone: '', semester: '1', degree: 'BSCS' });
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = students.filter((s: any) =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editId) {
        return dataApi.update('students', editId, form);
      }
      return dataApi.create('students', form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => dataApi.remove('students', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  const resetForm = () => {
    setForm({ full_name: '', email: '', roll_number: '', phone: '', semester: '1', degree: 'BSCS' });
    setEditId(null);
  };

  const openEdit = (s: any) => {
    setForm({ full_name: s.full_name ?? '', email: s.email ?? '', roll_number: s.roll_number ?? '', phone: s.phone ?? '', semester: String(s.semester ?? '1'), degree: s.degree ?? 'BSCS' });
    setEditId(s.id);
    setModalVisible(true);
  };

  const getDeptName = (id: string) => departments.find((d: any) => d.id === id)?.name ?? '';

  const renderStudent = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onLongPress={() => {
      Alert.alert('Actions', `${item.full_name}`, [
        { text: 'Edit', onPress: () => openEdit(item) },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(item.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.full_name ?? '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.full_name}</Text>
        <Text style={styles.cardSub}>{item.roll_number} · Sem {item.semester}</Text>
        {item.department_id && <Badge label={getDeptName(item.department_id)} variant="muted" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.heading}>Students</Text>
        <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color={colors.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Search students..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No students found" />}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Student' : 'Add Student'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {['full_name', 'email', 'roll_number', 'phone', 'semester', 'degree'].map((key) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{key.replace('_', ' ').toUpperCase()}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={key === 'semester' ? 'numeric' : key === 'email' ? 'email-address' : 'default'}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveMut.mutate()}>
              <Text style={styles.saveBtnText}>{editId ? 'Update' : 'Add Student'}</Text>
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
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
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
});
