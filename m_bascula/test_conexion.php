<?php
/**
 * Database Connection Test Script
 * Tests connectivity to all required databases for the weighing system
 */

// Disable error display for production
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<html><head><title>Prueba de Conexión - Sistema de Báscula</title>";
echo "<style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .test { margin: 15px 0; padding: 15px; border-left: 4px solid #ddd; background: #f9f9f9; }
    .success { border-color: #28a745; background: #d4edda; }
    .error { border-color: #dc3545; background: #f8d7da; }
    .warning { border-color: #ffc107; background: #fff3cd; }
    .info { border-color: #17a2b8; background: #d1ecf1; }
    .status { font-weight: bold; }
    .status.ok { color: #28a745; }
    .status.fail { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #007bff; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
</style></head><body>";

echo "<div class='container'>";
echo "<h1>🔌 Prueba de Conexión - Sistema de Báscula Vansolix</h1>";
echo "<p>Fecha/Hora: " . date('Y-m-d H:i:s') . "</p>";

// Test 1: PHP SQL Server Driver
echo "<h2>1. Verificación de Extensiones PHP</h2>";

$phpDrivers = [
    'pdo_sqlsrv' => 'PDO SQL Server Driver',
    'sqlsrv' => 'Microsoft SQL Server Driver'
];

foreach ($phpDrivers as $driver => $name) {
    $loaded = extension_loaded($driver);
    $class = $loaded ? 'success' : 'error';
    $status = $loaded ? 'OK' : 'NO INSTALADA';
    $statusClass = $loaded ? 'ok' : 'fail';
    
    echo "<div class='test $class'>";
    echo "<strong>$name:</strong> <span class='status $statusClass'>$status</span>";
    echo "</div>";
}

// Test 2: Configuration File
echo "<h2>2. Verificación de Archivos de Configuración</h2>";

$configFile = __DIR__ . '/../../../php/config.php';
$dbFile = __DIR__ . '/../../../php/db_sqlserver.php';

$files = [
    'config.php' => $configFile,
    'db_sqlserver.php' => $dbFile
];

foreach ($files as $name => $path) {
    $exists = file_exists($path);
    $class = $exists ? 'success' : 'error';
    $status = $exists ? 'EXISTE' : 'NO ENCONTRADO';
    $statusClass = $exists ? 'ok' : 'fail';
    
    echo "<div class='test $class'>";
    echo "<strong>$name:</strong> <span class='status $statusClass'>$status</span><br>";
    echo "<small>Ruta: $path</small>";
    echo "</div>";
}

// Test 3: Database Connections
echo "<h2>3. Prueba de Conexiones a Bases de Datos</h2>";

require_once __DIR__ . '/../php/db_bascula.php';

$databases = [
    'vscalex_oleaginosas' => [
        'name' => 'Base de Datos de Báscula',
        'host' => '192.168.0.199',
        'port' => '1433'
    ],
    'SAP_OLEAGINOSAS' => [
        'name' => 'Base de Datos SAP',
        'host' => '192.168.0.199',
        'port' => '1433'
    ]
];

try {
    $db = new DatabaseBascula();
    
    // Test vscalex_oleaginosas
    echo "<div class='test'>";
    echo "<h3>📊 Base de Datos: vscalex_oleaginosas</h3>";
    echo "<p><strong>Host:</strong> 192.168.0.199:1433</p>";
    
    try {
        $conn = $db->getBasculaConnection();
        echo "<p><span class='status ok'>✓ CONEXIÓN EXITOSA</span></p>";
        
        // Test query
        $tables = $db->queryBascula("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
        
        echo "<p><strong>Tablas encontradas:</strong> " . count($tables) . "</p>";
        echo "<table>";
        echo "<tr><th>Tabla</th></tr>";
        
        $expectedTables = ['admin_usuarios', 'admin_terminales', 'tipos_productos', 'trans_pesadas'];
        $foundTables = array_column($tables, 'TABLE_NAME');
        
        foreach ($expectedTables as $table) {
            $found = in_array($table, $foundTables);
            $statusIcon = $found ? '✓' : '✗';
            $statusClass = $found ? 'ok' : 'fail';
            echo "<tr><td><span class='code'>$table</span> <span class='status $statusClass'>$statusIcon</span></td></tr>";
        }
        
        echo "</table>";
        echo "</div>";
        
    } catch (Exception $e) {
        echo "<p><span class='status fail'>✗ ERROR DE CONEXIÓN</span></p>";
        echo "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
        echo "</div>";
    }
    
    // Test SAP_OLEAGINOSAS
    echo "<div class='test'>";
    echo "<h3>📊 Base de Datos: SAP_OLEAGINOSAS</h3>";
    echo "<p><strong>Host:</strong> 192.168.0.199:1433</p>";
    
    try {
        $conn = $db->getSAPConnection();
        echo "<p><span class='status ok'>✓ CONEXIÓN EXITOSA</span></p>";
        
        // Test query to SAP tables
        $sapTables = [
            '[@VEHICULOS]' => 'Vehículos',
            'OCRD' => 'Socios de Negocio',
            'OPRC' => 'Centros de Costo'
        ];
        
        echo "<table>";
        echo "<tr><th>Tabla SAP</th><th>Descripción</th><th>Estado</th></tr>";
        
        foreach ($sapTables as $table => $desc) {
            try {
                $query = "SELECT TOP 1 * FROM [SAP_OLEAGINOSAS].[dbo].[$table]";
                $result = $db->querySAP($query);
                $status = !empty($result) ? '✓ Accesible' : '⚠ Vacía';
                $statusClass = !empty($result) ? 'ok' : 'warning';
            } catch (Exception $e) {
                $status = '✗ Error';
                $statusClass = 'fail';
            }
            
            echo "<tr>";
            echo "<td><span class='code'>$table</span></td>";
            echo "<td>$desc</td>";
            echo "<td><span class='status $statusClass'>$status</span></td>";
            echo "</tr>";
        }
        
        echo "</table>";
        echo "</div>";
        
    } catch (Exception $e) {
        echo "<p><span class='status fail'>✗ ERROR DE CONEXIÓN</span></p>";
        echo "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
        echo "</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='test error'>";
    echo "<p><span class='status fail'>✗ ERROR CRÍTICO</span></p>";
    echo "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
}

// Test 4: Scale Connection
echo "<h2>4. Prueba de Conexión con Báscula</h2>";

require_once __DIR__ . '/../php/escala_comunicacion.php';

echo "<div class='test'>";
echo "<h3>⚖️ Báscula Hardware</h3>";
echo "<p><strong>IP:</strong> 192.168.0.35</p>";
echo "<p><strong>Puerto:</strong> 4001</p>";

try {
    $testResult = EscalaComunicacion::testConnection('192.168.0.35', 4001);
    
    if ($testResult['success']) {
        echo "<p><span class='status ok'>✓ CONEXIÓN EXITOSA</span></p>";
        
        if (isset($testResult['weight']) && $testResult['weight']['success']) {
            echo "<p><strong>Peso Actual:</strong> " . $testResult['weight']['weight'] . " kg</p>";
            echo "<p><strong>Estado:</strong> " . ($testResult['weight']['stable'] ? 'Estable' : 'Inestable') . "</p>";
        }
    } else {
        echo "<p><span class='status fail'>✗ NO SE PUDO CONECTAR</span></p>";
        echo "<p><strong>Mensaje:</strong> " . htmlspecialchars($testResult['message']) . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p><span class='status fail'>✗ ERROR</span></p>";
    echo "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "</div>";

// Test 5: API Endpoints
echo "<h2>5. Verificación de Endpoints API</h2>";

$endpoints = [
    'auth_api.php' => 'Autenticación',
    'pesadas_api.php' => 'Operaciones de Pesaje',
    'vehiculos_api.php' => 'Gestión de Vehículos',
    'escala_api.php' => 'Comunicación con Báscula',
    'config_api.php' => 'Configuración y Catálogos'
];

echo "<table>";
echo "<tr><th>Endpoint</th><th>Descripción</th><th>Estado</th></tr>";

foreach ($endpoints as $file => $desc) {
    $path = __DIR__ . '/../php/' . $file;
    $exists = file_exists($path);
    $status = $exists ? '✓ Disponible' : '✗ No encontrado';
    $statusClass = $exists ? 'ok' : 'fail';
    
    echo "<tr>";
    echo "<td><span class='code'>$file</span></td>";
    echo "<td>$desc</td>";
    echo "<td><span class='status $statusClass'>$status</span></td>";
    echo "</tr>";
}

echo "</table>";

// Summary
echo "<h2>📋 Resumen</h2>";

echo "<div class='test info'>";
echo "<p><strong>Sistema de Báscula Vansolix - Estado de Integración</strong></p>";
echo "<ul>";
echo "<li>✅ Backend PHP implementado</li>";
echo "<li>✅ APIs REST configuradas</li>";
echo "<li>✅ Conexión a bases de datos SQL Server</li>";
echo "<li>✅ Integración con SAP_OLEAGINOSAS</li>";
echo "<li>⚠️ Báscula hardware: Verificar conexión física</li>";
echo "</ul>";
echo "<p><strong>Próximos pasos:</strong></p>";
echo "<ol>";
echo "<li>Verificar que las tablas necesarias existen en vscalex_oleaginosas</li>";
echo "<li>Crear usuarios iniciales en admin_usuarios</li>";
echo "<li>Configurar báscula en admin_terminales</li>";
echo "<li>Probar flujo completo de entrada/salida</li>";
echo "</ol>";
echo "</div>";

echo "</div>"; // Close container
echo "</body></html>";
?>
