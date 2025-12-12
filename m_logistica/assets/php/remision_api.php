<?php
header('Content-Type: application/json');
require_once '../../../php/db_postgres.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        case 'get_viajes_activos':
            getViajesActivos($pg);
            break;
        case 'save_remision':
            if ($method === 'POST') saveRemision($pg);
            break;
        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

function getViajesActivos($pg)
{
    // Get trips that don't have a remission yet or are in progress
    $sql = "SELECT lv.*, pv.placa, pc.nombres, pc.apellidos, lp.finca_empresa 
            FROM logi_viajes lv
            JOIN port_vehiculos pv ON lv.vehiculo_id = pv.id
            JOIN port_conductores pc ON lv.conductor_id = pc.id
            JOIN logi_programacion lp ON lv.programacion_id = lp.id
            WHERE lv.estado_viaje IN ('programado', 'en_curso')
            ORDER BY lv.created_at DESC";
    $stmt = $pg->query($sql);
    echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
}

function saveRemision($pg)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['viaje_id'])) throw new Exception("Viaje ID is required");

    $sql = "INSERT INTO logi_remisiones 
            (viaje_id, fecha_corte, fecha_hora_cargue, fecha_hora_recogida, 
            fruto_certificado, certificado_por, variedad_tipo, lotes_corte, 
            ciclo_cosecha, cosechado_por, observaciones) 
            VALUES 
            (:viaje, :fecha_corte, :fecha_cargue, :fecha_recogida, 
            :certificado, :cert_por, :variedad, :lotes, 
            :ciclo, :cosechado, :obs)";

    $stmt = $pg->prepare($sql);
    $stmt->execute([
        ':viaje' => $data['viaje_id'],
        ':fecha_corte' => $data['fecha_corte'],
        ':fecha_cargue' => $data['fecha_hora_cargue'],
        ':fecha_recogida' => $data['fecha_hora_recogida'],
        ':certificado' => isset($data['fruto_certificado']) ? 'true' : 'false',
        ':cert_por' => $data['certificado_por'],
        ':variedad' => $data['variedad_tipo'],
        ':lotes' => $data['lotes_corte'],
        ':ciclo' => $data['ciclo_cosecha'],
        ':cosechado' => $data['cosechado_por'],
        ':obs' => $data['observaciones'] ?? ''
    ]);

    // Update trip status to 'finalizado' or similar if needed, but for now just leave it
    // Maybe update to 'en_retorno' if that was a status, but 'en_curso' is fine.

    echo json_encode(['status' => 'success', 'message' => 'Remisión creada correctamente']);
}
