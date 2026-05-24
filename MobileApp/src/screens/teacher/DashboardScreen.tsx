import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, MessageSquare, FolderKanban } from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import StatCard from '../../components/StatCard';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize } from '../../theme';
import { getTeacherComplaints, getTeacherCourseIds, getTeacherProfile, getTeacherStudents } from '../../lib/teacherData';

export default function TeacherDashboard() {
  const { session } = useAuth();
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: complaints = [] } = useQuery({ queryKey: ['complaints'], queryFn: () => dataApi.getAll('complaints') });
  const { data: groups = [] } = useQuery({ queryKey: ['fyp_groups'], queryFn: () => dataApi.getAll('fyp_groups') });

  const myTeacher = getTeacherProfile(teachers, session?.user?.email, session?.user?.id);
  const myCourses = useMemo(() => (myTeacher ? courses.filter((course: any) => course.teacher_id === myTeacher.id) : []), [courses, myTeacher]);
  const myCourseIds = useMemo(() => getTeacherCourseIds(courses, myTeacher?.id), [courses, myTeacher]);
  const myStudents = useMemo(() => getTeacherStudents(students, myCourseIds), [students, myCourseIds]);
  const myComplaints = useMemo(() => getTeacherComplaints(complaints, students, myCourseIds, myTeacher?.id), [complaints, students, myCourseIds, myTeacher]);
  const myGroups = groups.filter((group: any) => group.supervisor_id === myTeacher?.id);

  return (
    <ScreenWrapper>
      <Text style={styles.heading}>Dashboard</Text>
      <Text style={styles.subheading}>Welcome, {myTeacher?.full_name ?? 'Teacher'}</Text>

      <View style={styles.statsRow}>
        <StatCard title="My Courses" value={myCourses.length} icon={<BookOpen size={20} color={colors.primary} />} />
        <StatCard title="My Students" value={myStudents.length} icon={<Users size={20} color={colors.success} />} color={colors.success} />
      </View>
      <View style={styles.statsRow}>
        <StatCard title="Complaints" value={myComplaints.length} icon={<MessageSquare size={20} color={colors.warning} />} color={colors.warning} />
        <StatCard title="FYP Groups" value={myGroups.length} icon={<FolderKanban size={20} color={colors.accent} />} color={colors.accent} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textPrimary },
  subheading: { fontSize: fontSize.md, color: colors.textMuted, marginBottom: spacing.xl },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
});
