<?php

/**
 * SQL Server Database Connection Configuration
 * 
 * Este archivo configura las conexiones a los servidores SQL Server:
 * - Primary OSM database: 192.168.150.199
 * - Weighing system (Vansolix/Bascula): 192.168.0.199
 * 
 * NOTA: Las opciones de conexión han sido optimizadas para replicar el
 * comportamiento del código original C# (SqlClient) de Vansolix.
 * 
 * Consulte ANALISIS_CONEXION_DB.md para detalles sobre la configuración.
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

// Load configuration
require_once __DIR__ . '/config.php';

// =============================================================================
// PRIMARY SQL SERVER CONFIGURATION (OSM Database)
// Server: 192.168.150.199
// =============================================================================
$serverName = "192.168.150.199";
$database   = "SVN_G4026_OSM";
$username   = "sa";
$password   = "Sap2015";
$port       = "1433";

// =============================================================================
// WEIGHING SYSTEM SQL SERVER CONFIGURATION (Vansolix/Bascula)
// Server: 192.168.0.199
// Databases: vscalex_oleaginosas, SAP_OLEAGINOSAS
// =============================================================================
$serverNameBascula = "192.168.150.199";
$databaseBascula   = "vscalex_oleaginosas";
$databaseSAP       = "PRUEBA_OLEAGINOSAS_BASE";
$usernameBascula   = "sa";
$passwordBascula   = "Sap2015";
$portBascula       = "1433";

// =============================================================================
// PDO Connection Options (Optimized to match C# SqlClient behavior)
// =============================================================================
// Timeout de conexión: 30 segundos (C# default es 15)
// Timeout de consulta: 30 segundos
// CharacterSet: UTF-8 para compatibilidad
// =============================================================================
// PDO options - only use attributes supported by pdo_sqlsrv driver
// Note: PDO::ATTR_EMULATE_PREPARES is NOT supported by pdo_sqlsrv (only native prepares)
// Note: PDO::ATTR_TIMEOUT is NOT supported by pdo_sqlsrv (use LoginTimeout in DSN instead)
$pdoOptions = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

// Agregar opciones específicas de SQL Server si están disponibles
if (defined('PDO::SQLSRV_ATTR_QUERY_TIMEOUT')) {
    $pdoOptions[PDO::SQLSRV_ATTR_QUERY_TIMEOUT] = 30;
}
if (defined('PDO::SQLSRV_ATTR_DIRECT_QUERY')) {
    $pdoOptions[PDO::SQLSRV_ATTR_DIRECT_QUERY] = true;
}

// =============================================================================
// DSN CONFIGURATION NOTES
// =============================================================================
// Las siguientes opciones de DSN replican el comportamiento de C# SqlClient:
//
// TrustServerCertificate=true - Confiar en el certificado del servidor
// LoginTimeout=30            - Tiempo máximo de espera para login (segundos)
// ConnectionPooling=0        - Deshabilitar pool para evitar conexiones stale
// Encrypt=no                 - Sin encriptación SSL (puede cambiar según config)
// APP=PHP_OSM_WEB            - Identificador de aplicación para monitoreo
//
// DIFERENCIAS CON C# SqlClient:
// - C# usa connection pooling por defecto
// - C# usa LoginTimeout=15 por defecto
// - C# negocia automáticamente la encriptación
// - PHP PDO requiere configuración explícita
// =============================================================================

try {
    // Primary SQL Server connection (OSM)
    // Equivalente a: "Data Source=192.168.150.199;Initial Catalog=SVN_G4026_OSM;..."
    $dsn = "sqlsrv:Server={$serverName},{$port};" .
        "Database={$database};" .
        "TrustServerCertificate=true;" .
        "LoginTimeout=2;" .
        "Encrypt=no;" .
        "APP=PHP_OSM_WEB";

    $sqlsrv = new PDO($dsn, $username, $password, $pdoOptions);

    if (ENABLE_DEBUG) {
        echo "✅ Conexión exitosa a SQL Server (OSM).";
    }
} catch (PDOException $e) {
    // Log error securely without exposing details
    error_log("SQL Server OSM connection error: " . $e->getMessage());
    error_log("DSN attempted: sqlsrv:Server={$serverName},{$port};Database={$database}");

    // Don't expose database details in error message
    if (ENABLE_DEBUG) {
        error_log("❌ Error al conectar a SQL Server OSM: " . $e->getMessage());
    } else {
        error_log("❌ Error al conectar a la base de datos. Contacte al administrador.");
    }
}

try {
    // Weighing system database connection (vscalex_oleaginosas)
    // Equivalente a: "Data Source=192.168.0.199;Initial Catalog=vscalex_oleaginosas;..."
    // Este DSN replica la conexión del código C# original de Vansolix
    $dsnBascula = "sqlsrv:Server={$serverNameBascula},{$portBascula};" .
        "Database={$databaseBascula};" .
        "TrustServerCertificate=true;" .
        "LoginTimeout=2;" .
        "Encrypt=no;" .
        "APP=PHP_OSM_BASCULA";

    $sqlsrvBascula = new PDO($dsnBascula, $usernameBascula, $passwordBascula, $pdoOptions);

    if (ENABLE_DEBUG) {
        echo "✅ Conexión exitosa a SQL Server (Báscula - vscalex_oleaginosas).";
    }
} catch (PDOException $e) {
    error_log("SQL Server Bascula connection error: " . $e->getMessage());
    error_log("DSN attempted: sqlsrv:Server={$serverNameBascula},{$portBascula};Database={$databaseBascula}");
    error_log("Verify: 1) ODBC Driver installed, 2) Network connectivity, 3) Firewall rules");

    if (ENABLE_DEBUG) {
        error_log("❌ Error al conectar a SQL Server Báscula: " . $e->getMessage());
    } else {
        error_log("❌ Error al conectar a la base de datos de báscula. Contacte al administrador.");
    }
}

try {
    // SAP database connection (SAP_OLEAGINOSAS)
    // Equivalente a la segunda conexión del código C# de Vansolix
    // Usa el mismo servidor pero diferente base de datos
    $dsnSAP = "sqlsrv:Server={$serverNameBascula},{$portBascula};" .
        "Database={$databaseSAP};" .
        "TrustServerCertificate=true;" .
        "LoginTimeout=2;" .
        "Encrypt=no;" .
        "APP=PHP_OSM_SAP";

    $sqlsrvSAP = new PDO($dsnSAP, $usernameBascula, $passwordBascula, $pdoOptions);

    if (ENABLE_DEBUG) {
        echo "✅ Conexión exitosa a SQL Server (SAP - SAP_OLEAGINOSAS).";
    }
} catch (PDOException $e) {
    error_log("SQL Server SAP connection error: " . $e->getMessage());
    error_log("DSN attempted: sqlsrv:Server={$serverNameBascula},{$portBascula};Database={$databaseSAP}");

    if (ENABLE_DEBUG) {
        error_log("❌ Error al conectar a SQL Server SAP: " . $e->getMessage());
    } else {
        error_log("❌ Error al conectar a la base de datos SAP. Contacte al administrador.");
    }
}

// =============================================================================
// FUNCIONES AUXILIARES PARA DIAGNÓSTICO DE CONEXIÓN
// =============================================================================

/**
 * Verifica la conectividad de red al servidor SQL Server
 * @param string $host Dirección IP del servidor
 * @param int $port Puerto del servidor
 * @param int $timeout Timeout en segundos
 * @return array Resultado de la verificación
 */
function testNetworkConnectivity($host, $port = 1433, $timeout = 5)
{
    $result = [
        'host' => $host,
        'port' => $port,
        'reachable' => false,
        'error' => null
    ];

    $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);

    if ($fp) {
        $result['reachable'] = true;
        fclose($fp);
    } else {
        $result['error'] = "$errstr (código: $errno)";
    }

    return $result;
}

/**
 * Verifica si las extensiones necesarias están instaladas
 * @return array Estado de las extensiones
 */
function checkSqlServerExtensions()
{
    return [
        'pdo_sqlsrv' => extension_loaded('pdo_sqlsrv'),
        'sqlsrv' => extension_loaded('sqlsrv'),
        'pdo' => extension_loaded('pdo')
    ];
}

/**
 * Obtiene la versión del driver PDO SQL Server
 * @return string|null Versión del driver o null si no está disponible
 */
function getSqlServerDriverVersion()
{
    if (!extension_loaded('pdo_sqlsrv')) {
        return null;
    }

    // Intentar obtener la versión del driver
    $info = [];
    if (function_exists('sqlsrv_client_info')) {
        $info = sqlsrv_client_info(null);
    }

    // Verificar si tenemos información del driver
    if (isset($info['DriverVer']) && !empty($info['DriverVer'])) {
        return $info['DriverVer'];
    }

    // Intentar obtener la versión desde phpversion
    $phpVersion = phpversion('pdo_sqlsrv');
    if ($phpVersion !== false && !empty($phpVersion)) {
        return $phpVersion;
    }

    return 'versión desconocida';
}
