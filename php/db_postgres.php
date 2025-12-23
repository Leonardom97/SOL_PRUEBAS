<?php
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

// Cargar configuración
require_once __DIR__ . '/config.php';

$pg = null; // Initialize to null
$host = 'localhost';
$db   = 'web_osm';
$user = 'postgres';
$pass = '12345';
$port = '5432';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    $pg = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => true
    ]);
} catch (PDOException $e) {
    // Registrar error de forma segura sin exponer detalles sensibles
    error_log("Error de conexión PostgreSQL: " . $e->getMessage());
    if (defined('ENABLE_DEBUG') && ENABLE_DEBUG) {
        error_log("Error al conectar a PostgreSQL: " . $e->getMessage());
    } else {
        error_log("Error al conectar a la base de datos. Contacte al administrador.");
    }
}

// --- Conexión: Prueba_agronomia (antes db_postgres_prueba.php) ---
$pg_prueba = null; // Initialize to null
$host_prueba = 'localhost';
$db_prueba   = 'prueba_agronomia';
$user_prueba = 'postgres';
$pass_prueba = '12345';
$port_prueba = '5432';

try {
    $dsn_prueba = "pgsql:host=$host_prueba;port=$port_prueba;dbname=$db_prueba";
    $pg_prueba = new PDO($dsn_prueba, $user_prueba, $pass_prueba, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => true
    ]);
} catch (PDOException $e) {
    error_log("Error al conectar a PostgreSQL (Prueba): " . $e->getMessage());
}

// --- Conexión: web_temporal (antes db_temporal.php) ---
$pg_temporal = null; // Initialize to null
$host_temporal = 'localhost';
$db_temporal   = 'db_temporal';
$user_temporal = 'postgres';
$pass_temporal = '12345';
$port_temporal = '5432';

try {
    $dsn_temporal = "pgsql:host=$host_temporal;port=$port_temporal;dbname=$db_temporal";
    $pg_temporal = new PDO($dsn_temporal, $user_temporal, $pass_temporal, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => true
    ]);
} catch (PDOException $e) {
    error_log("Error al conectar a PostgreSQL (Temporal): " . $e->getMessage());
}
