<?php
// php/cap_control_api.php
// API para listar cap_tema, cap_proceso, cap_lugar, cap_tipo_actividad
// Normaliza campo activo según columna 'estado' (0 -> activo, 1 -> inactivo)
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors','0');
error_reporting(E_ALL);

function api_log($msg) {
    @file_put_contents(__DIR__ . '/php_error_api.log', "[".date('Y-m-d H:i:s')."] ".$msg."\n", FILE_APPEND | LOCK_EX);
}
function respond($data) { echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

// cargar conexión
$paths = [ __DIR__ . '/../db_postgres.php', __DIR__ . '/db_postgres.php', __DIR__ . '/../../db_postgres.php' ];
$found=false;
foreach ($paths as $p) { if (file_exists($p)) { require_once $p; $found=true; break; } }
if (!$found || !isset($pg) || !($pg instanceof PDO)) {
    api_log("DB no encontrada");
    respond(['success'=>false,'error'=>'DB no disponible']);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    if ($method === 'GET') {
        switch ($action) {
            case 'list_temas':
            case 'list_procesos':
            case 'list_lugares':
            case 'list_tactividad':
                $map = [
                    'list_temas' => 'cap_tema',
                    'list_procesos' => 'cap_proceso',
                    'list_lugares' => 'cap_lugar',
                    'list_tactividad' => 'cap_tipo_actividad'
                ];
                $table = $map[$action];

                // obtener columnas
                $stmt = $pg->prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :t");
                $stmt->execute([':t'=>$table]);
                $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (!$cols) respond(['success'=>false,'error'=>'Tabla no encontrada']);

                // detectar columna texto para nombre
                $textCol = null;
                $prefs = ['nombre','name','descripcion','titulo','tema','label'];
                foreach ($cols as $c) {
                    $cn = $c['column_name'];
                    foreach ($prefs as $p) {
                        if (stripos($cn, $p) !== false) { $textCol = $cn; break 2; }
                    }
                }
                if (!$textCol) {
                    foreach ($cols as $c) { if ($c['column_name'] !== 'id') { $textCol = $c['column_name']; break; } }
                }
                if (!$textCol) respond(['success'=>false,'error'=>'No se detectó columna de texto']);

                // preferir 'estado'
                $stateCol = null; $stateType = null;
                foreach ($cols as $c) { if (strcasecmp($c['column_name'],'estado')===0) { $stateCol=$c['column_name']; $stateType=$c['data_type']; break; } }
                if (!$stateCol) {
                    foreach ($cols as $c) { if (strcasecmp($c['column_name'],'activo')===0) { $stateCol=$c['column_name']; $stateType=$c['data_type']; break; } }
                }
                if (!$stateCol) {
                    foreach ($cols as $c) { if (strtolower($c['data_type'])==='boolean') { $stateCol=$c['column_name']; $stateType=$c['data_type']; break; } }
                }
                if (!$stateCol) {
                    foreach ($cols as $c) { $dt=strtolower($c['data_type']); if (in_array($dt,['smallint','integer','bigint','serial','bigserial'])) { if (strtolower($c['column_name'])!=='id') { $stateCol=$c['column_name']; $stateType=$c['data_type']; break; } } }
                }

                if ($stateCol) {
                    $sql = "SELECT id, {$textCol} AS nombre, {$stateCol} AS estado_raw FROM {$table} ORDER BY id ASC";
                    $rows = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                    $out = [];
                    foreach ($rows as $r) {
                        $raw = $r['estado_raw'];
                        $active = true;
                        if ($stateCol === 'estado' || in_array(strtolower($stateType), ['smallint','integer','bigint','serial','bigserial'])) {
                            $active = (int)$raw === 0;
                        } elseif (strtolower($stateType) === 'boolean') {
                            $active = (bool)$raw;
                        } else {
                            $s = strtoupper(trim((string)$raw));
                            if ($s === '0' || $s === 'FALSE' || $s === 'F') $active = false;
                            elseif ($s === '1' || $s === 'TRUE' || $s === 'T') $active = true;
                            elseif ($s === 'I' || stripos($s,'INACT') !== false) $active = false;
                            elseif ($s === 'A' || stripos($s,'ACT') !== false) $active = true;
                        }
                        $out[] = ['id'=>$r['id'],'nombre'=>$r['nombre'],'activo'=>$active];
                    }
                } else {
                    $sql = "SELECT id, {$textCol} AS nombre FROM {$table} ORDER BY id ASC";
                    $rows = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                    $out = [];
                    foreach ($rows as $r) { $out[] = ['id'=>$r['id'],'nombre'=>$r['nombre'],'activo'=>true]; }
                }

                $key = ($action === 'list_temas') ? 'temas' : (($action === 'list_procesos') ? 'procesos' : (($action === 'list_lugares') ? 'lugares' : 'tactividad'));
                respond(['success'=>true, $key => $out]);

            default:
                respond(['success'=>false,'error'=>'Acción GET no válida']);
        }
    }

    respond(['success'=>false,'error'=>'Método no soportado']);
} catch (Exception $e) {
    api_log("cap_control_api error: ".$e->getMessage());
    respond(['success'=>false,'error'=>'Error servidor']);
}