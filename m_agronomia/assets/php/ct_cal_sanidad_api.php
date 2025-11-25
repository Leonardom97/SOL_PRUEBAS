<?php
/**
 * API ct_cal_sanidad.
 * Acciones: conexion|listar|list, actualizar|upsert,
 * aprobar|aprobar (admin), rechazar|rechazar (admin), inactivar|inactivate.
 * Alias entrada aceptados: approve->aprobar, reject->rechazar.
 *
 * Ajustes:
 * - Aceptar 'id' genérico como fallback.
 * - RECHAZAR: intenta MAIN y TEMP; si MAIN afectó, elimina TEMP; devuelve detalles.
 */
header('Content-Type: application/json; charset=utf-8');

function respond(array $d,int $c=200){
  http_response_code($c);
  echo json_encode($d,JSON_UNESCAPED_UNICODE);
  exit;
}
function map_action(?string $a): string{
  $a=is_string($a)?strtolower(trim($a)):'';
  $m=[
    'conexion'=>'list','listar'=>'list','list'=>'list',
    'actualizar'=>'upsert','upsert'=>'upsert',
    'inactivar'=>'inactivate','desactivar'=>'inactivate','inactivate'=>'inactivate',
    'rechazar'=>'rechazar','reject'=>'rechazar',
    'aprobar'=>'aprobar','approve'=>'aprobar'
  ];
  return $m[$a]??'';
}
function clean_identifier(string $s): string { return preg_replace('/[^A-Za-z0-9_]/','',$s); }
function getTemporal(): PDO { require __DIR__.'/db_temporal.php'; return $pg; }
function getMain(): PDO { require __DIR__.'/db_postgres_prueba.php'; return $pg; }
function require_admin_if_needed(string $a){
  if(in_array($a,['aprobar','rechazar'],true)){
    require_once __DIR__.'/require_admin.php';
    require_admin_only();
  }
}

try{
  $method=$_SERVER['REQUEST_METHOD']??'GET';
  $raw=file_get_contents('php://input');
  $body=$raw!==''?(json_decode($raw,true) ?: []):[];
  $action=$_GET['action'] ?? $_POST['action'] ?? $body['action'] ?? '';
  $action=map_action($action);
  if($action==='') respond(['success'=>false,'error'=>'missing_action']);
  require_admin_if_needed($action);

  $table='ct_cal_sanidad'; $idCol='ct_cal_sanidad_id';
  $colsAllowed=[
    'ct_cal_sanidad_id','fecha','hora','responsable','labor','colaborador','plantacion','finca',
    'siembra','lote','parcela','linea','palma','tipo_labor','estado','etapa','instar','verificacion',
    'observaciones','supervision','check','error_registro'
  ];

  if($action==='list'){
    if($method!=='GET') respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'GET'],405);
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
    if($method!=='POST') respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    if(!is_array($body)) throw new RuntimeException('JSON inválido');
    $id=isset($body[$idCol])?trim($body[$idCol]):'';
    if($id==='') $id = isset($body['id'])?trim($body['id']):'';
    if(!$id||trim($id)==='') throw new RuntimeException("$idCol requerido");
    $pg=getTemporal(); $pg->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);

    $insertCols=[];$insertPlaceholders=[];$insertVals=[];
    $updatePairs=[];$updateVals=[];
    foreach($colsAllowed as $c){
      if(array_key_exists($c,$body)){
        $insertCols[]=$c; $insertPlaceholders[]='?'; $insertVals[]=$body[$c];
        if($c!==$idCol){ $updatePairs[]="\"$c\" = ?"; $updateVals[]=$body[$c]; }
      }
    }
    if(!$insertCols) throw new RuntimeException('Sin columnas válidas');

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

  if($action==='inactivate'){
    if($method!=='POST') respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    $id=isset($body[$idCol])?trim($body[$idCol]):'';
    if($id==='') $id = isset($body['id'])?trim($body['id']):'';
    if(!$id) respond(['success'=>false,'error'=>'invalid_id'],400);
    $pg=getMain();
    $st=$pg->prepare("UPDATE $table SET error_registro='inactivo' WHERE $idCol=?");
    $ok=$st->execute([$id]);
    respond(['success'=>$ok&&$st->rowCount()>0,'action'=>'inactivate','id'=>$id,'estado'=>'inactivo']);
  }

  if($action==='rechazar'){
    if($method!=='POST') respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    $id=isset($body[$idCol])?trim($body[$idCol]):'';
    if($id==='') $id = isset($body['id'])?trim($body['id']):'';
    if($id==='') throw new RuntimeException("$idCol requerido");

    $warnings = [];
    $updatedMain = 0;
    $updatedTemp = 0;
    $deletedTemp = 0;

    try {
      $pgMain = getMain();
      $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
      $stMain = $pgMain->prepare("UPDATE public.$table SET supervision='rechazado', \"check\"=0 WHERE $idCol=:id");
      $stMain->execute(['id'=>$id]);
      $updatedMain = $stMain->rowCount();
    } catch(Throwable $e){
      $warnings[] = 'main_error: '.$e->getMessage();
      $updatedMain = 0;
    }

    try {
      $pgTemp = getTemporal();
      $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
      $stTemp = $pgTemp->prepare("UPDATE public.$table SET supervision='rechazado', \"check\"=0 WHERE $idCol=:id");
      $stTemp->execute(['id'=>$id]);
      $updatedTemp = $stTemp->rowCount();
    } catch(Throwable $e){
      $warnings[] = 'temp_error: '.$e->getMessage();
      $updatedTemp = 0;
    }

    if($updatedMain > 0){
      try{
        if(!isset($pgTemp)) $pgTemp = getTemporal();
        $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $del = $pgTemp->prepare("DELETE FROM public.$table WHERE $idCol = :id");
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

  if($action==='aprobar'){
    if($method!=='POST') respond(['success'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    $id=isset($body[$idCol])?trim($body[$idCol]):'';
    if($id==='') $id = isset($body['id'])?trim($body['id']):'';
    if($id==='') throw new RuntimeException("$idCol requerido");
    $pgTemp=getTemporal(); $pgMain=getMain();
    $pgTemp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
    $pgMain->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
    respond(['success'=>false,'error'=>'not_implemented','message'=>'Aprobar: mantener o adaptar la implementación existente.']);
  }

  respond(['success'=>false,'error'=>'unknown_action','message'=>'Acción no soportada'],400);

}catch(Throwable $e){
  respond(['success'=>false,'error'=>'exception','message'=>$e->getMessage()],400);
}
?>