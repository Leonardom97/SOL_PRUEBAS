<?php
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

// Load configuration
require_once __DIR__ . '/config.php';

// Primary SQL Server configuration (existing OSM database)
$serverName = "192.168.150.199";
$database   = "SVN_G4026_OSM";
$username   = "sa";
$password   = "Sap2015";
$port       = "1433";

// Weighing system SQL Server configuration (Vansolix/Bascula databases)
$serverNameBascula = "192.168.0.199";
$databaseBascula   = "vscalex_oleaginosas";
$databaseSAP       = "SAP_OLEAGINOSAS";
$usernameBascula   = "sa";
$passwordBascula   = "Sap2015";
$portBascula       = "1433";

try {
    // Primary SQL Server connection
    $dsn = "sqlsrv:Server=$serverName,$port;Database=$database;TrustServerCertificate=true";

    $sqlsrv = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    if (ENABLE_DEBUG) {
        echo "✅ Conexión exitosa a SQL Server (OSM).";
    }

} catch (PDOException $e) {
    // Log error securely without exposing details
    error_log("SQL Server connection error: " . $e->getMessage());
    
    // Don't expose database details in error message
    if (ENABLE_DEBUG) {
        die("❌ Error al conectar a SQL Server: " . $e->getMessage());
    } else {
        die("❌ Error al conectar a la base de datos. Contacte al administrador.");
    }
}

try {
    // Weighing system database connection (vscalex_oleaginosas)
    $dsnBascula = "sqlsrv:Server=$serverNameBascula,$portBascula;Database=$databaseBascula;TrustServerCertificate=true";

    $sqlsrvBascula = new PDO($dsnBascula, $usernameBascula, $passwordBascula, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    if (ENABLE_DEBUG) {
        echo "✅ Conexión exitosa a SQL Server (Báscula - vscalex_oleaginosas).";
    }

} catch (PDOException $e) {
    error_log("SQL Server Bascula connection error: " . $e->getMessage());
    
    if (ENABLE_DEBUG) {
        die("❌ Error al conectar a SQL Server Báscula: " . $e->getMessage());
    } else {
        die("❌ Error al conectar a la base de datos de báscula. Contacte al administrador.");
    }
}

try {
    // SAP database connection (SAP_OLEAGINOSAS)
    $dsnSAP = "sqlsrv:Server=$serverNameBascula,$portBascula;Database=$databaseSAP;TrustServerCertificate=true";

    $sqlsrvSAP = new PDO($dsnSAP, $usernameBascula, $passwordBascula, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    if (ENABLE_DEBUG) {
        echo "✅ Conexión exitosa a SQL Server (SAP - SAP_OLEAGINOSAS).";
    }

} catch (PDOException $e) {
    error_log("SQL Server SAP connection error: " . $e->getMessage());
    
    if (ENABLE_DEBUG) {
        die("❌ Error al conectar a SQL Server SAP: " . $e->getMessage());
    } else {
        die("❌ Error al conectar a la base de datos SAP. Contacte al administrador.");
    }
}
?>
