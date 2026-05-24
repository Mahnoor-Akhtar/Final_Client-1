import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import AuthStack from './AuthStack';
import AdminTabs from './AdminTabs';
import TeacherTabs from './TeacherTabs';
import StudentTabs from './StudentTabs';

export default function RootNavigator() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session || !role) {
    return <AuthStack />;
  }

  switch (role) {
    case 'admin':
      return <AdminTabs />;
    case 'teacher':
      return <TeacherTabs />;
    case 'student':
      return <StudentTabs />;
    default:
      return <AuthStack />;
  }
}
