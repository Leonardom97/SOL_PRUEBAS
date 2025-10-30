<?php
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403); exit('Acceso prohibido');
}

$serverName = "192.168.150.199";
$database   = "SVN_G4026_OSM";
$username   = "sa";
$password   = "Sap2015";
$port       = "1433";

try {
    $dsn = "sqlsrv:server=$serverName,$port;Database=$database";
    $sqlsrv = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die("Error al conectar a SQL Server: " . $e->getMessage());
}
