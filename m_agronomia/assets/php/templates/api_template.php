<?php
/**
 * PLANTILLA BASE PARA API - {NOMBRE_MODULO}
 * 
 * Esta plantilla implementa las siguientes acciones:
 * - conexion/listar/list: Lista registros con paginación y filtros
 * - actualizar/upsert: Inserta o actualiza registros en BD temporal
 * - inactivar/desactivar: Marca registros como inactivos
 * - rechazar/reject: Rechaza registros (requiere admin)
 * - aprobar/approve: Aprueba registros (requiere admin)
 * 
 * INSTRUCCIONES DE USO:
 * 1. Copiar este archivo y renombrarlo como {nombre_tabla}_api.php
 * 2. Reemplazar {NOMBRE_TABLA} por el nombre real de la tabla
 * 3. Reemplazar {NOMBRE_TABLA_ID} por el nombre de la columna ID
 * 4. Actualizar el array $cols con las columnas de la tabla
 * 5. IMPORTANTE: Siempre incluir 'error_registro', 'supervision', 'check' en $cols
 * 
 * @author Sistema SOL
 * @version 1.0
 */
header('Content-Type: application/json; charset=utf-8');

/**
 * Función para responder en formato JSON
 * @param array $d Datos a responder
 * @param int $c Código HTTP (default: 200)
 */
function respond(array $d, int $c = 200) {
    http_response_code($c);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Obtiene conexión a BD temporal
 * @return PDO Conexión PDO
 */
function getTemporal(): PDO {
    require __DIR__ . '/db_temporal.php';
    return $pg;
}

/**
 * Obtiene conexión a BD principal
 * @return PDO Conexión PDO
 */
function getMain(): PDO {
    require __DIR__ . '/db_postgres_prueba.php';
    return $pg;
}

/**
 * Mapea alias de acciones a nombres estándar
 * @param string|null $a Acción recibida
 * @return string Acción estandarizada
 */
function map_action(?string $a): string {
    $a = is_string($a) ? strtolower(trim($a)) : '';
    $m = [
        'conexion' => 'conexion', 'listar' => 'conexion', 'list' => 'conexion',
        'actualizar' => 'actualizar', 'upsert' => 'actualizar',
        'inactivar' => 'inactivar', 'desactivar' => 'inactivar',
        'rechazar' => 'rechazar', 'reject' => 'rechazar',
        'aprobar' => 'aprobar', 'approve' => 'aprobar'
    ];
    return $m[$a] ?? '';
}

// ================================================================================
// CONFIGURACIÓN DEL MÓDULO - MODIFICAR SEGÚN LA TABLA
// ================================================================================
$TABLE_NAME = '{NOMBRE_TABLA}';           // Nombre de la tabla en BD
$PRIMARY_KEY = '{NOMBRE_TABLA_ID}';       // Nombre de la columna clave primaria

// Array de columnas válidas para la tabla
// IMPORTANTE: Siempre incluir 'error_registro', 'supervision', 'check'
$cols = [
    '{NOMBRE_TABLA_ID}',
    // Agregar aquí las columnas de la tabla...
    'error_registro',
    'supervision',
    'check'
];
// ================================================================================

try {
    // Obtener datos del request
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?: [];
    $action = $_GET['action'] ?? $body['action'] ?? null;
    
    if (!$action) {
        throw new RuntimeException('action requerido. Valores: conexion, actualizar, inactivar, rechazar, aprobar');
    }

    $action = map_action($action);
    
    // Verificar permisos para acciones de aprobación/rechazo
    if (in_array($action, ['aprobar', 'rechazar'], true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }

    // ============================================================================
    // ACCIÓN: CONEXION (listar registros con paginación y filtros)
    // ============================================================================
    if ($action === 'conexion') {
        $pg = getMain();
        
        // Paginación
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $pageSize = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
        $offset = ($page - 1) * $pageSize;

        // Construir filtros WHERE
        $where = [];
        $params = [];
        foreach ($_GET as $key => $value) {
            if (strpos($key, 'filtro_') === 0 && $value !== '') {
                $col = preg_replace('/[^a-zA-Z0-9_]/', '', substr($key, 7));
                if ($col === '') continue;
                $where[] = "\"$col\" ILIKE ?";
                $params[] = '%' . $value . '%';
            }
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        // Ordenamiento
        $orderSql = '';
        if (!empty($_GET['ordenColumna'])) {
            $ordenColumna = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['ordenColumna']);
            if ($ordenColumna !== '') {
                $ordenAsc = (isset($_GET['ordenAsc']) && $_GET['ordenAsc'] == '0') ? 'DESC' : 'ASC';
                $orderSql = "ORDER BY \"$ordenColumna\" $ordenAsc";
            }
        }

        // Ejecutar consulta principal
        $sql = "SELECT * FROM $TABLE_NAME $whereSql $orderSql LIMIT :lim OFFSET :off";
        $stmt = $pg->prepare($sql);
        $i = 1;
        foreach ($params as $p) {
            $stmt->bindValue($i++, $p);
        }
        $stmt->bindValue(':lim', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Obtener total de registros
        $sqlT = "SELECT COUNT(*) FROM $TABLE_NAME $whereSql";
        $stmtT = $pg->prepare($sqlT);
        $i = 1;
        foreach ($params as $p) {
            $stmtT->bindValue($i++, $p);
        }
        $stmtT->execute();
        $total = (int)$stmtT->fetchColumn();

        respond([
            'success' => true,
            'action' => 'conexion',
            'datos' => $datos,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize
        ]);
    }

    // ============================================================================
    // ACCIÓN: ACTUALIZAR (insertar o actualizar en BD temporal)
    // ============================================================================
    if ($action === 'actualizar') {
        $pg = getTemporal();
        
        if (!is_array($body)) {
            throw new RuntimeException('JSON inválido');
        }

        // Obtener ID del registro
        $id = $body[$PRIMARY_KEY] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) {
            $id = $body['id'];
        }
        if (!$id || trim($id) === '') {
            throw new RuntimeException("$PRIMARY_KEY requerido");
        }

        // Preparar columnas para inserción y actualización
        $insertCols = [];
        $insertPlaceholders = [];
        $insertVals = [];
        $updatePairs = [];
        $updateVals = [];
        
        foreach ($cols as $c) {
            if (array_key_exists($c, $body)) {
                $insertCols[] = $c;
                $insertPlaceholders[] = '?';
                $insertVals[] = $body[$c];
                if ($c !== $PRIMARY_KEY) {
                    $updatePairs[] = "\"$c\" = ?";
                    $updateVals[] = $body[$c];
                }
            }
        }
        
        if (empty($insertCols)) {
            throw new RuntimeException('No hay datos para insertar o actualizar');
        }

        $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Verificar si el registro existe
        $stC = $pg->prepare("SELECT 1 FROM $TABLE_NAME WHERE $PRIMARY_KEY=?");
        $stC->execute([$id]);
        $exists = (bool)$stC->fetchColumn();

        if ($exists) {
            // UPDATE
            $sql = "UPDATE $TABLE_NAME SET " . implode(', ', $updatePairs) . " WHERE $PRIMARY_KEY = ?";
            $valsToExecute = array_merge($updateVals, [$id]);
            $ok = $pg->prepare($sql)->execute($valsToExecute);
        } else {
            // INSERT
            if (!in_array($PRIMARY_KEY, $insertCols, true)) {
                $insertCols[] = $PRIMARY_KEY;
                $insertPlaceholders[] = '?';
                $insertVals[] = $id;
            }
            $sql = "INSERT INTO $TABLE_NAME (" . implode(',', $insertCols) . ") VALUES (" . implode(',', $insertPlaceholders) . ")";
            $ok = $pg->prepare($sql)->execute($insertVals);
        }

        if ($ok) {
            respond(['success' => true, 'message' => 'guardado correctamente']);
        } else {
            respond(['success' => false, 'error' => 'db_error'], 500);
        }
    }

    // ============================================================================
    // ACCIÓN: INACTIVAR (marcar registro como inactivo)
    // ============================================================================
    if ($action === 'inactivar') {
        $pg = getMain();
        
        $id = $body[$PRIMARY_KEY] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) {
            $id = $body['id'];
        }
        if (!$id) {
            respond(['success' => false, 'error' => 'id_invalid'], 400);
        }
        
        $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $st = $pg->prepare("UPDATE $TABLE_NAME SET error_registro='inactivo' WHERE $PRIMARY_KEY=?");
        $st->execute([$id]);
        $success = $st->rowCount() > 0;
        
        respond([
            'success' => $success,
            'action' => 'inactivar',
            'id' => $id,
            'estado' => 'inactivo'
        ]);
    }

    // ============================================================================
    // ACCIÓN: RECHAZAR (rechazar registro - requiere admin)
    // ============================================================================
    if ($action === 'rechazar') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
        }
        
        $id = isset($body[$PRIMARY_KEY]) ? trim($body[$PRIMARY_KEY]) : '';
        if ($id === '') {
            $id = isset($body['id']) ? trim($body['id']) : '';
        }
        if ($id === '') {
            throw new RuntimeException("$PRIMARY_KEY requerido");
        }

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) Actualizar en BD principal
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.$TABLE_NAME SET supervision='rechazado', \"check\"=0 WHERE $PRIMARY_KEY=:id");
            $stMain->execute(['id' => $id]);
            $updatedMain = $stMain->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'main_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // 2) Actualizar en BD temporal
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.$TABLE_NAME SET supervision='rechazado', \"check\"=0 WHERE $PRIMARY_KEY=:id");
            $stTemp->execute(['id' => $id]);
            $updatedTemp = $stTemp->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'temp_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        // 3) Si MAIN afectó, eliminar fila en TEMP
        if ($updatedMain > 0) {
            try {
                if (!isset($pgTemp)) $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $del = $pgTemp->prepare("DELETE FROM public.$TABLE_NAME WHERE $PRIMARY_KEY = :id");
                $del->execute(['id' => $id]);
                $deletedTemp = $del->rowCount();
            } catch (Throwable $e) {
                $warnings[] = 'temp_delete_error: ' . $e->getMessage();
            }
        }

        $ok = ($updatedMain + $updatedTemp) > 0;
        respond([
            'success' => $ok,
            'action' => 'rechazar',
            'id' => $id,
            'updated_main' => $updatedMain,
            'updated_temp' => $updatedTemp,
            'deleted_temp' => $deletedTemp,
            'estado' => 'rechazado',
            'warnings' => $warnings
        ]);
    }

    // ============================================================================
    // ACCIÓN: APROBAR (aprobar registro - requiere admin)
    // ============================================================================
    if ($action === 'aprobar') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
        }
        
        $id = isset($body[$PRIMARY_KEY]) ? trim($body[$PRIMARY_KEY]) : '';
        if ($id === '') {
            $id = isset($body['id']) ? trim($body['id']) : '';
        }
        if ($id === '') {
            throw new RuntimeException("$PRIMARY_KEY requerido");
        }

        $warnings = [];
        $updatedMain = 0;
        $insertedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) Intentar actualizar en BD principal
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.$TABLE_NAME SET supervision='aprobado', \"check\"=1 WHERE $PRIMARY_KEY=:id");
            $stMain->execute(['id' => $id]);
            $updatedMain = $stMain->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'main_update_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // 2) Si no existía en MAIN, intentar insertar desde TEMP
        if ($updatedMain == 0) {
            try {
                $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $stFetch = $pgTemp->prepare("SELECT * FROM public.$TABLE_NAME WHERE $PRIMARY_KEY = :id LIMIT 1");
                $stFetch->execute(['id' => $id]);
                $row = $stFetch->fetch(PDO::FETCH_ASSOC);
                
                if ($row) {
                    // Asegurar valores por defecto para supervision/check
                    $row['supervision'] = 'aprobado';
                    $row['check'] = 1;
                    
                    // Construir INSERT dinámico
                    $colsArr = array_keys($row);
                    $place = array_map(function ($c) {
                        return ':' . preg_replace('/[^a-zA-Z0-9_]/', '', $c);
                    }, $colsArr);
                    $colsSql = implode(',', array_map(function ($c) {
                        return "\"$c\"";
                    }, $colsArr));
                    $placeSql = implode(',', $place);
                    $sqlIns = "INSERT INTO public.$TABLE_NAME ($colsSql) VALUES ($placeSql)";
                    $stIns = $pgMain->prepare($sqlIns);
                    
                    // Bind values
                    foreach ($colsArr as $c) {
                        $stIns->bindValue(':' . preg_replace('/[^a-zA-Z0-9_]/', '', $c), $row[$c]);
                    }
                    $stIns->execute();
                    $insertedMain = $stIns->rowCount();
                } else {
                    $warnings[] = 'no_temp_row_to_insert';
                }
            } catch (Throwable $e) {
                $warnings[] = 'main_insert_error: ' . $e->getMessage();
            }
        }

        // 3) Actualizar TEMP siempre que sea posible
        try {
            if (!isset($pgTemp)) $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.$TABLE_NAME SET supervision='aprobado', \"check\"=1 WHERE $PRIMARY_KEY=:id");
            $stTemp->execute(['id' => $id]);
            $updatedTemp = $stTemp->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'temp_update_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        // 4) Si MAIN fue actualizado o insertado, eliminar fila en TEMP
        if (($updatedMain + $insertedMain) > 0) {
            try {
                if (!isset($pgTemp)) $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $del = $pgTemp->prepare("DELETE FROM public.$TABLE_NAME WHERE $PRIMARY_KEY = :id");
                $del->execute(['id' => $id]);
                $deletedTemp = $del->rowCount();
            } catch (Throwable $e) {
                $warnings[] = 'temp_delete_error_after_main: ' . $e->getMessage();
            }
        }

        $ok = ($updatedMain + $insertedMain + $updatedTemp + $deletedTemp) > 0;
        respond([
            'success' => $ok,
            'action' => 'aprobar',
            'id' => $id,
            'updated_main' => $updatedMain,
            'inserted_main' => $insertedMain,
            'updated_temp' => $updatedTemp,
            'deleted_temp' => $deletedTemp,
            'warnings' => $warnings
        ]);
    }

    throw new RuntimeException('action no reconocido');

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'exception', 'message' => $e->getMessage()]);
}
?>
