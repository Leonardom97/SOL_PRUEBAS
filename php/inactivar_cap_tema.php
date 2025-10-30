<?php
// php/inactivar_cap_tema.php
// Pone estado = 1 (inactivo) en cap_tema. NO toca nombre ni id.
// Respuesta: { success: true, id: <id>, new_value: <new_estado_value> }
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0); error_reporting(E_ALL);

function respond($d){ echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function api_log($m){ @file_put_contents(__DIR__.'/php_error_api.log', "[".date('Y-m-d H:i:s')."] ".$m."\n", FILE_APPEND|LOCK_EX); }

// incluir conexión (ajusta rutas si es necesario)
$paths = [__DIR__.'/../db_postgres.php', __DIR__.'/db_postgres.php', __DIR__.'/../../db_postgres.php'];
$ok=false;
foreach($paths as $p){ if(file_exists($p)){ require_once $p; $ok=true; break; } }
if(!$ok || !isset($pg) || !($pg instanceof PDO)){
    api_log("DB no disponible");
    respond(['success'=>false, 'error'=>'DB no disponible']);
}

// leer id (acepta JSON o form)
$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? $_POST['id'] ?? null;
if ($id === null || !is_numeric($id)) respond(['success'=>false, 'error'=>'ID inválido']);
$id = (int)$id;
if ($id <= 0) respond(['success'=>false, 'error'=>'ID inválido']);

try {
    $table = 'cap_tema';
    $stateCol = 'estado';

    // comprobar existencia de columna estado
    $chk = $pg->prepare("SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c LIMIT 1");
    $chk->execute([':t'=>$table, ':c'=>$stateCol]);
    if (!$chk->fetch()) {
        respond(['success'=>false, 'error'=>"Columna 'estado' no encontrada en {$table}"]);
    }

    // realizar UPDATE: fijar estado = 1
    $u = $pg->prepare("UPDATE {$table} SET {$stateCol} = 1 WHERE id = :id RETURNING {$stateCol} AS newv, id");
    $u->execute([':id' => $id]);
    $r = $u->fetch(PDO::FETCH_ASSOC);
    if (!$r) respond(['success'=>false, 'error'=>'Registro no encontrado']);
    respond(['success'=>true, 'id'=> (int)$r['id'], 'new_value' => (int)$r['newv']]);
} catch (Exception $e) {
    api_log("inactivar_cap_tema error: ".$e->getMessage());
    respond(['success'=>false, 'error'=>'Error del servidor']);
}