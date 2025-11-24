<?php
/**
 * API plagas.
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

    $table = 'plagas';
    $idCol = 'plagas_id';
    $colsAllowed = [
        'plagas_id', 'fecha', 'hora', 'colaborador', 'plantacion', 'finca', 'siembra', 'lote', 'parcela', 'linea', 'palma', 'ubicacion', 'orden', 'plaga', 'etapa', 'cantidad', 'instar', 'estado', 'error_registro', 'supervision', 'check'
    ];

    // Handle each action using helper functions
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
