<?php
/**
 * Run this script ONCE to add database indexes for fast queries.
 * Usage: php create_indexes.php
 */
require __DIR__ . '/vendor/autoload.php';

if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} else if (file_exists(__DIR__ . '/../backend/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../backend');
    $dotenv->load();
}

App\Database::bootstrap();

$capsule = \Illuminate\Database\Capsule\Manager::connection();

$indexes = [
    // users
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
    
    // user_roles
    "CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role)",
    
    // students
    "CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_students_email ON students (email)",
    "CREATE INDEX IF NOT EXISTS idx_students_department_id ON students (department_id)",
    
    // teachers
    "CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers (email)",
    "CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON teachers (department_id)",
    
    // courses
    "CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses (teacher_id)",
    "CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses (department_id)",
    
    // attendance
    "CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance (student_id)",
    
    // timetables
    "CREATE INDEX IF NOT EXISTS idx_timetables_teacher_id ON timetables (teacher_id)",
    "CREATE INDEX IF NOT EXISTS idx_timetables_department_id ON timetables (department_id)",
    
    // fees
    "CREATE INDEX IF NOT EXISTS idx_fees_student_id ON fees (student_id)",
    
    // fyp_groups
    "CREATE INDEX IF NOT EXISTS idx_fyp_groups_supervisor_id ON fyp_groups (supervisor_id)",
    "CREATE INDEX IF NOT EXISTS idx_fyp_groups_status ON fyp_groups (status)",
    
    // fyp_submissions
    "CREATE INDEX IF NOT EXISTS idx_fyp_submissions_group_id ON fyp_submissions (group_id)",
    
    // complaints
    "CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON complaints (student_id)",
    "CREATE INDEX IF NOT EXISTS idx_complaints_teacher_id ON complaints (teacher_id)",
    "CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status)",
    
    // notifications
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)",
    'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications ("createdAt" DESC)',
];

echo "Creating database indexes...\n\n";

$success = 0;
$failed = 0;

foreach ($indexes as $sql) {
    try {
        $capsule->statement($sql);
        echo "  OK: $sql\n";
        $success++;
    } catch (\Exception $e) {
        echo "  SKIP: $sql\n       Reason: " . $e->getMessage() . "\n";
        $failed++;
    }
}

echo "\nDone! Created: $success, Skipped: $failed\n";
