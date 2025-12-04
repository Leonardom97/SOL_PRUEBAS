<?php
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403); exit('Acceso prohibido');
}

// Load configuration
require_once __DIR__ . '/config.php';

$host = 'localhost';
$db   = 'web_osm';
$user = 'postgres';
$pass = '12345';
$port = '5432';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    $pg = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    // Log error securely without exposing details
    error_log("PostgreSQL connection error: " . $e->getMessage());
    if (ENABLE_DEBUG) {
        error_log("Error al conectar a PostgreSQL: " . $e->getMessage());
    } else {
        error_log("Error al conectar a la base de datos. Contacte al administrador.");
    }
}
