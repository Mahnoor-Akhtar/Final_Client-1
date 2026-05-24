import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize, spacing } from '../theme';

type Variant = 'primary' | 'success' | 'warning' | 'accent' | 'muted';

const variantStyles: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: colors.primaryLight, text: colors.primary },
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  accent: { bg: colors.accentLight, text: colors.accent },
  muted: { bg: colors.border, text: colors.textMuted },
};

interface BadgeProps {
  label: string;
  variant?: Variant;
}

export default function Badge({ label, variant = 'primary' }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
