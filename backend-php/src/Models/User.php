<?php
namespace App\Models;

class User extends BaseModel {
    protected $table = 'users';
    protected $fillable = ['id', 'email', 'password', 'googleId', 'name', 'raw_user_meta_data'];
    protected $casts = [
        'raw_user_meta_data' => 'array'
    ];
    
    // In Express backend, password was selected in login/register, 
    // but hidden in me endpoint. We can customize the visible properties 
    // or select it when needed. By default, let's include it but allow hiding.
    protected $hidden = [];
}
