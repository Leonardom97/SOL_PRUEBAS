<?php
header('Content-Type: application/json');
require_once '../../../php/db_postgres.php';

// Simple router
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        case 'get_vehiculos':
            getVehiculos($pg);
            break;
        case 'save_vehiculo':
            if ($method === 'POST') saveVehiculo($pg);
            break;
        case 'get_conductores':
            getConductores($pg);
            break;
        case 'save_conductor':
            if ($method === 'POST') saveConductor($pg);
            break;
        case 'check_placa':
            checkPlaca($pg);
            break;
        case 'registrar_ingreso':
            if ($method === 'POST') registrarIngreso($pg);
            break;
        case 'registrar_salida':
            if ($method === 'POST') registrarSalida($pg);
            break;
        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

function getVehiculos($pg)
{
    $stmt = $pg->query("SELECT * FROM port_vehiculos ORDER BY updated_at DESC");
    echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
}

function saveVehiculo($pg)
{
    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation
    if (empty($data['placa'])) {
        throw new Exception("Placa is required");
    }

    if (isset($data['id']) && !empty($data['id'])) {
        // Update
        $sql = "UPDATE port_vehiculos SET 
                placa = :placa, tipo_vehiculo = :tipo_vehiculo, empresa = :empresa, 
                propio_externo = :propio_externo, soat_fecha_vencimiento = :soat, 
                tecnomecanica_fecha_vencimiento = :tecno, poliza_terceros_fecha_vencimiento = :poliza, 
                area_perteneciente = :area, estado_vehiculo = :estado, updated_at = NOW()
                WHERE id = :id";
    } else {
        // Insert
        $sql = "INSERT INTO port_vehiculos 
                (placa, tipo_vehiculo, empresa, propio_externo, soat_fecha_vencimiento, 
                tecnomecanica_fecha_vencimiento, poliza_terceros_fecha_vencimiento, 
                area_perteneciente, estado_vehiculo) 
                VALUES 
                (:placa, :tipo_vehiculo, :empresa, :propio_externo, :soat, 
                :tecno, :poliza, :area, :estado)";
    }

    $stmt = $pg->prepare($sql);
    $params = [
        ':placa' => $data['placa'],
        ':tipo_vehiculo' => $data['tipo_vehiculo'],
        ':empresa' => $data['empresa'],
        ':propio_externo' => $data['propio_externo'],
        ':soat' => $data['soat_fecha_vencimiento'],
        ':tecno' => $data['tecnomecanica_fecha_vencimiento'],
        ':poliza' => $data['poliza_terceros_fecha_vencimiento'],
        ':area' => $data['area_perteneciente'],
        ':estado' => $data['estado_vehiculo'] ?? 'activo'
    ];

    if (isset($data['id']) && !empty($data['id'])) {
        $params[':id'] = $data['id'];
    }

    $stmt->execute($params);
    echo json_encode(['status' => 'success', 'message' => 'Vehiculo guardado correctamente']);
}

function getConductores($pg)
{
    $stmt = $pg->query("SELECT * FROM port_conductores ORDER BY updated_at DESC");
    echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
}

function saveConductor($pg)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['cedula'])) {
        throw new Exception("Cedula is required");
    }

    if (isset($data['id']) && !empty($data['id'])) {
        // Update
        $sql = "UPDATE port_conductores SET 
                cedula = :cedula, nombres = :nombres, apellidos = :apellidos, 
                licencia_categoria = :licencia_cat, licencia_fecha_vencimiento = :licencia_venc, 
                parafiscales_fecha_vencimiento = :parafiscales, empresa = :empresa, 
                contacto = :contacto, area_asignada = :area, estado_conductor = :estado, updated_at = NOW()
                WHERE id = :id";
    } else {
        // Insert
        $sql = "INSERT INTO port_conductores 
                (cedula, nombres, apellidos, licencia_categoria, licencia_fecha_vencimiento, 
                parafiscales_fecha_vencimiento, empresa, contacto, area_asignada, estado_conductor) 
                VALUES 
                (:cedula, :nombres, :apellidos, :licencia_cat, :licencia_venc, 
                :parafiscales, :empresa, :contacto, :area, :estado)";
    }

    $stmt = $pg->prepare($sql);
    $params = [
        ':cedula' => $data['cedula'],
        ':nombres' => $data['nombres'],
        ':apellidos' => $data['apellidos'],
        ':licencia_cat' => $data['licencia_categoria'],
        ':licencia_venc' => $data['licencia_fecha_vencimiento'],
        ':parafiscales' => $data['parafiscales_fecha_vencimiento'],
        ':empresa' => $data['empresa'],
        ':contacto' => $data['contacto'],
        ':area' => $data['area_asignada'],
        ':estado' => $data['estado_conductor'] ?? 'activo'
    ];

    if (isset($data['id']) && !empty($data['id'])) {
        $params[':id'] = $data['id'];
    }

    $stmt->execute($params);
    echo json_encode(['status' => 'success', 'message' => 'Conductor guardado correctamente']);
}

function checkPlaca($pg)
{
    $placa = $_GET['placa'] ?? '';
    $stmt = $pg->prepare("SELECT * FROM port_vehiculos WHERE placa = :placa");
    $stmt->execute([':placa' => $placa]);
    $vehiculo = $stmt->fetch();

    if ($vehiculo) {
        echo json_encode(['status' => 'success', 'exists' => true, 'data' => $vehiculo]);
    } else {
        echo json_encode(['status' => 'success', 'exists' => false]);
    }
}

function registrarIngreso($pg)
{
    $data = json_decode(file_get_contents('php://input'), true);
    $placa = $data['placa'] ?? '';

    if (empty($placa)) throw new Exception("Placa is required");

    // Check if vehicle exists
    $stmt = $pg->prepare("SELECT * FROM port_vehiculos WHERE placa = :placa");
    $stmt->execute([':placa' => $placa]);
    $vehiculo = $stmt->fetch();

    if (!$vehiculo) throw new Exception("Vehículo no encontrado");

    // Update status
    $update = $pg->prepare("UPDATE port_vehiculos SET ubicacion_actual = 'en_planta', updated_at = NOW() WHERE id = :id");
    $update->execute([':id' => $vehiculo['id']]);

    echo json_encode(['status' => 'success', 'message' => 'Ingreso registrado']);
}

function registrarSalida($pg)
{
    $data = json_decode(file_get_contents('php://input'), true);
    $placa = $data['placa'] ?? '';

    if (empty($placa)) throw new Exception("Placa is required");

    $stmt = $pg->prepare("SELECT * FROM port_vehiculos WHERE placa = :placa");
    $stmt->execute([':placa' => $placa]);
    $vehiculo = $stmt->fetch();

    if (!$vehiculo) throw new Exception("Vehículo no encontrado");

    // Update status
    $update = $pg->prepare("UPDATE port_vehiculos SET ubicacion_actual = 'en_viaje', updated_at = NOW() WHERE id = :id");
    $update->execute([':id' => $vehiculo['id']]);

    echo json_encode(['status' => 'success', 'message' => 'Salida registrada']);
}
