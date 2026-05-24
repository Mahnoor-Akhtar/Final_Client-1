import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useQuery } from '@tanstack/react-query';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { getStudentCourseIds, getTeacherCourseIds, getTeacherProfile, getTeacherStudents } from '../../lib/teacherData';

export default function MyStudentsScreen() {
  const { session } = useAuth();
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });

  const myTeacher = getTeacherProfile(teachers, session?.user?.email, session?.user?.id);
  const myCourseIds = useMemo(() => getTeacherCourseIds(courses, myTeacher?.id), [courses, myTeacher]);
  const myStudents = useMemo(() => getTeacherStudents(students, myCourseIds), [students, myCourseIds]);

  const getSharedCourses = (studentCourses: string[]) => {
    return courses
      .filter((c: any) => studentCourses.includes(c.id) && myCourseIds.includes(c.id))
      .map((c: any) => c.code);
  };

  return (
    <ScreenWrapper scroll={false} title="My Students">
      <FlatList
        data={myStudents}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No students enrolled" subtitle="Ask admin to enroll students in your courses" />}
        renderItem={({ item }) => {
          const sc = getStudentCourseIds(item);
          const shared = getSharedCourses(sc);
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.full_name ?? '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.full_name}</Text>
                <Text style={styles.cardSub}>{item.roll_number}</Text>
                <View style={styles.badgeRow}>
                  {shared.map((code: string) => <Badge key={code} label={code} variant="primary" />)}
                </View>
              </View>
            </View>
          );
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  cardSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.xs },
});
