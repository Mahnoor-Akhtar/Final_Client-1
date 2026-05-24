import React from 'react';
import { LayoutDashboard, BookOpen, Users, Settings } from 'lucide-react-native';
import CustomTabs, { TabDef } from './CustomTabs';

import TeacherDashboard from '../screens/teacher/DashboardScreen';
import MyCoursesScreen from '../screens/teacher/MyCoursesScreen';
import MyStudentsScreen from '../screens/teacher/MyStudentsScreen';
import AttendanceScreen from '../screens/shared/AttendanceScreen';
import TimetableScreen from '../screens/shared/TimetableScreen';
import FYPScreen from '../screens/shared/FYPScreen';
import ComplaintsScreen from '../screens/shared/ComplaintsScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const tabs: TabDef[] = [
  { key: 'home', label: 'Home', icon: ({ color, size }) => <LayoutDashboard size={size} color={color} />, screens: [{ key: 'dashboard', label: 'Dashboard', component: TeacherDashboard }] },
  { key: 'teaching', label: 'Teaching', icon: ({ color, size }) => <BookOpen size={size} color={color} />, screens: [
    { key: 'courses', label: 'My Courses', component: MyCoursesScreen },
    { key: 'students', label: 'My Students', component: MyStudentsScreen },
  ]},
  { key: 'operations', label: 'Operations', icon: ({ color, size }) => <Users size={size} color={color} />, screens: [
    { key: 'attendance', label: 'Attendance', component: AttendanceScreen },
    { key: 'timetable', label: 'Timetable', component: TimetableScreen },
    { key: 'fyp', label: 'FYP Groups', component: FYPScreen },
    { key: 'complaints', label: 'Complaints', component: ComplaintsScreen },
  ]},
  { key: 'settings', label: 'Settings', icon: ({ color, size }) => <Settings size={size} color={color} />, screens: [{ key: 'settings', label: 'Settings', component: SettingsScreen }] },
];

export default function TeacherTabs() {
  return <CustomTabs tabs={tabs} />;
}
