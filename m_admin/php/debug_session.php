<?php
// m_admin/php/debug_session.php
// Place this in the same folder as the API to test session visibility

require_once '../../php/security_headers.php'; // Adjust path if needed

// Allow CORS for debugging (match your Vite origin)
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");

session_start();

header('Content-Type: application/json');

$response = [
    'session_id' => session_id(),
    'session_name' => session_name(),
    'cookie_params' => session_get_cookie_params(),
    'session_data' => $_SESSION,
    'user_logged_in' => isset($_SESSION['usuario_id']),
    'server_path' => __DIR__,
];

echo json_encode($response);
