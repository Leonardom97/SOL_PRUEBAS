<?php
header('Content-Type: application/json; charset=utf-8');

function ok($d){ http_response_code(200); echo json_encode($d); exit; }
function err($m){ http_response_code(200); echo json_encode(['error'=>$m, 'total'=>0, 'detalles'=>[]]); exit; }
function qident($s){ if (!preg_match('/^[A-Za-z0-9_]+$/',$s)) throw new RuntimeException("Identificador inválido: $s"); return '"'.$s.'"'; }

try {
  require_once __DIR__.'/db_temporal.php';
  if (!isset($pg)) err('db_temporal.php no define $pg');
  $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  $entidadesBase = ['mantenimientos','monitoreos_generales','oficios_varios_palma','cosecha_fruta','fertilizacion_organica'];
  $ent = strtolower(trim((string)($_GET['entidad'] ?? '')));
  $ent = preg_replace('/[^a-z0-9_]/','',$ent);
  $targets = ($ent && in_array($ent, $entidadesBase, true)) ? [$ent] : $entidadesBase;

  $names = array_merge($targets, array_map(fn($e)=>$e.'_temp', $targets));
  $low = array_map('strtolower', $names);
  $in = implode("','", array_map('addslashes', $low));

  $q = "
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type='BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema')
      AND lower(table_name) IN ('$in')
    ORDER BY table_schema, table_name
  ";
  $cand = $pg->query($q)->fetchAll(PDO::FETCH_ASSOC);
  if (!$cand) ok(['total'=>0, 'detalles'=>[], 'reason'=>'no_tables']);

  $detalles = [];
  $total = 0;

  foreach ($cand as $t) {
    $schema = $t['table_schema'];
    $table  = $t['table_name'];

    $st = $pg->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?");
    $st->execute([$schema, $table]);
    $cols = $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $map = [];
    foreach ($cols as $c) $map[strtolower($c)] = $c;

    $full = qident($schema).'.'.qident($table);

    $where = 'TRUE';
    if (isset($map['verificacion'])) {
      $where = "LOWER(COALESCE(".qident($map['verificacion']).", 'pendiente')) = 'pendiente'";
    } elseif (isset($map['Verificacion'])) {
      $where = "LOWER(COALESCE(".qident($map['Verificacion']).", 'pendiente')) = 'pendiente'";
    }

    $count = (int)$pg->query("SELECT COUNT(*) FROM $full WHERE $where")->fetchColumn();
    $total += $count;
    $entity = preg_replace('/_temp$/i','', strtolower($table));
    $detalles[] = ['entidad'=>$entity, 'tabla'=>"$schema.$table", 'total'=>$count, 'fallback'=> ($where==='TRUE' ? 'sin_columna_verificacion' : null)];
  }

  ok(['total'=>$total, 'detalles'=>$detalles, 'entidad'=>$ent ?: null]);
} catch (Throwable $e) {
  err($e->getMessage());
}