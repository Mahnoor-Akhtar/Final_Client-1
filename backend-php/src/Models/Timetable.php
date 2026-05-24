<?php
namespace App\Models;

class Timetable extends BaseModel {
    protected $table = 'timetables';
    protected $fillable = ['id', 'day', 'slot', 'room', 'course_id', 'teacher_id', 'department_id'];
}
