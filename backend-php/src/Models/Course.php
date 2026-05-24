<?php
namespace App\Models;

class Course extends BaseModel {
    protected $table = 'courses';
    protected $fillable = [
        'id', 'code', 'title', 'credit_hours', 'semester', 'degree', 
        'department_id', 'teacher_id'
    ];
    protected $casts = [
        'credit_hours' => 'integer',
        'semester' => 'integer'
    ];
}
