<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors','0');
error_reporting(E_ALL);
function respond($d){ echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function api_log($m){ @file_put_contents(__DIR__.'/php_error_api.log', "[".date('Y-m-d H:i:s')."] ".$m."\n", FILE_APPEND|LOCK_EX); }

$paths=[ __DIR__ . '/../db_postgres.php', __DIR__ . '/db_postgres.php', __DIR__ . '/../../db_postgres.php' ];
$included=false; foreach($paths as $p){ if(file_exists($p)){ require_once $p; $included=true; break; } }
if(!$included || !isset($pg) || !($pg instanceof PDO)){ api_log("update_cap_tema: DB no encontrada"); respond(['success'=>false,'error'=>'Error DB']); }

$input = json_decode(file_get_contents('php://input'), true);
$id = (int)($input['id'] ?? $_POST['id'] ?? 0);
$nombre = trim((string)($input['nombre'] ?? $_POST['nombre'] ?? ''));

if($id<=0 || $nombre==='') respond(['success'=>false,'error'=>'Parámetros inválidos']);

try {
    $table = 'cap_tema';
    // detectar columna textual
    $prefs = ['nombre','name','descripcion','titulo','tema'];
    $stmt = $pg->prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :t");
    $stmt->execute([':t'=>$table]); $cols=$stmt->fetchAll(PDO::FETCH_ASSOC);
    $col=null;
    foreach($prefs as $p){ foreach($cols as $c){ if(stripos($c['column_name'],$p)!==false){ $col=$c['column_name']; break 2; } } }
    if(!$col){ foreach($cols as $c){ $dt=strtolower($c['data_type']); if($c['column_name']!=='id' && !in_array($dt,['integer','bigint','smallint','serial','bigserial'])){ $col=$c['column_name']; break; } } }
    if(!$col){ api_log("update_cap_tema: no column text"); respond(['success'=>false,'error'=>'Tabla no preparada para edición']); }
    if(!preg_match('/^[a-zA-Z0-9_]+$/',$col)){ api_log("update_cap_tema: columna insegura $col"); respond(['success'=>false,'error'=>'Configuración inválida']); }

    $sql = "UPDATE {$table} SET {$col} = :nombre WHERE id = :id RETURNING id, {$col}";
    $s = $pg->prepare($sql);
    $s->execute([':nombre'=>$nombre, ':id'=>$id]);
    $row = $s->fetch(PDO::FETCH_ASSOC);
    if(!$row) respond(['success'=>false,'error'=>'Registro no encontrado o no actualizado']);
    respond(['success'=>true,'updated'=>['id'=>$row['id'],'nombre'=>$row[$col]]]);
} catch(Exception $e){
    api_log("update_cap_tema error: ".$e->getMessage());
    respond(['success'=>false,'error'=>'Error al actualizar']);
}