<?php
// Seguridad: evita el acceso directo a este archivo desde el navegador
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403); exit('Acceso prohibido');
}

// Parámetros de conexión a la base de datos PostgreSQL
$host = 'localhost';
$db   = 'postgres';
$user = 'postgres';
$pass = '12345';
$port = '5432';

try {
    // Construye la cadena DSN para PDO
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    // Crea una instancia PDO para la conexión
    $pg = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Lanza excepciones en caso de error
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC // Devuelve resultados como arrays asociativos
    ]);
} catch (PDOException $e) {
    // Muestra mensaje de error si falla la conexión
    die("Error al conectar a PostgreSQL: " . $e->getMessage());
}
?>