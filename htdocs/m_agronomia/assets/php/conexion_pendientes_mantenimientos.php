<?php
header('Content-Type: application/json; charset=utf-8');

function ok($data){ http_response_code(200); echo json_encode($data); exit; }
function err($msg){ http_response_code(200); echo json_encode(['error'=>$msg,'datos'=>[], 'total'=>0]); exit; }

function qident($s){
  if (!preg_match('/^[A-Za-z0-9_]+$/',$s)) throw new RuntimeException("Identificador inválido: $s");
  return '"'.$s.'"';
}

try {
    require_once __DIR__ . '/db_temporal.php';
    if (!isset($pg)) err('db_temporal.php no define $pg');
    $pg_temp = $pg;
    $pg_temp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Detectar tabla temporal
    $q = "
      SELECT
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mantenimientos') AS has_mant,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mantenimientos_temp') AS has_mant_temp
    ";
    $meta = $pg_temp->query($q)->fetch(PDO::FETCH_ASSOC);
    if (!$meta) err('No se pudieron consultar tablas');
    $table = !empty($meta['has_mant']) ? 'public.mantenimientos'
           : (!empty($meta['has_mant_temp']) ? 'public.mantenimientos_temp' : null);
    if (!$table) err('No existe mantenimientos ni mantenimientos_temp en la base temporal');

    // Mapear columnas reales
    [$schema,$tname] = explode('.', $table, 2);
    $stCols = $pg_temp->prepare("
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
    ");
    $stCols->execute([$schema, $tname]);
    $cols = $stCols->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $map = [];
    foreach ($cols as $c) $map[strtolower($c)] = $c;

    $verif = $map['verificacion'] ?? null;
    $fecha = $map['fecha'] ?? null;
    $idcol = $map['mantenimientos_id'] ?? null;

    $page = max(1, intval($_GET['page'] ?? 1));
    $pageSize = max(1, intval($_GET['pageSize'] ?? 25));
    $offset = ($page - 1) * $pageSize;

    // Filtros + sólo pendientes (o todos si no hay columna verificacion)
    $where = [];
    $params = [];

    if ($verif) {
      $where[] = "LOWER(COALESCE(".qident($verif).", 'pendiente')) = 'pendiente'";
    }

    foreach ($_GET as $k => $v) {
        if (strpos($k, 'filtro_') === 0 && $v !== '') {
            $col = substr($k, 7);
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $col)) continue;
            $where[] = qident($col) . " ILIKE ?";
            $params[] = '%' . $v . '%';
        }
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $orderSql = 'ORDER BY ';
    if (!empty($_GET['ordenColumna'])) {
        $ordenCol = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['ordenColumna']);
        $ordenAsc = (isset($_GET['ordenAsc']) && $_GET['ordenAsc'] === '0') ? 'DESC' : 'ASC';
        $orderSql .= qident($ordenCol) . " $ordenAsc";
    } else {
        if ($fecha) {
          $orderSql .= qident($fecha) . " DESC";
          if ($idcol) $orderSql .= ", " . qident($idcol) . " DESC";
        } elseif ($idcol) {
          $orderSql .= qident($idcol) . " DESC";
        } else {
          $orderSql .= "1";
        }
    }

    $full = qident($schema).'.'.qident($tname);

    $sql = "SELECT * FROM {$full} $whereSql $orderSql LIMIT $pageSize OFFSET $offset";
    $st = $pg_temp->prepare($sql);
    $st->execute($params);
    $datos = $st->fetchAll(PDO::FETCH_ASSOC);

    $sqlT = "SELECT COUNT(*) FROM {$full} $whereSql";
    $stT = $pg_temp->prepare($sqlT);
    $stT->execute($params);
    $total = (int)$stT->fetchColumn();

    ok([
      'datos' => $datos,
      'total' => $total,
      'tabla' => $table,
      'fallback' => $verif ? null : 'sin_columna_verificacion'
    ]);
} catch (Throwable $e) {
    err($e->getMessage());
}