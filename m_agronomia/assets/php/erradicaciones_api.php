<?php
/**
 * API erradicaciones
 *
 * Soporta:
 *  - action=conexion (GET): listado con filtros, paginación y orden
 *  - action=actualizar (POST JSON): upsert en temporal
 *  - action=inactivar (POST JSON): marca error_registro='inactivo' en main
 *  - action=rechazar (POST JSON): rechaza en main/temp (requiere admin)
 *  - action=aprobar (POST JSON): aprueba en main/temp (requiere admin)
 *
 * Sigue el patrón de mantenimientos_api.php / compostaje_api.php
 */
header('Content-Type: application/json; charset=utf-8');

function respond(array $d,int $c=200){
    http_response_code($c);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}
function getTemporal(): PDO { require __DIR__ . '/db_temporal.php'; return $pg; }
function getMain(): PDO { require __DIR__ . '/db_postgres_prueba.php'; return $pg; }

function map_action(?string $a): string {
    $a = is_string($a) ? strtolower(trim($a)) : '';
    $m = [
        'conexion'=>'conexion','listar'=>'conexion','list'=>'conexion',
        'actualizar'=>'actualizar','upsert'=>'actualizar',
        'inactivar'=>'inactivar','desactivar'=>'inactivar',
        'rechazar'=>'rechazar','reject'=>'rechazar',
        'aprobar'=>'aprobar','approve'=>'aprobar',
    'activar'=>'activar','reactivar'=>'activar','activar_registro'=>'activar'
    ];
    return $m[$a] ?? '';
}

try {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?: [];
    $action = $_GET['action'] ?? $body['action'] ?? null;
    if(!$action) throw new RuntimeException('action requerido. Valores: conexion, actualizar, inactivar, rechazar, aprobar');

    $action = map_action($action);

    // Columnas para erradicaciones (según lista proporcionada)
    $cols = [
        'erradicaciones_id','fecha','fecha_actividad','hora','colaborador','plantacion',
        'finca','siembra','lote','parcela','linea','palma',
        'mesamate_l','alisin_l','cal_agricola_kg','unidad_2','cantidad_unidades','estado',
        'herramienta','labor','observacion','camtidad_2','unidad_medida_2',
        'dl_50_producto_2','ingrediente_activo_2','concantracion_ingrediente_2',
        'error_registro','supervision','check'
    ];

    // Acciones restringidas a admin
    if (in_array($action, ['aprobar','rechazar'], true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }
    if (in_array($action,['actualizar','inactivar'],true)) {
        require_once __DIR__ . '/require_admin.php';
        require_edit_permission();
    }

    if ($action === 'conexion') {
        $pg = getMain();
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $pageSize = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
        $offset = ($page - 1) * $pageSize;

        $where = []; $params = [];
        foreach ($_GET as $key => $value) {
            if (strpos($key, 'filtro_') === 0 && $value !== '') {
                $col = preg_replace('/[^a-zA-Z0-9_]/', '', substr($key, 7));
                if ($col === '') continue;
                $where[] = "\"$col\" ILIKE ?";
                $params[] = '%'.$value.'%';
            }
        }
        $whereSql = $where ? 'WHERE '.implode(' AND ', $where) : '';

        $orderSql = '';
        if(!empty($_GET['ordenColumna'])){
            $ordenColumna = preg_replace('/[^a-zA-Z0-9_]/','',$_GET['ordenColumna']);
            if($ordenColumna!==''){
                $ordenAsc = (isset($_GET['ordenAsc']) && $_GET['ordenAsc']=='0') ? 'DESC' : 'ASC';
                $orderSql = "ORDER BY \"$ordenColumna\" $ordenAsc";
            }
        }

        $sql = "SELECT * FROM erradicaciones $whereSql $orderSql LIMIT :lim OFFSET :off";
        $stmt = $pg->prepare($sql);
        $i = 1; foreach($params as $p){ $stmt->bindValue($i++,$p); }
        $stmt->bindValue(':lim', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sqlT = "SELECT COUNT(*) FROM erradicaciones $whereSql";
        $stmtT = $pg->prepare($sqlT);
        $i = 1; foreach($params as $p){ $stmtT->bindValue($i++,$p); }
        $stmtT->execute();
        $total = (int)$stmtT->fetchColumn();

        respond(['success'=>true,'action'=>'conexion','datos'=>$datos,'total'=>$total,'page'=>$page,'pageSize'=>$pageSize]);
    }

    if ($action === 'actualizar') {
        $pg = getTemporal();
        if(!is_array($body)) throw new RuntimeException('JSON inválido');

        $id = $body['erradicaciones_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id || trim($id)==='') throw new RuntimeException('erradicaciones_id requerido');

        $insertCols=[]; $placeholders=[]; $vals=[];
        $updatePairs=[]; $updateVals=[];
        foreach($cols as $c){
            if(array_key_exists($c, $body)){
                $insertCols[] = $c;
                $placeholders[] = '?';
                $vals[] = $body[$c];
                if($c !== 'erradicaciones_id'){
                    $updatePairs[] = "\"$c\" = ?";
                    $updateVals[] = $body[$c];
                }
            }
        }
        if(empty($insertCols)) throw new RuntimeException('No hay datos para insertar o actualizar');

        $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $stC = $pg->prepare("SELECT 1 FROM erradicaciones WHERE erradicaciones_id = ?");
        $stC->execute([$id]);
        $exists = (bool)$stC->fetchColumn();

        if($exists){
            $sql = "UPDATE erradicaciones SET ".implode(', ', $updatePairs)." WHERE erradicaciones_id = ?";
            $valsToExecute = array_merge($updateVals, [$id]);
            $ok = $pg->prepare($sql)->execute($valsToExecute);
        } else {
            if(!in_array('erradicaciones_id', $insertCols, true)){
                $insertCols[] = 'erradicaciones_id';
                $placeholders[] = '?';
                $vals[] = $id;
            }
            $sql = "INSERT INTO erradicaciones (".implode(',', $insertCols).") VALUES (".implode(',', $placeholders).")";
            $ok = $pg->prepare($sql)->execute($vals);
        }

        if($ok){
            respond(['success'=>true,'message'=>'guardado correctamente']);
        } else {
            respond(['success'=>false,'error'=>'db_error'],500);
        }
    }

    if ($action === 'inactivar') {
        $pg = getMain();
        $id = $body['erradicaciones_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id) respond(['success'=>false,'error'=>'id_invalid'],400);
        $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $st = $pg->prepare("UPDATE erradicaciones SET error_registro='inactivo' WHERE erradicaciones_id = ?");
        $st->execute([$id]);
        $success = $st->rowCount() > 0;
        respond(['success'=>$success,'action'=>'inactivar','id'=>$id,'estado'=>'inactivo']);
    }

    // --- ACTIVAR: quita flag error_registro en MAIN (pone NULL) ---
    if ($action === 'activar') {
        $pg = getMain();
        $id = $body['erradicaciones_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id) respond(['success'=>false,'error'=>'id_invalid'],400);
        $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $st = $pg->prepare("UPDATE erradicaciones SET error_registro = NULL WHERE erradicaciones_id = :id");
        $st->execute(['id'=>$id]);
        $success = $st->rowCount() > 0;
        respond(['success'=>$success,'action'=>'activar','id'=>$id,'estado'=>'activo']);
    }

    if ($action === 'rechazar') {
        if($_SERVER['REQUEST_METHOD'] !== 'POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id = isset($body['erradicaciones_id']) ? trim($body['erradicaciones_id']) : '';
        if($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if($id === '') throw new RuntimeException('erradicaciones_id requerido');

        $warnings = []; $updatedMain = 0; $updatedTemp = 0; $deletedTemp = 0;

        // 1) MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.erradicaciones SET supervision='rechazado', \"check\"=0 WHERE erradicaciones_id=:id");
            $stMain->execute(['id'=>$id]);
            $updatedMain = $stMain->rowCount();
        } catch(Throwable $e){
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        // 2) TEMP
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.erradicaciones SET supervision='rechazado', \"check\"=0 WHERE erradicaciones_id=:id");
            $stTemp->execute(['id'=>$id]);
            $updatedTemp = $stTemp->rowCount();
        } catch(Throwable $e){
            $warnings[] = 'temp_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        // 3) si MAIN afectó, eliminar fila en TEMP
        if($updatedMain > 0){
            try{
                if(!isset($pgTemp)) $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
                $del = $pgTemp->prepare("DELETE FROM public.erradicaciones WHERE erradicaciones_id = :id");
                $del->execute(['id'=>$id]);
                $deletedTemp = $del->rowCount();
            } catch(Throwable $e){
                $warnings[] = 'temp_delete_error: '.$e->getMessage();
            }
        }

        $ok = ($updatedMain + $updatedTemp) > 0;
        respond([
            'success'=>$ok,
            'action'=>'rechazar',
            'id'=>$id,
            'updated_main'=>$updatedMain,
            'updated_temp'=>$updatedTemp,
            'deleted_temp'=>$deletedTemp,
            'estado'=>'rechazado',
            'warnings'=>$warnings
        ]);
    }

    if ($action === 'aprobar') {
        if($_SERVER['REQUEST_METHOD'] !== 'POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id = isset($body['erradicaciones_id']) ? trim($body['erradicaciones_id']) : '';
        if($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if($id === '') throw new RuntimeException('erradicaciones_id requerido');

        $warnings = []; $updatedMain = 0; $insertedMain = 0; $updatedTemp = 0; $deletedTemp = 0;

        // 1) intentar actualizar MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.erradicaciones SET supervision='aprobado', \"check\"=1 WHERE erradicaciones_id=:id");
            $stMain->execute(['id'=>$id]);
            $updatedMain = $stMain->rowCount();
        } catch(Throwable $e){
            $warnings[] = 'main_update_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        // 2) si no existía en MAIN, intentar insertar desde TEMP
        if($updatedMain == 0){
            try{
                $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
                $stFetch = $pgTemp->prepare("SELECT * FROM public.erradicaciones WHERE erradicaciones_id = :id LIMIT 1");
                $stFetch->execute(['id'=>$id]);
                $row = $stFetch->fetch(PDO::FETCH_ASSOC);
                if($row){
                    $row['supervision'] = 'aprobado';
                    $row['check'] = 1;
                    $colsRow = array_keys($row);
                    $place = array_map(function($c){ return ':'.preg_replace('/[^a-zA-Z0-9_]/','',$c); }, $colsRow);
                    $colsSql = implode(',', array_map(function($c){ return "\"$c\""; }, $colsRow));
                    $placeSql = implode(',', $place);
                    $sqlIns = "INSERT INTO public.erradicaciones ($colsSql) VALUES ($placeSql)";
                    $stIns = $pgMain->prepare($sqlIns);
                    foreach($colsRow as $c){
                        $stIns->bindValue(':'.preg_replace('/[^a-zA-Z0-9_]/','',$c), $row[$c]);
                    }
                    $stIns->execute();
                    $insertedMain = $stIns->rowCount();
                } else {
                    $warnings[] = 'no_temp_row_to_insert';
                }
            } catch(Throwable $e){
                $warnings[] = 'main_insert_error: '.$e->getMessage();
            }
        }

        // 3) actualizar TEMP siempre que sea posible
        try {
            if(!isset($pgTemp)) $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.erradicaciones SET supervision='aprobado', \"check\"=1 WHERE erradicaciones_id=:id");
            $stTemp->execute(['id'=>$id]);
            $updatedTemp = $stTemp->rowCount();
        } catch(Throwable $e){
            $warnings[] = 'temp_update_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        // 4) si MAIN fue actualizado o insertado, eliminar fila en TEMP
        if(($updatedMain + $insertedMain) > 0){
            try {
                if(!isset($pgTemp)) $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
                $del = $pgTemp->prepare("DELETE FROM public.erradicaciones WHERE erradicaciones_id = :id");
                $del->execute(['id'=>$id]);
                $deletedTemp = $del->rowCount();
            } catch(Throwable $e){
                $warnings[] = 'temp_delete_error_after_main: '.$e->getMessage();
            }
        }

        $ok = ($updatedMain + $insertedMain + $updatedTemp + $deletedTemp) > 0;
        respond([
            'success'=>$ok,
            'action'=>'aprobar',
            'id'=>$id,
            'updated_main'=>$updatedMain,
            'inserted_main'=>$insertedMain,
            'updated_temp'=>$updatedTemp,
            'deleted_temp'=>$deletedTemp,
            'warnings'=>$warnings
        ]);
    }

    throw new RuntimeException('action no reconocido');

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>'exception','message'=>$e->getMessage()]);
}
?>