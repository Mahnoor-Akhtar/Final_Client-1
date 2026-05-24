<?php
namespace App;

use Illuminate\Database\Capsule\Manager as Capsule;

class Database {
    public static function bootstrap() {
        $capsule = new Capsule;

        $dbUrl = $_ENV['DATABASE_URL'] ?? null;
        
        $config = [
            'driver'   => 'pgsql',
            'host'     => '127.0.0.1',
            'database' => 'postgres',
            'username' => 'postgres',
            'password' => '',
            'port'     => '5432',
            'charset'  => 'utf8',
            'prefix'   => '',
            'schema'   => 'public',
            'sslmode'  => 'prefer',
        ];

        if ($dbUrl) {
            $parsed = parse_url($dbUrl);
            if ($parsed) {
                $config['host'] = $parsed['host'] ?? $config['host'];
                $config['port'] = $parsed['port'] ?? $config['port'];
                $config['database'] = ltrim($parsed['path'] ?? '', '/') ?: $config['database'];
                $config['username'] = $parsed['user'] ?? $config['username'];
                $config['password'] = isset($parsed['pass']) ? urldecode($parsed['pass']) : $config['password'];
            }
        }

        $config['options'] = [
            \PDO::ATTR_PERSISTENT => true,
        ];

        $capsule->addConnection($config);
        $capsule->setAsGlobal();
        $capsule->bootEloquent();
    }
}
