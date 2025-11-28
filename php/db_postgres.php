<?php
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403); exit('Acceso prohibido');
}

// Load configuration
require_once __DIR__ . '/config.php';

$host = '192.168.125.25';
$db   = 'Prueba';
$user = 'formatos';
$pass = 'Formatos2021';
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
    
    // Don't expose database details in error message
    if (ENABLE_DEBUG) {
        die("Error al conectar a PostgreSQL: " . $e->getMessage());
    } else {
        die("Error al conectar a la base de datos. Contacte al administrador.");
    }
}
