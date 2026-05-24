<?php
namespace App\Models;

class Fee extends BaseModel {
    protected $table = 'fees';
    protected $fillable = ['id', 'student_id', 'title', 'amount', 'due_date', 'status', 'paid_at', 'method'];
    protected $casts = [
        'amount' => 'float'
    ];
}
