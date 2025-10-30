<?php
// php/agregar_cap_tipo_actividad.php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0); error_reporting(E_ALL);
function respond($d){ echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function api_log($m){ @file_put_contents(__DIR__.'/php_error_api.log', "[".date('Y-m-d H:i:s')."] ".$m."\n", FILE_APPEND|LOCK_EX); }

$paths = [__DIR__.'/../db_postgres.php', __DIR__.'/db_postgres.php', __DIR__.'/../../db_postgres.php'];
$ok = false;
foreach ($paths as $p) { if (file_exists($p)) { require_once $p; $ok = true; break; } }
if (!$ok || !isset($pg) || !($pg instanceof PDO)) { api_log("DB missing"); respond(['success'=>false,'error'=>'DB no disponible']); }

$input = json_decode(file_get_contents('php://input'), true);
$nombre = $input['nombre'] ?? $_POST['nombre'] ?? $_POST['name'] ?? $input['name'] ?? null;
$nombre = is_string($nombre) ? trim($nombre) : null;
if (!$nombre) respond(['success'=>false,'error'=>'Nombre vacío']);

try {
    $table = 'cap_tipo_actividad';
    $stmt = $pg->prepare("SELECT column_name FROM information_schema.columns WHERE table_name = :t");
    $stmt->execute([':t'=>$table]);
    $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!$cols) respond(['success'=>false,'error'=>'Tabla no encontrada']);
    $candidates = ['nombre','name','titulo','descripcion','tipo','label'];
    $nameCol = null;
    foreach ($candidates as $c) {
        foreach ($cols as $col) {
            if (strcasecmp($col,$c)===0) { $nameCol = $col; break 2; }
        }
    }
    if (!$nameCol) {
        foreach ($cols as $col) { if (strcasecmp($col,'id')!==0) { $nameCol = $col; break; } }
    }
    if (!$nameCol) respond(['success'=>false,'error'=>'No se detectó columna para nombre']);
    if (!in_array('estado',$cols)) respond(['success'=>false,'error'=>"Columna 'estado' no encontrada en {$table}"]);
    if (!preg_match('/^[a-zA-Z0-9_]+$/',$nameCol)) { api_log("unsafe col $nameCol"); respond(['success'=>false,'error'=>'Configuración inválida']); }

    $sql = "INSERT INTO {$table} ({$nameCol}, estado) VALUES (:nombre, 0) RETURNING id, {$nameCol} AS nombre, estado";
    $ins = $pg->prepare($sql);
    $ins->execute([':nombre'=>$nombre]);
    $r = $ins->fetch(PDO::FETCH_ASSOC);
    if (!$r) respond(['success'=>false,'error'=>'No se pudo insertar']);
    respond(['success'=>true,'id'=>(int)$r['id'],'nombre'=>$r['nombre'],'estado'=> (int)$r['estado']]);
} catch (Exception $e) {
    api_log("agregar_cap_tipo_actividad error: ".$e->getMessage());
    respond(['success'=>false,'error'=>'Error servidor']);
}