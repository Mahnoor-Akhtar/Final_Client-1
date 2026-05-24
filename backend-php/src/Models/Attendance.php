<?php
namespace App\Models;

class Attendance extends BaseModel {
    protected $table = 'attendance';
    protected $fillable = ['id', 'date', 'student_id', 'course_id', 'status'];
}
