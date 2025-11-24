<?php
/**
 * API fertilizacion_organica.
 * Acciones: list, upsert, inactivate, rechazar, aprobar
 */
require_once __DIR__ . '/api_helpers.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $raw = file_get_contents('php://input');
    $body = $raw !== '' ? (json_decode($raw, true) ?: []) : [];
    $action = $_GET['action'] ?? $_POST['action'] ?? $body['action'] ?? '';
    $action = map_action($action);
    
    if ($action === '') {
        respond(['success' => false, 'error' => 'missing_action']);
    }
    
    require_admin_if_needed($action);

    $table = 'fertilizacion_organica';
    $idCol = 'fertilizacion_organica_id';
    $colsAllowed = [
        'fertilizacion_organica_id', 'fecha_actividad', 'responsable', 'plantacion', 'finca', 'siembra', 'lote', 'parcela',
        'linea_entrada', 'linea_salida', 'hora_entrada', 'hora_salida', 'labor_especifica', 'producto_aplicado',
        'dosis_kg', 'unidad_aplicacion', 'contratista_colaborador', 'n_colaboradores', 'colaboradores', 'tipo_labor',
        'contratista_maquinaria', 'n_operadores', 'tipo_maquina', 'nombre_operadores', 'bultos_aplicados',
        'n_traslado', 'kg_aplicados', 'supervision', 'check', 'error_registro'
    ];

    if ($action === 'list') {
        $result = handle_list($table, $colsAllowed, $idCol);
        respond($result);
    }

    if ($action === 'upsert') {
        $result = handle_upsert($table, $colsAllowed, $idCol, $body);
        respond($result);
    }

    if ($action === 'inactivate') {
        $result = handle_inactivate($table, $idCol, $body);
        respond($result);
    }

    if ($action === 'rechazar') {
        $result = handle_rechazar($table, $idCol, $body);
        respond($result);
    }

    if ($action === 'aprobar') {
        $result = handle_aprobar($table, $idCol, $colsAllowed, $body);
        respond($result);
    }

    respond(['success' => false, 'error' => 'unknown_action', 'message' => 'Acción no soportada'], 400);
} catch (Throwable $e) {
    respond(['success' => false, 'error' => 'exception', 'message' => $e->getMessage()], 400);
}
?>
