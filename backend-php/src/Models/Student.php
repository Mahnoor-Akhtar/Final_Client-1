<?php
namespace App\Models;

class Student extends BaseModel {
    protected $table = 'students';
    protected $fillable = [
        'id', 'user_id', 'roll_number', 'full_name', 'email', 'phone',
        'department_id', 'degree', 'semester', 'address', 'image_url', 'courses'
    ];
    protected $casts = [
        'semester' => 'integer'
    ];

    /**
     * Read PostgreSQL text[] as a PHP array.
     */
    public function getCoursesAttribute($value) {
        if (empty($value)) return [];
        if (is_array($value)) return $value;
        if (is_string($value)) {
            // PostgreSQL array literal: {"a","b"}
            if (preg_match('/^\{(.*)\}$/s', $value, $matches)) {
                $inner = $matches[1];
                if ($inner === '') return [];
                preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"|([^,]+)/', $inner, $m, PREG_SET_ORDER);
                $result = [];
                foreach ($m as $match) {
                    if (isset($match[1]) && $match[1] !== '') {
                        $result[] = str_replace(['\\\\', '\\"'], ['\\', '"'], $match[1]);
                    } elseif (isset($match[2])) {
                        $result[] = trim($match[2]);
                    }
                }
                return $result;
            }
        }
        return [];
    }

    /**
     * Write PHP array as a PostgreSQL text[] literal.
     */
    public function setCoursesAttribute($value) {
        if (is_array($value)) {
            $parts = array_map(function($v) {
                return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $v) . '"';
            }, $value);
            $this->attributes['courses'] = '{' . implode(',', $parts) . '}';
        } elseif (is_string($value) && preg_match('/^\{.*\}$/s', $value)) {
            $this->attributes['courses'] = $value;
        } else {
            $this->attributes['courses'] = $value;
        }
    }
}
