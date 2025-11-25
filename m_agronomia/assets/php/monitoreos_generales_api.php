<?php
header('Content-Type: application/json; charset=utf-8');

function respond(array $d,int $c=200){
    http_response_code($c);
    echo json_encode($d,JSON_UNESCAPED_UNICODE);
    exit;
}
function map_action(?string $a): string {
    $a=is_string($a)?strtolower(trim($a)):'';
    $m=[
        'conexion'=>'list','listar'=>'list','list'=>'list',
        'actualizar'=>'upsert','upsert'=>'upsert',
        'rechazar'=>'rechazar','reject'=>'rechazar',
        'aprobar'=>'aprobar','approve'=>'aprobar',
        'inactivar'=>'inactivate','desactivar'=>'inactivate','inactivate'=>'inactivate'
    ];
    return $m[$a] ?? '';
}
function clean_identifier(string $s): string {
    return preg_replace('/[^A-Za-z0-9_]/','',$s);
}
function getTemporal(): PDO { require __DIR__.'/db_temporal.php'; return $pg; }
function getMain(): PDO { require __DIR__.'/db_postgres_prueba.php'; return $pg; }
function require_admin_if_needed(string $a){
    if(in_array($a,['aprobar','rechazar'],true)){
        require_once __DIR__.'/require_admin.php';
        require_admin_only();
    }
}

try{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    $action = $_GET['action'] ?? $_POST['action'] ?? null;
    if(!$action){
        $rawInput = file_get_contents('php://input');
        if($rawInput){
            $tmp=json_decode($rawInput,true);
            if(is_array($tmp) && isset($tmp['action'])) $action=$tmp['action'];
        }
    }
    $action = map_action($action);
    if($action===''){
        respond(['success'=>false,'error'=>'missing_action','message'=>'Parámetro action requerido']);
    }

    $body=[];
    if(in_array($method,['POST','PUT','PATCH'],true)){
        $raw=file_get_contents('php://input');
        if($raw!==''){
            $dec=json_decode($raw,true);
            if(is_array($dec)) $body=$dec;
        }
    }

    require_admin_if_needed($action);

    $table='monitoreos_generales';
    $idCol='monitoreos_generales_id';

    if($action==='list'){
        if($method!=='GET'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'GET'],405);
        }
        $pg=getMain();
        $page=max(1,intval($_GET['page']??1));
        $size=max(1,intval($_GET['pageSize']??25));
        $off=($page-1)*$size;

        $where=[];$params=[];
        foreach($_GET as $k=>$v){
            if(strpos($k,'filtro_')===0 && $v!==''){
                $col=clean_identifier(substr($k,7));
                if($col==='') continue;
                $where[]="\"$col\" ILIKE ?";
                $params[]='%'.$v.'%';
            }
        }
        $whereSql=$where?'WHERE '.implode(' AND ',$where):'';

        $orderSql='';
        if(!empty($_GET['ordenColumna'])){
            $oc=clean_identifier($_GET['ordenColumna']);
            if($oc!==''){
                $dir=(isset($_GET['ordenAsc'])&&$_GET['ordenAsc']=='0')?'DESC':'ASC';
                $orderSql="ORDER BY \"$oc\" $dir";
            }
        }

        $st=$pg->prepare("SELECT * FROM $table $whereSql $orderSql LIMIT $size OFFSET $off");
        $st->execute($params);
        $rows=$st->fetchAll(PDO::FETCH_ASSOC);

        $stT=$pg->prepare("SELECT COUNT(*) FROM $table $whereSql");
        $stT->execute($params);
        $total=(int)$stT->fetchColumn();

        respond(['success'=>true,'action'=>'list','page'=>$page,'pageSize'=>$size,'total'=>$total,'datos'=>$rows]);
    }

    if($action==='upsert'){
        if($method!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        if(!is_array($body)) respond(['success'=>false,'error'=>'invalid_json'],400);

        $colsAllowed=[
            'monitoreos_generales_id','fecha','hora','colaborador','plantacion','finca','siembra','lote',
            'parcela','linea','palma','grupo','estado','validacion','sintoma','observacion','supervision','check','error_registro'
        ];

        $id=isset($body[$idCol])?trim($body[$idCol]):'';
        if($id==='') $id = isset($body['id'])?trim($body['id']):'';
        if($id===''){
            respond(['success'=>false,'error'=>'id_required','message'=>"$idCol requerido"],400);
        }

        $pg=getTemporal();
        $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);

        $insertCols=[];$insertPlaceholders=[];$insertVals=[];
        $updatePairs=[];$updateVals=[];
        foreach($colsAllowed as $c){
            if(array_key_exists($c,$body)){
                $insertCols[]=$c; $insertPlaceholders[]='?'; $insertVals[]=$body[$c];
                if($c!==$idCol) { $updatePairs[]="\"$c\" = ?"; $updateVals[]=$body[$c]; }
            }
        }
        if(!$insertCols){
            respond(['success'=>false,'error'=>'no_columns','message'=>'Sin columnas válidas'],400);
        }

        $stC=$pg->prepare("SELECT 1 FROM $table WHERE $idCol=?");
        $stC->execute([$id]);
        $exists=(bool)$stC->fetchColumn();

        if($exists){
            $sql="UPDATE $table SET ".implode(', ',$updatePairs)." WHERE $idCol = ?";
            $valsToExec = array_merge($updateVals, [$id]);
            $ok = $pg->prepare($sql)->execute($valsToExec);
        }else{
            if(!in_array($idCol,$insertCols,true)){ $insertCols[]=$idCol; $insertPlaceholders[]='?'; $insertVals[]=$id; }
            $sql="INSERT INTO $table (".implode(',',$insertCols).") VALUES (".implode(',',$insertPlaceholders).")";
            $ok = $pg->prepare($sql)->execute($insertVals);
        }

        if($ok) respond(['success'=>true,'message'=>'guardado correctamente']);
        respond(['success'=>false,'error'=>'db_error'],500);
    }

    if($action==='aprobar'){
        if($method!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id=isset($body[$idCol])?trim($body[$idCol]):'';
        if($id==='') $id = isset($body['id'])?trim($body['id']):'';
        if($id==='') respond(['success'=>false,'error'=>'id_required'],400);

        // Mantener flujo de aprobar existente...
        respond(['success'=>false,'error'=>'not_implemented','message'=>'Aprobar: mantener o adaptar la implementación existente.']);
    }

    if($action==='rechazar'){
        if($method!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id=isset($body[$idCol])?trim($body[$idCol]):'';
        if($id==='') $id = isset($body['id'])?trim($body['id']):'';
        if($id==='') respond(['success'=>false,'error'=>'id_required'],400);

        $warnings = [];
        $updatedMain = 0;
        $updatedTemp = 0;
        $deletedTemp = 0;

        try {
            $pg = getMain(); $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $st = $pg->prepare("UPDATE public.$table SET supervision='rechazado', \"check\"=0 WHERE $idCol=:id");
            $st->execute(['id'=>$id]);
            $updatedMain = $st->rowCount();
        } catch(Throwable $e) {
            $warnings[] = 'main_error: '.$e->getMessage();
            $updatedMain = 0;
        }

        try {
            $pgT = getTemporal(); $pgT->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
            $st2 = $pgT->prepare("UPDATE public.$table SET supervision='rechazado', \"check\"=0 WHERE $idCol=:id");
            $st2->execute(['id'=>$id]);
            $updatedTemp = $st2->rowCount();
        } catch(Throwable $e) {
            $warnings[] = 'temp_error: '.$e->getMessage();
            $updatedTemp = 0;
        }

        if($updatedMain > 0){
            try{
                if(!isset($pgT)) $pgT = getTemporal();
                $pgT->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
                $del = $pgT->prepare("DELETE FROM public.$table WHERE $idCol = :id");
                $del->execute(['id'=>$id]);
                $deletedTemp = $del->rowCount();
            }catch(Throwable $e){
                $warnings[] = 'temp_delete_error: '.$e->getMessage();
            }
        }

        respond([
            'success'=>($updatedMain + $updatedTemp) > 0,
            'action'=>'rechazar',
            'updated_main'=>$updatedMain,
            'updated_temp'=>$updatedTemp,
            'deleted_temp'=>$deletedTemp,
            'id'=>$id,
            'estado'=>'rechazado',
            'warnings'=>$warnings
        ]);
    }

    if($action==='inactivate'){
        if($method!=='POST'){
            respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
        }
        $id=isset($body[$idCol])?trim($body[$idCol]):'';
        if($id==='') $id = isset($body['id'])?trim($body['id']):'';
        if($id==='') respond(['success'=>false,'error'=>'id_required'],400);
        $pg=getMain(); $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $st=$pg->prepare("UPDATE $table SET error_registro='inactivo' WHERE $idCol=?");
        $ok=$st->execute([$id]);
        respond([
            'success'=>$ok && $st->rowCount()>0,
            'action'=>'inactivate',
            'id'=>$id,
            'estado'=>'inactivo'
        ]);
    }

    respond(['success'=>false,'error'=>'unknown_action','message'=>'Acción no soportada: '.$action],400);

}catch(Throwable $e){
    respond(['success'=>false,'error'=>'exception','message'=>$e->getMessage()],500);
}
?>