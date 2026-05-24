<?php
require __DIR__ . '/vendor/autoload.php';

if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} else if (file_exists(__DIR__ . '/../backend/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../backend');
    $dotenv->load();
}

App\Database::bootstrap();

try {
    $student = App\Models\Student::first();
    if (!$student) {
        die("No students found in DB\n");
    }
    
    echo "Found student: " . $student->full_name . " (ID: " . $student->id . ")\n";
    $origCourses = $student->courses;
    echo "Original courses: " . json_encode($origCourses) . "\n";
    
    $course = App\Models\Course::first();
    if (!$course) {
        die("No courses found in DB\n");
    }
    echo "Adding course: " . $course->title . " (ID: " . $course->id . ")\n";
    
    $updated = array_unique(array_merge($origCourses ?: [], [$course->id]));
    
    echo "Attempting to save courses: " . json_encode($updated) . "\n";
    $student->courses = $updated;
    $student->save();
    
    // Fetch again
    $studentRefetched = App\Models\Student::find($student->id);
    echo "Refetched courses: " . json_encode($studentRefetched->courses) . "\n";
    
    // Restore
    $student->courses = $origCourses;
    $student->save();
    echo "Success! Restored original courses.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
