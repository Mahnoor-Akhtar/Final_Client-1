# Punjab Colleges Mobile App — Complete Plan

## Color Theme

| Token | Value | Usage |
|-------|-------|-------|
| **Primary** | `#2563EB` (Blue-600) | Buttons, active tabs, headers |
| **Accent** | `#DC2626` (Red-600) | Badges, alerts, urgent items |
| **Background** | `#F8FAFC` (Slate-50) | Screen background |
| **Card** | `#FFFFFF` | Card surfaces |
| **Text Primary** | `#0F172A` (Slate-900) | Headings |
| **Text Muted** | `#64748B` (Slate-500) | Subtitles, labels |
| **Success** | `#16A34A` (Green-600) | Present, approved, paid |
| **Warning** | `#F59E0B` (Amber-500) | Pending states |
| **Border** | `#E2E8F0` (Slate-200) | Card borders, dividers |

---

## Navigation Structure

```
Bottom Tab Navigator (role-based)
├── Home (Dashboard)
├── Academics (Stack)
├── Operations (Stack)
└── Profile (Settings)
```

---

## All Screens by Role

### 1. AUTH SCREENS (Shared)

| Screen | Widgets | DB Connection |
|--------|---------|---------------|
| **Login** | Logo, Email `TextInput`, Password `TextInput`, Role badge (auto-detected), "Sign In" `Button` | `POST /api/auth/login` → `users` table |
| **Splash** | Animated PGC logo, role loading spinner | `GET /api/auth/session` |

---

### 2. ADMIN SCREENS (11 screens)

#### 2a. Dashboard
- **Widgets**: Stats cards (Total Students, Teachers, Courses, Departments), Recent complaints list, Quick action buttons
- **DB**: `GET /api/data/students`, `teachers`, `courses`, `departments`, `complaints`

#### 2b. Students List
- **Widgets**: `SearchBar`, `FlatList` of student cards (avatar, name, roll#, semester, department badge), FAB "+" to add
- **DB**: `GET /api/data/students`

#### 2c. Student Add/Edit
- **Widgets**: Form with `TextInput` (name, email, roll#, phone), `Picker` (department, degree, semester), image upload
- **DB**: `POST/PUT /api/data/students`

#### 2d. Teachers List
- **Widgets**: `SearchBar`, `FlatList` of teacher cards (name, email, department), FAB "+"
- **DB**: `GET /api/data/teachers`

#### 2e. Teacher Add/Edit
- **Widgets**: Form with `TextInput` (name, email, phone), `Picker` (department)
- **DB**: `POST/PUT /api/data/teachers`

#### 2f. Courses
- **Widgets**: Course cards (code badge, name, assigned teacher, student count), "Assign Courses" button → modal with multi-select checkboxes for teacher/students
- **DB**: `GET /api/data/courses`, `PUT /api/data/students` (enrollment), `PUT /api/data/courses` (teacher assign)

#### 2g. Departments
- **Widgets**: Department cards, Add/Edit modal
- **DB**: `GET/POST/PUT/DELETE /api/data/departments`

#### 2h. Attendance
- **Widgets**: `Picker` (course, date), student `FlatList` with Present/Absent toggle `Switch`, "Save" button
- **DB**: `GET /api/data/attendance`, `POST /api/data/attendance`

#### 2i. Timetable
- **Widgets**: Day tabs (Mon–Sat), time slot cards (course, teacher, room, time), FAB "+" to add slot
- **DB**: `GET/POST/PUT/DELETE /api/data/timetables`

#### 2j. Fees
- **Widgets**: Student fee cards (name, amount, status badge: Paid/Pending/Overdue), filter tabs
- **DB**: `GET/POST/PUT /api/data/fees`

#### 2k. FYP Portal
- **Widgets**: Group cards (group name, title, members, supervisor, status badge), Approve/Reject buttons, submissions list
- **DB**: `GET/PUT /api/data/fyp_groups`, `GET /api/data/fyp_submissions`

#### 2l. Complaints
- **Widgets**: Inbox list (subject, student name, status badge, date), detail view with reply `TextInput`
- **DB**: `GET/PUT /api/data/complaints`

#### 2m. Settings
- **Widgets**: Profile info, Change password, Sign out button
- **DB**: `PUT /api/auth/update`, `POST /api/auth/logout`

---

### 3. TEACHER SCREENS (8 screens)

#### 3a. Dashboard
- **Widgets**: Stats (My Courses, My Students, Pending Complaints, FYP Groups), today's schedule card
- **DB**: `GET /api/data/courses`, `students`, `complaints`, `timetables` (filtered by `teacher_id`)

#### 3b. My Courses
- **Widgets**: Course cards (code, name, student count), read-only
- **DB**: `GET /api/data/courses` (filtered `teacher_id`)

#### 3c. My Students
- **Widgets**: `FlatList` grouped by course, student cards with shared-course badges
- **DB**: `GET /api/data/students` (filtered by teacher's course IDs)

#### 3d. Attendance
- **Widgets**: `Picker` (my courses only, date), student roll with `Switch` toggles, Save button
- **DB**: `GET/POST /api/data/attendance`

#### 3e. Timetable
- **Widgets**: Day tabs, my schedule cards (course, room, time)
- **DB**: `GET /api/data/timetables` (filtered `teacher_id`)

#### 3f. FYP Groups
- **Widgets**: Supervised group cards, submission list per group, grade `TextInput` + Save
- **DB**: `GET /api/data/fyp_groups` (filtered `supervisor_id`), `GET/PUT /api/data/fyp_submissions`

#### 3g. Complaints
- **Widgets**: Only complaints assigned to me, reply input
- **DB**: `GET/PUT /api/data/complaints` (filtered `teacher_id`)

#### 3h. Settings
- **Widgets**: Profile, change password, sign out

---

### 4. STUDENT SCREENS (8 screens)

#### 4a. Dashboard
- **Widgets**: Stats (Enrolled Courses, Attendance %, Fee Status, FYP Status), today's classes card
- **DB**: `GET /api/data/students` (my record), `attendance`, `fees`, `fyp_groups`

#### 4b. My Courses
- **Widgets**: Enrolled course cards (code badge, name, teacher name), read-only
- **DB**: `GET /api/data/courses` (filtered by student's `courses[]`)

#### 4c. Timetable
- **Widgets**: Day tabs, my class cards (course, teacher, room, time)
- **DB**: `GET /api/data/timetables` (filtered by enrolled `course_id`s)

#### 4d. Attendance
- **Widgets**: Course `Picker`, attendance history `FlatList` (date, status badge Present/Absent), attendance % progress bar
- **DB**: `GET /api/data/attendance` (filtered `student_id`)

#### 4e. Fees
- **Widgets**: Fee cards (amount, due date, status badge), payment history
- **DB**: `GET /api/data/fees` (filtered `student_id`)

#### 4f. FYP Progress
- **If in a group**: Group info card (name, title, supervisor, members), submissions list, upload PDF button, grades display
- **If not in a group**: Registration form (group name, title, abstract, select members, select supervisor)
- **DB**: `GET /api/data/fyp_groups`, `GET/POST /api/data/fyp_submissions`

#### 4g. Complaints
- **Widgets**: My complaints list, "New Complaint" FAB → form (subject, category picker, description `TextInput`), status tracking
- **DB**: `GET/POST /api/data/complaints` (filtered `student_id`)

#### 4h. Settings
- **Widgets**: Profile info, change password, sign out

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native (Expo) |
| **Navigation** | React Navigation (Bottom Tabs + Stack) |
| **State/Data** | TanStack React Query (same as web) |
| **HTTP Client** | Reuse `mern` client adapted for React Native |
| **Icons** | `lucide-react-native` |
| **UI Components** | React Native Paper or NativeWind (Tailwind for RN) |
| **File Upload** | `expo-document-picker` for FYP PDFs |
| **Notifications** | Socket.IO client (same as web) |

---

## Folder Structure

```
mobile/
├── App.tsx
├── src/
│   ├── navigation/
│   │   ├── AuthStack.tsx
│   │   ├── AdminTabs.tsx
│   │   ├── TeacherTabs.tsx
│   │   └── StudentTabs.tsx
│   ├── screens/
│   │   ├── auth/          (Login, Splash)
│   │   ├── admin/         (Dashboard, Students, Teachers, ...)
│   │   ├── teacher/       (Dashboard, MyCourses, Attendance, ...)
│   │   └── student/       (Dashboard, MyCourses, Attendance, ...)
│   ├── components/        (Cards, Badges, FormInputs, ...)
│   ├── hooks/             (useAuth, useApi)
│   ├── services/          (api client - reuse mern logic)
│   └── theme/             (colors, fonts, spacing)
├── package.json
└── app.json
```

---

## Summary

- **Total unique screens**: ~27 across all 3 roles
- **Backend**: Same PHP backend — no changes needed
- **API base URL**: Point to your deployed backend (e.g. `http://<your-ip>:5000`)
