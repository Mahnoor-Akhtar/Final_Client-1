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
        die("No student found\n");
    }

    echo "Found student: " . $student->full_name . " (ID: " . $student->id . ")\n";
    $origCourses = $student->courses;
    echo "Original: " . json_encode($origCourses) . "\n";

    // Simulate API update logic
    $cleaned = ['courses' => ['course-1', 'course-2']];
    
    // This is what $doc->update($cleaned) does in index.php
    $student->update($cleaned);

    // Refetch
    $student2 = App\Models\Student::find($student->id);
    echo "After update(): " . json_encode($student2->courses) . "\n";

    // Restore
    $student2->update(['courses' => $origCourses]);
    echo "Restored original.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
