<?php

/**
 * API de Coberturas
 *
 * Gestiona registros de coberturas, incluyendo:
 * - Operaciones CRUD con soporte para tabla temporal y principal.
 * - Flujo de aprobación (Rechazar/Aprobar) que requiere permisos de administrador.
 * - Sincronización de estado (Inactivar/Activar) entre tablas principal y temporal.
 * - Registro de auditoría para todas las operaciones críticas.
 */
header('Content-Type: application/json; charset=utf-8');

/**
 * Envía una respuesta JSON y termina la ejecución
 * 
 * @param array $d Datos a enviar en la respuesta
 * @param int $c Código de respuesta HTTP (por defecto 200)
 * @return void
 */
function respond(array $d, int $c = 200)
{
    http_response_code($c);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}
require_once __DIR__ . '/../../../php/db_postgres.php';
require_once __DIR__ . '/../../../php/audit_logger.php';
if (session_status() !== PHP_SESSION_ACTIVE) session_start();
$logger = new AuditLogger();

/**
 * Obtener conexión a la base de datos temporal
 * @return PDO
 */
function getTemporal(): PDO
{
    global $pg_temporal;
    return $pg_temporal;
}

/**
 * Obtener conexión a la base de datos principal
 * @return PDO
 */
function getMain(): PDO
{
    global $pg_prueba;
    return $pg_prueba;
}

/**
 * Mapear acciones de entrada a acciones estándar normalizadas
 * 
 * @param string|null $a Acción solicitada
 * @return string Acción normalizada
 */
function map_action(?string $a): string
{
    $a = is_string($a) ? strtolower(trim($a)) : '';
    $m = [
        'conexion' => 'conexion',
        'listar' => 'conexion',
        'list' => 'conexion',
        'actualizar' => 'actualizar',
        'upsert' => 'actualizar',
        'inactivar' => 'inactivar',
        'desactivar' => 'inactivar',
        'rechazar' => 'rechazar',
        'reject' => 'rechazar',
        'aprobar' => 'aprobar',
        'approve' => 'aprobar',
        'activar' => 'activar',
        'reactivar' => 'activar',
        'activar_registro' => 'activar'
    ];
    return $m[$a] ?? '';
}

try {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?: [];
    $action = $_GET['action'] ?? $body['action'] ?? null;
    if (!$action) throw new RuntimeException('action requerido. Valores: conexion, actualizar, inactivar, rechazar, aprobar');

    $action = map_action($action);
    if (in_array($action, ['aprobar', 'rechazar'], true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }

    if ($action === 'conexion') {
        $pg = getMain();
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $pageSize = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
        $offset = ($page - 1) * $pageSize;

        $where = [];
        $params = [];
        foreach ($_GET as $key => $value) {
            if (strpos($key, 'filtro_') === 0 && $value !== '') {
                $col = preg_replace('/[^a-zA-Z0-9_]/', '', substr($key, 7));
                if ($col === '') continue;
                $where[] = "\"$col\"::text ILIKE ?";
                $params[] = '%' . $value . '%';
            }
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $orderSql = '';
        if (!empty($_GET['ordenColumna'])) {
            $ordenColumna = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['ordenColumna']);
            if ($ordenColumna !== '') {
                $ordenAsc = (isset($_GET['ordenAsc']) && $_GET['ordenAsc'] == '0') ? 'DESC' : 'ASC';
                $orderSql = "ORDER BY \"$ordenColumna\" $ordenAsc";
            }
        }

        $sql = "SELECT * FROM coberturas $whereSql $orderSql LIMIT ? OFFSET ?";
        $stmt = $pg->prepare($sql);
        $i = 1;
        foreach ($params as $p) {
            $stmt->bindValue($i++, $p);
        }
        $stmt->bindValue($i++, $pageSize, PDO::PARAM_INT);
        $stmt->bindValue($i++, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sqlCount = "SELECT COUNT(*) FROM coberturas $whereSql";
        $stmtCount = $pg->prepare($sqlCount);
        $iCount = 1;
        foreach ($params as $p) {
            $stmtCount->bindValue($iCount++, $p);
        }
        $stmtCount->execute();
        $total = (int)$stmtCount->fetchColumn();

        echo json_encode(['datos' => $datos, 'total' => $total]);
        exit;
    }

    if ($action === 'actualizar' || $action === 'upsert') {
        $pg = getTemporal();
        if (!is_array($body)) throw new RuntimeException('JSON inválido');
        $cols = [
            'coberturas_id',
            'fecha',
            'hora',
            'fecha_actividad',
            'responsable',
            'contratista',
            'codigo',
            'colaborador',
            'labor',
            'plantacion',
            'finca',
            'siembra',
            'lote',
            'parcela',
            'linea_entrada',
            'linea_salida',
            'unidad',
            'cantidad',
            'h_inicio',
            'h_fin',
            'cobertura',
            'cant_colaboradores',
            'operador',
            'maquina',
            'observaciones',
            'supervision',
            'error_registro',
            'check'
        ];
        $id = $body['coberturas_id'] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
        if (!$id || trim($id) === '') throw new RuntimeException('coberturas_id requerido');

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
                if ($c !== 'coberturas_id') {
                    $updatePairs[] = "\"$c\" = ?";
                    $updateVals[] = $body[$c];
                }
            }
        }
        if (empty($insertCols)) throw new RuntimeException('No hay datos para insertar o actualizar');

        $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $stC = $pg->prepare("SELECT 1 FROM coberturas WHERE coberturas_id=?");
        $stC->execute([$id]);
        $exists = (bool)$stC->fetchColumn();

        if ($exists) {
            $sql = "UPDATE coberturas SET " . implode(', ', $updatePairs) . " WHERE coberturas_id = ?";
            $valsToExecute = array_merge($updateVals, [$id]);
            $ok = $pg->prepare($sql)->execute($valsToExecute);
        } else {
            if (!in_array('coberturas_id', $insertCols, true)) {
                $insertCols[] = 'coberturas_id';
                $insertPlaceholders[] = '?';
                $insertVals[] = $id;
            }
            $sql = "INSERT INTO coberturas (" . implode(',', $insertCols) . ") VALUES (" . implode(',', $insertPlaceholders) . ")";
            $ok = $pg->prepare($sql)->execute($insertVals);
        }

        if ($ok) {
            $logAction = $exists ? 'UPDATE_COBERTURAS' : 'CREATE_COBERTURAS';
            $logDesc = $exists ? 'Actualización Coberturas' : 'Registro Coberturas';
            $logger->log($_SESSION['usuario_id'] ?? null, $_SESSION['tipo_usuario'] ?? 'colaborador', $logAction, $logDesc, ['id' => $id]);

            respond(['success' => true, 'message' => 'guardado correctamente']);
        } else {
            respond(['success' => false, 'error' => 'db_error'], 500);
        }
    }

    // --- INACTIVAR: marca error_registro='inactivo' en MAIN y en TEMP si existe ---
    if ($action === 'inactivar') {
        $id = $body['coberturas_id'] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
        if (!$id) respond(['success' => false, 'error' => 'id_invalid'], 400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;

        // MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE coberturas SET error_registro = 'inactivo' WHERE coberturas_id = :id");
            $stMain->execute(['id' => $id]);
            $updatedMain = $stMain->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'main_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // TEMP (intentar si existe)
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.coberturas SET error_registro = 'inactivo' WHERE coberturas_id = :id");
            $stTemp->execute(['id' => $id]);
            $updatedTemp = $stTemp->rowCount();
        } catch (Throwable $e) {
            // no fallo crítico si temporal no accesible, sólo avisamos
            $warnings[] = 'temp_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        $ok = ($updatedMain + $updatedTemp) > 0;
        if ($ok) {
            $logger->log($_SESSION['usuario_id'] ?? null, $_SESSION['tipo_usuario'] ?? 'colaborador', 'INACTIVATE_COBERTURAS', 'Inactivación Coberturas', ['id' => $id]);
        }
        respond(['success' => $ok, 'action' => 'inactivar', 'id' => $id, 'updated_main' => $updatedMain, 'updated_temp' => $updatedTemp, 'estado' => 'inactivo', 'warnings' => $warnings]);
    }

    // --- ACTIVAR: quita flag error_registro en MAIN y TEMP (pone NULL) ---
    if ($action === 'activar') {
        $id = $body['coberturas_id'] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
        if (!$id) respond(['success' => false, 'error' => 'id_invalid'], 400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;

        // MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // intento poner NULL; si tu esquema no permite NULL podrías cambiar a empty string ''.
            $stMain = $pgMain->prepare("UPDATE coberturas SET error_registro = NULL WHERE coberturas_id = :id");
            $stMain->execute(['id' => $id]);
            $updatedMain = $stMain->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'main_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // TEMP
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.coberturas SET error_registro = NULL WHERE coberturas_id = :id");
            $stTemp->execute(['id' => $id]);
            $updatedTemp = $stTemp->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'temp_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        $ok = ($updatedMain + $updatedTemp) > 0;
        if ($ok) {
            $logger->log($_SESSION['usuario_id'] ?? null, $_SESSION['tipo_usuario'] ?? 'colaborador', 'ACTIVATE_COBERTURAS', 'Reactivación Coberturas', ['id' => $id]);
        }
        respond(['success' => $ok, 'action' => 'activar', 'id' => $id, 'updated_main' => $updatedMain, 'updated_temp' => $updatedTemp, 'estado' => 'activo', 'warnings' => $warnings]);
    }

    if ($action === 'rechazar') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
        }
        $id = isset($body['coberturas_id']) ? trim($body['coberturas_id']) : '';
        if ($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if ($id === '') throw new RuntimeException('coberturas_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.coberturas SET supervision='rechazado', \"check\"=0 WHERE coberturas_id=:id");
            $stMain->execute(['id' => $id]);
            $updatedMain = $stMain->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'main_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // 2) TEMP (siempre intentamos)
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.coberturas SET supervision='rechazado', \"check\"=0 WHERE coberturas_id=:id");
            $stTemp->execute(['id' => $id]);
            $updatedTemp = $stTemp->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'temp_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        // 3) si MAIN afectó, eliminar fila en TEMP
        if ($updatedMain > 0) {
            try {
                if (!isset($pgTemp)) $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $del = $pgTemp->prepare("DELETE FROM public.coberturas WHERE coberturas_id = :id");
                $del->execute(['id' => $id]);
                $deletedTemp = $del->rowCount();
            } catch (Throwable $e) {
                $warnings[] = 'temp_delete_error: ' . $e->getMessage();
            }
        }

        $ok = ($updatedMain + $updatedTemp) > 0;
        if ($ok) {
            $logger->log($_SESSION['usuario_id'] ?? null, $_SESSION['tipo_usuario'] ?? 'admin', 'REJECT_COBERTURAS', 'Rechazo Coberturas', ['id' => $id]);
        }
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

    if ($action === 'aprobar') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
        }
        $id = isset($body['coberturas_id']) ? trim($body['coberturas_id']) : '';
        if ($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if ($id === '') throw new RuntimeException('coberturas_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $insertedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) intentar actualizar MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.coberturas SET supervision='aprobado', \"check\"=1 WHERE coberturas_id=:id");
            $stMain->execute(['id' => $id]);
            $updatedMain = $stMain->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'main_update_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // 2) si no existía en MAIN, intentar insertar desde TEMP
        if ($updatedMain == 0) {
            try {
                $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $stFetch = $pgTemp->prepare("SELECT * FROM public.coberturas WHERE coberturas_id = :id LIMIT 1");
                $stFetch->execute(['id' => $id]);
                $row = $stFetch->fetch(PDO::FETCH_ASSOC);
                if ($row) {
                    // asegurarnos valores por defecto para supervision/check
                    $row['supervision'] = 'aprobado';
                    $row['check'] = 1;
                    // construir insert dinámico
                    $cols = array_keys($row);
                    $place = array_map(function ($c) {
                        return ':' . preg_replace('/[^a-zA-Z0-9_]/', '', $c);
                    }, $cols);
                    $colsSql = implode(',', array_map(function ($c) {
                        return "\"$c\"";
                    }, $cols));
                    $placeSql = implode(',', $place);
                    $sqlIns = "INSERT INTO public.coberturas ($colsSql) VALUES ($placeSql)";
                    $stIns = $pgMain->prepare($sqlIns);
                    // bind values
                    foreach ($cols as $c) {
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

        // 3) actualizar TEMP siempre que sea posible
        try {
            if (!isset($pgTemp)) $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.coberturas SET supervision='aprobado', \"check\"=1 WHERE coberturas_id=:id");
            $stTemp->execute(['id' => $id]);
            $updatedTemp = $stTemp->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'temp_update_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        // 4) si MAIN fue actualizado o insertado, eliminar fila en TEMP para que no siga apareciendo en pendientes
        if (($updatedMain + $insertedMain) > 0) {
            try {
                if (!isset($pgTemp)) $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $del = $pgTemp->prepare("DELETE FROM public.coberturas WHERE coberturas_id = :id");
                $del->execute(['id' => $id]);
                $deletedTemp = $del->rowCount();
            } catch (Throwable $e) {
                $warnings[] = 'temp_delete_error_after_main: ' . $e->getMessage();
            }
        }

        $ok = ($updatedMain + $insertedMain + $updatedTemp + $deletedTemp) > 0;
        if ($ok) {
            $logger->log($_SESSION['usuario_id'] ?? null, $_SESSION['tipo_usuario'] ?? 'admin', 'APPROVE_COBERTURAS', 'Aprobación Coberturas', ['id' => $id]);
        }
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
