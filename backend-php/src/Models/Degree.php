<?php
namespace App\Models;

class Degree extends BaseModel {
    protected $table = 'degrees';
    protected $fillable = ['id', 'name', 'code', 'duration_years'];
    protected $casts = [
        'duration_years' => 'integer'
    ];
}
