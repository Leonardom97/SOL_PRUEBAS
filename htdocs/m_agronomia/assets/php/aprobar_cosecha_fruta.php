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
function get_pk_column(PDO $pg,string $schema,string $table): ?string {
  $sql="SELECT a.attname FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) JOIN pg_namespace n ON n.oid=c.relnamespace WHERE i.indisprimary=true AND n.nspname=:s AND c.relname=:t LIMIT 1";
  $st=$pg->prepare($sql); $st->execute(['s'=>$schema,'t'=>$table]); $pk=$st->fetchColumn(); return $pk?:null;
}
function qident($s){ if(!preg_match('/^[A-Za-z0-9_]+$/',$s)) throw new RuntimeException("Ident inválido: $s"); return '"'.$s.'"'; }

try{
  require_once __DIR__.'/db_temporal.php'; if(!isset($pg)) err('db_temporal.php no define $pg'); $pg_temp=$pg; $pg_temp->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
  require_once __DIR__.'/db_postgres_prueba.php'; if(!isset($pg)) err('db_postgres_prueba.php no define $pg'); $pg_main=$pg; $pg_main->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);

  $input=read_input();
  $id=trim((string)($input['cosecha_fruta_id'] ?? $input['id'] ?? ''));
  if($id==='') err('cosecha_fruta_id es requerido');

  $meta=$pg_temp->query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') AND lower(table_name) IN ('cosecha_fruta','cosecha_fruta_temp') ORDER BY CASE WHEN lower(table_name) LIKE '%_temp' THEN 1 ELSE 0 END LIMIT 1")->fetch(PDO::FETCH_ASSOC);
  if(!$meta) err('No existe tabla temporal de cosecha_fruta');
  $schema=$meta['table_schema']; $table=$meta['table_name'];

  $st=$pg_temp->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=?");
  $st->execute([$schema,$table]); $cols=$st->fetchAll(PDO::FETCH_COLUMN) ?: [];
  $map=[]; foreach($cols as $c) $map[strtolower($c)]=$c;
  $pk=get_pk_column($pg_temp,$schema,$table) ?: 'cosecha_fruta_id';
  $verif=$map['verificacion'] ?? ($map['Verificacion'] ?? null);

  $full=qident($schema).'.'.qident($table);
  $st=$pg_temp->prepare("SELECT * FROM $full WHERE ".qident($pk)." = ?"); $st->execute([$id]);
  $row=$st->fetch(PDO::FETCH_ASSOC); if(!$row) err('Registro no encontrado en temporal');

  if($verif) $row[$verif]='aprobado';

  $pg_main->beginTransaction();
  $cols=array_keys($row);
  $set=[]; $valsUpd=[]; foreach($cols as $c){ if($c===$pk) continue; $set[]=qident($c)." = ?"; $valsUpd[]=$row[$c]; }
  $valsUpd[]=$row[$pk];
  $u=$pg_main->prepare("UPDATE public.cosecha_fruta SET ".implode(', ',$set)." WHERE ".qident($pk)." = ?");
  $u->execute($valsUpd);
  if($u->rowCount()===0){
    $colsQ=array_map('qident',$cols); $ph=array_fill(0,count($cols),'?'); $valsIns=array_map(fn($c)=>$row[$c],$cols);
    $pg_main->prepare("INSERT INTO public.cosecha_fruta (".implode(', ',$colsQ).") VALUES (".implode(', ',$ph).")")->execute($valsIns);
  }
  $pg_main->commit();

  $pg_temp->prepare("DELETE FROM $full WHERE ".qident($pk)." = ?")->execute([$id]);

  ok(['success'=>true]);
}catch(Throwable $e){
  if(isset($pg_main) && $pg_main instanceof PDO && $pg_main->inTransaction()) $pg_main->rollBack();
  err($e->getMessage());
}