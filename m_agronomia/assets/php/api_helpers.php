<?php
/**
 * api_helpers.php
 * 
 * Unified helper functions for all agronomia APIs
 * Fixes common issues: duplicate saves, approve/reject/inactivate not working
 */

// Prevent direct access - must be included by another file
if (!defined('API_HELPERS_LOADED')) {
    define('API_HELPERS_LOADED', true);
}

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    http_response_code(403);
    exit('Acceso prohibido');
}

/**
 * Send JSON response and exit
 */
function respond(array $data, int $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Map action aliases to canonical action names
 */
function map_action(?string $action): string {
    $action = is_string($action) ? strtolower(trim($action)) : '';
    $map = [
        'conexion' => 'list',
        'listar' => 'list',
        'list' => 'list',
        'actualizar' => 'upsert',
        'upsert' => 'upsert',
        'inactivar' => 'inactivate',
        'desactivar' => 'inactivate',
        'inactivate' => 'inactivate',
        'rechazar' => 'rechazar',
        'reject' => 'rechazar',
        'aprobar' => 'aprobar',
        'approve' => 'aprobar'
    ];
    return $map[$action] ?? '';
}

/**
 * Clean identifier to prevent SQL injection
 */
function clean_identifier(string $s): string {
    return preg_replace('/[^A-Za-z0-9_]/', '', $s);
}

/**
 * Get temporal database connection
 */
function getTemporal(): PDO {
    require __DIR__ . '/db_temporal.php';
    return $pg;
}

/**
 * Get main database connection
 */
function getMain(): PDO {
    require __DIR__ . '/db_postgres_prueba.php';
    return $pg;
}

/**
 * Require admin permissions if action needs it
 */
function require_admin_if_needed(string $action) {
    if (in_array($action, ['aprobar', 'rechazar'], true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }
}

/**
 * Handle LIST action with pagination, filtering, and sorting
 */
function handle_list(string $table, array $allowedColumns, string $idCol): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'GET'], 405);
    }

    $pg = getMain();
    $page = max(1, intval($_GET['page'] ?? 1));
    $pageSize = max(1, min(1000, intval($_GET['pageSize'] ?? 25)));
    $offset = ($page - 1) * $pageSize;

    // Build WHERE clause from filters
    $where = [];
    $params = [];
    foreach ($_GET as $key => $value) {
        if (strpos($key, 'filtro_') === 0 && $value !== '') {
            $col = clean_identifier(substr($key, 7));
            if ($col === '' || !in_array($col, $allowedColumns)) continue;
            $where[] = "\"$col\" ILIKE ?";
            $params[] = '%' . $value . '%';
        }
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Build ORDER BY clause
    $orderSql = '';
    if (!empty($_GET['ordenColumna'])) {
        $col = clean_identifier($_GET['ordenColumna']);
        if ($col !== '' && in_array($col, $allowedColumns)) {
            $dir = (isset($_GET['ordenAsc']) && $_GET['ordenAsc'] == '0') ? 'DESC' : 'ASC';
            $orderSql = "ORDER BY \"$col\" $dir";
        }
    }

    // Get data
    $sql = "SELECT * FROM $table $whereSql $orderSql LIMIT $pageSize OFFSET $offset";
    $stmt = $pg->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total count
    $sqlCount = "SELECT COUNT(*) FROM $table $whereSql";
    $stmtCount = $pg->prepare($sqlCount);
    $stmtCount->execute($params);
    $total = (int) $stmtCount->fetchColumn();

    return [
        'success' => true,
        'action' => 'list',
        'page' => $page,
        'pageSize' => $pageSize,
        'total' => $total,
        'datos' => $rows,
        'columnas' => !empty($rows) ? array_keys($rows[0]) : []
    ];
}

/**
 * Handle UPSERT action (insert or update in temporal database)
 */
function handle_upsert(string $table, array $allowedColumns, string $idCol, array $body): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
    }

    if (!is_array($body)) {
        throw new RuntimeException('JSON inválido');
    }

    // Get ID with fallback
    $id = isset($body[$idCol]) ? trim($body[$idCol]) : '';
    if ($id === '' && isset($body['id'])) {
        $id = trim($body['id']);
    }
    if (!$id || trim($id) === '') {
        throw new RuntimeException("$idCol requerido");
    }

    $pg = getTemporal();
    $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Prepare columns for insert/update
    $insertCols = [];
    $insertPlaceholders = [];
    $insertVals = [];
    $updatePairs = [];
    $updateVals = [];

    foreach ($allowedColumns as $col) {
        if (array_key_exists($col, $body)) {
            $insertCols[] = $col;
            $insertPlaceholders[] = '?';
            $insertVals[] = $body[$col];
            if ($col !== $idCol) {
                $updatePairs[] = "\"$col\" = ?";
                $updateVals[] = $body[$col];
            }
        }
    }

    if (empty($insertCols)) {
        throw new RuntimeException('Sin columnas válidas');
    }

    // Check if record exists
    $stCheck = $pg->prepare("SELECT 1 FROM $table WHERE $idCol = ?");
    $stCheck->execute([$id]);
    $exists = (bool) $stCheck->fetchColumn();

    if ($exists) {
        // UPDATE
        if (empty($updatePairs)) {
            throw new RuntimeException('Sin columnas para actualizar');
        }
        $sql = "UPDATE $table SET " . implode(', ', $updatePairs) . " WHERE $idCol = ?";
        $valsToExec = array_merge($updateVals, [$id]);
        $ok = $pg->prepare($sql)->execute($valsToExec);
    } else {
        // INSERT
        if (!in_array($idCol, $insertCols, true)) {
            $insertCols[] = $idCol;
            $insertPlaceholders[] = '?';
            $insertVals[] = $id;
        }
        $sql = "INSERT INTO $table (" . implode(',', $insertCols) . ") VALUES (" . implode(',', $insertPlaceholders) . ")";
        $ok = $pg->prepare($sql)->execute($insertVals);
    }

    if ($ok) {
        return ['success' => true, 'message' => 'guardado correctamente', 'id' => $id];
    }
    
    return ['success' => false, 'error' => 'db_error'];
}

/**
 * Handle INACTIVATE action (mark as inactive in main database)
 */
function handle_inactivate(string $table, string $idCol, array $body): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
    }

    $id = isset($body[$idCol]) ? trim($body[$idCol]) : '';
    if ($id === '' && isset($body['id'])) {
        $id = trim($body['id']);
    }
    if (!$id) {
        return ['success' => false, 'error' => 'invalid_id'];
    }

    $pg = getMain();
    $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pg->prepare("UPDATE $table SET error_registro = 'inactivo' WHERE $idCol = ?");
    $ok = $stmt->execute([$id]);
    
    return [
        'success' => $ok && $stmt->rowCount() > 0,
        'action' => 'inactivate',
        'id' => $id,
        'estado' => 'inactivo',
        'updated' => $stmt->rowCount()
    ];
}

/**
 * Handle RECHAZAR action (reject - mark as rejected in both databases)
 */
function handle_rechazar(string $table, string $idCol, array $body): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
    }

    $id = isset($body[$idCol]) ? trim($body[$idCol]) : '';
    if ($id === '' && isset($body['id'])) {
        $id = trim($body['id']);
    }
    if ($id === '') {
        throw new RuntimeException("$idCol requerido");
    }

    $warnings = [];
    $updatedMain = 0;
    $updatedTemp = 0;
    $deletedTemp = 0;

    // 1) Try to update in MAIN database
    try {
        $pgMain = getMain();
        $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $stMain = $pgMain->prepare("UPDATE public.$table SET supervision = 'rechazado', \"check\" = 0 WHERE $idCol = :id");
        $stMain->execute(['id' => $id]);
        $updatedMain = $stMain->rowCount();
    } catch (Throwable $e) {
        $warnings[] = 'main_error: ' . $e->getMessage();
        $updatedMain = 0;
    }

    // 2) Try to update in TEMP database
    try {
        $pgTemp = getTemporal();
        $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $stTemp = $pgTemp->prepare("UPDATE public.$table SET supervision = 'rechazado', \"check\" = 0 WHERE $idCol = :id");
        $stTemp->execute(['id' => $id]);
        $updatedTemp = $stTemp->rowCount();
    } catch (Throwable $e) {
        $warnings[] = 'temp_error: ' . $e->getMessage();
        $updatedTemp = 0;
    }

    // 3) If MAIN was updated, try to delete from TEMP
    if ($updatedMain > 0) {
        try {
            if (!isset($pgTemp)) $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $del = $pgTemp->prepare("DELETE FROM public.$table WHERE $idCol = :id");
            $del->execute(['id' => $id]);
            $deletedTemp = $del->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'temp_delete_error: ' . $e->getMessage();
        }
    }

    $ok = ($updatedMain + $updatedTemp) > 0;
    return [
        'success' => $ok,
        'action' => 'rechazar',
        'id' => $id,
        'updated_main' => $updatedMain,
        'updated_temp' => $updatedTemp,
        'deleted_temp' => $deletedTemp,
        'estado' => 'rechazado',
        'warnings' => $warnings
    ];
}

/**
 * Handle APROBAR action (approve - move from temp to main database)
 */
function handle_aprobar(string $table, string $idCol, array $allowedColumns, array $body): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
    }

    $id = isset($body[$idCol]) ? trim($body[$idCol]) : '';
    if ($id === '' && isset($body['id'])) {
        $id = trim($body['id']);
    }
    if ($id === '') {
        throw new RuntimeException("$idCol requerido");
    }

    $pgTemp = getTemporal();
    $pgMain = getMain();
    $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pgTemp->beginTransaction();
    $pgMain->beginTransaction();

    try {
        // 1) Get record from temp database
        $stTemp = $pgTemp->prepare("SELECT * FROM $table WHERE $idCol = ?");
        $stTemp->execute([$id]);
        $row = $stTemp->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            // Not in temp, just update status in main if exists
            $stUpdate = $pgMain->prepare("UPDATE $table SET supervision = 'aprobado', \"check\" = 1 WHERE $idCol = ?");
            $stUpdate->execute([$id]);
            $updated = $stUpdate->rowCount();
            
            $pgMain->commit();
            $pgTemp->commit();
            
            return [
                'success' => $updated > 0,
                'action' => 'aprobar',
                'id' => $id,
                'message' => $updated > 0 ? 'Registro ya estaba en base principal, marcado como aprobado' : 'Registro no encontrado',
                'moved' => false,
                'updated_main' => $updated
            ];
        }

        // 2) Prepare data for upsert into main database
        // Set supervision to 'aprobado' and check to 1
        $row['supervision'] = 'aprobado';
        $row['check'] = 1;

        // Filter only allowed columns
        $insertCols = [];
        $insertPlaceholders = [];
        $insertVals = [];
        $updatePairs = [];

        foreach ($allowedColumns as $col) {
            if (array_key_exists($col, $row)) {
                $insertCols[] = $col;
                $insertPlaceholders[] = '?';
                $insertVals[] = $row[$col];
                if ($col !== $idCol) {
                    $updatePairs[] = "\"$col\" = EXCLUDED.\"$col\"";
                }
            }
        }

        if (empty($insertCols)) {
            throw new RuntimeException('Sin columnas para insertar');
        }

        // 3) Upsert into main database
        $sql = "INSERT INTO $table (" . implode(',', $insertCols) . ") VALUES (" . implode(',', $insertPlaceholders) . ")";
        if (!empty($updatePairs)) {
            $sql .= " ON CONFLICT (\"$idCol\") DO UPDATE SET " . implode(', ', $updatePairs);
        }
        
        $stInsert = $pgMain->prepare($sql);
        $stInsert->execute($insertVals);
        $moved = $stInsert->rowCount() > 0;

        // 4) Delete from temp database
        $stDelete = $pgTemp->prepare("DELETE FROM $table WHERE $idCol = ?");
        $stDelete->execute([$id]);
        $deleted = $stDelete->rowCount();

        $pgMain->commit();
        $pgTemp->commit();

        return [
            'success' => true,
            'action' => 'aprobar',
            'id' => $id,
            'message' => 'Registro aprobado y movido a tabla base',
            'moved' => $moved,
            'deleted_temp' => $deleted
        ];
    } catch (Throwable $e) {
        $pgMain->rollBack();
        $pgTemp->rollBack();
        return [
            'success' => false,
            'error' => 'exception',
            'message' => $e->getMessage(),
            'id' => $id
        ];
    }
}
