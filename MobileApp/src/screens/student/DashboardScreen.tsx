import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CalendarClock, Wallet, FolderKanban } from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import StatCard from '../../components/StatCard';
import { dataApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize } from '../../theme';

export default function StudentDashboard() {
  const { session } = useAuth();
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => dataApi.getAll('attendance') });
  const { data: fees = [] } = useQuery({ queryKey: ['fees'], queryFn: () => dataApi.getAll('fees') });
  const { data: groups = [] } = useQuery({ queryKey: ['fyp_groups'], queryFn: () => dataApi.getAll('fyp_groups') });

  const myStudent = students.find((s: any) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());
  const enrolledCount = useMemo(() => {
    if (!myStudent) return 0;
    const sc = Array.isArray(myStudent.courses) ? myStudent.courses : [];
    return sc.length;
  }, [myStudent]);

  const myAttendance = attendance.filter((a: any) => a.student_id === myStudent?.id);
  const presentCount = myAttendance.filter((a: any) => a.status === 'present').length;
  const attendancePercent = myAttendance.length > 0 ? Math.round((presentCount / myAttendance.length) * 100) : 0;

  const myFees = fees.filter((f: any) => f.student_id === myStudent?.id);
  const pendingFees = myFees.filter((f: any) => f.status !== 'paid').length;

  const myGroup = groups.find((g: any) => {
    const members = Array.isArray(g.members) ? g.members : [];
    return members.includes(myStudent?.id);
  });

  return (
    <ScreenWrapper>
      <Text style={styles.heading}>Dashboard</Text>
      <Text style={styles.subheading}>Welcome, {myStudent?.full_name ?? 'Student'}</Text>

      <View style={styles.statsRow}>
        <StatCard title="Courses" value={enrolledCount} icon={<BookOpen size={20} color={colors.primary} />} />
        <StatCard title="Attendance" value={`${attendancePercent}%`} icon={<CalendarClock size={20} color={colors.success} />} color={colors.success} />
      </View>
      <View style={styles.statsRow}>
        <StatCard title="Pending Fees" value={pendingFees} icon={<Wallet size={20} color={colors.warning} />} color={colors.warning} />
        <StatCard title="FYP" value={myGroup ? myGroup.status : 'None'} icon={<FolderKanban size={20} color={colors.accent} />} color={colors.accent} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textPrimary },
  subheading: { fontSize: fontSize.md, color: colors.textMuted, marginBottom: spacing.xl },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
});
