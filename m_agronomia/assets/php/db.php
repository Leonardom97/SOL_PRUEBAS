<?php
// m_agronomia/db.php
// Conexión reutilizable PDO a PostgreSQL
// Ajusta si quieres mover credenciales a archivo de configuración o variables de entorno.

$DB_HOST = '192.168.125.25';
$DB_PORT = '5432';
$DB_NAME = 'web_osm';
$DB_USER = 'formatos';
$DB_PASS = 'Formatos2021';

$dsn = "pgsql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};";

function getPDO() {
    global $dsn, $DB_USER, $DB_PASS;
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            // No exponer detalles en producción
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'No se pudo conectar a la base de datos']);
            exit;
        }
    }
    return $pdo;
}
?>