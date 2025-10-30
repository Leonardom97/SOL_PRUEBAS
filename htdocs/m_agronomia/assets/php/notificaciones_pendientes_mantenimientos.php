<?php
header('Content-Type: application/json; charset=utf-8');

function ok($d){ http_response_code(200); echo json_encode($d); exit; }
function err($m){ http_response_code(200); echo json_encode(['error'=>$m, 'total'=>0, 'detalles'=>[]]); exit; }

function start_safe_output() {
  ini_set('display_errors','0');
  error_reporting(E_ALL);
  set_error_handler(function($errno,$errstr,$errfile,$errline){ throw new ErrorException($errstr,0,$errno,$errfile,$errline); });
  ob_start();
}
function end_safe_output(){ if (ob_get_level()>0) ob_end_clean(); }

function qident($s){
  if (!preg_match('/^[A-Za-z0-9_]+$/',$s)) throw new RuntimeException("Identificador inválido: $s");
  return '"'.$s.'"';
}

try {
  start_safe_output();
  require_once __DIR__.'/db_temporal.php';
  if (!isset($pg)) err('db_temporal.php no define $pg');
  $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // Buscar tablas candidatas en todos los esquemas de usuario
  $q = "
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type='BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema')
      AND lower(table_name) IN ('mantenimientos','mantenimientos_temp')
    ORDER BY CASE lower(table_name) WHEN 'mantenimientos' THEN 0 ELSE 1 END
  ";
  $cand = $pg->query($q)->fetchAll(PDO::FETCH_ASSOC);

  if (!$cand) {
    end_safe_output();
    ok(['total'=>0, 'detalles'=>[], 'reason'=>'no_tables']);
  }

  $detalles = [];
  $total = 0;

  foreach ($cand as $t) {
    $schema = $t['table_schema'];
    $table  = $t['table_name'];

    // Mapear columnas (case-insensitive)
    $st = $pg->prepare("
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
    ");
    $st->execute([$schema, $table]);
    $cols = $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $map = [];
    foreach ($cols as $c) $map[strtolower($c)] = $c;

    $full = qident($schema).'.'.qident($table);

    if (!isset($map['verificacion'])) {
      // Fallback: si la tabla temporal no tiene columna verificacion,
      // contamos todos los registros como pendientes (modelo: todo lo temporal es “por aprobar”)
      $count = (int)$pg->query("SELECT COUNT(*) FROM $full")->fetchColumn();
      $total += $count;
      $detalles[] = ['tabla'=>"$schema.$table", 'total'=>$count, 'fallback'=>'sin_columna_verificacion'];
      continue;
    }

    $verifCol = $map['verificacion'];
    $where = "LOWER(COALESCE(".qident($verifCol).", 'pendiente')) = 'pendiente'";

    $sql = "SELECT COUNT(*) FROM $full WHERE $where";
    $count = (int)$pg->query($sql)->fetchColumn();

    $total += $count;
    $detalles[] = ['tabla'=>"$schema.$table", 'total'=>$count];
  }

  end_safe_output();
  ok(['total'=>$total, 'detalles'=>$detalles]);
} catch (Throwable $e) {
  if (ob_get_level()>0) ob_end_clean();
  err($e->getMessage());
}