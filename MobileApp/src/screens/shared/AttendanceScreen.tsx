import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ChevronDown, Check, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function AttendanceScreen() {
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => dataApi.getAll('attendance') });

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [roll, setRoll] = useState<Record<string, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dateInputOpen, setDateInputOpen] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [loadedKey, setLoadedKey] = useState('');

  const getStudentCourses = (s: any): string[] => {
    if (!s?.courses) return [];
    if (Array.isArray(s.courses)) return s.courses;
    if (typeof s.courses === 'string') {
      try {
        const parsed = JSON.parse(s.courses);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const changeDate = (days: number) => {
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const d = new Date(year, month, day);
    d.setDate(d.getDate() + days);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const myTeacher = teachers.find((t: any) => t.email?.toLowerCase() === session?.user?.email?.toLowerCase());
  const myStudent = students.find((s: any) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());

  const availableCourses = useMemo(() => {
    if (role === 'teacher' && myTeacher) return courses.filter((c: any) => c.teacher_id === myTeacher.id);
    if (role === 'student' && myStudent) {
      const sc = getStudentCourses(myStudent);
      return courses.filter((c: any) => sc.includes(c.id));
    }
    return courses;
  }, [courses, role, myTeacher, myStudent]);

  const enrolledStudents = useMemo(() => {
    if (!selectedCourse) return [];
    return students.filter((s: any) => {
      const sc = getStudentCourses(s);
      return sc.includes(selectedCourse);
    });
  }, [students, selectedCourse]);

  // Student: view their attendance — deduplicated by date (keep latest per date)
  const myAttendance = useMemo(() => {
    if (role !== 'student' || !myStudent || !selectedCourse) return [];
    const raw = attendance.filter((a: any) => a.student_id === myStudent.id && a.course_id === selectedCourse);
    // Deduplicate: for each date keep the record with the highest id (latest inserted)
    const map = new Map<string, any>();
    raw.forEach((a: any) => {
      const existing = map.get(a.date);
      if (!existing || String(a.id) > String(existing.id)) {
        map.set(a.date, a);
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [attendance, myStudent, selectedCourse, role]);

  // Auto-load attendance when course or date changes
  useEffect(() => {
    if (!selectedCourse) return;
    const currentKey = `${selectedCourse}_${selectedDate}`;
    if (loadedKey !== currentKey) {
      const matchingRecords = attendance.filter(
        (a: any) => a.course_id === selectedCourse && a.date === selectedDate
      );
      const newRoll: Record<string, boolean> = {};
      enrolledStudents.forEach((student: any) => {
        const record = matchingRecords.find((a: any) => a.student_id === student.id);
        newRoll[student.id] = record ? (record.status === 'present' || record.status === 'late') : true;
      });
      setRoll(newRoll);
      setLoadedKey(currentKey);
    }
  }, [selectedCourse, selectedDate, attendance, enrolledStudents, loadedKey]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) throw new Error('Select a course');
      
      const matchingRecords = attendance.filter(
        (a: any) => a.course_id === selectedCourse && a.date === selectedDate
      );

      const promises = enrolledStudents.map((s: any) => {
        const existingRecord = matchingRecords.find((r: any) => r.student_id === s.id);
        const newStatus = roll[s.id] ? 'present' : 'absent';
        
        if (existingRecord) {
          return dataApi.update('attendance', existingRecord.id, {
            status: newStatus
          });
        } else {
          return dataApi.create('attendance', {
            student_id: s.id,
            course_id: selectedCourse,
            date: selectedDate,
            status: newStatus,
          });
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      setLoadedKey('');
      qc.invalidateQueries({ queryKey: ['attendance'] });
      Alert.alert('Success', 'Attendance saved!');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  return (
    <ScreenWrapper scroll={false}>
      <View style={styles.header}>
        <Text style={styles.heading}>Attendance</Text>
      </View>

      {/* Course selector dropdown */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity 
          style={styles.dropdownTrigger} 
          onPress={() => setDropdownOpen(true)}
        >
          <Text style={styles.dropdownTriggerText}>
            {selectedCourse 
              ? (availableCourses.find((c: any) => c.id === selectedCourse)?.code + ' — ' + (availableCourses.find((c: any) => c.id === selectedCourse)?.title ?? ''))
              : 'Select a course...'}
          </Text>
          <ChevronDown size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Date selector row (Admin/Teacher only) */}
      {selectedCourse && role !== 'student' && (
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(-1)}>
            <ChevronLeft size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dateDisplay} 
            onPress={() => {
              setTempDate(selectedDate);
              setDateInputOpen(true);
            }}
          >
            <CalendarClock size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
            <Text style={styles.dateText}>{selectedDate}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(1)}>
            <ChevronRight size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Dropdown Bottom Sheet Modal */}
      <Modal visible={dropdownOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setDropdownOpen(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Course</Text>
              <TouchableOpacity onPress={() => setDropdownOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableCourses}
              keyExtractor={(item: any) => item.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const isSelected = selectedCourse === item.id;
                return (
                  <TouchableOpacity 
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]} 
                    onPress={() => { 
                      setSelectedCourse(item.id); 
                      setRoll({}); 
                      setLoadedKey('');
                      setDropdownOpen(false); 
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownItemCode, isSelected && styles.dropdownItemTextActive]}>{item.code}</Text>
                      <Text style={[styles.dropdownItemTitle, isSelected && styles.dropdownItemTextActive]}>{item.title}</Text>
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Date Input Modal */}
      <Modal visible={dateInputOpen} animationType="slide" transparent>
        <View style={styles.dateModalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setDateInputOpen(false)} 
          />
          <View style={styles.dateModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Date</Text>
              <TouchableOpacity onPress={() => setDateInputOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.dateInput}
              value={tempDate}
              onChangeText={setTempDate}
              placeholder="e.g. 2026-05-24"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.quickDateRow}>
              <TouchableOpacity 
                style={styles.quickDateBtn} 
                onPress={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setTempDate(today);
                }}
              >
                <Text style={styles.quickDateBtnText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickDateBtn} 
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setTempDate(yesterday.toISOString().slice(0, 10));
                }}
              >
                <Text style={styles.quickDateBtnText}>Yesterday</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={() => {
                const regex = /^\d{4}-\d{2}-\d{2}$/;
                if (!regex.test(tempDate)) {
                  Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
                  return;
                }
                const parsed = Date.parse(tempDate);
                if (isNaN(parsed)) {
                  Alert.alert('Invalid Date', 'Please enter a valid calendar date');
                  return;
                }
                setSelectedDate(tempDate);
                setDateInputOpen(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!selectedCourse ? (
        <EmptyState title="Select a course" subtitle="Tap the selector above to choose a course" />
      ) : role === 'student' ? (
        /* Student view: attendance history */
        <FlatList
          data={myAttendance}
          keyExtractor={(item: any, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No attendance records" />}
          renderItem={({ item }) => (
            <View style={styles.attendCard}>
              <Text style={styles.attendDate}>{item.date}</Text>
              <Badge label={item.status} variant={item.status === 'present' ? 'success' : 'accent'} />
            </View>
          )}
        />
      ) : (
        /* Admin/Teacher view: mark attendance */
        <>
          <FlatList
            data={enrolledStudents}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState title="No students enrolled" subtitle="Ask admin to enroll students in this course" />}
            renderItem={({ item }) => (
              <View style={styles.rollCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rollName}>{item.full_name}</Text>
                  <Text style={styles.rollSub}>{item.roll_number}</Text>
                </View>
                <Badge label={roll[item.id] ? 'Present' : 'Absent'} variant={roll[item.id] ? 'success' : 'accent'} />
                <Switch
                  value={!!roll[item.id]}
                  onValueChange={(v) => setRoll({ ...roll, [item.id]: v })}
                  trackColor={{ false: colors.accentLight, true: colors.successLight }}
                  thumbColor={roll[item.id] ? colors.success : colors.accent}
                  style={{ marginLeft: spacing.sm }}
                />
              </View>
            )}
          />
          {enrolledStudents.length > 0 && (
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveMut.mutate()}>
              <Text style={styles.saveBtnText}>Save Attendance</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary },
  courseRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  courseChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  courseChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  courseChipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  courseChipTextActive: { color: colors.white },
  list: { padding: spacing.lg, paddingBottom: 120 },
  rollCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  rollName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  rollSub: { fontSize: fontSize.sm, color: colors.textMuted },
  attendCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  attendDate: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  saveBtn: { position: 'absolute', bottom: 30, left: spacing.lg, right: spacing.lg, backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.lg, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  dropdownContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xs },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  dropdownTriggerText: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '75%', minHeight: '40%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  dropdownItemActive: { backgroundColor: colors.primaryLight },
  dropdownItemCode: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  dropdownItemTitle: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 2 },
  dropdownItemTextActive: { color: colors.primary },
  
  // Date Selector Row Styles
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateNavBtn: {
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  
  // Date Picker Modal Styles
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  quickDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  quickDateBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  quickDateBtnText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
