<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BaseModel extends Model {
    protected $keyType = 'string';
    public $incrementing = false;

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    /**
     * Generate a UUID v4 using only PHP built-ins (no ramsey/uuid needed).
     */
    private static function generateUuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // variant RFC 4122
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    protected static function boot() {
        parent::boot();

        // Register creating event as a fallback when event dispatcher IS available
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = self::generateUuid();
            }
        });
    }

    /**
     * Override save() to guarantee UUID generation even when the Eloquent
     * event dispatcher is not configured (e.g. bare Capsule setup).
     */
    public function save(array $options = []) {
        if (!$this->exists && empty($this->{$this->getKeyName()})) {
            $this->{$this->getKeyName()} = self::generateUuid();
        }
        return parent::save($options);
    }

    public function toArray() {
        $array = parent::toArray();
        if (isset($array['id'])) {
            $array['_id'] = $array['id'];
        }
        return $array;
    }
}

