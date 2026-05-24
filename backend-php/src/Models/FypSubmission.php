<?php
namespace App\Models;

class FypSubmission extends BaseModel {
    protected $table = 'fyp_submissions';
    protected $fillable = [
        'id', 'group_id', 'title', 'file_name', 'file_path', 
        'github_link', 'submitted_at', 'comments', 'grade'
    ];
}
