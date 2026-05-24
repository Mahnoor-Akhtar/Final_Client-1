<?php
namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response as SlimResponse;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthMiddleware {
    public function __invoke(Request $request, RequestHandler $handler): Response {
        $path = $request->getUri()->getPath();
        $method = $request->getMethod();
        
        // Allow public GET access to departments list (needed for registration dropdown)
        if ($method === 'GET' && ($path === '/api/data/departments' || str_ends_with($path, '/departments'))) {
            return $handler->handle($request);
        }

        $authHeader = $request->getHeaderLine('Authorization');
        
        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            $response = new SlimResponse();
            $response->getBody()->write(json_encode(['message' => 'No authorization token provided']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        $token = substr($authHeader, 7);
        $secret = $_ENV['JWT_SECRET'] ?? 'supersecure_college_cms_secret_key_12345';

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $request = $request->withAttribute('user', (array)$decoded);
            return $handler->handle($request);
        } catch (\Exception $e) {
            $response = new SlimResponse();
            $response->getBody()->write(json_encode(['message' => 'Invalid or expired token']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }
    }
}
