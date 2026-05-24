import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import AppBar from './AppBar';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  title?: string;
  right?: React.ReactNode;
}

export default function ScreenWrapper({ children, scroll = true, title, right }: Props) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe}>
      {title ? <AppBar title={title} right={right} /> : null}
      <Container
        style={styles.container}
        {...(scroll ? { contentContainerStyle: title ? styles.scrollContentWithBar : styles.scrollContent, showsVerticalScrollIndicator: false } : {})}
      >
        {!title && children}
        {title && scroll && <View style={styles.content}>{children}</View>}
        {title && !scroll && children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  scrollContentWithBar: {
    paddingBottom: 100,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
});
