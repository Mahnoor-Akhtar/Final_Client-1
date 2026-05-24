import React from 'react';
import { LayoutDashboard, GraduationCap, BookOpen, Settings } from 'lucide-react-native';
import CustomTabs, { TabDef } from './CustomTabs';

import AdminDashboard from '../screens/admin/DashboardScreen';
import StudentsScreen from '../screens/admin/StudentsScreen';
import TeachersScreen from '../screens/admin/TeachersScreen';
import CoursesScreen from '../screens/admin/CoursesScreen';
import DepartmentsScreen from '../screens/admin/DepartmentsScreen';
import AttendanceScreen from '../screens/shared/AttendanceScreen';
import TimetableScreen from '../screens/shared/TimetableScreen';
import FeesScreen from '../screens/shared/FeesScreen';
import FYPScreen from '../screens/shared/FYPScreen';
import ComplaintsScreen from '../screens/shared/ComplaintsScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const tabs: TabDef[] = [
  { key: 'home', label: 'Home', icon: ({ color, size }) => <LayoutDashboard size={size} color={color} />, screens: [{ key: 'dashboard', label: 'Dashboard', component: AdminDashboard }] },
  { key: 'academics', label: 'Academics', icon: ({ color, size }) => <GraduationCap size={size} color={color} />, screens: [
    { key: 'students', label: 'Students', component: StudentsScreen },
    { key: 'teachers', label: 'Teachers', component: TeachersScreen },
    { key: 'courses', label: 'Courses', component: CoursesScreen },
    { key: 'departments', label: 'Depts', component: DepartmentsScreen },
  ]},
  { key: 'operations', label: 'Operations', icon: ({ color, size }) => <BookOpen size={size} color={color} />, screens: [
    { key: 'attendance', label: 'Attendance', component: AttendanceScreen },
    { key: 'timetable', label: 'Timetable', component: TimetableScreen },
    { key: 'fees', label: 'Fees', component: FeesScreen },
    { key: 'fyp', label: 'FYP', component: FYPScreen },
    { key: 'complaints', label: 'Complaints', component: ComplaintsScreen },
  ]},
  { key: 'settings', label: 'Settings', icon: ({ color, size }) => <Settings size={size} color={color} />, screens: [{ key: 'settings', label: 'Settings', component: SettingsScreen }] },
];

export default function AdminTabs() {
  return <CustomTabs tabs={tabs} />;
}
