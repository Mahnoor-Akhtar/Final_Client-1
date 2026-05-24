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
    $count = App\Models\Teacher::count();
    echo 'Teacher count: ' . $count . PHP_EOL;
    $teachers = App\Models\Teacher::limit(5)->get();
    echo 'Teachers sample: ' . json_encode($teachers, JSON_PRETTY_PRINT) . PHP_EOL;
} catch (\Exception $err) {
    echo 'Error checking teachers: ' . $err->getMessage() . PHP_EOL;
}
