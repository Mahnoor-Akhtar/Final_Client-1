<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Database;
use App\Cache;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Course;
use App\Models\Attendance;
use App\Models\Timetable;
use App\Models\Fee;
use App\Models\FypGroup;
use App\Models\FypSubmission;
use App\Models\Complaint;
use App\Models\Notification;
use App\Models\Degree;
use App\Middleware\AuthMiddleware;
use App\NotificationService;
use Illuminate\Support\Str;

require __DIR__ . '/../vendor/autoload.php';

// Load Env
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} else if (file_exists(__DIR__ . '/../../backend/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../backend');
    $dotenv->load();
}

// Bootstrap Eloquent
Database::bootstrap();

$app = AppFactory::create();

// Add routing middleware
$app->addRoutingMiddleware();

// Add error middleware to handle Slim exceptions (like 404 Not Found) gracefully
$app->addErrorMiddleware(true, true, true);

// CORS Middleware
$app->add(function (Request $request, $handler) {
    if ($request->getMethod() === 'OPTIONS') {
        $response = new \Slim\Psr7\Response();
    } else {
        $response = $handler->handle($request);
    }
    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization, Accept-Encoding')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
});

// Gzip compression middleware
$app->add(function (Request $request, $handler) {
    $response = $handler->handle($request);
    $accept = $request->getHeaderLine('Accept-Encoding');
    $body = (string) $response->getBody();
    if (strlen($body) > 256 && str_contains($accept, 'gzip') && function_exists('gzencode')) {
        $compressed = gzencode($body, 6);
        if ($compressed !== false) {
            $newResponse = new \Slim\Psr7\Response($response->getStatusCode());
            $newResponse->getBody()->write($compressed);
            foreach ($response->getHeaders() as $name => $values) {
                foreach ($values as $value) {
                    $newResponse = $newResponse->withAddedHeader($name, $value);
                }
            }
            return $newResponse
                ->withHeader('Content-Encoding', 'gzip')
                ->withHeader('Vary', 'Accept-Encoding')
                ->withHeader('Content-Length', (string) strlen($compressed));
        }
    }
    return $response;
});

// Models map
$modelsMap = [
    'users' => User::class,
    'departments' => App\Models\Department::class,
    'students' => Student::class,
    'teachers' => Teacher::class,
    'courses' => Course::class,
    'attendance' => Attendance::class,
    'timetables' => Timetable::class,
    'fees' => Fee::class,
    'fyp_groups' => FypGroup::class,
    'fyp_submissions' => FypSubmission::class,
    'complaints' => Complaint::class,
    'notifications' => Notification::class,
    'degrees' => Degree::class,
    'user_roles' => UserRole::class,
];

// Helper to run query with dynamic mapping
$validateTable = function(Request $request, $handler) use ($modelsMap) {
    $routeContext = \Slim\Routing\RouteContext::fromRequest($request);
    $route = $routeContext->getRoute();
    $table = $route ? $route->getArgument('table') : '';
    
    if (!isset($modelsMap[$table])) {
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write(json_encode(['error' => ['message' => "Table/Collection '$table' not found"]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }
    return $handler->handle($request);
};

// --- AUTH ROUTES ---

// Register
$app->post('/api/auth/register', function (Request $request, Response $response) {
    $body = json_decode($request->getBody()->getContents(), true) ?? [];
    $email = isset($body['email']) ? trim(strtolower($body['email'])) : '';
    $password = $body['password'] ?? '';
    $options = $body['options'] ?? [];

    if (empty($email) || empty($password)) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Email and password are required']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $existing = User::where('email', $email)->first();
        if ($existing) {
            $response->getBody()->write(json_encode(['error' => ['message' => 'User already exists']]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
        $fullName = $options['data']['full_name'] ?? explode('@', $email)[0];

        $user = User::create([
            'email' => $email,
            'password' => $hashedPassword,
            'raw_user_meta_data' => ['full_name' => $fullName]
        ]);

        $role = 'student';
        if (str_ends_with($email, '@admin.com') || str_contains($email, 'admin')) {
            $role = 'admin';
        } else if (str_ends_with($email, '@teacher.com') || str_contains($email, 'teacher')) {
            $role = 'teacher';
        }

        UserRole::create([
            'user_id' => $user->id,
            'role' => $role
        ]);

        $profileDetails = $options['data'] ?? [];
        if ($role === 'student') {
            Student::create([
                'user_id' => $user->id,
                'roll_number' => $profileDetails['roll_number'] ?? ('ROLL-' . rand(1000, 9999)),
                'full_name' => $fullName,
                'email' => $email,
                'department_id' => $profileDetails['department_id'] ?? 'dept-cs',
                'degree' => $profileDetails['degree'] ?? 'BSCS',
                'semester' => isset($profileDetails['semester']) ? intval($profileDetails['semester']) : 1,
            ]);
        } else if ($role === 'teacher') {
            Teacher::create([
                'user_id' => $user->id,
                'employee_id' => $profileDetails['employee_id'] ?? ('EMP-' . rand(1000, 9999)),
                'full_name' => $fullName,
                'email' => $email,
                'department_id' => $profileDetails['department_id'] ?? 'dept-cs',
                'qualification' => $profileDetails['qualification'] ?? 'MS CS',
                'salary' => 80000,
            ]);
        }

        $secret = $_ENV['JWT_SECRET'] ?? 'supersecure_college_cms_secret_key_12345';
        $payload = [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $role,
            'exp' => time() + (7 * 24 * 60 * 60) // 7 days
        ];
        $token = JWT::encode($payload, $secret, 'HS256');

        $sessionPayload = [
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => 604800,
            'user' => [
                'id' => $user->id,
                'aud' => 'authenticated',
                'role' => 'authenticated',
                'email' => $user->email,
                'email_confirmed_at' => date(DATE_ATOM),
                'confirmed_at' => date(DATE_ATOM),
                'last_sign_in_at' => date(DATE_ATOM),
                'user_metadata' => array_merge($user->raw_user_meta_data ?? [], ['role' => $role]),
                'created_at' => $user->created_at ? $user->created_at->format(DATE_ATOM) : null,
                'updated_at' => $user->updated_at ? $user->updated_at->format(DATE_ATOM) : null,
            ]
        ];

        $response->getBody()->write(json_encode([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'raw_user_meta_data' => $user->raw_user_meta_data,
                ],
                'session' => $sessionPayload
            ],
            'error' => null
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
});

// Login
$app->post('/api/auth/login', function (Request $request, Response $response) {
    $body = json_decode($request->getBody()->getContents(), true) ?? [];
    $email = isset($body['email']) ? trim(strtolower($body['email'])) : '';
    $password = $body['password'] ?? '';

    if (empty($email) || empty($password)) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Email and password are required']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $user = User::select('users.*', 'user_roles.role')
            ->leftJoin('user_roles', 'user_roles.user_id', '=', 'users.id')
            ->where('users.email', $email)
            ->first();

        if (!$user) {
            $response->getBody()->write(json_encode(['error' => ['message' => 'User does not exist. Please register first.']]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        if (!password_verify($password, $user->password)) {
            $response->getBody()->write(json_encode(['error' => ['message' => 'Invalid credentials']]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $role = $user->role ?? '';

        $secret = $_ENV['JWT_SECRET'] ?? 'supersecure_college_cms_secret_key_12345';
        $payload = [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $role,
            'exp' => time() + (7 * 24 * 60 * 60)
        ];
        $token = JWT::encode($payload, $secret, 'HS256');

        $sessionPayload = [
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => 604800,
            'user' => [
                'id' => $user->id,
                'aud' => 'authenticated',
                'role' => 'authenticated',
                'email' => $user->email,
                'email_confirmed_at' => date(DATE_ATOM),
                'confirmed_at' => date(DATE_ATOM),
                'last_sign_in_at' => date(DATE_ATOM),
                'user_metadata' => array_merge($user->raw_user_meta_data ?? [], ['role' => $role]),
                'created_at' => $user->created_at ? $user->created_at->format(DATE_ATOM) : null,
                'updated_at' => $user->updated_at ? $user->updated_at->format(DATE_ATOM) : null,
            ]
        ];

        $response->getBody()->write(json_encode([
            'data' => [
                'session' => $sessionPayload,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'raw_user_meta_data' => $user->raw_user_meta_data
                ]
            ],
            'error' => null
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
});

// Logout
$app->post('/api/auth/logout', function (Request $request, Response $response) {
    $response->getBody()->write(json_encode(['error' => null]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Change Password
$app->post('/api/auth/change-password', function (Request $request, Response $response) {
    $body = json_decode($request->getBody()->getContents(), true) ?? [];
    $oldPassword = $body['oldPassword'] ?? '';
    $newPassword = $body['newPassword'] ?? '';

    if (empty($oldPassword) || empty($newPassword)) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Both old and new passwords are required']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    if (strlen($newPassword) < 6) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'New password must be at least 6 characters']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $userAttr = $request->getAttribute('user');
    if (!$userAttr || !isset($userAttr['id'])) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Unauthorized']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    try {
        $user = User::find($userAttr['id']);
        if (!$user) {
            $response->getBody()->write(json_encode(['error' => ['message' => 'User not found']]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        if (!password_verify($oldPassword, $user->password)) {
            $response->getBody()->write(json_encode(['error' => ['message' => 'Current password is incorrect']]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $user->password = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 10]);
        $user->save();

        $response->getBody()->write(json_encode(['error' => null, 'data' => ['ok' => true]]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

// Reset Password
$app->post('/api/auth/reset-password', function (Request $request, Response $response) {
    $body = json_decode($request->getBody()->getContents(), true) ?? [];
    $email = isset($body['email']) ? trim(strtolower($body['email'])) : '';
    $newPassword = $body['newPassword'] ?? '';

    if (empty($email) || empty($newPassword)) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Email and new password are required']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    if (strlen($newPassword) < 6) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'New password must be at least 6 characters']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $user = User::where('email', $email)->first();
        if (!$user) {
            $response->getBody()->write(json_encode(['error' => ['message' => 'User with this email does not exist']]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $user->password = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 10]);
        $user->save();

        $response->getBody()->write(json_encode(['error' => null, 'data' => ['ok' => true]]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
});

// Me
$app->get('/api/auth/me', function (Request $request, Response $response) {
    $userAttr = $request->getAttribute('user');
    if (!$userAttr || !isset($userAttr['id'])) {
        $response->getBody()->write(json_encode(['message' => 'Unauthorized']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    try {
        $user = User::find($userAttr['id']);
        if (!$user) {
            $response->getBody()->write(json_encode(['message' => 'User not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        // Return user with keys matching frontend (including _id)
        $doc = $user->toArray();
        $response->getBody()->write(json_encode($doc));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['message' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

// OAuth Callback Redirection Emulation
$app->get('/api/auth/google/callback', function (Request $request, Response $response) {
    // Return standard redirect with mock token (just like in server.js callbacks)
    $secret = $_ENV['JWT_SECRET'] ?? 'supersecure_college_cms_secret_key_12345';
    // Make a dummy google user payload for callback
    $payload = [
        'id' => 'google-user-id-' . rand(1000, 9999),
        'email' => 'google-user@college.edu',
        'exp' => time() + (7 * 24 * 60 * 60)
    ];
    $token = JWT::encode($payload, $secret, 'HS256');
    return $response
        ->withHeader('Location', "http://localhost:5173/app?token=$token")
        ->withStatus(302);
});

// Root route
$app->get('/', function (Request $request, Response $response) {
    $response->getBody()->write(json_encode([
        'message' => 'PGC CMS API is running',
        'status' => 'healthy',
        'health_check' => '/health'
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Health check
$app->get('/health', function (Request $request, Response $response) {
    $response->getBody()->write(json_encode([
        'status' => 'healthy',
        'timestamp' => date(DATE_ATOM)
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

// --- DATA FILE UPLOAD ROUTE ---
$app->post('/api/upload', function (Request $request, Response $response) {
    $uploadedFiles = $request->getUploadedFiles();
    $uploadedFile = $uploadedFiles['file'] ?? null;
    
    if (!$uploadedFile || $uploadedFile->getError() !== UPLOAD_ERR_OK) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'No file uploaded or upload error occurred']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $uploadDir = __DIR__ . '/uploads';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $extension = pathinfo($uploadedFile->getClientFilename(), PATHINFO_EXTENSION);
    $filename = time() . '-' . rand(100000000, 999999999) . ($extension ? '.' . $extension : '');
    $uploadedFile->moveTo($uploadDir . '/' . $filename);

    $uri = $request->getUri();
    $baseUrl = $uri->getScheme() . '://' . $uri->getHost() . ($uri->getPort() ? ':' . $uri->getPort() : '');
    // In dev environment, if Apache or PHP server serves from public root:
    $fileUrl = $baseUrl . '/uploads/' . $filename;

    $response->getBody()->write(json_encode([
        'data' => [
            'file_path' => $fileUrl,
            'file_name' => $uploadedFile->getClientFilename(),
        ],
        'error' => null
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

// --- DASHBOARD STATS ROUTE ---
$app->get('/api/dashboard/stats', function (Request $request, Response $response) {
    $userAttr = $request->getAttribute('user');
    if (!$userAttr || !isset($userAttr['id'])) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Unauthorized']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
    $userId = $userAttr['id'];

    try {
        $role = $userAttr['role'] ?? null;
        if (!$role) {
            $userRoleDoc = UserRole::where('user_id', $userId)->first();
            $role = $userRoleDoc ? $userRoleDoc->role : '';
        }

        // Check server-side cache first (120 second TTL per user+role)
        $cacheKey = Cache::key('dashboard_stats_' . $role . '_' . $userId);
        $cached = Cache::get($cacheKey, 120);
        if ($cached !== null) {
            $response->getBody()->write($cached);
            return $response->withHeader('Content-Type', 'application/json')
                            ->withHeader('X-Cache', 'HIT');
        }

        $data = [];

        if ($role === 'admin') {
            $studentsCount = Student::count();
            $teachersCount = Teacher::count();
            $coursesCount = Course::count();
            $departmentsCount = App\Models\Department::count();
            
            $pendingComplaints = Complaint::where('status', 'pending')->get()->map(function($c) {
                return $c->toArray();
            })->toArray();
            
            $recentNotifications = Notification::orderBy('createdAt', 'desc')->limit(4)->get()->map(function($n) {
                return $n->toArray();
            })->toArray();

            $data = [
                'students' => $studentsCount,
                'teachers' => $teachersCount,
                'courses' => $coursesCount,
                'departments' => $departmentsCount,
                'pendingComplaints' => $pendingComplaints,
                'recentNotifications' => $recentNotifications
            ];
        } elseif ($role === 'teacher') {
            $user = User::find($userId);
            $email = $user ? trim(strtolower($user->email)) : '';
            $teacher = Teacher::where('email', $email)->first();
            if ($teacher) {
                $courses = Course::where('teacher_id', $teacher->id)->get()->map(function($c) {
                    return $c->toArray();
                })->toArray();
                
                $fypGroups = FypGroup::where('supervisor_id', $teacher->id)->get()->map(function($g) {
                    return $g->toArray();
                })->toArray();
                
                $timetable = Timetable::where('teacher_id', $teacher->id)->get()->map(function($t) {
                    return $t->toArray();
                })->toArray();
                
                $department = $teacher->department_id ? App\Models\Department::find($teacher->department_id) : null;
                $deptArray = $department ? $department->toArray() : null;

                $data = [
                    'profile' => $teacher->toArray(),
                    'courses' => $courses,
                    'fypGroups' => $fypGroups,
                    'timetable' => $timetable,
                    'department' => $deptArray
                ];
            }
        } elseif ($role === 'student') {
            $user = User::find($userId);
            $email = $user ? trim(strtolower($user->email)) : '';
            $student = Student::where('email', $email)->first();
            if ($student) {
                $attendance = Attendance::where('student_id', $student->id)->get()->map(function($a) {
                    return $a->toArray();
                })->toArray();
                
                $fees = Fee::where('student_id', $student->id)->get()->map(function($f) {
                    return $f->toArray();
                })->toArray();
                
                $studentCourseIds = is_array($student->courses) ? $student->courses : [];
                $timetableQuery = Timetable::query();
                if (!empty($studentCourseIds)) {
                    $timetableQuery->whereIn('course_id', $studentCourseIds);
                } else {
                    $timetableQuery->whereRaw('1 = 0');
                }
                $timetable = $timetableQuery->get()->map(function($t) {
                    return $t->toArray();
                })->toArray();
                
                $department = $student->department_id ? App\Models\Department::find($student->department_id) : null;
                $deptArray = $department ? $department->toArray() : null;

                // Optimized: use ANY() for PostgreSQL text[] instead of loading ALL groups
                $myFyp = null;
                $fypGroup = FypGroup::whereRaw("? = ANY(members)", [$student->id])->first();
                if ($fypGroup) {
                    $myFyp = $fypGroup->toArray();
                }

                // Optimized: use WHERE IN instead of loading ALL courses
                if (!empty($studentCourseIds)) {
                    $studentCourses = Course::whereIn('id', $studentCourseIds)->get()->map(function($c) {
                        return $c->toArray();
                    })->toArray();
                } else {
                    $studentCourses = Course::where('department_id', $student->department_id)->get()->map(function($c) {
                        return $c->toArray();
                    })->toArray();
                }

                $data = [
                    'profile' => $student->toArray(),
                    'attendance' => $attendance,
                    'fees' => $fees,
                    'fypGroup' => $myFyp,
                    'timetable' => $timetable,
                    'courses' => $studentCourses,
                    'department' => $deptArray
                ];
            }
        }

        $jsonResponse = json_encode([
            'data' => $data,
            'error' => null
        ]);

        // Store in cache for 120 seconds
        Cache::set($cacheKey, $jsonResponse);

        $response->getBody()->write($jsonResponse);
        return $response->withHeader('Content-Type', 'application/json')
                        ->withHeader('X-Cache', 'MISS');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

// --- DYNAMIC REST ROUTING (/api/data/{table}) ---

// GET (Read)
$app->get('/api/data/{table}', function (Request $request, Response $response, array $args) use ($modelsMap) {
    $table = $args['table'];
    $modelClass = $modelsMap[$table];
    $queryParams = $request->getQueryParams();

    // Server-side cache: 60 second TTL per user+table+params
    $userAttrForCache = $request->getAttribute('user');
    $cacheUserId = $userAttrForCache['id'] ?? 'anon';
    $cacheKey = Cache::key('data_' . $table . '_' . serialize($queryParams) . '_' . $cacheUserId);
    $cached = Cache::get($cacheKey, 60);
    if ($cached !== null) {
        $response->getBody()->write($cached);
        return $response->withHeader('Content-Type', 'application/json')
                        ->withHeader('X-Cache', 'HIT');
    }

    $orderCol = $queryParams['_order'] ?? null;
    $orderAsc = ($queryParams['_asc'] ?? 'true') !== 'false';
    $limit = isset($queryParams['_limit']) ? intval($queryParams['_limit']) : null;

    $filters = $queryParams;
    unset($filters['_order'], $filters['_asc'], $filters['_limit']);

    $normalizedFilters = [];
    foreach ($filters as $k => $v) {
        $key = ($k === '_id' || $k === 'id') ? 'id' : $k;
        if ($v === 'true') $v = true;
        elseif ($v === 'false') $v = false;

        if ($key === 'email') {
            $v = trim(strtolower($v));
        }
        $normalizedFilters[$key] = $v;
    }

    // Role-based data isolation
    $userAttr = $request->getAttribute('user');
    $userId = $userAttr['id'] ?? '';
    
    $role = $userAttr['role'] ?? null;
    if (!$role) {
        $userRoleDoc = UserRole::where('user_id', $userId)->first();
        $role = $userRoleDoc ? $userRoleDoc->role : '';
    }

    if ($role === 'student') {
        $student = Student::where('user_id', $userId)->first();
        $studentId = $student ? $student->id : '';

        if ($table === 'fees') {
            $normalizedFilters['student_id'] = $studentId;
        } elseif ($table === 'complaints') {
            $normalizedFilters['student_id'] = $studentId;
        } elseif ($table === 'students') {
            $normalizedFilters['user_id'] = $userId;
        }
    } elseif ($role === 'teacher') {
        $user = User::find($userId);
        $email = $user ? trim(strtolower($user->email)) : '';
        $teacher = Teacher::where('email', $email)->first();
        $teacherId = $teacher ? $teacher->id : '';

        if ($table === 'fees') {
            $response->getBody()->write(json_encode(['data' => [], 'count' => 0, 'error' => null]));
            return $response->withHeader('Content-Type', 'application/json');
        } elseif ($table === 'timetables') {
            $normalizedFilters['teacher_id'] = $teacherId;
        } elseif ($table === 'fyp_groups') {
            $normalizedFilters['supervisor_id'] = $teacherId;
        }
    }

    if ($table === 'notifications') {
        $authHeader = $request->getHeaderLine('Authorization');
        if (!empty($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $secret = $_ENV['JWT_SECRET'] ?? 'supersecure_college_cms_secret_key_12345';
            try {
                $decoded = JWT::decode($token, new Key($secret, 'HS256'));
                $userId = $decoded->id ?? '';
                $userEmail = $decoded->email ?? '';

                $userRoleDoc = UserRole::where('user_id', $userId)->first();
                $role = $userRoleDoc ? $userRoleDoc->role : '';

                $query = $modelClass::query();
                $query->where(function($q) use ($userId, $userEmail, $role) {
                    $q->where('user_id', $userId)
                      ->orWhere('user_id', $userEmail)
                      ->orWhere('user_id', $role);
                });

                if ($orderCol) {
                    $colMap = ['_id' => 'id', 'created_at' => 'createdAt', 'updated_at' => 'updatedAt'];
                    $dbCol = $colMap[$orderCol] ?? $orderCol;
                    $query->orderBy($dbCol, $orderAsc ? 'asc' : 'desc');
                }

                if ($limit) {
                    $query->limit($limit);
                }

                $docs = $query->get();
                $response->getBody()->write(json_encode([
                    'data' => $docs,
                    'count' => count($docs),
                    'error' => null
                ]));
                return $response->withHeader('Content-Type', 'application/json');
            } catch (\Exception $e) {
                // fall through
            }
        }
    }

    $query = $modelClass::query();

    // Custom subquery filter for fyp_submissions for teacher
    if ($role === 'teacher' && $table === 'fyp_submissions') {
        $user = User::find($userId);
        $email = $user ? trim(strtolower($user->email)) : '';
        $teacher = Teacher::where('email', $email)->first();
        $teacherId = $teacher ? $teacher->id : '';
        
        if (!empty($teacherId)) {
            $query->whereIn('group_id', function($q) use ($teacherId) {
                $q->select('id')->from('fyp_groups')->where('supervisor_id', $teacherId);
            });
        }
    }

    foreach ($normalizedFilters as $k => $v) {
        $query->where($k, $v);
    }

    if ($orderCol) {
        $colMap = ['_id' => 'id', 'created_at' => 'createdAt', 'updated_at' => 'updatedAt'];
        $dbCol = $colMap[$orderCol] ?? $orderCol;
        $query->orderBy($dbCol, $orderAsc ? 'asc' : 'desc');
    }

    if ($limit) {
        $query->limit($limit);
    }

    $docs = $query->get();
    $jsonResponse = json_encode([
        'data' => $docs,
        'count' => count($docs),
        'error' => null
    ]);

    // Store in cache
    Cache::set($cacheKey, $jsonResponse);

    $response->getBody()->write($jsonResponse);
    return $response->withHeader('Content-Type', 'application/json')
                    ->withHeader('X-Cache', 'MISS');
})->add($validateTable)->add(new AuthMiddleware());

// POST (Create)
$app->post('/api/data/{table}', function (Request $request, Response $response, array $args) use ($modelsMap) {
    $table = $args['table'];

    // Invalidate cache on data mutation
    Cache::invalidate();

    // Role-based write privilege validation
    $userAttr = $request->getAttribute('user');
    $userId = $userAttr['id'] ?? '';
    $role = $userAttr['role'] ?? null;
    if (!$role) {
        $userRoleDoc = UserRole::where('user_id', $userId)->first();
        $role = $userRoleDoc ? $userRoleDoc->role : '';
    }

    $isAllowed = false;
    if ($role === 'admin') {
        $isAllowed = true;
    } elseif ($role === 'teacher') {
        $allowed = ['fyp_groups', 'fyp_submissions', 'complaints', 'attendance', 'notifications'];
        if (in_array($table, $allowed)) $isAllowed = true;
    } elseif ($role === 'student') {
        $allowed = ['fyp_groups', 'fyp_submissions', 'complaints', 'fees', 'notifications'];
        if (in_array($table, $allowed)) $isAllowed = true;
    }

    if (!$isAllowed) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Access Denied: Insufficient privileges for role ' . ($role ?: 'unknown')]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $modelClass = $modelsMap[$table];
    $data = json_decode($request->getBody()->getContents(), true) ?? [];

    // Duplicate project and member check for FYP Groups
    if ($table === 'fyp_groups') {
        $items = isset($data[0]) ? $data : [$data];
        $allGroups = FypGroup::all();
        foreach ($items as $item) {
            $titleToCheck = trim($item['title'] ?? '');
            if (!empty($titleToCheck)) {
                foreach ($allGroups as $g) {
                    if ($g->status === 'approved' && strtolower(trim($g->title)) === strtolower($titleToCheck)) {
                        $response->getBody()->write(json_encode(['error' => ['message' => 'This project is already taken']]));
                        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
                    }
                }
            }
            if (isset($item['members']) && is_array($item['members'])) {
                foreach ($item['members'] as $mId) {
                    foreach ($allGroups as $g) {
                        if ($g->members && in_array($mId, $g->members)) {
                            $response->getBody()->write(json_encode(['error' => ['message' => 'One of the students is already in a group']]));
                            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
                        }
                    }
                }
            }
        }
    }

    // Auto-create user for Student/Teacher profile added by Admin
    $autoCreateUserForProfile = function(&$profileData, $role) {
        if (empty($profileData['email'])) return;
        $email = trim(strtolower($profileData['email']));
        $user = User::where('email', $email)->first();
        if (!$user) {
            $hashedPassword = password_hash('123456', PASSWORD_BCRYPT, ['cost' => 10]);
            $user = User::create([
                'email' => $email,
                'password' => $hashedPassword,
                'raw_user_meta_data' => ['full_name' => $profileData['full_name'] ?? '']
            ]);
            UserRole::create([
                'user_id' => $user->id,
                'role' => $role
            ]);
            error_log("Auto-created user for admin-added $role: $email");
        }
        $profileData['user_id'] = $user->id;

        // Auto-populate required database fields if missing from the request
        if ($role === 'student') {
            if (empty($profileData['roll_number'])) {
                $profileData['roll_number'] = 'ROLL-' . rand(1000, 9999);
            }
            if (empty($profileData['department_id'])) {
                $profileData['department_id'] = 'dept-cs';
            }
            if (empty($profileData['degree'])) {
                $profileData['degree'] = 'BSCS';
            }
            if (!isset($profileData['semester'])) {
                $profileData['semester'] = 1;
            }
        } else if ($role === 'teacher') {
            if (empty($profileData['employee_id'])) {
                $profileData['employee_id'] = 'EMP-' . rand(1000, 9999);
            }
            if (empty($profileData['department_id'])) {
                $profileData['department_id'] = 'dept-cs';
            }
            if (empty($profileData['qualification'])) {
                $profileData['qualification'] = 'MS CS';
            }
            if (!isset($profileData['salary'])) {
                $profileData['salary'] = 80000;
            }
        }
    };

    $sanitizeCourseData = function(&$courseData) {
        if (!isset($courseData['credit_hours'])) {
            $courseData['credit_hours'] = 3;
        }
        if (empty($courseData['semester'])) {
            $courseData['semester'] = 1;
        }
        if (empty($courseData['degree'])) {
            $courseData['degree'] = 'BSCS';
        }
        if (empty($courseData['department_id'])) {
            $courseData['department_id'] = 'dept-cs';
        }
    };

    try {
        $result = null;
        if (isset($data[0]) && is_array($data)) {
            // Bulk insert
            $inserted = [];
            foreach ($data as $item) {
                if ($table === 'students') {
                    $autoCreateUserForProfile($item, 'student');
                } else if ($table === 'teachers') {
                    $autoCreateUserForProfile($item, 'teacher');
                } else if ($table === 'courses') {
                    $sanitizeCourseData($item);
                }
                
                // Strip incoming _id and normalize to id
                if (isset($item['_id'])) {
                    $item['id'] = $item['_id'];
                    unset($item['_id']);
                }
                
                // ATTENDANCE UPSERT (bulk): prevent duplicate records for same student+course+date
                if ($table === 'attendance'
                    && !empty($item['student_id'])
                    && !empty($item['course_id'])
                    && !empty($item['date'])
                ) {
                    $existing = \App\Models\Attendance::where('student_id', $item['student_id'])
                        ->where('course_id', $item['course_id'])
                        ->where('date', $item['date'])
                        ->first();
                    if ($existing) {
                        if (isset($item['status'])) {
                            $existing->status = $item['status'];
                            $existing->save();
                        }
                        $doc = $existing;
                    } else {
                        $doc = $modelClass::create($item);
                    }
                } else {
                    $doc = $modelClass::create($item);
                }
                
                $inserted[] = $doc;
            }
            $result = $inserted;
        } else {
            // Single insert
            if ($table === 'students') {
                $autoCreateUserForProfile($data, 'student');
            } else if ($table === 'teachers') {
                $autoCreateUserForProfile($data, 'teacher');
            } else if ($table === 'courses') {
                $sanitizeCourseData($data);
            }
            
            // ATTENDANCE UPSERT: prevent duplicate records for same student+course+date
            if ($table === 'attendance'
                && !empty($data['student_id'])
                && !empty($data['course_id'])
                && !empty($data['date'])
            ) {
                $existing = \App\Models\Attendance::where('student_id', $data['student_id'])
                    ->where('course_id', $data['course_id'])
                    ->where('date', $data['date'])
                    ->first();

                if ($existing) {
                    // Record exists – update status only
                    if (isset($data['status'])) {
                        $existing->status = $data['status'];
                        $existing->save();
                    }
                    $result = $existing;
                } else {
                    $result = $modelClass::create($data);
                }
            } else {
                if (isset($data['_id'])) {
                    $data['id'] = $data['_id'];
                    unset($data['_id']);
                }
                
                $result = $modelClass::create($data);
            }
        }

        // Auto-create profile if inserting a role into user_roles
        if ($table === 'user_roles') {
            $userRoleDoc = is_array($result) ? $result[0] : $result;
            if ($userRoleDoc) {
                $userId = $userRoleDoc->user_id;
                $role = $userRoleDoc->role;
                $user = User::find($userId);
                
                if ($user) {
                    $email = $user->email;
                    $fullName = $user->raw_user_meta_data['full_name'] ?? explode('@', $email)[0];
                    
                    if ($role === 'student') {
                        $exists = Student::where('user_id', $userId)->first();
                        if (!$exists) {
                            Student::create([
                                'user_id' => $userId,
                                'roll_number' => 'ROLL-' . rand(1000, 9999),
                                'full_name' => $fullName,
                                'email' => $email,
                                'department_id' => 'dept-cs',
                                'degree' => 'BSCS',
                                'semester' => 1
                            ]);
                        }
                    } else if ($role === 'teacher') {
                        $exists = Teacher::where('user_id', $userId)->first();
                        if (!$exists) {
                            Teacher::create([
                                'user_id' => $userId,
                                'employee_id' => 'EMP-' . rand(1000, 9999),
                                'full_name' => $fullName,
                                'email' => $email,
                                'department_id' => 'dept-cs',
                                'qualification' => 'MS CS',
                                'salary' => 80000
                            ]);
                        }
                    }
                }
            }
        }

        // Trigger real-time notifications
        if ($result) {
            $docs = is_array($result) ? $result : [$result];
            foreach ($docs as $doc) {
                // convert to array for consistent notification builder access
                $docArray = $doc->toArray();
                NotificationService::createAndEmitNotification($table, 'create', $data, $docArray);
            }
        }

        $response->getBody()->write(json_encode([
            'data' => $result,
            'error' => null
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['data' => null, 'error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add($validateTable)->add(new AuthMiddleware());

// PUT (Update)
$app->put('/api/data/{table}', function (Request $request, Response $response, array $args) use ($modelsMap) {
    $table = $args['table'];

    // Invalidate cache on data mutation
    Cache::invalidate();

    // Role-based write privilege validation
    $userAttr = $request->getAttribute('user');
    $userId = $userAttr['id'] ?? '';
    $role = $userAttr['role'] ?? null;
    if (!$role) {
        $userRoleDoc = UserRole::where('user_id', $userId)->first();
        $role = $userRoleDoc ? $userRoleDoc->role : '';
    }

    $isAllowed = false;
    if ($role === 'admin') {
        $isAllowed = true;
    } elseif ($role === 'teacher') {
        $allowed = ['fyp_groups', 'fyp_submissions', 'complaints', 'attendance', 'notifications'];
        if (in_array($table, $allowed)) $isAllowed = true;
    } elseif ($role === 'student') {
        $allowed = ['fyp_groups', 'fyp_submissions', 'complaints', 'fees', 'notifications'];
        if (in_array($table, $allowed)) $isAllowed = true;
    }

    if (!$isAllowed) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Access Denied: Insufficient privileges for role ' . ($role ?: 'unknown')]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $modelClass = $modelsMap[$table];
    $queryParams = $request->getQueryParams();
    $updatePayload = json_decode($request->getBody()->getContents(), true) ?? [];

    $filters = $queryParams;
    unset($filters['_order'], $filters['_asc'], $filters['_limit']);

    if (isset($filters['id'])) {
        $filters['id'] = $filters['id'];
    } else if (isset($filters['_id'])) {
        $filters['id'] = $filters['_id'];
        unset($filters['_id']);
    }

    try {
        // Validate approval of FYP Group duplicate title
        if ($table === 'fyp_groups') {
            if (isset($updatePayload['status']) && $updatePayload['status'] === 'approved') {
                $query = FypGroup::query();
                foreach ($filters as $k => $v) {
                    $query->where($k, $v);
                }
                $targetGroups = $query->get();
                $allGroups = FypGroup::all();
                
                foreach ($targetGroups as $targetGroup) {
                    $titleToCheck = trim($targetGroup->title ?? '');
                    if (!empty($titleToCheck)) {
                        foreach ($allGroups as $g) {
                            if ($g->id !== $targetGroup->id && $g->status === 'approved' && strtolower(trim($g->title)) === strtolower($titleToCheck)) {
                                $response->getBody()->write(json_encode(['error' => ['message' => 'This project is already taken']]));
                                return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
                            }
                        }
                    }
                }
            }
        }

        // Execute bulk update
        $query = $modelClass::query();
        foreach ($filters as $k => $v) {
            $query->where($k, $v);
        }
        
        // Strip keys that shouldn't be overwritten
        $cleaned = $updatePayload;
        unset($cleaned['id'], $cleaned['_id'], $cleaned['__v']);
        
        $matchedDocs = $query->get();
        $count = 0;
        foreach ($matchedDocs as $doc) {
            $doc->update($cleaned);
            $count++;
        }

        // Debug logging for enrollment issues
        if ($table === 'students' && isset($cleaned['courses'])) {
            error_log("[ENROLL DEBUG] PUT students filters=" . json_encode($filters) . " payload=" . json_encode($cleaned) . " matched=" . count($matchedDocs) . " updated=" . $count);
        }

        // Auto-reject other pending groups with same title upon approval
        if ($table === 'fyp_groups' && isset($updatePayload['status']) && $updatePayload['status'] === 'approved') {
            try {
                $allGroups = FypGroup::all();
                foreach ($matchedDocs as $targetGroup) {
                    $titleToCheck = trim($targetGroup->title ?? '');
                    if (!empty($titleToCheck)) {
                        $otherPending = FypGroup::where('id', '!=', $targetGroup->id)
                            ->where('status', 'pending')
                            ->where('title', 'ILIKE', $titleToCheck)
                            ->get();
                            
                        foreach ($otherPending as $pending) {
                            $pending->status = 'rejected';
                            $pending->save();

                            // Send notifications to members of auto-rejected groups
                            if ($pending->members && is_array($pending->members)) {
                                foreach ($pending->members as $mId) {
                                    $student = Student::find($mId);
                                    $studentEmail = $student ? $student->email : $mId;
                                    $msg = "Your FYP group request for \"{$pending->title}\" was automatically rejected because the project is already taken.";
                                    
                                    $notif = Notification::create([
                                        'user_id' => $studentEmail,
                                        'title' => 'FYP Project Taken',
                                        'message' => $msg,
                                        'read' => false
                                    ]);
                                    
                                    App\SocketBridge::emit(strtolower($studentEmail), 'notification', $notif);
                                    App\SocketBridge::emit($studentEmail, 'notification', $notif);
                                }
                            }
                        }
                    }
                }
            } catch (\Exception $err) {
                error_log("Failed to auto-reject pending groups: " . $err->getMessage());
            }
        }

        // Trigger real-time notifications
        foreach ($matchedDocs as $doc) {
            NotificationService::createAndEmitNotification($table, 'update', $updatePayload, $doc->toArray());
        }

        $response->getBody()->write(json_encode([
            'data' => [
                'matchedCount' => $count,
                'modifiedCount' => $count,
                'acknowledged' => true
            ],
            'error' => null
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['data' => null, 'error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add($validateTable)->add(new AuthMiddleware());

// DELETE (Delete)
$app->delete('/api/data/{table}', function (Request $request, Response $response, array $args) use ($modelsMap) {
    $table = $args['table'];

    // Invalidate cache on data mutation
    Cache::invalidate();

    // Role-based write privilege validation
    $userAttr = $request->getAttribute('user');
    $userId = $userAttr['id'] ?? '';
    $role = $userAttr['role'] ?? null;
    if (!$role) {
        $userRoleDoc = UserRole::where('user_id', $userId)->first();
        $role = $userRoleDoc ? $userRoleDoc->role : '';
    }

    $isAllowed = false;
    if ($role === 'admin') {
        $isAllowed = true;
    } elseif ($role === 'teacher') {
        $allowed = ['fyp_groups', 'fyp_submissions', 'complaints', 'notifications'];
        if (in_array($table, $allowed)) $isAllowed = true;
    } elseif ($role === 'student') {
        $allowed = ['fyp_groups', 'fyp_submissions', 'notifications'];
        if (in_array($table, $allowed)) $isAllowed = true;
    }

    if (!$isAllowed) {
        $response->getBody()->write(json_encode(['error' => ['message' => 'Access Denied: Insufficient privileges for role ' . ($role ?: 'unknown')]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $modelClass = $modelsMap[$table];
    $queryParams = $request->getQueryParams();

    $filters = $queryParams;
    unset($filters['_order'], $filters['_asc'], $filters['_limit']);

    if (isset($filters['id'])) {
        $filters['id'] = $filters['id'];
    } else if (isset($filters['_id'])) {
        $filters['id'] = $filters['_id'];
        unset($filters['_id']);
    }

    try {
        $query = $modelClass::query();
        foreach ($filters as $k => $v) {
            $query->where($k, $v);
        }
        
        $count = $query->delete();

        $response->getBody()->write(json_encode([
            'data' => [
                'deletedCount' => $count,
                'acknowledged' => true
            ],
            'error' => null
        ]));
        return $response->withHeader('Content-Type', 'application/json');

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['data' => null, 'error' => ['message' => $e->getMessage()]]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add($validateTable)->add(new AuthMiddleware());

$app->run();
