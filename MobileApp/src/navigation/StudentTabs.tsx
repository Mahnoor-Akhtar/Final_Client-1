import React from 'react';
import { LayoutDashboard, BookOpen, CalendarClock, Settings } from 'lucide-react-native';
import CustomTabs, { TabDef } from './CustomTabs';

import StudentDashboard from '../screens/student/DashboardScreen';
import StudentCoursesScreen from '../screens/student/MyCoursesScreen';
import TimetableScreen from '../screens/shared/TimetableScreen';
import AttendanceScreen from '../screens/shared/AttendanceScreen';
import FeesScreen from '../screens/shared/FeesScreen';
import FYPScreen from '../screens/shared/FYPScreen';
import ComplaintsScreen from '../screens/shared/ComplaintsScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const tabs: TabDef[] = [
  { key: 'home', label: 'Home', icon: ({ color, size }) => <LayoutDashboard size={size} color={color} />, screens: [{ key: 'dashboard', label: 'Dashboard', component: StudentDashboard }] },
  { key: 'academics', label: 'Academics', icon: ({ color, size }) => <BookOpen size={size} color={color} />, screens: [
    { key: 'courses', label: 'Courses', component: StudentCoursesScreen },
    { key: 'timetable', label: 'Timetable', component: TimetableScreen },
  ]},
  { key: 'operations', label: 'Operations', icon: ({ color, size }) => <CalendarClock size={size} color={color} />, screens: [
    { key: 'attendance', label: 'Attendance', component: AttendanceScreen },
    { key: 'fees', label: 'Fees', component: FeesScreen },
    { key: 'fyp', label: 'FYP', component: FYPScreen },
    { key: 'complaints', label: 'Complaints', component: ComplaintsScreen },
  ]},
  { key: 'settings', label: 'Settings', icon: ({ color, size }) => <Settings size={size} color={color} />, screens: [{ key: 'settings', label: 'Settings', component: SettingsScreen }] },
];

export default function StudentTabs() {
  return <CustomTabs tabs={tabs} />;
}
