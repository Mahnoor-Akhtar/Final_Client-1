import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../theme';

interface Props {
  title: string;
  right?: React.ReactNode;
}

export default function AppBar({ title, right }: Props) {
  return (
    <View style={styles.bar}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  right: {
    marginLeft: spacing.md,
  },
});
