<?php

/**
 * API de Cosecha de Fruta
 *
 * Gestiona las actividades de cosecha, incluyendo:
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

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

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
    if (!$action) throw new RuntimeException('action requerido. Valores: conexion, actualizar, inactivar, rechazar, aprobar, activar');

    $action = map_action($action);

    // Aprobar y rechazar requieren admin (mantengo la restricción previa)
    if (in_array($action, ['aprobar', 'rechazar'], true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }

    // --- CONEXION / LISTAR ---
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

        $sql = "SELECT * FROM reco_fruta $whereSql $orderSql LIMIT ? OFFSET ?";
        $stmt = $pg->prepare($sql);
        $i = 1;
        foreach ($params as $p) {
            $stmt->bindValue($i++, $p);
        }
        $stmt->bindValue($i++, $pageSize, PDO::PARAM_INT);
        $stmt->bindValue($i++, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sqlT = "SELECT COUNT(*) FROM reco_fruta $whereSql";
        $stmtT = $pg->prepare($sqlT);
        $i = 1;
        foreach ($params as $p) {
            $stmtT->bindValue($i++, $p);
        }
        $stmtT->execute();
        $total = (int)$stmtT->fetchColumn();

        respond(['success' => true, 'action' => 'conexion', 'datos' => $datos, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize]);
    }

    // --- ACTUALIZAR (UPSERT) en TEMPORAL ---
    if ($action === 'actualizar') {
        $pg = getTemporal();
        if (!is_array($body)) throw new RuntimeException('JSON inválido');
        $cols = [
            'reco_fruta_id',
            'fecha',
            'hora',
            'fecha_actividad',
            'colaborador',
            'fecha_corte',
            'plantacion',
            'finca',
            'siembra',
            'lote',
            'parcela',
            'labor_especifica',
            'tipo_labor',
            'cod_contratista_maquina',
            'cod_contratista_colaborador',
            'hora_entrada',
            'hora_salida',
            'linea_entrada',
            'linea_salida',
            'total_personas',
            'unidad',
            'cantidad',
            'n_remision',
            'colaborador_contratista',
            'tipo_equipo',
            'cod_maquina',
            'cod_vagon',
            'cod_plantacion',
            'plantacion_trz',
            'tipo',
            'tipo_cosecha',
            'porce_verdes',
            'porce_tusa',
            'porce_enfermos_malformados',
            'porce_impureza',
            'porce_sobremaduro',
            'porce_pedunculo_largo',
            'cod_corte',
            'horas_trabajadas',
            'kilos_horas',
            'kg_persona',
            'peso_promedio_estandar',
            'peso_inicial',
            'peso_plantacion',
            'part',
            'peso_bascula',
            'peso_cargue',
            'peso_promedio',
            'peso_promedio_corte',
            'racimos_viaje_cargue',
            'error',
            'palmas_1',
            'palmas_2',
            'ajuste_palmas',
            'palmas',
            'area',
            'avance',
            'entrada_diaria',
            'jornales_totales',
            'area_individual',
            'racimos_encontrados',
            'tipo_general',
            'fecha_cargue',
            'supervision',
            'error_registro',
            'check'
        ];
        $id = $body['reco_fruta_id'] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
        if (!$id || trim($id) === '') throw new RuntimeException('reco_fruta_id requerido');

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
                if ($c !== 'reco_fruta_id') {
                    $updatePairs[] = "\"$c\" = ?";
                    $updateVals[] = $body[$c];
                }
            }
        }
        if (empty($insertCols)) throw new RuntimeException('No hay datos para insertar o actualizar');

        $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $stC = $pg->prepare("SELECT 1 FROM reco_fruta WHERE reco_fruta_id=?");
        $stC->execute([$id]);
        $exists = (bool)$stC->fetchColumn();

        if ($exists) {
            $sql = "UPDATE reco_fruta SET " . implode(', ', $updatePairs) . " WHERE reco_fruta_id = ?";
            $valsToExecute = array_merge($updateVals, [$id]);
            $ok = $pg->prepare($sql)->execute($valsToExecute);

            // AUDIT LOG UPDATE
            if ($ok) {
                $logger->log(
                    $_SESSION['usuario_id'] ?? null,
                    $_SESSION['tipo_usuario'] ?? 'colaborador',
                    'UPDATE_COSECHA',
                    'Actualización Cosecha Fruta',
                    ['id' => $id]
                );
            }

            // AUDIT LOG UPDATE
            if ($ok) {
                $logger->log(
                    $_SESSION['usuario_id'] ?? null,
                    $_SESSION['tipo_usuario'] ?? 'colaborador',
                    'UPDATE_COSECHA',
                    'Actualización Cosecha Fruta',
                    ['id' => $id]
                );
            }
        } else {
            if (!in_array('reco_fruta_id', $insertCols, true)) {
                $insertCols[] = 'reco_fruta_id';
                $insertPlaceholders[] = '?';
                $insertVals[] = $id;
            }
            $sql = "INSERT INTO reco_fruta (" . implode(',', $insertCols) . ") VALUES (" . implode(',', $insertPlaceholders) . ")";
            $ok = $pg->prepare($sql)->execute($insertVals);

            // AUDIT LOG CREATE
            if ($ok) {
                $logger->log(
                    $_SESSION['usuario_id'] ?? null,
                    $_SESSION['tipo_usuario'] ?? 'colaborador',
                    'CREATE_COSECHA',
                    'Registro Cosecha Fruta',
                    ['id' => $id]
                );
            }
        }

        if ($ok) {
            respond(['success' => true, 'message' => 'guardado correctamente']);
        } else {
            respond(['success' => false, 'error' => 'db_error'], 500);
        }
    }

    // --- INACTIVAR: marca error_registro='inactivo' en MAIN y en TEMP si existe ---
    if ($action === 'inactivar') {
        $id = $body['reco_fruta_id'] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
        if (!$id) respond(['success' => false, 'error' => 'id_invalid'], 400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $foundMain = false;
        $foundTemp = false;

        // MAIN - verificar si existe primero, luego actualizar
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgMain->prepare("SELECT 1 FROM reco_fruta WHERE reco_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id' => $id]);
            $foundMain = (bool)$stCheck->fetchColumn();

            if ($foundMain) {
                $stMain = $pgMain->prepare("UPDATE reco_fruta SET error_registro = 'inactivo' WHERE reco_fruta_id = :id");
                $stMain->execute(['id' => $id]);
                $updatedMain = $stMain->rowCount();
            }
        } catch (Throwable $e) {
            $warnings[] = 'main_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // TEMP - verificar si existe primero, luego actualizar
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgTemp->prepare("SELECT 1 FROM reco_fruta WHERE reco_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id' => $id]);
            $foundTemp = (bool)$stCheck->fetchColumn();

            if ($foundTemp) {
                $stTemp = $pgTemp->prepare("UPDATE reco_fruta SET error_registro = 'inactivo' WHERE reco_fruta_id = :id");
                $stTemp->execute(['id' => $id]);
                $updatedTemp = $stTemp->rowCount();
            }
        } catch (Throwable $e) {
            // no fallo crítico si temporal no accesible, sólo avisamos
            $warnings[] = 'temp_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        // Éxito si el registro se encontró en al menos una base de datos
        $ok = ($foundMain || $foundTemp);

        // AUDIT LOG INACTIVATE
        if ($ok) {
            $logger->log(
                $_SESSION['usuario_id'] ?? null,
                $_SESSION['tipo_usuario'] ?? 'colaborador',
                'INACTIVATE_COSECHA',
                'Inactivación Cosecha Fruta',
                ['id' => $id]
            );
        }

        $response = ['success' => $ok, 'action' => 'inactivar', 'id' => $id, 'updated_main' => $updatedMain, 'updated_temp' => $updatedTemp, 'estado' => 'inactivo', 'warnings' => $warnings];
        if (!$ok) {
            $response['error'] = 'No se encontró el registro con ID: ' . htmlspecialchars($id, ENT_QUOTES, 'UTF-8') . ' en ninguna base de datos';
        }
        respond($response);
    }

    // --- ACTIVAR: quita flag error_registro en MAIN y TEMP (pone NULL) ---
    if ($action === 'activar') {
        $id = $body['reco_fruta_id'] ?? null;
        if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
        if (!$id) respond(['success' => false, 'error' => 'id_invalid'], 400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $foundMain = false;
        $foundTemp = false;

        // MAIN - verificar si existe primero, luego actualizar
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgMain->prepare("SELECT 1 FROM reco_fruta WHERE reco_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id' => $id]);
            $foundMain = (bool)$stCheck->fetchColumn();

            if ($foundMain) {
                // intento poner NULL; si tu esquema no permite NULL podrías cambiar a empty string ''.
                $stMain = $pgMain->prepare("UPDATE reco_fruta SET error_registro = NULL WHERE reco_fruta_id = :id");
                $stMain->execute(['id' => $id]);
                $updatedMain = $stMain->rowCount();
            }
        } catch (Throwable $e) {
            $warnings[] = 'main_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // TEMP - verificar si existe primero, luego actualizar
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgTemp->prepare("SELECT 1 FROM reco_fruta WHERE reco_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id' => $id]);
            $foundTemp = (bool)$stCheck->fetchColumn();

            if ($foundTemp) {
                $stTemp = $pgTemp->prepare("UPDATE reco_fruta SET error_registro = NULL WHERE reco_fruta_id = :id");
                $stTemp->execute(['id' => $id]);
                $updatedTemp = $stTemp->rowCount();
            }
        } catch (Throwable $e) {
            $warnings[] = 'temp_error: ' . $e->getMessage();
            $updatedTemp = 0;
        }

        // Éxito si el registro se encontró en al menos una base de datos
        $ok = ($foundMain || $foundTemp);

        // AUDIT LOG ACTIVATE
        if ($ok) {
            $logger->log(
                $_SESSION['usuario_id'] ?? null,
                $_SESSION['tipo_usuario'] ?? 'colaborador',
                'ACTIVATE_COSECHA',
                'Reactivación Cosecha Fruta',
                ['id' => $id]
            );
        }

        $response = ['success' => $ok, 'action' => 'activar', 'id' => $id, 'updated_main' => $updatedMain, 'updated_temp' => $updatedTemp, 'estado' => 'activo', 'warnings' => $warnings];
        if (!$ok) {
            $response['error'] = 'No se encontró el registro con ID: ' . htmlspecialchars($id, ENT_QUOTES, 'UTF-8') . ' en ninguna base de datos';
        }
        respond($response);
    }

    // --- RECHAZAR (ya implementado) ---
    if ($action === 'rechazar') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
        }
        $id = isset($body['reco_fruta_id']) ? trim($body['reco_fruta_id']) : '';
        if ($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if ($id === '') throw new RuntimeException('reco_fruta_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.reco_fruta SET supervision='rechazado', \"check\"=0 WHERE reco_fruta_id=:id");
            $stMain->execute(['id' => $id]);
            $updatedMain = $stMain->rowCount();
        } catch (Throwable $e) {
            $warnings[] = 'main_error: ' . $e->getMessage();
            $updatedMain = 0;
        }

        // 2) TEMP
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.reco_fruta SET supervision='rechazado', \"check\"=0 WHERE reco_fruta_id=:id");
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
                $del = $pgTemp->prepare("DELETE FROM public.reco_fruta WHERE reco_fruta_id = :id");
                $del->execute(['id' => $id]);
                $deletedTemp = $del->rowCount();
            } catch (Throwable $e) {
                $warnings[] = 'temp_delete_error: ' . $e->getMessage();
            }
        }

        $ok = ($updatedMain + $updatedTemp) > 0;

        // AUDIT LOG REJECT
        if ($ok) {
            $logger->log(
                $_SESSION['usuario_id'] ?? null,
                $_SESSION['tipo_usuario'] ?? 'admin',
                'REJECT_COSECHA',
                'Rechazo Cosecha Fruta',
                ['id' => $id]
            );
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

    // --- APROBAR (ya implementado) ---
    if ($action === 'aprobar') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(['success' => false, 'error' => 'method_not_allowed', 'allowed' => 'POST'], 405);
        }
        $id = isset($body['reco_fruta_id']) ? trim($body['reco_fruta_id']) : '';
        if ($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if ($id === '') throw new RuntimeException('reco_fruta_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $insertedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) intentar actualizar MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.reco_fruta SET supervision='aprobado', \"check\"=1 WHERE reco_fruta_id=:id");
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
                $stFetch = $pgTemp->prepare("SELECT * FROM public.reco_fruta WHERE reco_fruta_id = :id LIMIT 1");
                $stFetch->execute(['id' => $id]);
                $row = $stFetch->fetch(PDO::FETCH_ASSOC);
                if ($row) {
                    $row['supervision'] = 'aprobado';
                    $row['check'] = 1;
                    $cols = array_keys($row);
                    $place = array_map(function ($c) {
                        return ':' . preg_replace('/[^a-zA-Z0-9_]/', '', $c);
                    }, $cols);
                    $colsSql = implode(',', array_map(function ($c) {
                        return "\"$c\"";
                    }, $cols));
                    $placeSql = implode(',', $place);
                    $sqlIns = "INSERT INTO public.reco_fruta ($colsSql) VALUES ($placeSql)";
                    $stIns = $pgMain->prepare($sqlIns);
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
            $stTemp = $pgTemp->prepare("UPDATE public.reco_fruta SET supervision='aprobado', \"check\"=1 WHERE reco_fruta_id=:id");
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
                $del = $pgTemp->prepare("DELETE FROM public.reco_fruta WHERE reco_fruta_id = :id");
                $del->execute(['id' => $id]);
                $deletedTemp = $del->rowCount();
            } catch (Throwable $e) {
                $warnings[] = 'temp_delete_error_after_main: ' . $e->getMessage();
            }
        }

        $ok = ($updatedMain + $insertedMain + $updatedTemp + $deletedTemp) > 0;

        // AUDIT LOG APPROVE
        if ($ok) {
            $logger->log(
                $_SESSION['usuario_id'] ?? null,
                $_SESSION['tipo_usuario'] ?? 'admin',
                'APPROVE_COSECHA',
                'Aprobación Cosecha Fruta',
                ['id' => $id]
            );
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
