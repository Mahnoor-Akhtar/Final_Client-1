import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../theme';

export interface TabDef {
  key: string;
  label: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
  screens: { key: string; label: string; component: React.ComponentType }[];
}

interface Props {
  tabs: TabDef[];
}

export default function CustomTabs({ tabs }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeScreen, setActiveScreen] = useState(0);

  const currentTab = tabs[activeTab];
  const currentScreenDef = currentTab.screens[activeScreen];
  const CurrentComponent = currentScreenDef.component;

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    setActiveScreen(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Sub-navigation for stacks with multiple screens */}
        {currentTab.screens.length > 1 && (
          <View style={styles.subNav}>
            {currentTab.screens.map((s, i) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.subNavBtn, activeScreen === i && styles.subNavBtnActive]}
                onPress={() => setActiveScreen(i)}
              >
                <Text style={[styles.subNavText, activeScreen === i && styles.subNavTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.screen}>
          <CurrentComponent />
        </View>
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab, i) => {
          const isActive = activeTab === i;
          const color = isActive ? colors.primary : colors.textMuted;
          return (
            <TouchableOpacity key={tab.key} style={styles.tabBtn} onPress={() => handleTabPress(i)}>
              {tab.icon({ color, size: 22 })}
              <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1 },
  screen: { flex: 1 },
  subNav: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  subNavBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subNavBtnActive: {
    borderBottomColor: colors.primary,
  },
  subNavText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  subNavTextActive: {
    color: colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
