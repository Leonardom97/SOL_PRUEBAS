<?php
header('Content-Type: text/html');
require_once '../../php/db_postgres.php';

echo "<h1>Database Connection Test</h1>";

if ($pg) {
    echo "<p style='color:green'><strong>Connection Successful!</strong></p>";
} else {
    echo "<p style='color:red'><strong>Connection Failed!</strong></p>";
    exit;
}

$tables = [
    'logi_programacion',
    'logi_viajes',
    'logi_remisiones',
    'port_vehiculos',
    'port_conductores',
    'logi_cajones',
    'logi_fincas',
    'logi_acopios'
];

echo "<h2>Table Check</h2>";
echo "<ul>";

foreach ($tables as $table) {
    try {
        $stmt = $pg->query("SELECT count(*) FROM $table");
        if ($stmt) {
            $count = $stmt->fetchColumn();
            echo "<li><span style='color:green'>OK</span>: Table <strong>$table</strong> exists (Rows: $count)</li>";
        } else {
            echo "<li><span style='color:red'>MISSING</span>: Table <strong>$table</strong> does not exist or query failed.</li>";
        }
    } catch (Exception $e) {
        echo "<li><span style='color:red'>ERROR</span>: Table <strong>$table</strong> error: " . $e->getMessage() . "</li>";
    }
}

echo "</ul>";
