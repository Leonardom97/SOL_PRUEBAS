<?php
/**
 * API ct_cal_sanidad.
 * - Upsert guarda en la BD temporal.
 * - Rechazar: intenta MAIN, actualiza TEMP siempre; si MAIN afectó filas intenta eliminar en TEMP.
 * - Aprobar: intenta actualizar MAIN; si no existe en MAIN, inserta desde TEMP; actualiza TEMP siempre.
 *   Si MAIN fue actualizado/insertado correctamente, elimina la fila en TEMP para que no siga apareciendo en pendientes.
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
  $a=is_string($a)?strtolower(trim($a)):'';
  $m=[
    'conexion'=>'conexion','listar'=>'conexion','list'=>'conexion',
    'actualizar'=>'actualizar','upsert'=>'actualizar',
    'inactivar'=>'inactivar','desactivar'=>'inactivar',
    'rechazar'=>'rechazar','reject'=>'rechazar',
    'aprobar'=>'aprobar','approve'=>'aprobar',
    'activar'=>'activar','reactivar'=>'activar','activar_registro'=>'activar',
    'revertir'=>'revertir','revert'=>'revertir'
  ];
  return $m[$a]??'';
}

try {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?: [];
    $action = $_GET['action'] ?? $body['action'] ?? null;
    if (!$action) throw new RuntimeException('action requerido. Valores: conexion, actualizar, inactivar, rechazar, aprobar');

    $action = map_action($action);
    if (in_array($action,['aprobar','rechazar'],true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }

    if ($action==='conexion') {
        $pg = getMain();
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $pageSize = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
        $offset = ($page - 1) * $pageSize;

        $where=[];$params=[];
        foreach ($_GET as $key => $value) {
            if (strpos($key, 'filtro_') === 0 && $value !== '') {
                $col = preg_replace('/[^a-zA-Z0-9_]/', '', substr($key, 7));
                if ($col==='') continue;
                $where[]="\"$col\" ILIKE ?";
                $params[]='%'.$value.'%';
            }
        }
        $whereSql=$where?'WHERE '.implode(' AND ',$where):'';

        $orderSql='';
        if(!empty($_GET['ordenColumna'])){
            $ordenColumna=preg_replace('/[^a-zA-Z0-9_]/','',$_GET['ordenColumna']);
            if($ordenColumna!==''){
                $ordenAsc=(isset($_GET['ordenAsc'])&&$_GET['ordenAsc']=='0')?'DESC':'ASC';
                $orderSql="ORDER BY \"$ordenColumna\" $ordenAsc";
            }
        }

        $sql="SELECT * FROM ct_cal_sanidad $whereSql $orderSql LIMIT :lim OFFSET :off";
        $stmt=$pg->prepare($sql);
        $i=1; foreach($params as $p){ $stmt->bindValue($i++,$p); }
        $stmt->bindValue(':lim',$pageSize,PDO::PARAM_INT);
        $stmt->bindValue(':off',$offset,PDO::PARAM_INT);
        $stmt->execute();
        $datos=$stmt->fetchAll(PDO::FETCH_ASSOC);

        $sqlT="SELECT COUNT(*) FROM ct_cal_sanidad $whereSql";
        $stmtT=$pg->prepare($sqlT);
        $i=1; foreach($params as $p){ $stmtT->bindValue($i++,$p); }
        $stmtT->execute();
        $total=(int)$stmtT->fetchColumn();

        respond(['success'=>true,'action'=>'conexion','datos'=>$datos,'total'=>$total,'page'=>$page,'pageSize'=>$pageSize]);
    }

    if ($action==='actualizar') {
        $pg = getTemporal();
        if(!is_array($body)) throw new RuntimeException('JSON inválido');
        $cols=[
            'ct_cal_sanidad_id','fecha','hora','responsable','labor','colaborador','plantacion','finca','siembra','lote','parcela','linea','palma','tipo_labor','estado','etapa','instar','verificacion','observaciones','supervision','error_registro','check'
        ];
        $id=$body['ct_cal_sanidad_id']??null;
        if((!$id||trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id||trim($id)==='') throw new RuntimeException('ct_cal_sanidad_id requerido');

        $insertCols=[];$insertPlaceholders=[];$insertVals=[];
        $updatePairs=[];$updateVals=[];
        foreach($cols as $c){
            if(array_key_exists($c,$body)){
                $insertCols[]=$c;
                $insertPlaceholders[]='?';
                $insertVals[]=$body[$c];
                if($c!=='ct_cal_sanidad_id'){
                    $updatePairs[]="\"$c\" = ?";
                    $updateVals[]=$body[$c];
                }
            }
        }
        if(empty($insertCols)) throw new RuntimeException('No hay datos para insertar o actualizar');

        $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $stC=$pg->prepare("SELECT 1 FROM ct_cal_sanidad WHERE ct_cal_sanidad_id=?");
        $stC->execute([$id]);
        $exists=(bool)$stC->fetchColumn();

        if($exists){
            $sql="UPDATE ct_cal_sanidad SET ".implode(', ',$updatePairs)." WHERE ct_cal_sanidad_id = ?";
            $valsToExecute = array_merge($updateVals, [$id]);
            $ok = $pg->prepare($sql)->execute($valsToExecute);
        } else {
            if(!in_array('ct_cal_sanidad_id',$insertCols,true)){
                $insertCols[]='ct_cal_sanidad_id';
                $insertPlaceholders[]='?';
                $insertVals[]=$id;
            }
            $sql="INSERT INTO ct_cal_sanidad (".implode(',',$insertCols).") VALUES (".implode(',',$insertPlaceholders).")";
            $ok = $pg->prepare($sql)->execute($insertVals);
        }

        if($ok){
            respond(['success'=>true,'message'=>'guardado correctamente']);
        }else{
            respond(['success'=>false,'error'=>'db_error'],500);
        }
    }

    // --- INACTIVAR: marca error_registro='inactivo' en MAIN y en TEMP si existe ---
    if ($action === 'inactivar') {
        $id = $body['ct_cal_sanidad_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id) respond(['success'=>false,'error'=>'id_invalid'],400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;

        // MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE ct_cal_sanidad SET error_registro = 'inactivo' WHERE ct_cal_sanidad_id = :id");
            $stMain->execute(['id'=>$id]);
            $updatedMain = $stMain->rowCount();
        } catch(Throwable $e) {
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        // TEMP (intentar si existe)
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.ct_cal_sanidad SET error_registro = 'inactivo' WHERE ct_cal_sanidad_id = :id");
            $stTemp->execute(['id'=>$id]);
            $updatedTemp = $stTemp->rowCount();
        } catch(Throwable $e) {
            // no fallo crítico si temporal no accesible, sólo avisamos
            $warnings[] = 'temp_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        $ok = ($updatedMain + $updatedTemp) > 0;
        respond(['success'=>$ok,'action'=>'inactivar','id'=>$id,'updated_main'=>$updatedMain,'updated_temp'=>$updatedTemp,'estado'=>'inactivo','warnings'=>$warnings]);
    }

    // --- ACTIVAR: quita flag error_registro en MAIN y TEMP (pone NULL) ---
    if ($action === 'activar') {
        $id = $body['ct_cal_sanidad_id'] ?? null;
        if((!$id || trim($id)==='') && isset($body['id'])) $id = $body['id'];
        if(!$id) respond(['success'=>false,'error'=>'id_invalid'],400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;

        // MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            // intento poner NULL; si tu esquema no permite NULL podrías cambiar a empty string ''.
            $stMain = $pgMain->prepare("UPDATE ct_cal_sanidad SET error_registro = NULL WHERE ct_cal_sanidad_id = :id");
            $stMain->execute(['id'=>$id]);
            $updatedMain = $stMain->rowCount();
        } catch(Throwable $e) {
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        // TEMP
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.ct_cal_sanidad SET error_registro = NULL WHERE ct_cal_sanidad_id = :id");
            $stTemp->execute(['id'=>$id]);
            $updatedTemp = $stTemp->rowCount();
        } catch(Throwable $e) {
            $warnings[] = 'temp_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        $ok = ($updatedMain + $updatedTemp) > 0;
        respond(['success'=>$ok,'action'=>'activar','id'=>$id,'updated_main'=>$updatedMain,'updated_temp'=>$updatedTemp,'estado'=>'activo','warnings'=>$warnings]);
    }

    if ($action==='rechazar'){
        if($_SERVER['REQUEST_METHOD']!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id=isset($body['ct_cal_sanidad_id'])?trim($body['ct_cal_sanidad_id']):'';
        if($id==='') $id = isset($body['id'])?trim($body['id']):'';
        if($id==='') throw new RuntimeException('ct_cal_sanidad_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.ct_cal_sanidad SET supervision='rechazado', \"check\"=0 WHERE ct_cal_sanidad_id=:id");
            $stMain->execute(['id'=>$id]);
            $updatedMain = $stMain->rowCount();
        } catch(Throwable $e){
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        // 2) TEMP (siempre intentamos)
        try {
            $pgTemp = getTemporal();
            $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stTemp = $pgTemp->prepare("UPDATE public.ct_cal_sanidad SET supervision='rechazado', \"check\"=0 WHERE ct_cal_sanidad_id=:id");
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
                $del = $pgTemp->prepare("DELETE FROM public.ct_cal_sanidad WHERE ct_cal_sanidad_id = :id");
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

    if ($action==='aprobar'){
        if($_SERVER['REQUEST_METHOD']!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id=isset($body['ct_cal_sanidad_id'])?trim($body['ct_cal_sanidad_id']):'';
        if($id==='') $id = isset($body['id'])?trim($body['id']):'';
        if($id==='') throw new RuntimeException('ct_cal_sanidad_id requerido');

        $warnings = [];
        $updatedMain = 0;
        $insertedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        // 1) intentar actualizar MAIN
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.ct_cal_sanidad SET supervision='aprobado', \"check\"=1 WHERE ct_cal_sanidad_id=:id");
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
                $stFetch = $pgTemp->prepare("SELECT * FROM public.ct_cal_sanidad WHERE ct_cal_sanidad_id = :id LIMIT 1");
                $stFetch->execute(['id'=>$id]);
                $row = $stFetch->fetch(PDO::FETCH_ASSOC);
                if($row){
                    // asegurarnos valores por defecto para supervision/check
                    $row['supervision'] = 'aprobado';
                    $row['check'] = 1;
                    // construir insert dinámico
                    $cols = array_keys($row);
                    $place = array_map(function($c){ return ':'.preg_replace('/[^a-zA-Z0-9_]/','',$c); }, $cols);
                    $colsSql = implode(',', array_map(function($c){ return "\"$c\""; }, $cols));
                    $placeSql = implode(',', $place);
                    $sqlIns = "INSERT INTO public.ct_cal_sanidad ($colsSql) VALUES ($placeSql)";
                    $stIns = $pgMain->prepare($sqlIns);
                    // bind values
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
            $stTemp = $pgTemp->prepare("UPDATE public.ct_cal_sanidad SET supervision='aprobado', \"check\"=1 WHERE ct_cal_sanidad_id=:id");
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
                $del = $pgTemp->prepare("DELETE FROM public.ct_cal_sanidad WHERE ct_cal_sanidad_id = :id");
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

    // --- REVERTIR: cambia supervision de 'aprobado' a 'pendiente' ---
    if ($action === 'revertir') {
        if($_SERVER['REQUEST_METHOD']!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id=isset($body['ct_cal_sanidad_id'])?trim($body['ct_cal_sanidad_id']):'';
        if($id==='') $id = isset($body['id'])?trim($body['id']):'';
        if($id==='') throw new RuntimeException('ct_cal_sanidad_id requerido');

        $warnings = [];
        $updatedMain = 0;

        // Revertir en MAIN: cambiar supervision a 'pendiente'
        try {
            $pgMain = getMain();
            $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $stMain = $pgMain->prepare("UPDATE public.ct_cal_sanidad SET supervision='pendiente', "check"=0 WHERE ct_cal_sanidad_id=:id AND supervision='aprobado'");
            $stMain->execute(['id'=>$id]);
            $updatedMain = $stMain->rowCount();
        } catch(Throwable $e){
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        $ok = $updatedMain > 0;
        respond([
            'success'=>$ok,
            'action'=>'revertir',
            'id'=>$id,
            'updated_main'=>$updatedMain,
            'estado'=>'pendiente',
            'warnings'=>$warnings,
            'message'=> $ok ? 'Registro revertido a pendiente' : 'No se pudo revertir el registro (puede que no esté aprobado)'
        ]);
    }


    throw new RuntimeException('action no reconocido');

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>'exception','message'=>$e->getMessage()]);
}
?>