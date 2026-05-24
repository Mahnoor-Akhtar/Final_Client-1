import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, Alert, TextInput, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Trash2, MapPin, User, BookOpen, X, ChevronDown, Check } from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOTS = [
  '09:00 AM - 10:30 AM',
  '11:00 AM - 12:30 PM',
  '01:00 PM - 02:30 PM',
  '02:30 PM - 04:00 PM',
];

const COLUMN_WIDTH = 135;
const TIME_COLUMN_WIDTH = 95;
const ROW_HEIGHT = 120;

export default function TimetableScreen() {
  const { session, role } = useAuth();
  const qc = useQueryClient();

  // Queries
  const { data: timetables = [] } = useQuery({ queryKey: ['timetables'], queryFn: () => dataApi.getAll('timetables') });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => dataApi.getAll('departments') });

  // Modal & Edit state
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<any>(null);

  // Selector inputs state
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedSlot, setSelectedSlot] = useState('09:00 AM - 10:30 AM');
  const [selectedRoom, setSelectedRoom] = useState('Room 101');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('dept-cs');

  // Generic Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'slot' | 'course' | 'teacher' | 'room' | 'dept' | null>(null);

  const myTeacher = teachers.find((t: any) => t.email?.toLowerCase() === session?.user?.email?.toLowerCase());
  const myStudent = students.find((s: any) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());

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

  const getCourseName = (id: string) => courses.find((c: any) => c.id === id)?.title ?? '';
  const getCourseCode = (id: string) => courses.find((c: any) => c.id === id)?.code ?? '';
  const getTeacherName = (id: string) => teachers.find((t: any) => t.id === id)?.full_name ?? '';

  const filteredSchedules = useMemo(() => {
    let list = [...timetables];
    if (role === 'teacher' && myTeacher) {
      list = list.filter((t: any) => t.teacher_id === myTeacher.id);
    } else if (role === 'student' && myStudent) {
      const sc = getStudentCourses(myStudent);
      list = list.filter((t: any) => sc.includes(t.course_id));
    }
    return list;
  }, [timetables, role, myTeacher, myStudent]);

  // Picker selection config
  const pickerData = useMemo(() => {
    if (pickerType === 'day') {
      return DAYS.map(d => ({ id: d, title: d, label: d }));
    }
    if (pickerType === 'slot') {
      return SLOTS.map(s => ({ id: s, title: s, label: s }));
    }
    if (pickerType === 'course') {
      return courses.map((c: any) => ({ id: c.id, code: c.code, title: c.title, label: `${c.code} — ${c.title}` }));
    }
    if (pickerType === 'teacher') {
      return teachers.map((t: any) => ({ id: t.id, title: t.full_name, label: t.full_name }));
    }
    if (pickerType === 'room') {
      return ['Room 101', 'Room 102', 'Room 201', 'Lab 1', 'Lab 2'].map(r => ({ id: r, title: r, label: r }));
    }
    if (pickerType === 'dept') {
      return departments.map((d: any) => ({ id: d.id, title: d.name, label: d.name }));
    }
    return [];
  }, [pickerType, courses, teachers, departments]);

  const handlePickerSelect = (id: string) => {
    if (pickerType === 'day') setSelectedDay(id);
    if (pickerType === 'slot') setSelectedSlot(id);
    if (pickerType === 'course') setSelectedCourseId(id);
    if (pickerType === 'teacher') setSelectedTeacherId(id);
    if (pickerType === 'room') setSelectedRoom(id);
    if (pickerType === 'dept') setSelectedDeptId(id);
    setPickerOpen(false);
  };

  // Create slot mutation
  const createMut = useMutation({
    mutationFn: async (payload: any) => {
      return dataApi.create('timetables', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetables'] });
      Alert.alert('Success', 'Class slot scheduled successfully!');
      setSchedulingOpen(false);
      setSelectedCourseId('');
      setSelectedTeacherId('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // Delete slot mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      return dataApi.remove('timetables', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetables'] });
      Alert.alert('Success', 'Class slot removed!');
      setDetailsOpen(false);
      setActiveSlot(null);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleCreateSlot = () => {
    if (!selectedCourseId || !selectedTeacherId || !selectedRoom || !selectedDeptId) {
      Alert.alert('Missing Fields', 'Please fill all fields');
      return;
    }

    // Check room conflicts (same day, slot, and room)
    const conflict = timetables.find(
      (t: any) =>
        t.day?.toLowerCase() === selectedDay?.toLowerCase() &&
        t.slot === selectedSlot &&
        t.room === selectedRoom
    );

    if (conflict) {
      Alert.alert('Schedule Conflict', 'Room or Teacher is already booked for this slot!');
      return;
    }

    createMut.mutate({
      day: selectedDay,
      slot: selectedSlot,
      room: selectedRoom,
      course_id: selectedCourseId,
      teacher_id: selectedTeacherId,
      department_id: selectedDeptId,
    });
  };

  return (
    <ScreenWrapper scroll={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Timetable</Text>
          <Text style={styles.subHeading}>
            {role === 'admin' ? 'Manage class schedule' : 'Weekly lecture schedule'}
          </Text>
        </View>
        
        {role === 'admin' && (
          <TouchableOpacity 
            style={styles.headerScheduleBtn}
            onPress={() => {
              setSelectedDay('Monday');
              setSelectedSlot('09:00 AM - 10:30 AM');
              setSelectedRoom('Room 101');
              setSelectedCourseId('');
              setSelectedTeacherId('');
              setSelectedDeptId(departments[0]?.id ?? 'dept-cs');
              setSchedulingOpen(true);
            }}
          >
            <Plus size={16} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.headerScheduleBtnText}>Schedule</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.verticalScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridContainer}>
          <View>
            {/* Header Row: time column + day columns */}
            <View style={styles.gridHeaderRow}>
              <View style={[styles.gridHeaderCell, styles.timeColumnHeader]}>
                <Text style={styles.gridHeaderCellText}>Time Slot</Text>
              </View>
              {DAYS.map((day) => (
                <View key={day} style={styles.gridHeaderCell}>
                  <Text style={styles.gridHeaderCellText}>{day.slice(0, 3)}</Text>
                </View>
              ))}
            </View>

            {/* Grid Rows: one row per time slot */}
            {SLOTS.map((slot) => (
              <View key={slot} style={styles.gridRow}>
                {/* Time slot label cell */}
                <View style={[styles.gridCell, styles.timeColumnCell]}>
                  <Clock size={12} color={colors.primary} style={{ marginBottom: 4 }} />
                  <Text style={styles.timeSlotStartText}>{slot.split(' - ')[0]}</Text>
                  <Text style={styles.timeSlotEndText}>{slot.split(' - ')[1]}</Text>
                </View>

                {/* Day cells for this slot */}
                {DAYS.map((day) => {
                  const classesInSlot = filteredSchedules.filter(
                    (t: any) => t.day?.toLowerCase() === day.toLowerCase() && t.slot === slot
                  );

                  return (
                    <View key={day} style={styles.gridCell}>
                      {/* Render scheduled classes */}
                      {classesInSlot.map((classItem: any) => (
                        <TouchableOpacity
                          key={classItem.id}
                          style={styles.classCard}
                          onPress={() => {
                            setActiveSlot(classItem);
                            setDetailsOpen(true);
                          }}
                        >
                          <Text style={styles.classCode} numberOfLines={1}>
                            {getCourseCode(classItem.course_id)}
                          </Text>
                          <Text style={styles.classTitle} numberOfLines={1}>
                            {getCourseName(classItem.course_id)}
                          </Text>
                          <View style={styles.classMetaRow}>
                            <MapPin size={9} color={colors.primary} />
                            <Text style={styles.classMetaText} numberOfLines={1}>
                              {classItem.room}
                            </Text>
                          </View>
                          <View style={styles.classMetaRow}>
                            <User size={9} color={colors.primary} />
                            <Text style={styles.classMetaText} numberOfLines={1}>
                              {getTeacherName(classItem.teacher_id)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}

                      {/* Add button for Admin if slot is empty */}
                      {role === 'admin' && classesInSlot.length === 0 && (
                        <TouchableOpacity
                          style={styles.emptyAddCell}
                          onPress={() => {
                            setSelectedDay(day);
                            setSelectedSlot(slot);
                            setSelectedRoom('Room 101');
                            setSelectedCourseId('');
                            setSelectedTeacherId('');
                            setSelectedDeptId(departments[0]?.id ?? 'dept-cs');
                            setSchedulingOpen(true);
                          }}
                        >
                          <Plus size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}

                      {/* Show empty placeholder if no classes and not Admin */}
                      {classesInSlot.length === 0 && role !== 'admin' && (
                        <View style={styles.emptyCell}>
                          <Text style={styles.emptyCellText}>—</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Schedule Class Modal */}
      <Modal visible={schedulingOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setSchedulingOpen(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Schedule Class</Text>
                <Text style={styles.modalSubTitle}>Plan new lecture slot</Text>
              </View>
              <TouchableOpacity onPress={() => setSchedulingOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>DAY</Text>
              <TouchableOpacity 
                style={styles.formSelector} 
                onPress={() => {
                  setPickerType('day');
                  setPickerOpen(true);
                }}
              >
                <Text style={styles.formSelectorText}>{selectedDay}</Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>TIME SLOT</Text>
              <TouchableOpacity 
                style={styles.formSelector} 
                onPress={() => {
                  setPickerType('slot');
                  setPickerOpen(true);
                }}
              >
                <Text style={styles.formSelectorText}>{selectedSlot}</Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>COURSE</Text>
              <TouchableOpacity 
                style={styles.formSelector} 
                onPress={() => {
                  setPickerType('course');
                  setPickerOpen(true);
                }}
              >
                <Text style={styles.formSelectorText}>
                  {selectedCourseId 
                    ? (courses.find((c: any) => c.id === selectedCourseId)?.code + ' — ' + courses.find((c: any) => c.id === selectedCourseId)?.title)
                    : 'Select course...'}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>LECTURER</Text>
              <TouchableOpacity 
                style={styles.formSelector} 
                onPress={() => {
                  setPickerType('teacher');
                  setPickerOpen(true);
                }}
              >
                <Text style={styles.formSelectorText}>
                  {selectedTeacherId 
                    ? teachers.find((t: any) => t.id === selectedTeacherId)?.full_name 
                    : 'Select lecturer...'}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>ROOM</Text>
              <TouchableOpacity 
                style={styles.formSelector} 
                onPress={() => {
                  setPickerType('room');
                  setPickerOpen(true);
                }}
              >
                <Text style={styles.formSelectorText}>
                  {selectedRoom || 'Select room...'}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>DEPARTMENT</Text>
              <TouchableOpacity 
                style={styles.formSelector} 
                onPress={() => {
                  setPickerType('dept');
                  setPickerOpen(true);
                }}
              >
                <Text style={styles.formSelectorText}>
                  {selectedDeptId 
                    ? departments.find((d: any) => d.id === selectedDeptId)?.name 
                    : 'Select department...'}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleCreateSlot}
                disabled={createMut.isPending}
              >
                <Text style={styles.submitBtnText}>
                  {createMut.isPending ? 'Scheduling...' : 'Schedule Slot'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Generic Selector Bottom Sheet */}
      <Modal visible={pickerOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setPickerOpen(false)} 
          />
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {pickerType === 'course' ? 'Course' : pickerType === 'teacher' ? 'Lecturer' : pickerType === 'room' ? 'Room' : 'Department'}
              </Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerData}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => {
                const isSelected = 
                  pickerType === 'course' ? selectedCourseId === item.id :
                  pickerType === 'teacher' ? selectedTeacherId === item.id :
                  pickerType === 'room' ? selectedRoom === item.id :
                  selectedDeptId === item.id;
                return (
                  <TouchableOpacity 
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]} 
                    onPress={() => handlePickerSelect(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      {pickerType === 'course' ? (
                        <>
                          <Text style={[styles.pickerItemCode, isSelected && styles.pickerItemTextActive]}>{item.code}</Text>
                          <Text style={[styles.pickerItemTitle, isSelected && styles.pickerItemTextActive]}>{item.title}</Text>
                        </>
                      ) : (
                        <Text style={[styles.pickerItemTitle, isSelected && styles.pickerItemTextActive, { fontWeight: '600' }]}>{item.title}</Text>
                      )}
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Slot Details Modal */}
      <Modal visible={detailsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setDetailsOpen(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Class Details</Text>
                <Text style={styles.modalSubTitle}>{activeSlot?.day} · {activeSlot?.slot}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailsOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {activeSlot && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <BookOpen size={18} color={colors.primary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Course</Text>
                    <Text style={styles.detailValue}>
                      {getCourseCode(activeSlot.course_id)} — {getCourseName(activeSlot.course_id)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <User size={18} color={colors.primary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Lecturer</Text>
                    <Text style={styles.detailValue}>{getTeacherName(activeSlot.teacher_id)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <MapPin size={18} color={colors.primary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Room / Lab</Text>
                    <Text style={styles.detailValue}>{activeSlot.room}</Text>
                  </View>
                </View>

                {role === 'admin' && (
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        const confirmDelete = window.confirm('Are you sure you want to delete this schedule slot?');
                        if (confirmDelete) {
                          deleteMut.mutate(activeSlot.id);
                        }
                      } else {
                        Alert.alert(
                          'Remove Schedule',
                          'Are you sure you want to delete this schedule slot?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(activeSlot.id) }
                          ]
                        );
                      }
                    }}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 size={16} color={colors.white} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.deleteBtnText}>
                      {deleteMut.isPending ? 'Removing...' : 'Remove Class Slot'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, marginBottom: spacing.md },
  heading: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary },
  subHeading: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  
  verticalScroll: { flex: 1 },
  gridContainer: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  
  // Grid Table Layout
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  gridHeaderCell: {
    width: COLUMN_WIDTH,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  timeColumnHeader: {
    width: TIME_COLUMN_WIDTH,
  },
  gridHeaderCellText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  gridCell: {
    width: COLUMN_WIDTH,
    minHeight: ROW_HEIGHT,
    padding: spacing.xs,
    borderRightWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  timeColumnCell: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  timeSlotStartText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  timeSlotEndText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Grid Cards
  classCard: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  classCode: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.primary,
  },
  classTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  classMetaText: {
    fontSize: 9,
    color: colors.textMuted,
    flex: 1,
  },
  
  emptyAddCell: {
    flex: 1,
    width: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  emptyCell: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCellText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  
  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  
  // Custom Select Form Fields
  formContainer: {
    paddingBottom: 40,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  formSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  formSelectorText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  
  // Custom Generic Dropdown Picker Item Row
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  pickerItemActive: {
    backgroundColor: colors.primaryLight,
  },
  pickerItemCode: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  pickerItemTitle: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  pickerItemTextActive: {
    color: colors.primary,
  },
  
  // Slot Details Styles
  detailsContainer: {
    paddingVertical: spacing.sm,
    paddingBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  detailInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  deleteBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  slotAddButtonCompact: {
    height: 30,
    marginTop: 4,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  headerScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  headerScheduleBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
});
