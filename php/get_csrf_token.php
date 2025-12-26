<?php
/**
 * Get CSRF Token
 * API endpoint to get a CSRF token for forms
 */

// Apply security headers
require_once __DIR__ . '/security_headers.php';
require_once __DIR__ . '/secure_session.php';
require_once __DIR__ . '/csrf_protection.php';

// Configurar e iniciar sesión segura
configure_secure_session();
session_start();
header('Content-Type: application/json');

// Generate or get existing token
$token = CSRFProtection::getToken();

echo json_encode([
    'success' => true,
    'token' => $token
]);
