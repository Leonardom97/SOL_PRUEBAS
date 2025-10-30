<?php
// php/cap_control_api.php
// API robusta para listar y agregar/actualizar cap_tema, cap_proceso, cap_lugar, cap_tipo_actividad
// GET?action=list_temas|list_procesos|list_lugares|list_tactividad
// POST?action=add_... | update_... (id, nombre)

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors','0');
error_reporting(E_ALL);

function api_log($msg) {
    $file = __DIR__ . '/php_error_api.log';
    $date = date('Y-m-d H:i:s');
    @file_put_contents($file, "[$date] $msg\n", FILE_APPEND | LOCK_EX);
}
set_exception_handler(function($e){
    api_log("Uncaught exception: ".$e->getMessage()." in ".$e->getFile().":".$e->getLine());
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Server exception'], JSON_UNESCAPED_UNICODE);
    exit;
});
register_shutdown_function(function(){
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR,E_CORE_ERROR,E_COMPILE_ERROR,E_PARSE])) {
        api_log("Fatal error: ".$err['message']." in ".$err['file'].":".$err['line']);
        if (!headers_sent()) http_response_code(500);
        echo json_encode(['success'=>false,'error'=>'Fatal error'], JSON_UNESCAPED_UNICODE);
        exit;
    }
});

// localizar db_postgres.php
$db_paths = [
    __DIR__ . '/../db_postgres.php',
    __DIR__ . '/db_postgres.php',
    __DIR__ . '/../../db_postgres.php'
];
$included = false;
foreach ($db_paths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $included = true;
        break;
    }
}
if (!$included) {
    api_log("db_postgres.php no encontrado. Rutas probadas: ".implode(', ',$db_paths));
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Configuración: db_postgres.php no encontrado.'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (!isset($pg) || !($pg instanceof PDO)) {
    api_log('$pg no existe o no es PDO tras incluir db_postgres.php');
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Configuración: conexión a BD no inicializada'], JSON_UNESCAPED_UNICODE);
    exit;
}

// utilidades
function is_identifier($s) {
    return preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $s);
}
function detect_text_column(PDO $pg, string $table) {
    $prefs = ['nombre','name','descripcion','titulo','tema','proceso','lugar','tipo','actividad','label'];
    $stmt = $pg->prepare("
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = :t
        ORDER BY ordinal_position
    ");
    $stmt->execute([':t' => $table]);
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$cols) return null;
    foreach ($cols as $c) {
        $cn = $c['column_name'];
        foreach ($prefs as $p) {
            if (stripos($cn, $p) !== false) return $cn;
        }
    }
    foreach ($cols as $c) {
        $cn = $c['column_name'];
        $dt = strtolower($c['data_type']);
        if ($cn !== 'id' && !in_array($dt, ['integer','bigint','smallint','serial','bigserial'])) return $cn;
    }
    return null;
}
function detect_id_column(PDO $pg, string $table) {
    $stmt = $pg->prepare("
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = :t
        ORDER BY ordinal_position
    ");
    $stmt->execute([':t' => $table]);
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$cols) return null;
    foreach ($cols as $c) { if ($c['column_name'] === 'id') return 'id'; }
    foreach ($cols as $c) {
        $dt = strtolower($c['data_type']);
        if (in_array($dt, ['integer','bigint','smallint','serial','bigserial'])) return $c['column_name'];
    }
    return null;
}
function respond($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// adjust sequence helper (used by add scripts previously)
function get_serial_sequence_name(PDO $pg, string $table) {
    try {
        $stmt = $pg->prepare("SELECT pg_get_serial_sequence(:tbl, 'id') AS seqname");
        $stmt->execute([':tbl' => $table]);
        $seq = $stmt->fetchColumn();
        return $seq ? $seq : null;
    } catch (Exception $e) {
        api_log("get_serial_sequence_name error for {$table}: " . $e->getMessage());
        return null;
    }
}
function sync_sequence(PDO $pg, string $table) {
    try {
        $seq = get_serial_sequence_name($pg, $table);
        if (!$seq) { api_log("sync_sequence: no sequence for table {$table}"); return false; }
        $max = (int)$pg->query("SELECT COALESCE(MAX(id),0) FROM {$table}")->fetchColumn();
        $stmt = $pg->prepare("SELECT setval(:seqname, :val, true)");
        $stmt->execute([':seqname' => $seq, ':val' => $max]);
        api_log("sync_sequence: set sequence {$seq} to {$max} for table {$table}");
        return true;
    } catch (Exception $e) {
        api_log("sync_sequence error for {$table}: " . $e->getMessage());
        return false;
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    if ($method === 'GET') {
        switch ($action) {
            case 'list_temas':
                $table = 'cap_tema';
                $col = detect_text_column($pg,$table);
                $idcol = detect_id_column($pg,$table);
                if (!$col || !is_identifier($col) || !$idcol || !is_identifier($idcol)) {
                    respond(['success'=>false,'error'=>"No se pudo detectar columnas válidas en {$table}"]);
                }
                $sql = "SELECT {$idcol} AS id, {$col} AS nombre FROM {$table} ORDER BY {$idcol} ASC";
                $rows = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                respond(['success'=>true,'temas'=>$rows]);
            case 'list_procesos':
                $table = 'cap_proceso';
                $col = detect_text_column($pg,$table);
                $idcol = detect_id_column($pg,$table);
                if (!$col || !is_identifier($col) || !$idcol || !is_identifier($idcol)) {
                    respond(['success'=>false,'error'=>"No se pudo detectar columnas válidas en {$table}"]);
                }
                $sql = "SELECT {$idcol} AS id, {$col} AS nombre FROM {$table} ORDER BY {$idcol} ASC";
                $rows = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                respond(['success'=>true,'procesos'=>$rows]);
            case 'list_lugares':
                $table = 'cap_lugar';
                $col = detect_text_column($pg,$table);
                $idcol = detect_id_column($pg,$table);
                if (!$col || !is_identifier($col) || !$idcol || !is_identifier($idcol)) {
                    respond(['success'=>false,'error'=>"No se pudo detectar columnas válidas en {$table}"]);
                }
                $sql = "SELECT {$idcol} AS id, {$col} AS nombre FROM {$table} ORDER BY {$idcol} ASC";
                $rows = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                respond(['success'=>true,'lugares'=>$rows]);
            case 'list_tactividad':
                $table = 'cap_tipo_actividad';
                $col = detect_text_column($pg,$table);
                $idcol = detect_id_column($pg,$table);
                if (!$col || !is_identifier($col) || !$idcol || !is_identifier($idcol)) {
                    respond(['success'=>false,'error'=>"No se pudo detectar columnas válidas en {$table}"]);
                }
                $sql = "SELECT {$idcol} AS id, {$col} AS nombre FROM {$table} ORDER BY {$idcol} ASC";
                $rows = $pg->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                respond(['success'=>true,'tactividad'=>$rows]);
            default:
                respond(['success'=>false,'error'=>'Acción GET no válida']);
        }
    }

    // POST: agregar ya implementado en tus agregar_cap_*.php externos.
    if ($method === 'POST') {
        // soportar actualizaciones: update_tema, update_proceso, update_lugar, update_tactividad
        $map = [
            'update_tema' => 'cap_tema',
            'update_proceso' => 'cap_proceso',
            'update_lugar' => 'cap_lugar',
            'update_tactividad' => 'cap_tipo_actividad'
        ];
        if (isset($map[$action])) {
            $table = $map[$action];
            $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
            $nombre = trim((string)($_POST['nombre'] ?? ''));
            if ($id <= 0 || $nombre === '') {
                respond(['success'=>false,'error'=>'Parámetros inválidos']);
            }
            // detectar columna
            $col = detect_text_column($pg,$table);
            if (!$col || !is_identifier($col)) {
                api_log("No se detectó columna texto para update en {$table}");
                respond(['success'=>false,'error'=>'Configuración: tabla no válida para actualizar']);
            }
            try {
                // UPDATE ... RETURNING id, col
                $sql = "UPDATE {$table} SET {$col} = :nombre WHERE id = :id RETURNING id, {$col}";
                $stmt = $pg->prepare($sql);
                $stmt->execute([':nombre' => $nombre, ':id' => $id]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    respond(['success'=>false,'error'=>'No se encontró el registro o no se pudo actualizar']);
                }
                // normalizar salida
                $out = ['id' => $row['id'], 'nombre' => $row[$col]];
                respond(['success'=>true, 'updated' => $out]);
            } catch (PDOException $e) {
                api_log("PDOException update {$table}: " . $e->getMessage());
                // intentar sincronizar secuencia sólo si es 23505 (pero rare para UPDATE)
                respond(['success'=>false,'error'=>'Error al actualizar registro']);
            }
        }
        respond(['success'=>false,'error'=>'Acción POST no soportada en este endpoint']);
    }

    respond(['success'=>false,'error'=>'Método no soportado']);
} catch (PDOException $e) {
    api_log("PDOException cap_control_api: ".$e->getMessage());
    http_response_code(500);
    respond(['success'=>false,'error'=>'Error en BD']);
} catch (Exception $e) {
    api_log("Exception cap_control_api: ".$e->getMessage());
    http_response_code(500);
    respond(['success'=>false,'error'=>'Error del servidor']);
}