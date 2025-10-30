<?php
header('Content-Type: application/json; charset=utf-8');
function ok($d){ http_response_code(200); echo json_encode($d); exit; }
function err($m){ http_response_code(200); echo json_encode(['success'=>false,'error'=>$m]); exit; }

function read_input(): array {
  $ct = $_SERVER['CONTENT_TYPE'] ?? '';
  $raw = file_get_contents('php://input') ?: '';
  if (stripos($ct, 'application/json') !== false) {
    $d = json_decode($raw, true);
    if (is_array($d)) return $d;
  }
  if (!empty($_POST)) return $_POST;
  if ($raw !== '') {
    $t = ltrim($raw);
    if ($t !== '' && ($t[0] === '{' || $t[0] === '[')) {
      $d = json_decode($raw, true);
      if (is_array($d)) return $d;
    }
    $parsed = []; parse_str($raw, $parsed); if (!empty($parsed)) return $parsed;
  }
  return $_GET ?? [];
}

function detect_temp_table(PDO $pg): array {
  $meta = $pg->query("
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mantenimientos') AS has_mant,
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mantenimientos_temp') AS has_mant_temp
  ")->fetch(PDO::FETCH_ASSOC);
  if (!$meta) throw new RuntimeException('No se pudieron consultar tablas');

  if (!empty($meta['has_mant'])) return ['schema'=>'public','table'=>'mantenimientos'];
  if (!empty($meta['has_mant_temp'])) return ['schema'=>'public','table'=>'mantenimientos_temp'];

  throw new RuntimeException('No existe mantenimientos ni mantenimientos_temp en la base temporal');
}

function get_table_columns(PDO $pg, string $schema, string $table): array {
  $st = $pg->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position");
  $st->execute([$schema, $table]);
  $cols = $st->fetchAll(PDO::FETCH_COLUMN);
  if (!$cols) throw new RuntimeException("No se pudieron leer columnas de {$schema}.{$table}");
  return $cols; // nombres exactos según el catálogo
}

function get_pk_column(PDO $pg, string $schema, string $table): ?string {
  $sql = "
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.indisprimary = true AND n.nspname = :schema AND c.relname = :table
    LIMIT 1
  ";
  $st = $pg->prepare($sql);
  $st->execute(['schema'=>$schema, 'table'=>$table]);
  $pk = $st->fetchColumn();
  return $pk ?: null;
}

function qident(string $name): string {
  // Permite A-Z, a-z, 0-9 y guion bajo; si no, lanza
  if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) throw new RuntimeException("Identificador inválido: $name");
  return '"' . $name . '"';
}

try {
  require_once __DIR__ . '/db_temporal.php';
  if (!isset($pg)) err('db_temporal.php no define $pg');
  $pg_temp = $pg; $pg_temp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // 1) Detectar tabla temporal y metadatos
  [$schema, $table] = (function($arr){ return [$arr['schema'], $arr['table']]; })(detect_temp_table($pg_temp));
  $colsDB = get_table_columns($pg_temp, $schema, $table);
  $pkCol = get_pk_column($pg_temp, $schema, $table);

  // Mapa case-insensitive de columnas reales
  $mapLowerToReal = [];
  foreach ($colsDB as $c) { $mapLowerToReal[strtolower($c)] = $c; }

  // 2) Leer input
  $input = read_input();
  if (!is_array($input) || empty($input)) err('No se recibieron datos');

  // Aceptar alias de ID: 'mantenimientos_id' o 'id' si el PK tuviera otro nombre
  if ($pkCol) {
    if (!array_key_exists($pkCol, $input)) {
      if (isset($input['mantenimientos_id'])) $input[$pkCol] = $input['mantenimientos_id'];
      elseif (isset($input['id'])) $input[$pkCol] = $input['id'];
    }
  } else {
    // Sin PK conocida, mantener tal cual
  }

  // 3) Normalizar claves de input a nombres reales de columnas
  $data = [];
  foreach ($input as $k => $v) {
    $kl = strtolower((string)$k);
    if (isset($mapLowerToReal[$kl])) {
      $real = $mapLowerToReal[$kl];
      $data[$real] = $v;
    }
  }
  if (empty($data)) err('No hay campos válidos para guardar en la tabla');

  // Si existe la columna Verificacion y no viene, default a 'pendiente'
  if (isset($mapLowerToReal['verificacion']) && (!isset($data['Verificacion']) && !isset($data['verificacion']))) {
    $data[$mapLowerToReal['verificacion']] = 'pendiente';
  }

  // 4) Armar UPSERT según disponibilidad de PK y si vino o no el valor de PK
  $fullTable = qident($schema) . '.' . qident($table);
  $hasPk = $pkCol && in_array($pkCol, $colsDB, true);

  if ($hasPk) {
    $pkVal = $data[$pkCol] ?? null;
    $pkValNorm = is_string($pkVal) ? trim($pkVal) : $pkVal;

    if ($pkValNorm !== null && $pkValNorm !== '' && strtolower((string)$pkValNorm) !== 'null') {
      // Chequear existencia por PK
      $st = $pg_temp->prepare("SELECT 1 FROM {$fullTable} WHERE " . qident($pkCol) . " = ?");
      $st->execute([$pkVal]);
      $exists = (bool)$st->fetchColumn();

      if ($exists) {
        // UPDATE (excluir PK del set)
        $setCols = []; $vals = [];
        foreach ($data as $col => $val) {
          if ($col === $pkCol) continue;
          $setCols[] = qident($col) . " = ?";
          $vals[] = $val;
        }
        if (empty($setCols)) err('No hay campos para actualizar');
        $vals[] = $pkVal;
        $sql = "UPDATE {$fullTable} SET " . implode(', ', $setCols) . " WHERE " . qident($pkCol) . " = ?";
        $ok = $pg_temp->prepare($sql)->execute($vals);
        ok(['success'=>(bool)$ok, 'op'=>'update', 'tabla'=>"$schema.$table"]);
      } else {
        // INSERT con PK incluida
        $cols = array_keys($data);
        $ph = array_fill(0, count($cols), '?');
        $vals = array_values($data);
        $colsQ = array_map('qident', $cols);
        $sql = "INSERT INTO {$fullTable} (" . implode(', ', $colsQ) . ") VALUES (" . implode(', ', $ph) . ")";
        $ok = $pg_temp->prepare($sql)->execute($vals);
        ok(['success'=>(bool)$ok, 'op'=>'insert_with_pk', 'tabla'=>"$schema.$table"]);
      }
    } else {
      // INSERT sin PK (si la PK tiene default/serial)
      $dataNoPk = $data;
      unset($dataNoPk[$pkCol]);

      if (empty($dataNoPk)) err('No hay columnas para insertar sin PK');
      $cols = array_keys($dataNoPk);
      $ph = array_fill(0, count($cols), '?');
      $vals = array_values($dataNoPk);
      $colsQ = array_map('qident', $cols);
      $sql = "INSERT INTO {$fullTable} (" . implode(', ', $colsQ) . ") VALUES (" . implode(', ', $ph) . ")";
      $ok = $pg_temp->prepare($sql)->execute($vals);
      ok(['success'=>(bool)$ok, 'op'=>'insert_without_pk', 'tabla'=>"$schema.$table"]);
    }
  } else {
    // Sin PK detectable: hacer INSERT simple con las columnas que vengan
    $cols = array_keys($data);
    $ph = array_fill(0, count($cols), '?');
    $vals = array_values($data);
    $colsQ = array_map('qident', $cols);
    $sql = "INSERT INTO {$fullTable} (" . implode(', ', $colsQ) . ") VALUES (" . implode(', ', $ph) . ")";
    $ok = $pg_temp->prepare($sql)->execute($vals);
    ok(['success'=>(bool)$ok, 'op'=>'insert_no_pkinfo', 'tabla'=>"$schema.$table"]);
  }

} catch (Throwable $e) {
  err($e->getMessage());
}