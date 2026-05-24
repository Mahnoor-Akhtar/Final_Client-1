import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { LogOut, Lock, User } from 'lucide-react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function SettingsScreen() {
  const { session, role, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully');
      setOldPassword('');
      setNewPassword('');
    } catch (e: any) {
      const msg = e.response?.data?.error?.message ?? e.message ?? 'Failed to update password';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Text style={styles.heading}>Settings</Text>

      {/* Profile card */}
      <View style={styles.card}>
        <View style={styles.avatarBox}>
          <User size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.email}>{session?.user?.email ?? 'Unknown'}</Text>
          <Text style={styles.roleBadge}>{role?.toUpperCase()} PORTAL</Text>
        </View>
      </View>

      {/* Change password */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Lock size={16} color={colors.textMuted} />
          <Text style={styles.sectionTitle}>Change Password</Text>
        </View>
        <TextInput
          style={[styles.input, { marginBottom: spacing.md }]}
          placeholder="Current password"
          placeholderTextColor={colors.textMuted}
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="New password (min 6 chars)"
          placeholderTextColor={colors.textMuted}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.btn} onPress={handleChangePassword} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => {
        if (Platform.OS === 'web') {
          const confirmSignOut = window.confirm('Are you sure you want to sign out?');
          if (confirmSignOut) {
            logout();
          }
        } else {
          Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ]);
        }
      }}>
        <LogOut size={18} color={colors.accent} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xl },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl,
  },
  avatarBox: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  email: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  roleBadge: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, marginTop: 2, letterSpacing: 1 },
  section: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  input: {
    backgroundColor: colors.background, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, fontSize: fontSize.md, color: colors.textPrimary,
  },
  btn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.md,
  },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accentLight, borderRadius: borderRadius.md, paddingVertical: spacing.lg,
  },
  logoutText: { fontSize: fontSize.md, fontWeight: '700', color: colors.accent },
});
