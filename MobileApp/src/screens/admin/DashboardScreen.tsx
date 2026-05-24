import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Building2, 
  MessageSquare, 
  Check, 
  X, 
  AlertCircle, 
  ChevronRight,
  Send,
  Clock
} from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import Badge from '../../components/Badge';
import { dataApi } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function AdminDashboard() {
  const qc = useQueryClient();

  // Queries
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => dataApi.getAll('students') });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => dataApi.getAll('teachers') });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => dataApi.getAll('courses') });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => dataApi.getAll('departments') });
  const { data: complaints = [] } = useQuery({ queryKey: ['complaints'], queryFn: () => dataApi.getAll('complaints') });

  // Component States
  const [complaintTab, setComplaintTab] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  // Computations
  const pendingComplaints = useMemo(() => {
    return complaints.filter((c: any) => c.status === 'pending');
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    if (complaintTab === 'pending') return pendingComplaints;
    if (complaintTab === 'resolved') return complaints.filter((c: any) => c.status === 'resolved');
    return complaints;
  }, [complaints, complaintTab, pendingComplaints]);

  const currentDateString = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  }, []);

  const getStudentName = (id: string) => {
    const student = students.find((s: any) => s.id === id);
    return student ? student.full_name : 'Unknown Student';
  };

  const getStudentRoll = (id: string) => {
    const student = students.find((s: any) => s.id === id);
    return student ? student.roll_number : '—';
  };

  // Resolve complaint mutation
  const resolveMut = useMutation({
    mutationFn: async (payload: { id: string; reply: string }) => {
      return dataApi.update('complaints', payload.id, {
        admin_reply: payload.reply,
        status: 'resolved'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      Alert.alert('Success', 'Complaint resolved successfully!');
      setSelectedComplaint(null);
      setReplyText('');
    },
    onError: (e: any) => {
      Alert.alert('Error', e.message);
    }
  });

  const handleResolve = () => {
    if (!replyText.trim()) {
      Alert.alert('Missing Reply', 'Please enter a resolution reply.');
      return;
    }
    resolveMut.mutate({ id: selectedComplaint.id, reply: replyText });
  };

  return (
    <ScreenWrapper>
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeTitle}>Welcome back,</Text>
          <Text style={styles.welcomeName}>Administrator</Text>
          <Text style={styles.welcomeDate}>{currentDateString}</Text>
        </View>
        <View style={styles.welcomeIconContainer}>
          <Building2 size={36} color={colors.white} style={{ opacity: 0.8 }} />
        </View>
      </View>

      {/* Action Banner for pending complaints */}
      {pendingComplaints.length > 0 && (
        <View style={styles.alertBanner}>
          <AlertCircle size={20} color={colors.accent} style={{ marginRight: spacing.xs }} />
          <Text style={styles.alertText}>
            You have <Text style={{ fontWeight: '700' }}>{pendingComplaints.length}</Text> pending complaints to resolve.
          </Text>
        </View>
      )}

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Overview Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={[styles.statCardCustom, { borderLeftColor: colors.primary }]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                <GraduationCap size={20} color={colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statVal}>{students.length}</Text>
                <Text style={styles.statLbl}>Students</Text>
              </View>
            </View>
            
            <View style={[styles.statCardCustom, { borderLeftColor: colors.success }]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.successLight }]}>
                <Users size={20} color={colors.success} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statVal}>{teachers.length}</Text>
                <Text style={styles.statLbl}>Teachers</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCardCustom, { borderLeftColor: colors.warning }]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.warningLight }]}>
                <BookOpen size={20} color={colors.warning} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statVal}>{courses.length}</Text>
                <Text style={styles.statLbl}>Courses</Text>
              </View>
            </View>
            
            <View style={[styles.statCardCustom, { borderLeftColor: colors.accent }]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.accentLight }]}>
                <Building2 size={20} color={colors.accent} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statVal}>{departments.length}</Text>
                <Text style={styles.statLbl}>Depts</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Complaints Resolution Area */}
      <View style={styles.complaintsSection}>
        <Text style={styles.sectionTitle}>Complaints Resolution</Text>
        
        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity 
            style={[styles.tabChip, complaintTab === 'pending' && styles.tabChipActive]} 
            onPress={() => setComplaintTab('pending')}
          >
            <Text style={[styles.tabText, complaintTab === 'pending' && styles.tabTextActive]}>
              Pending ({pendingComplaints.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabChip, complaintTab === 'resolved' && styles.tabChipActive]} 
            onPress={() => setComplaintTab('resolved')}
          >
            <Text style={[styles.tabText, complaintTab === 'resolved' && styles.tabTextActive]}>
              Resolved
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabChip, complaintTab === 'all' && styles.tabChipActive]} 
            onPress={() => setComplaintTab('all')}
          >
            <Text style={[styles.tabText, complaintTab === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Complaints List */}
        {filteredComplaints.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={32} color={colors.textMuted} style={{ marginBottom: spacing.xs }} />
            <Text style={styles.emptyStateText}>
              {complaintTab === 'pending' 
                ? 'No pending complaints. All caught up! 🎉' 
                : 'No complaints to show.'}
            </Text>
          </View>
        ) : (
          filteredComplaints.map((item: any, idx: number) => (
            <TouchableOpacity 
              key={item.id ?? String(idx)} 
              style={styles.complaintCard}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedComplaint(item);
                setReplyText(item.admin_reply ?? '');
              }}
            >
              <View style={styles.complaintCardHeader}>
                <Badge label={item.category || 'General'} variant={item.category === 'Hostel' ? 'warning' : 'muted'} />
                <Badge 
                  label={item.status || 'pending'} 
                  variant={item.status === 'resolved' ? 'success' : 'accent'} 
                />
              </View>
              
              <Text style={styles.complaintSubject}>{item.subject}</Text>
              <Text style={styles.complaintSnippet} numberOfLines={2}>{item.description}</Text>
              
              <View style={styles.complaintCardFooter}>
                <View style={styles.studentInfo}>
                  <GraduationCap size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.studentText}>
                    {getStudentName(item.student_id)} ({getStudentRoll(item.student_id)})
                  </Text>
                </View>
                
                <Text style={styles.actionLink}>
                  {item.status === 'resolved' ? 'View Details' : 'Resolve'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Resolution Modal */}
      <Modal visible={!!selectedComplaint} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setSelectedComplaint(null)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Complaint details</Text>
                <Text style={styles.modalSubtitle}>Submitted by student</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedComplaint(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Details card */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>STUDENT</Text>
                    <Text style={styles.detailValue}>
                      {getStudentName(selectedComplaint.student_id)} ({getStudentRoll(selectedComplaint.student_id)})
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>CATEGORY</Text>
                    <Text style={styles.detailValue}>{selectedComplaint.category || 'General'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SUBJECT</Text>
                    <Text style={[styles.detailValue, { fontWeight: '700' }]}>{selectedComplaint.subject}</Text>
                  </View>

                  <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <Text style={styles.detailLabel}>DESCRIPTION</Text>
                    <Text style={styles.detailDescription}>{selectedComplaint.description}</Text>
                  </View>
                </View>

                {/* Resolution UI */}
                {selectedComplaint.status !== 'resolved' ? (
                  <View style={styles.resolutionContainer}>
                    <Text style={styles.fieldLabel}>ADMIN RESOLUTION REPLY</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder="Write how this issue was resolved..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={4}
                    />

                    <TouchableOpacity 
                      style={styles.submitBtn} 
                      onPress={handleResolve}
                      disabled={resolveMut.isPending}
                    >
                      <Send size={16} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>
                        {resolveMut.isPending ? 'Resolving...' : 'Send Reply & Resolve'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.resolvedContainer}>
                    <Text style={styles.fieldLabel}>ADMIN RESOLUTION</Text>
                    <View style={styles.resolvedReplyBox}>
                      <Text style={styles.resolvedReplyText}>{selectedComplaint.admin_reply}</Text>
                      <View style={styles.resolvedFooter}>
                        <Check size={14} color={colors.success} style={{ marginRight: 4 }} />
                        <Text style={styles.resolvedStatus}>Resolved</Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Welcome Banner
  welcomeBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: fontSize.md,
    color: colors.primaryLight,
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: fontSize.xxl,
    color: colors.white,
    fontWeight: '800',
    marginTop: 2,
  },
  welcomeDate: {
    fontSize: fontSize.xs,
    color: colors.primaryLight,
    marginTop: 6,
    opacity: 0.9,
  },
  welcomeIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  // Alert Banner
  alertBanner: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent + '25',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  alertText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },

  // Stats Section
  statsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCardCustom: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statVal: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLbl: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Complaints Resolution Area
  complaintsSection: {
    marginTop: spacing.sm,
    paddingBottom: 40,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  complaintCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  complaintCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  complaintSubject: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  complaintSnippet: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  complaintCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  studentText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  actionLink: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },

  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalScroll: {
    paddingBottom: 40,
  },

  // Details Card inside modal
  detailsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  detailDescription: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
    marginTop: 4,
  },

  // Resolution controls
  resolutionContainer: {
    marginTop: spacing.xs,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  // Resolved Display UI
  resolvedContainer: {
    marginTop: spacing.xs,
  },
  resolvedReplyBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '20',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  resolvedReplyText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  resolvedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resolvedStatus: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.success,
  },
});
