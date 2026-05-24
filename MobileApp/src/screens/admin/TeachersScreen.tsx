import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react-native';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function TeachersScreen() {
  const qc = useQueryClient();
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => dataApi.getAll('departments') });
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = teachers.filter((t: any) =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editId) return dataApi.update('teachers', editId, form);
      return dataApi.create('teachers', form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setModalVisible(false); resetForm(); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => dataApi.remove('teachers', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });

  const resetForm = () => { setForm({ full_name: '', email: '', phone: '' }); setEditId(null); };

  const openEdit = (t: any) => {
    setForm({ full_name: t.full_name ?? '', email: t.email ?? '', phone: t.phone ?? '' });
    setEditId(t.id);
    setModalVisible(true);
  };

  const getDeptName = (id: string) => departments.find((d: any) => d.id === id)?.name ?? '';

  const renderTeacher = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onLongPress={() => {
      Alert.alert('Actions', item.full_name, [
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
        <Text style={styles.cardSub}>{item.email}</Text>
        {item.department_id && <Badge label={getDeptName(item.department_id)} variant="muted" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.heading}>Teachers</Text>
        <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.searchBox}>
        <Search size={16} color={colors.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Search teachers..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
      </View>
      <FlatList data={filtered} keyExtractor={(item: any) => item.id} renderItem={renderTeacher} contentContainerStyle={styles.list} ListEmptyComponent={<EmptyState title="No teachers found" />} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Teacher' : 'Add Teacher'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {['full_name', 'email', 'phone'].map((key) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{key.replace('_', ' ').toUpperCase()}</Text>
                <TextInput style={styles.fieldInput} value={(form as any)[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} placeholderTextColor={colors.textMuted} keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'} />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveMut.mutate()}>
              <Text style={styles.saveBtnText}>{editId ? 'Update' : 'Add Teacher'}</Text>
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
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.success },
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
