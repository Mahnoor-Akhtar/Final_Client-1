import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Linking, Platform, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import {
  FolderKanban, Plus, X, Check, XCircle,
  FileText, Upload, GitBranch, ExternalLink,
  MessageSquare, ChevronDown,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { dataApi, uploadApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { getTeacherProfile } from '../../lib/teacherData';

const MILESTONES = [
  'Project Proposal Draft',
  'Software Requirement Specification',
  'System Architecture Design',
  'Final Thesis & Code Submission',
];

export default function FYPScreen() {
  const { session, role } = useAuth();
  const qc = useQueryClient();

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: groups = [] }      = useQuery({ queryKey: ['fyp_groups'],      queryFn: () => dataApi.getAll('fyp_groups') });
  const { data: submissions = [] } = useQuery({ queryKey: ['fyp_submissions'], queryFn: () => dataApi.getAll('fyp_submissions') });
  const { data: students = [] }    = useQuery({ queryKey: ['students'],        queryFn: () => dataApi.getAll('students') });
  const { data: teachers = [] }    = useQuery({ queryKey: ['teachers'],        queryFn: () => dataApi.getAll('teachers') });

  const myTeacher = getTeacherProfile(teachers, session?.user?.email, session?.user?.id);
  const myStudent = students.find((s: any) => s.email?.toLowerCase() === session?.user?.email?.toLowerCase());

  // Find student's group
  const myGroup = useMemo(() => {
    if (role !== 'student' || !myStudent) return null;
    return groups.find((g: any) => {
      const members = Array.isArray(g.members) ? g.members : [];
      return members.includes(myStudent.id);
    });
  }, [groups, myStudent, role]);

  // Teacher's supervised groups
  const supervisedGroups = useMemo(() => {
    if (role !== 'teacher' || !myTeacher) return [];
    return groups.filter((g: any) => g.supervisor_id === myTeacher.id);
  }, [groups, myTeacher, role]);

  const getStudentName = (id: string) => students.find((s: any) => s.id === id)?.full_name ?? id;
  const getTeacherName = (id: string) => teachers.find((t: any) => t.id === id)?.full_name ?? '';
  const statusVariant  = (s: string) => s === 'approved' ? 'success' : s === 'rejected' ? 'accent' : 'warning';

  // ─── Admin / Teacher: approve / reject ────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      dataApi.update('fyp_groups', id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fyp_groups'] }),
  });

  // ─── Student: register FYP group ──────────────────────────────────────────
  const [registerModal, setRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    group_name: '', title: '', abstract: '', supervisor_id: '', partner_id: ''
  });
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  const createGroupMut = useMutation({
    mutationFn: (payload: any) => dataApi.create('fyp_groups', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fyp_groups'] });
      setRegisterModal(false);
      setRegForm({ group_name: '', title: '', abstract: '', supervisor_id: '', partner_id: '' });
    },
  });

  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => dataApi.remove('fyp_groups', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fyp_groups'] }),
  });

  const handleRegisterGroup = () => {
    if (!regForm.group_name || !regForm.title || !regForm.abstract || !regForm.supervisor_id) {
      return;
    }
    if (!myStudent) return;
    const members = [myStudent.id];
    if (regForm.partner_id) members.push(regForm.partner_id);
    createGroupMut.mutate({
      group_name: regForm.group_name,
      title: regForm.title,
      abstract: regForm.abstract,
      supervisor_id: regForm.supervisor_id,
      members,
      status: 'pending',
    });
  };

  // ─── Teacher: grade submission ────────────────────────────────────────────
  const [gradeModal, setGradeModal]  = useState(false);
  const [gradeSub,   setGradeSub]    = useState<any>(null);
  const [gradeVal,   setGradeVal]    = useState('');
  const [gradeNote,  setGradeNote]   = useState('');

  const gradeMut = useMutation({
    mutationFn: () => dataApi.update('fyp_submissions', gradeSub.id, { grade: gradeVal, comments: gradeNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fyp_submissions'] }); setGradeModal(false); },
  });

  // ─── Student: submit document ─────────────────────────────────────────────
  const [submitModal,   setSubmitModal]   = useState(false);
  const [milestone,     setMilestone]     = useState('');
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [submitError,   setSubmitError]   = useState('');
  const [pickedFile,    setPickedFile]    = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [githubLink,    setGithubLink]    = useState('');
  const [uploading,     setUploading]     = useState(false);

  const submitDocMut = useMutation({
    mutationFn: async (payload: any) => dataApi.create('fyp_submissions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fyp_submissions'] });
      setSubmitModal(false);
      resetSubmitForm();
    },
  });

  const resetSubmitForm = () => {
    setMilestone('');
    setPickedFile(null);
    setGithubLink('');
    setUploading(false);
    setSubmitError('');
  };

  // Pick any document (PDF, DOCX, ZIP …)
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/zip', 'application/x-zip-compressed', '*/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        setPickedFile(result.assets[0]);
      }
    } catch {
      // User cancelled or error — no-op
    }
  };

  const handleSubmitDocument = async () => {
    if (!myGroup) return;
    if (!milestone) {
      setSubmitError('Please select a document milestone before submitting.');
      return;
    }
    if (!pickedFile && !githubLink.trim()) return;
    setSubmitError('');

    setUploading(true);
    let filePath = '';
    let fileName = pickedFile?.name ?? 'GitHub Link';

    try {
      if (pickedFile) {
        const res = await uploadApi.uploadFile(
          pickedFile.uri,
          pickedFile.name,
          pickedFile.mimeType ?? 'application/octet-stream',
        );
        if (res?.error?.message) throw new Error(res.error.message);
        filePath = res?.data?.file_path ?? '';
        fileName = res?.data?.file_name ?? pickedFile.name;
      }

      await submitDocMut.mutateAsync({
        group_id:     myGroup.id,
        title:        milestone,
        file_name:    fileName,
        file_path:    filePath,
        github_link:  githubLink.trim(),
        submitted_at: new Date().toISOString(),
      });
    } catch (err: any) {
      // keep modal open so user sees the error
    } finally {
      setUploading(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderGroupCard = (g: any, showActions = false) => {
    const members  = Array.isArray(g.members) ? g.members : [];
    const groupSubs = submissions.filter((s: any) => s.group_id === g.id);
    const canAct = showActions || (role === 'teacher' && myTeacher && g.supervisor_id === myTeacher.id);

    return (
      <View key={g.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.groupName}>{g.group_name}</Text>
          <Badge label={g.status ?? 'pending'} variant={statusVariant(g.status ?? 'pending')} />
        </View>
        <Text style={styles.projectTitle}>{g.title}</Text>
        <Text style={styles.meta}>Supervisor: {getTeacherName(g.supervisor_id)}</Text>
        <Text style={styles.meta}>Members: {members.map(getStudentName).join(', ')}</Text>
        {g.abstract ? <Text style={styles.abstract} numberOfLines={3}>{g.abstract}</Text> : null}

        {/* Admin / Supervisor approve/reject */}
        {canAct && g.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => updateStatus.mutate({ id: g.id, status: 'approved' })}>
              <Check size={14} color={colors.white} />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]}
              onPress={() => updateStatus.mutate({ id: g.id, status: 'rejected' })}>
              <XCircle size={14} color={colors.white} />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submissions log */}
        {groupSubs.length > 0 && (
          <View style={styles.subsSection}>
            <Text style={styles.subsTitle}>Submissions</Text>
            {groupSubs.map((sub: any) => (
              <View key={sub.id} style={styles.subCard}>
                <FileText size={14} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName}>{sub.title ?? 'Submission'}</Text>
                  <Text style={styles.meta}>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}</Text>
                  {/* File / GitHub links */}
                  <View style={styles.linkRow}>
                    {sub.file_path ? (
                      <TouchableOpacity style={styles.linkChip} onPress={() => Linking.openURL(sub.file_path)}>
                        <FileText size={11} color={colors.primary} />
                        <Text style={styles.linkChipText}>View File</Text>
                        <ExternalLink size={10} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                    {sub.github_link ? (
                      <TouchableOpacity style={[styles.linkChip, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => Linking.openURL(sub.github_link)}>
                        <GitBranch size={11} color={colors.textPrimary} />
                        <Text style={[styles.linkChipText, { color: colors.textPrimary }]}>GitHub</Text>
                        <ExternalLink size={10} color={colors.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {sub.comments ? (
                    <View style={styles.commentBox}>
                      <MessageSquare size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.commentText}>{sub.comments}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {sub.grade ? (
                    <Badge label={`Grade: ${sub.grade}`} variant="success" />
                  ) : (role === 'teacher' || role === 'admin') ? (
                    <TouchableOpacity onPress={() => { setGradeSub(sub); setGradeVal(''); setGradeNote(''); setGradeModal(true); }}>
                      <Text style={styles.gradeLink}>Grade</Text>
                    </TouchableOpacity>
                  ) : (
                    <Badge label="Pending" variant="warning" />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ─── Student view ─────────────────────────────────────────────────────────

  if (role === 'student') {
    const mySubs = myGroup ? submissions.filter((s: any) => s.group_id === myGroup.id) : [];

    return (
      <ScreenWrapper scroll={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.heading}>FYP Portal</Text>
          {myGroup?.status === 'approved' && (
            <TouchableOpacity style={styles.submitFab} onPress={() => setSubmitModal(true)}>
              <Upload size={14} color={colors.white} style={{ marginRight: 4 }} />
              <Text style={styles.submitFabText}>Submit File</Text>
            </TouchableOpacity>
          )}
        </View>

        {!myGroup ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
            <FolderKanban size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs }}>No FYP Group</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg }}>
              Register your project group by selecting a partner and supervisor.
            </Text>
            <TouchableOpacity style={styles.submitFab} onPress={() => setRegisterModal(true)}>
              <Plus size={16} color={colors.white} />
              <Text style={styles.submitFabText}>Create FYP Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {renderGroupCard(myGroup)}
            {myGroup.status === 'rejected' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accent, alignSelf: 'center', marginTop: spacing.md }]}
                onPress={() => Alert.alert('Remove Request', 'This will delete your rejected FYP request so you can register again.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteGroupMut.mutate(myGroup.id) },
                ])}>
                <XCircle size={14} color={colors.white} />
                <Text style={styles.actionBtnText}>Remove Request & Try Again</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ─── Document Submission Modal ─────────────────────────── */}
        <Modal visible={submitModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1}
              onPress={() => !uploading && setSubmitModal(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit FYP Document</Text>
                <TouchableOpacity onPress={() => !uploading && setSubmitModal(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

                {/* Milestone picker */}
                <Text style={styles.label}>DOCUMENT MILESTONE</Text>
                <TouchableOpacity
                  style={[styles.selector, submitError && !milestone && { borderColor: colors.accent }]}
                  onPress={() => { setMilestoneOpen(true); setSubmitError(''); }}
                >
                  <Text style={[styles.selectorText, !milestone && { color: colors.textMuted }]}>
                    {milestone || 'Choose Milestone…'}
                  </Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {/* File picker area */}
                <Text style={styles.label}>UPLOAD FILE (PDF / DOCX / ZIP)</Text>
                <TouchableOpacity style={[styles.dropzone, pickedFile && styles.dropzoneActive]}
                  onPress={handlePickFile} disabled={uploading}>
                  {pickedFile ? (
                    <View style={styles.pickedFileRow}>
                      <FileText size={28} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={styles.pickedFileName} numberOfLines={2}>{pickedFile.name}</Text>
                        <Text style={styles.pickedFileMeta}>
                          {pickedFile.mimeType ?? 'Unknown type'} · {pickedFile.size ? (pickedFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setPickedFile(null)} disabled={uploading}>
                        <X size={18} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.dropzoneInner}>
                      <Upload size={30} color={colors.textMuted} />
                      <Text style={styles.dropzoneText}>Tap to choose file</Text>
                      <Text style={styles.dropzoneSub}>PDF, DOCX, ZIP supported</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* OR GitHub Link */}
                <Text style={styles.orDivider}>— or enter GitHub repository link —</Text>
                <View style={styles.githubRow}>
                  <GitBranch size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                  <TextInput
                    style={styles.githubInput}
                    value={githubLink}
                    onChangeText={setGithubLink}
                    placeholder="https://github.com/username/repo"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    editable={!uploading}
                  />
                </View>

                {/* Inline validation errors */}
                {submitError ? (
                  <Text style={styles.errorText}>{submitError}</Text>
                ) : !pickedFile && !githubLink.trim() ? (
                  <Text style={styles.hintText}>Upload a file OR provide a GitHub link.</Text>
                ) : null}

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.submitBtn, (uploading || (!pickedFile && !githubLink.trim())) && { opacity: 0.55 }]}
                  onPress={handleSubmitDocument}
                  disabled={uploading || (!pickedFile && !githubLink.trim())}
                >
                  {uploading ? (
                    <Text style={styles.submitBtnText}>Uploading…</Text>
                  ) : (
                    <Text style={styles.submitBtnText}>Send Submission</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Milestone picker sheet */}
        <Modal visible={milestoneOpen} animationType="fade" transparent>
          <View style={styles.pickerOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMilestoneOpen(false)} />
            <View style={styles.pickerContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Milestone</Text>
                <TouchableOpacity onPress={() => setMilestoneOpen(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {MILESTONES.map((m) => (
                <TouchableOpacity key={m} style={[styles.milestoneItem, milestone === m && styles.milestoneItemActive]}
                  onPress={() => { setMilestone(m); setMilestoneOpen(false); }}>
                  <Text style={[styles.milestoneText, milestone === m && { color: colors.primary }]}>{m}</Text>
                  {milestone === m && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ─── Group Registration Modal ─────────────────────────── */}
        <Modal visible={registerModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setRegisterModal(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Register FYP Group</Text>
                <TouchableOpacity onPress={() => setRegisterModal(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
                <Text style={styles.label}>GROUP NAME</Text>
                <TextInput style={styles.fieldInput} placeholder="e.g. Team Alpha"
                  value={regForm.group_name} onChangeText={(v) => setRegForm({ ...regForm, group_name: v })}
                  placeholderTextColor={colors.textMuted} />

                <Text style={styles.label}>PROJECT TITLE</Text>
                <TextInput style={styles.fieldInput} placeholder="e.g. AI Campus Portal"
                  value={regForm.title} onChangeText={(v) => setRegForm({ ...regForm, title: v })}
                  placeholderTextColor={colors.textMuted} />

                <Text style={styles.label}>ABSTRACT</Text>
                <TextInput style={[styles.fieldInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Describe your project scope, tech stack, and problem statement..."
                  value={regForm.abstract} onChangeText={(v) => setRegForm({ ...regForm, abstract: v })}
                  placeholderTextColor={colors.textMuted} multiline />

                <Text style={styles.label}>PROPOSED SUPERVISOR</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setSupervisorOpen(true)}>
                  <Text style={[styles.selectorText, !regForm.supervisor_id && { color: colors.textMuted }]}>
                    {regForm.supervisor_id ? getTeacherName(regForm.supervisor_id) : 'Choose Supervisor…'}
                  </Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <Text style={styles.label}>PARTNER (OPTIONAL)</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setPartnerOpen(true)}>
                  <Text style={[styles.selectorText, !regForm.partner_id && { color: colors.textMuted }]}>
                    {regForm.partner_id ? getStudentName(regForm.partner_id) : 'No Partner'}
                  </Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, (!regForm.group_name || !regForm.title || !regForm.abstract || !regForm.supervisor_id || createGroupMut.isPending) && { opacity: 0.55 }]}
                  onPress={handleRegisterGroup}
                  disabled={!regForm.group_name || !regForm.title || !regForm.abstract || !regForm.supervisor_id || createGroupMut.isPending}>
                  <Text style={styles.submitBtnText}>
                    {createGroupMut.isPending ? 'Submitting…' : 'Submit Registration Pitch'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Supervisor picker */}
        <Modal visible={supervisorOpen} animationType="fade" transparent>
          <View style={styles.pickerOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSupervisorOpen(false)} />
            <View style={styles.pickerContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Supervisor</Text>
                <TouchableOpacity onPress={() => setSupervisorOpen(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={teachers}
                keyExtractor={(t: any) => t.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.milestoneItem}
                    onPress={() => { setRegForm({ ...regForm, supervisor_id: item.id }); setSupervisorOpen(false); }}>
                    <Text style={styles.milestoneText}>{item.full_name} ({item.qualification ?? 'Faculty'})</Text>
                    {regForm.supervisor_id === item.id && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Partner picker */}
        <Modal visible={partnerOpen} animationType="fade" transparent>
          <View style={styles.pickerOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPartnerOpen(false)} />
            <View style={styles.pickerContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Partner</Text>
                <TouchableOpacity onPress={() => setPartnerOpen(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.milestoneItem}
                onPress={() => { setRegForm({ ...regForm, partner_id: '' }); setPartnerOpen(false); }}>
                <Text style={styles.milestoneText}>No Partner</Text>
                {!regForm.partner_id && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
              <FlatList
                data={students.filter((s: any) => s.id !== myStudent?.id && !groups.some((g: any) => (Array.isArray(g.members) ? g.members : []).includes(s.id)))}
                keyExtractor={(s: any) => s.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.milestoneItem}
                    onPress={() => { setRegForm({ ...regForm, partner_id: item.id }); setPartnerOpen(false); }}>
                    <Text style={styles.milestoneText}>{item.full_name} ({item.roll_number})</Text>
                    {regForm.partner_id === item.id && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </ScreenWrapper>
    );
  }

  // ─── Teacher / Admin view ─────────────────────────────────────────────────

  const displayGroups = role === 'teacher' ? supervisedGroups : groups;
  const isAdmin = role === 'admin';

  return (
    <ScreenWrapper scroll={false}>
      <Text style={styles.heading}>{role === 'teacher' ? 'My FYP Groups' : 'FYP Portal'}</Text>
      <FlatList
        data={displayGroups}
        keyExtractor={(g: any) => g.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No FYP groups" />}
        renderItem={({ item }) => renderGroupCard(item, isAdmin)}
      />

      {/* Grade modal */}
      <Modal visible={gradeModal} animationType="fade" transparent>
        <View style={styles.centreOverlay}>
          <View style={styles.centreModal}>
            <Text style={styles.modalTitle}>Assign Grade</Text>
            <Text style={styles.label}>GRADE (e.g. A, B+, 85)</Text>
            <TextInput style={styles.fieldInput} placeholder="e.g. A, B+, 85" value={gradeVal}
              onChangeText={setGradeVal} placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>FEEDBACK / COMMENTS</Text>
            <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Optional remarks for the student…" value={gradeNote}
              onChangeText={setGradeNote} placeholderTextColor={colors.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setGradeModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => gradeMut.mutate()} disabled={gradeMut.isPending}>
                <Text style={styles.saveBtnText}>{gradeMut.isPending ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  list: { padding: spacing.lg, paddingBottom: 100 },

  submitFab: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  submitFabText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },

  // ── Group Card ───────────────────────────────────────────────────────────────
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  groupName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  projectTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary, marginBottom: spacing.xs },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  abstract: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  actionBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },

  // ── Submissions ──────────────────────────────────────────────────────────────
  subsSection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  subsTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  subCard: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  subName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },

  linkRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 6 },
  linkChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary + '40', backgroundColor: colors.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  linkChipText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },

  commentBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.xs },
  commentText: { flex: 1, fontSize: fontSize.xs, color: colors.primary, lineHeight: 18 },

  gradeLink: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },

  // ── Modals ───────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },

  centreOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  centreModal: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl, width: '88%' },

  label: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs, letterSpacing: 0.8 },

  // Milestone selector
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  selectorText: { fontSize: fontSize.md, color: colors.textPrimary, flex: 1 },

  // Drop zone
  dropzone: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, minHeight: 120 },
  dropzoneActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dropzoneInner: { alignItems: 'center', gap: 8 },
  dropzoneText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted, marginTop: spacing.xs },
  dropzoneSub: { fontSize: fontSize.xs, color: colors.textMuted },
  pickedFileRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  pickedFileName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  pickedFileMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  orDivider: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginVertical: spacing.md, fontWeight: '600' },
  githubRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, backgroundColor: colors.background },
  githubInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, paddingVertical: spacing.md },

  hintText:  { fontSize: fontSize.xs, color: colors.warning, marginTop: spacing.xs, textAlign: 'center' },
  errorText: { fontSize: fontSize.sm, color: colors.accent,  marginTop: spacing.sm, textAlign: 'center', fontWeight: '600' },

  submitBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  submitBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },

  // Milestone picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerContent: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl, width: '88%' },
  milestoneItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  milestoneItemActive: { },
  milestoneText: { fontSize: fontSize.md, color: colors.textPrimary, flex: 1 },

  // Grade modal
  fieldInput: { backgroundColor: colors.background, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, fontSize: fontSize.md, color: colors.textPrimary, marginBottom: spacing.xs },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.lg, marginTop: spacing.lg },
  cancelText: { fontSize: fontSize.md, color: colors.textMuted },
  saveBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
