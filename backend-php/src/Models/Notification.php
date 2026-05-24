<?php
namespace App\Models;

class Notification extends BaseModel {
    protected $table = 'notifications';
    protected $fillable = ['id', 'user_id', 'title', 'message', 'read'];
    protected $casts = [
        'read' => 'boolean'
    ];
}
