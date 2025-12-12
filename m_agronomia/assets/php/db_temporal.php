<?php
/**
 * db_temporal.php
 *
 * Archivo de conexión a la base de datos temporal.
 * 
 * Propósito:
 *  - Establecer conexión PDO a la base de datos temporal de PostgreSQL.
 *  - Se utiliza para almacenar operaciones pendientes antes de su aprobación.
 *  - Configura el modo de errores con excepciones para mejor manejo de errores.
 *
 * Seguridad:
 *  - Evita acceso directo desde el navegador.
 *  - Las credenciales están en texto plano: considerar variables de entorno en producción.
 *
 * Variables resultantes:
 *  - $pg: instancia PDO activa conectada a db_temporal.
 */

// Prevenir acceso directo al archivo
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

// Parámetros de conexión (reemplazar en producción con variables de entorno / secrets)
$host = 'localhost';
$db   = 'db_temporal';
$user = 'postgres';
$pass = '12345';
$port = '5432';

try {
    // Crear conexión PDO con configuración de errores y modo de fetch
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    $pg = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    // No exponer detalles sensibles en producción
    die("Error al conectar a PostgreSQL: " . $e->getMessage());
}
?>