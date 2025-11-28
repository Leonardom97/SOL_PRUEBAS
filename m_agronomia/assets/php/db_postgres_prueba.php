<?php
/**
 * db_postgres_prueba.php
 *
 * Conexión a la base de datos de pruebas "Prueba_agronomia".
 * Se genera un objeto PDO en $pg.
 *
 * Mejoras sugeridas:
 *  - Usar .env / entorno seguro para credenciales.
 *  - Manejo de logs en lugar de die() para entornos productivos.
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403); exit('Acceso prohibido');
}

$host = '192.168.125.25';
$db   = 'Prueba_agronomia';
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
    die("Error al conectar a PostgreSQL: " . $e->getMessage());
}
?>