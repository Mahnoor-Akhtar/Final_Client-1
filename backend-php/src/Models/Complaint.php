<?php
namespace App\Models;

class Complaint extends BaseModel {
    protected $table = 'complaints';
    protected $fillable = ['id', 'student_id', 'title', 'category', 'description', 'status', 'reply', 'teacher_id'];
}
