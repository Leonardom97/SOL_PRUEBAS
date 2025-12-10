<?php
/**
 * API cosecha_fruta.
 * - Upsert guarda en la BD temporal.
 * - Rechazar/Aprobar requieren permisos de admin.
 * - Inactivar/Activar actualizan tanto MAIN como TEMP (si existen) para mantener consistencia entre ambas tablas.
 * - Acepta 'id' como fallback donde aplica.
 */
header('Content-Type: application/json; charset=utf-8');

function respond(array $d,int $c=200){
    http_response_code($c);
    echo json_encode($d,JSON_UNESCAPED_UNICODE);
    exit;
}
function getTemporal(): PDO { require __DIR__.'/db_temporal.php'; return $pg; }
function getMain(): PDO { require __DIR__.'/db_postgres_prueba.php'; return $pg; }

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
    if (!$action) throw new RuntimeException('action requerido. Valores: conexion, actualizar, inactivar, rechazar, aprobar, activar');

    $action = map_action($action);

    // Aprobar y rechazar requieren admin (mantengo la restricción previa)
    if (in_array($action, ['aprobar','rechazar'], true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }

    // --- CONEXION / LISTAR ---
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
        if (!empty($_GET['ordenColumna'])) {
            $ordenColumna = preg_replace('/[^a-zA-Z0-9_]/','',$_GET['ordenColumna']);
            if ($ordenColumna !== '') {
                $ordenAsc = (isset($_GET['ordenAsc']) && $_GET['ordenAsc'] == '0') ? 'DESC' : 'ASC';
                $orderSql = "ORDER BY \"$ordenColumna\" $ordenAsc";
            }
        }

        $sql = "SELECT * FROM cosecha_fruta $whereSql $orderSql LIMIT :lim OFFSET :off";
        $stmt = $pg->prepare($sql);
        $i = 1; foreach($params as $p){ $stmt->bindValue($i++,$p); }
        $stmt->bindValue(':lim',$pageSize,PDO::PARAM_INT);
        $stmt->bindValue(':off',$offset,PDO::PARAM_INT);
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sqlT = "SELECT COUNT(*) FROM cosecha_fruta $whereSql";
        $stmtT = $pg->prepare($sqlT);
        $i = 1; foreach($params as $p){ $stmtT->bindValue($i++,$p); }
        $stmtT->execute();
        $total = (int)$stmtT->fetchColumn();

        respond(['success'=>true,'action'=>'conexion','datos'=>$datos,'total'=>$total,'page'=>$page,'pageSize'=>$pageSize]);
    }

    // --- ACTUALIZAR (UPSERT) en TEMPORAL ---
    if ($action === 'actualizar') {
        $pg = getTemporal();
        if(!is_array($body)) throw new RuntimeException('JSON inválido');
        $cols = [
            'cosecha_fruta_id','fecha_actividad','responsable','plantacion','finca','siembra','lote','parcela','labor_especifica',
            'tipo_corte','equipo','cod_colaborador_contratista','n_grupo_dia','hora_entrada','hora_salida','linea_entrada','linea_salida',
            'total_personas','unidad','cantidad','peso_promedio_lonas','total_persona_dia','colaborador','nuevo_operador','supervision',
            'error_registro','check'
        ];
        $id = $body['cosecha_fruta_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id || trim($id)==='') throw new RuntimeException('cosecha_fruta_id requerido');

        $insertCols=[]; $insertPlaceholders=[]; $insertVals=[];
        $updatePairs=[]; $updateVals=[];
        foreach($cols as $c){
            if(array_key_exists($c,$body)){
                $insertCols[]=$c;
                $insertPlaceholders[]='?';
                $insertVals[]=$body[$c];
                if($c!=='cosecha_fruta_id'){
                    $updatePairs[]="\"$c\" = ?";
                    $updateVals[]=$body[$c];
                }
            }
        }
        if(empty($insertCols)) throw new RuntimeException('No hay datos para insertar o actualizar');

        $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $stC = $pg->prepare("SELECT 1 FROM cosecha_fruta WHERE cosecha_fruta_id=?");
        $stC->execute([$id]);
        $exists = (bool)$stC->fetchColumn();

        if($exists){
            $sql = "UPDATE cosecha_fruta SET ".implode(', ',$updatePairs)." WHERE cosecha_fruta_id = ?";
            $valsToExecute = array_merge($updateVals, [$id]);
            $ok = $pg->prepare($sql)->execute($valsToExecute);
        } else {
            if(!in_array('cosecha_fruta_id',$insertCols,true)){
                $insertCols[]='cosecha_fruta_id';
                $insertPlaceholders[]='?';
                $insertVals[]=$id;
            }
            $sql = "INSERT INTO cosecha_fruta (".implode(',',$insertCols).") VALUES (".implode(',',$insertPlaceholders).")";
            $ok = $pg->prepare($sql)->execute($insertVals);
        }

        if($ok){
            respond(['success'=>true,'message'=>'guardado correctamente']);
        } else {
            respond(['success'=>false,'error'=>'db_error'],500);
        }
    }

    // --- INACTIVAR: marca error_registro='inactivo' en MAIN y en TEMP si existe ---
    if ($action === 'inactivar') {
        $id = $body['cosecha_fruta_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id) respond(['success'=>false,'error'=>'id_invalid'],400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $foundMain = false;
        $foundTemp = false;

        // MAIN - verificar si existe primero, luego actualizar
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgMain->prepare("SELECT 1 FROM cosecha_fruta WHERE cosecha_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id'=>$id]);
            $foundMain = (bool)$stCheck->fetchColumn();
            
            if ($foundMain) {
                $stMain = $pgMain->prepare("UPDATE cosecha_fruta SET error_registro = 'inactivo' WHERE cosecha_fruta_id = :id");
                $stMain->execute(['id'=>$id]);
                $updatedMain = $stMain->rowCount();
            }
        } catch(Throwable $e) {
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        // TEMP - verificar si existe primero, luego actualizar
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgTemp->prepare("SELECT 1 FROM cosecha_fruta WHERE cosecha_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id'=>$id]);
            $foundTemp = (bool)$stCheck->fetchColumn();
            
            if ($foundTemp) {
                $stTemp = $pgTemp->prepare("UPDATE cosecha_fruta SET error_registro = 'inactivo' WHERE cosecha_fruta_id = :id");
                $stTemp->execute(['id'=>$id]);
                $updatedTemp = $stTemp->rowCount();
            }
        } catch(Throwable $e) {
            // no fallo crítico si temporal no accesible, sólo avisamos
            $warnings[] = 'temp_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        // Éxito si el registro se encontró en al menos una base de datos
        $ok = ($foundMain || $foundTemp);
        $response = ['success'=>$ok,'action'=>'inactivar','id'=>$id,'updated_main'=>$updatedMain,'updated_temp'=>$updatedTemp,'estado'=>'inactivo','warnings'=>$warnings];
        if (!$ok) {
            $response['error'] = 'No se encontró el registro con ID: '.htmlspecialchars($id, ENT_QUOTES, 'UTF-8').' en ninguna base de datos';
        }
        respond($response);
    }

    // --- ACTIVAR: quita flag error_registro en MAIN y TEMP (pone NULL) ---
    if ($action === 'activar') {
        $id = $body['cosecha_fruta_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id) respond(['success'=>false,'error'=>'id_invalid'],400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $foundMain = false;
        $foundTemp = false;

        // MAIN - verificar si existe primero, luego actualizar
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgMain->prepare("SELECT 1 FROM cosecha_fruta WHERE cosecha_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id'=>$id]);
            $foundMain = (bool)$stCheck->fetchColumn();
            
            if ($foundMain) {
                // intento poner NULL; si tu esquema no permite NULL podrías cambiar a empty string ''.
                $stMain = $pgMain->prepare("UPDATE cosecha_fruta SET error_registro = NULL WHERE cosecha_fruta_id = :id");
                $stMain->execute(['id'=>$id]);
                $updatedMain = $stMain->rowCount();
            }
        } catch(Throwable $e) {
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        // TEMP - verificar si existe primero, luego actualizar
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            // Primero verificar si el registro existe
            $stCheck = $pgTemp->prepare("SELECT 1 FROM cosecha_fruta WHERE cosecha_fruta_id = :id LIMIT 1");
            $stCheck->execute(['id'=>$id]);
            $foundTemp = (bool)$stCheck->fetchColumn();
            
            if ($foundTemp) {
                $stTemp = $pgTemp->prepare("UPDATE cosecha_fruta SET error_registro = NULL WHERE cosecha_fruta_id = :id");
                $stTemp->execute(['id'=>$id]);
                $updatedTemp = $stTemp->rowCount();
            }
        } catch(Throwable $e) {
            $warnings[] = 'temp_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        // Éxito si el registro se encontró en al menos una base de datos
        $ok = ($foundMain || $foundTemp);
        $response = ['success'=>$ok,'action'=>'activar','id'=>$id,'updated_main'=>$updatedMain,'updated_temp'=>$updatedTemp,'estado'=>'activo','warnings'=>$warnings];
        if (!$ok) {
            $response['error'] = 'No se encontró el registro con ID: '.htmlspecialchars($id, ENT_QUOTES, 'UTF-8').' en ninguna base de datos';
        }
        respond($response);
    }

    // --- RECHAZAR (ya implementado) ---
    if ($action === 'rechazar') {
        if($_SERVER['REQUEST_METHOD']!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id = isset($body['cosecha_fruta_id']) ? trim($body['cosecha_fruta_id']) : '';
        if($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if($id === '') throw new RuntimeException('cosecha_fruta_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.cosecha_fruta SET supervision='rechazado', \"check\"=0 WHERE cosecha_fruta_id=:id");
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
            $stTemp = $pgTemp->prepare("UPDATE public.cosecha_fruta SET supervision='rechazado', \"check\"=0 WHERE cosecha_fruta_id=:id");
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
                $del = $pgTemp->prepare("DELETE FROM public.cosecha_fruta WHERE cosecha_fruta_id = :id");
                $del->execute(['id'=>$id]);
                $deletedTemp = $del->rowCount();
            }catch(Throwable $e){
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

    // --- APROBAR (ya implementado) ---
    if ($action === 'aprobar') {
        if($_SERVER['REQUEST_METHOD']!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id = isset($body['cosecha_fruta_id']) ? trim($body['cosecha_fruta_id']) : '';
        if($id === '') $id = isset($body['id']) ? trim($body['id']) : '';
        if($id === '') throw new RuntimeException('cosecha_fruta_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $insertedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) intentar actualizar MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.cosecha_fruta SET supervision='aprobado', \"check\"=1 WHERE cosecha_fruta_id=:id");
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
                $stFetch = $pgTemp->prepare("SELECT * FROM public.cosecha_fruta WHERE cosecha_fruta_id = :id LIMIT 1");
                $stFetch->execute(['id'=>$id]);
                $row = $stFetch->fetch(PDO::FETCH_ASSOC);
                if($row){
                    $row['supervision'] = 'aprobado';
                    $row['check'] = 1;
                    $cols = array_keys($row);
                    $place = array_map(function($c){ return ':'.preg_replace('/[^a-zA-Z0-9_]/','',$c); }, $cols);
                    $colsSql = implode(',', array_map(function($c){ return "\"$c\""; }, $cols));
                    $placeSql = implode(',', $place);
                    $sqlIns = "INSERT INTO public.cosecha_fruta ($colsSql) VALUES ($placeSql)";
                    $stIns = $pgMain->prepare($sqlIns);
                    foreach($cols as $c){
                        $stIns->bindValue(':'.preg_replace('/[^a-zA-Z0-9_]/','',$c), $row[$c]);
                    }
                    $stIns->execute();
                    $insertedMain = $stIns->rowCount();
                } else {
                    $warnings[] = 'no_temp_row_to_insert';
                }
            }catch(Throwable $e){
                $warnings[] = 'main_insert_error: '.$e->getMessage();
            }
        }

        // 3) actualizar TEMP siempre que sea posible
        try {
            if(!isset($pgTemp)) $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.cosecha_fruta SET supervision='aprobado', \"check\"=1 WHERE cosecha_fruta_id=:id");
            $stTemp->execute(['id'=>$id]);
            $updatedTemp = $stTemp->rowCount();
        } catch(Throwable $e){
            $warnings[] = 'temp_update_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        // 4) si MAIN fue actualizado o insertado, eliminar fila en TEMP para que no siga apareciendo en pendientes
        if(($updatedMain + $insertedMain) > 0){
            try {
                if(!isset($pgTemp)) $pgTemp = getTemporal();
                $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
                $del = $pgTemp->prepare("DELETE FROM public.cosecha_fruta WHERE cosecha_fruta_id = :id");
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