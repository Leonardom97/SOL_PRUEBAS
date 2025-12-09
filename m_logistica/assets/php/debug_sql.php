<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../../../php/db_postgres.php';

try {
    $semana = '2025-W49'; // Example week

    echo "Testing connection...<br>";
    if ($pg) {
        echo "Connection successful.<br>";
    } else {
        die("Connection failed.");
    }

    $sql = "SELECT lp.*, 
            lv.id as viaje_id, lv.estado_viaje, lv.fecha_salida,
            pv.placa, pv.tipo_vehiculo,
            pc.nombres as conductor_nombres, pc.apellidos as conductor_apellidos,
            f.nombre_finca, f.nombre_empresa as proveedor_nombre,
            a.identificador as acopio_nombre
            FROM logi_programacion lp
            LEFT JOIN logi_viajes lv ON lp.id = lv.programacion_id
            LEFT JOIN port_vehiculos pv ON lv.vehiculo_id = pv.id
            LEFT JOIN port_conductores pc ON lv.conductor_id = pc.id
            LEFT JOIN logi_fincas f ON lp.finca_id = f.id
            LEFT JOIN logi_acopios a ON lp.acopio_id = a.id
            WHERE lp.semana_anio = :semana 
            ORDER BY lp.fecha_programacion, lp.id";

    echo "Preparing query...<br>";
    $stmt = $pg->prepare($sql);

    echo "Executing query...<br>";
    $stmt->execute([':semana' => $semana]);

    echo "Fetching results...<br>";
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<pre>";
    print_r($results);
    echo "</pre>";
} catch (PDOException $e) {
    echo "<h3>PDO Exception:</h3>";
    echo "Message: " . $e->getMessage() . "<br>";
    echo "Code: " . $e->getCode() . "<br>";
} catch (Exception $e) {
    echo "<h3>General Exception:</h3>";
    echo "Message: " . $e->getMessage() . "<br>";
}
