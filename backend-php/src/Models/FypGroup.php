<?php
namespace App\Models;

class FypGroup extends BaseModel {
    protected $table = 'fyp_groups';
    protected $fillable = ['id', 'group_name', 'title', 'abstract', 'members', 'supervisor_id', 'status'];

    /**
     * Read PostgreSQL text[] as a PHP array.
     */
    public function getMembersAttribute($value) {
        if (empty($value)) return [];
        if (is_array($value)) return $value;
        if (is_string($value)) {
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
    public function setMembersAttribute($value) {
        if (is_array($value)) {
            $parts = array_map(function($v) {
                return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $v) . '"';
            }, $value);
            $this->attributes['members'] = '{' . implode(',', $parts) . '}';
        } elseif (is_string($value) && preg_match('/^\{.*\}$/s', $value)) {
            $this->attributes['members'] = $value;
        } else {
            $this->attributes['members'] = $value;
        }
    }
}
