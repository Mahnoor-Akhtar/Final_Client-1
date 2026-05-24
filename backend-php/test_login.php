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
    $users = App\Models\User::all();
    echo "USERS IN DB:\n";
    foreach ($users as $u) {
        echo "- ID: {$u->id}, Email: {$u->email}\n";
    }

    $roles = App\Models\UserRole::all();
    echo "\nUSER ROLES IN DB:\n";
    foreach ($roles as $r) {
        echo "- ID: {$r->id}, UserID: {$r->user_id}, Role: {$r->role}\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
