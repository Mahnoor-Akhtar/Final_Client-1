import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useQuery } from '@tanstack/react-query';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { getStudentCourseIds, getTeacherCourseIds, getTeacherProfile } from '../../lib/teacherData';

export default function MyCoursesScreen() {
  const { session } = useAuth();
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });

  const myTeacher = getTeacherProfile(teachers, session?.user?.email, session?.user?.id);
  const myCourseIds = useMemo(() => getTeacherCourseIds(courses, myTeacher?.id), [courses, myTeacher]);
  const myCourses = useMemo(() => (myTeacher ? courses.filter((course: any) => course.teacher_id === myTeacher.id) : []), [courses, myTeacher]);

  const getEnrolledCount = (courseId: string) => students.filter((s: any) => {
    const sc = getStudentCourseIds(s);
    return sc.includes(courseId) && myCourseIds.includes(courseId);
  }).length;

  return (
    <ScreenWrapper scroll={false} title="My Courses">
      <FlatList
        data={myCourses}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No courses assigned" subtitle="Contact admin to assign courses to you" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Badge label={item.code ?? ''} variant="primary" />
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{getEnrolledCount(item.id)} students enrolled</Text>
          </View>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.xs },
  cardSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
});
