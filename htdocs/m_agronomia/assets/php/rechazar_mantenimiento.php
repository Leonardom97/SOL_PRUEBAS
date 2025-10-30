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
    if (!empty($_GET)) return $_GET;
    if ($raw !== '') {
        $t = ltrim($raw);
        if ($t !== '' && ($t[0] === '{' || $t[0] === '[')) { $d = json_decode($raw, true); if (is_array($d)) return $d; }
        $parsed = []; parse_str($raw, $parsed); if (!empty($parsed)) return $parsed;
    }
    return [];
}

try {
    require_once __DIR__ . '/db_temporal.php';
    if (!isset($pg)) err('db_temporal.php no define $pg');
    $pg_temp = $pg; $pg_temp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Detectar tabla temporal
    $meta = $pg_temp->query("
      SELECT
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mantenimientos') AS has_mant,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mantenimientos_temp') AS has_mant_temp
    ")->fetch(PDO::FETCH_ASSOC);
    $table = !empty($meta['has_mant']) ? 'public.mantenimientos'
           : (!empty($meta['has_mant_temp']) ? 'public.mantenimientos_temp' : null);
    if (!$table) err('No existe tabla temporal mantenimientos ni mantenimientos_temp');

    $input = read_input();
    $id = isset($input['mantenimientos_id']) ? trim((string)$input['mantenimientos_id']) : '';
    if ($id === '') err('mantenimientos_id es requerido');

    $pg_temp->prepare("DELETE FROM {$table} WHERE \"mantenimientos_id\" = ?")->execute([$id]);

    ok(['success'=>true]);
} catch (Throwable $e) {
    err($e->getMessage());
}