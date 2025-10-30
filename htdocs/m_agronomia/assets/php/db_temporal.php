<?php
// Seguridad: evita el acceso directo a este archivo desde el navegador
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

// Parámetros de conexión para la base de datos temporal
$host = 'localhost';
$db   = 'db_temporal';
$user = 'postgres';
$pass = '12345';
$port = '5432';

try {
    // Crea la conexión PDO a la base de datos temporal
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    $pg = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    // Evita mostrar información sensible en producción
    die("Error al conectar a PostgreSQL: " . $e->getMessage());
}
?>