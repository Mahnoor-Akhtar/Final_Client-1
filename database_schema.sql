-- ============================================================================
-- PGC College Management System - Complete PostgreSQL Schema
-- ============================================================================
-- Run this script ONCE in your new Supabase project's SQL Editor
-- before starting the PHP backend.
-- This creates all 14 tables exactly as the Eloquent models expect.
-- ============================================================================

-- Enable UUID extension (required for gen_random_uuid if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    "googleId" TEXT UNIQUE,
    name TEXT,
    "raw_user_meta_data" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. USER_ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. DEPARTMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. DEGREES
-- ============================================================================
CREATE TABLE IF NOT EXISTS degrees (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level TEXT,
    duration_years INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. TEACHERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    qualification TEXT,
    salary NUMERIC(12,2),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. STUDENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    roll_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    degree TEXT,
    semester INTEGER,
    address TEXT,
    image_url TEXT,
    courses TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. COURSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credit_hours INTEGER,
    semester INTEGER,
    degree TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. ATTENDANCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY,
    date TEXT NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. TIMETABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY,
    day TEXT NOT NULL,
    slot TEXT NOT NULL,
    room TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. FEES
-- ============================================================================
CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    due_date TEXT,
    paid_date TEXT,
    description TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. COMPLAINTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    reply TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. FYP_GROUPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS fyp_groups (
    id UUID PRIMARY KEY,
    group_name TEXT NOT NULL,
    title TEXT,
    supervisor_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    members TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. FYP_SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS fyp_submissions (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES fyp_groups(id) ON DELETE CASCADE,
    file_url TEXT,
    grade TEXT,
    remarks TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);
CREATE INDEX IF NOT EXISTS idx_students_department_id ON students (department_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers (user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers (email);
CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON teachers (department_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses (teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses (department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_timetables_teacher_id ON timetables (teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetables_department_id ON timetables (department_id);
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON fees (student_id);
CREATE INDEX IF NOT EXISTS idx_fyp_groups_supervisor_id ON fyp_groups (supervisor_id);
CREATE INDEX IF NOT EXISTS idx_fyp_groups_status ON fyp_groups (status);
CREATE INDEX IF NOT EXISTS idx_fyp_submissions_group_id ON fyp_submissions (group_id);
CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON complaints (student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications ("createdAt" DESC);

-- ============================================================================
-- DONE
-- ============================================================================
