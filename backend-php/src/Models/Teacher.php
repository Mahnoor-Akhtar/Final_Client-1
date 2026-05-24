<?php
namespace App\Models;

class Teacher extends BaseModel {
    protected $table = 'teachers';
    protected $fillable = [
        'id', 'user_id', 'employee_id', 'full_name', 'email', 'phone', 
        'department_id', 'qualification', 'salary'
    ];
    protected $casts = [
        'salary' => 'float'
    ];
}
