<?php
namespace App;

use GuzzleHttp\Client;

class SocketBridge {
    public static function emit($room, $event, $data) {
        $client = new Client();
        $bridgeUrl = $_ENV['SOCKET_BRIDGE_URL'] ?? 'http://localhost:5001';
        try {
            $client->post($bridgeUrl . '/emit', [
                'json' => [
                    'room' => $room,
                    'event' => $event,
                    'data' => $data
                ],
                'timeout' => 2 // Low timeout so it doesn't block the API
            ]);
        } catch (\Exception $e) {
            error_log("SocketBridge error: " . $e->getMessage());
        }
    }
}
