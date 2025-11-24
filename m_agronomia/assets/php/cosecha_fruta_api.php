<?php
/**
 * API cosecha_fruta.
 * Acciones: conexion|listar|list, actualizar|upsert,
 * aprobar|aprobar (admin), rechazar|rechazar (admin), inactivar|inactivate.
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

    $table = 'cosecha_fruta';
    $idCol = 'cosecha_fruta_id';
    $colsAllowed = [
        'cosecha_fruta_id', 'fecha_actividad', 'responsable', 'plantacion', 'finca', 'siembra', 'lote', 'parcela',
        'labor_especifica', 'tipo_corte', 'equipo', 'cod_colaborador_contratista', 'n_grupo_dia', 'hora_entrada',
        'hora_salida', 'linea_entrada', 'linea_salida', 'total_personas', 'unidad', 'cantidad', 'peso_promedio_lonas',
        'total_persona_dia', 'contratista', 'colaborador', 'nuevo_operador', 'supervision', 'check', 'error_registro'
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