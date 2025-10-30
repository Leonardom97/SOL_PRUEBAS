<?php
header('Content-Type: application/json; charset=utf-8');
function ok($d){ http_response_code(200); echo json_encode($d); exit; }
function err($m){ http_response_code(200); echo json_encode(['success'=>false,'error'=>$m]); exit; }
function read_input(): array {
  $ct=$_SERVER['CONTENT_TYPE']??''; $raw=file_get_contents('php://input')?:'';
  if(stripos($ct,'application/json')!==false){ $d=json_decode($raw,true); if(is_array($d)) return $d; }
  if(!empty($_POST)) return $_POST; if(!empty($_GET)) return $_GET;
  if($raw!==''){ $t=ltrim($raw); if($t!=='' && ($t[0]=='{'||$t[0]=='[')){ $d=json_decode($raw,true); if(is_array($d)) return $d; } $p=[]; parse_str($raw,$p); if(!empty($p)) return $p; }
  return [];
}
function qident($s){ if(!preg_match('/^[A-Za-z0-9_]+$/',$s)) throw new RuntimeException("Ident inválido: $s"); return '"'.$s.'"'; }

try{
  require_once __DIR__.'/db_temporal.php'; if(!isset($pg)) err('db_temporal.php no define $pg'); $pg_temp=$pg; $pg_temp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
  $input=read_input();
  $id=trim((string)($input['monitoreos_generales_id'] ?? $input['id'] ?? ''));
  if($id==='') err('monitoreos_generales_id es requerido');

  $meta=$pg_temp->query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') AND lower(table_name) IN ('monitoreos_generales','monitoreos_generales_temp') ORDER BY CASE WHEN lower(table_name) LIKE '%_temp' THEN 1 ELSE 0 END LIMIT 1")->fetch(PDO::FETCH_ASSOC);
  if(!$meta) err('No existe tabla temporal de monitoreos_generales');
  $schema=$meta['table_schema']; $table=$meta['table_name'];

  $full=qident($schema).'.'.qident($table);
  $pg_temp->prepare("DELETE FROM $full WHERE \"monitoreos_generales_id\" = ?")->execute([$id]);

  ok(['success'=>true]);
}catch(Throwable $e){ err($e->getMessage()); }