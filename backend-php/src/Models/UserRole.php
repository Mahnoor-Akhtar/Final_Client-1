<?php
namespace App\Models;

class UserRole extends BaseModel {
    protected $table = 'user_roles';
    protected $fillable = ['id', 'user_id', 'role'];
}
