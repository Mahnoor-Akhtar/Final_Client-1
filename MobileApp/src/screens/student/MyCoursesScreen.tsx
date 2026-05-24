import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function StudentCoursesScreen() {
  const { session } = useAuth();
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });

  const myStudent = students.find((s: any) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
  const myCourses = useMemo(() => {
    if (!myStudent) return [];
    const sc = Array.isArray(myStudent.courses) ? myStudent.courses : [];
    return courses.filter((c: any) => sc.includes(c.id));
  }, [courses, myStudent]);

  const getTeacherName = (id: string) => teachers.find((t: any) => t.id === id)?.full_name ?? 'TBA';

  return (
    <View style={styles.flex}>
      <Text style={styles.heading}>My Courses</Text>
      <FlatList
        data={myCourses}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No courses" subtitle="You are not enrolled in any courses yet" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Badge label={item.code ?? ''} variant="primary" />
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>Lecturer: {getTeacherName(item.teacher_id)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  heading: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.xs },
  cardSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
});
