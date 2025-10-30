<?php
header('Content-Type: application/json; charset=utf-8');

function ok($d){ http_response_code(200); echo json_encode($d); exit; }
function err($m){ http_response_code(200); echo json_encode(['success'=>false,'error'=>$m,'datos'=>[], 'total'=>0, 'fuentes'=>[]]); exit; }
function qident($s){ if(!preg_match('/^[A-Za-z0-9_]+$/',$s)) throw new RuntimeException("Identificador inválido: $s"); return '"'.$s.'"'; }

try {
  require_once __DIR__.'/db_temporal.php';
  if (!isset($pg)) err('db_temporal.php no define $pg');
  $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  $page = max(1, intval($_GET['page'] ?? 1));
  $pageSize = max(1, min(500, intval($_GET['pageSize'] ?? 200)));
  $offset = ($page - 1) * $pageSize;

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
    ORDER BY CASE WHEN lower(table_name) LIKE '%_temp' THEN 1 ELSE 0 END, table_name
  ";
  $cand = $pg->query($q)->fetchAll(PDO::FETCH_ASSOC);
  if (!$cand) ok(['datos'=>[], 'total'=>0, 'fuentes'=>[], 'reason'=>'no_tables', 'entidad'=>$ent ?: null]);

  $fuentes = [];
  $total = 0;
  $rows = [];

  foreach ($cand as $t) {
    $schema = $t['table_schema'];
    $table  = $t['table_name'];
    $entity = preg_replace('/_temp$/i','', strtolower($table));

    $st = $pg->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=?");
    $st->execute([$schema, $table]);
    $cols = $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $map = []; foreach ($cols as $c) $map[strtolower($c)] = $c;

    $full = qident($schema).'.'.qident($table);

    $verifCol = $map['verificacion'] ?? ($map['Verificacion'] ?? null);
    $fechaCol = $map['fecha'] ?? ($map['fecha_actividad'] ?? null);
    $plantCol = $map['plantacion'] ?? null;
    $fincaCol = $map['finca'] ?? null;
    $respCol  = $map['responsable'] ?? ($map['colaborador'] ?? null);
    $idCol    = $map[$entity.'_id'] ?? null;

    $where = $verifCol ? "LOWER(COALESCE(".qident($verifCol).", 'pendiente')) = 'pendiente'" : "TRUE";
    $orderBy = $fechaCol ? qident($fechaCol).' DESC' : ($idCol ? qident($idCol).' DESC' : '1');

    $sql = "SELECT * FROM $full WHERE $where ORDER BY $orderBy";
    $rs = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $cnt = count($rs);

    $total += $cnt;
    $fuentes[] = ['entidad'=>$entity, 'tabla'=>"$schema.$table", 'total'=>$cnt];

    foreach ($rs as $r) {
      $rows[] = [
        'id'          => $idCol ? ($r[$idCol] ?? null) : null,
        'fecha'       => $fechaCol ? ($r[$fechaCol] ?? null) : null,
        'responsable' => $respCol ? ($r[$respCol] ?? null) : null,
        'plantacion'  => $plantCol ? ($r[$plantCol] ?? null) : null,
        'finca'       => $fincaCol ? ($r[$fincaCol] ?? null) : null,
        '__fuente'    => "$schema.$table",
        '__entidad'   => $entity
      ];
    }
  }

  usort($rows, function($a,$b){
    $fa = $a['fecha']; $fb = $b['fecha'];
    if ($fa && $fb && $fa !== $fb) return ($fa < $fb) ? 1 : -1;
    $ia = $a['id']; $ib = $b['id'];
    if ($ia !== $ib) return ($ia < $ib) ? 1 : -1;
    return 0;
  });

  $rows = array_slice($rows, $offset, $pageSize);

  ok(['datos'=>$rows, 'total'=>$total, 'fuentes'=>$fuentes, 'entidad'=>$ent ?: null]);
} catch (Throwable $e) {
  err($e->getMessage());
}