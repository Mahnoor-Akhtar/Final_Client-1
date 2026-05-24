import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Building2 } from 'lucide-react-native';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function DepartmentsScreen() {
  const qc = useQueryClient();
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => dataApi.getAll('departments') });
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editId) return dataApi.update('departments', editId, form);
      return dataApi.create('departments', form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setModalVisible(false); setForm({ name: '', code: '' }); setEditId(null); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onLongPress={() => {
      Alert.alert('Actions', item.name, [
        { text: 'Edit', onPress: () => { setForm({ name: item.name ?? '', code: item.code ?? '' }); setEditId(item.id); setModalVisible(true); } },
        { text: 'Delete', style: 'destructive', onPress: () => dataApi.remove('departments', item.id).then(() => qc.invalidateQueries({ queryKey: ['departments'] })) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }}>
      <View style={styles.iconBox}><Building2 size={20} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSub}>{item.code ?? ''}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.heading}>Departments</Text>
        <TouchableOpacity style={styles.fab} onPress={() => { setForm({ name: '', code: '' }); setEditId(null); setModalVisible(true); }}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
      <FlatList data={departments} keyExtractor={(item: any) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} ListEmptyComponent={<EmptyState title="No departments" />} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit' : 'Add'} Department</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {['name', 'code'].map((k) => (
              <View key={k} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{k.toUpperCase()}</Text>
                <TextInput style={styles.fieldInput} value={(form as any)[k]} onChangeText={(v) => setForm({ ...form, [k]: v })} placeholderTextColor={colors.textMuted} />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveMut.mutate()}>
              <Text style={styles.saveBtnText}>{editId ? 'Update' : 'Add'}</Text>
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
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  cardSub: { fontSize: fontSize.sm, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs },
  fieldInput: { backgroundColor: colors.background, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, fontSize: fontSize.md, color: colors.textPrimary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
});
