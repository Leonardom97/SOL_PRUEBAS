<?php
header('Content-Type: application/json; charset=utf-8');

function ok($d){ http_response_code(200); echo json_encode($d); exit; }
function err($m){ http_response_code(200); echo json_encode(['success'=>false,'error'=>$m,'datos'=>[], 'total'=>0, 'fuentes'=>[]]); exit; }

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

  $page = max(1, intval($_GET['page'] ?? 1));
  $pageSize = max(1, min(500, intval($_GET['pageSize'] ?? 200)));
  $offset = ($page - 1) * $pageSize;

  // Candidatos
  $q = "
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type='BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema')
      AND lower(table_name) IN ('mantenimientos','mantenimientos_temp')
    ORDER BY CASE lower(table_name) WHEN 'mantenimientos' THEN 0 ELSE 1 END
  ";
  $cand = $pg->query($q)->fetchAll(PDO::FETCH_ASSOC);

  if (!$cand) { end_safe_output(); ok(['datos'=>[], 'total'=>0, 'fuentes'=>[], 'reason'=>'no_tables']); }

  $fuentes = [];
  $total = 0;
  $chunks = [];

  foreach ($cand as $t) {
    $schema = $t['table_schema'];
    $table  = $t['table_name'];

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

    $hasVerif = isset($map['verificacion']);
    $verifCol = $hasVerif ? qident($map['verificacion']) : null;

    $hasFecha = isset($map['fecha']);
    $fechaCol = $hasFecha ? qident($map['fecha']) : null;

    $hasId = isset($map['mantenimientos_id']);
    $idCol = $hasId ? qident($map['mantenimientos_id']) : null;

    // Total por tabla
    $where = $hasVerif ? "LOWER(COALESCE($verifCol, 'pendiente')) = 'pendiente'" : "TRUE";
    $cnt = (int)$pg->query("SELECT COUNT(*) FROM $full WHERE $where")->fetchColumn();
    $total += $cnt;
    $fuentes[] = ['tabla'=>"$schema.$table", 'total'=>$cnt, 'fallback'=> $hasVerif ? null : 'sin_columna_verificacion'];

    // Query de datos
    $orderBy = $fechaCol ? "$fechaCol DESC" : ($idCol ? "$idCol DESC" : "1");
    $sql = $hasVerif
      ? "SELECT *, '$schema.$table' AS __fuente FROM $full WHERE $where ORDER BY $orderBy"
      : "SELECT *, '$schema.$table' AS __fuente FROM $full ORDER BY $orderBy";
    $chunks[] = $sql;
  }

  $rows = [];
  if ($chunks) {
    foreach ($chunks as $sql) {
      $rs = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
      $rows = array_merge($rows, $rs);
    }
    // Orden global por fecha desc si existe, si no, por ID desc si existe
    usort($rows, function($a,$b){
      $fa = $a['fecha'] ?? $a['FECHA'] ?? null;
      $fb = $b['fecha'] ?? $b['FECHA'] ?? null;
      if ($fa && $fb && $fa != $fb) return ($fa < $fb) ? 1 : -1; // desc por fecha
      $ia = $a['mantenimientos_id'] ?? $a['MANTENIMIENTOS_ID'] ?? null;
      $ib = $b['mantenimientos_id'] ?? $b['MANTENIMIENTOS_ID'] ?? null;
      if ($ia != $ib) return ($ia < $ib) ? 1 : -1; // desc por ID
      return 0;
    });
    $rows = array_slice($rows, $offset, $pageSize);
  }

  end_safe_output();
  ok(['datos'=>$rows, 'total'=>$total, 'fuentes'=>$fuentes]);
} catch (Throwable $e) {
  if (ob_get_level()>0) ob_end_clean();
  err($e->getMessage());
}