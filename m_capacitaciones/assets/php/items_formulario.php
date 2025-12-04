<?php
// items_formulario.php
// Unifica las funcionalidades de:
//  - cap_agregar.php  (añadir registros)
//  - cap_inactivar.php (estado = 1)
//  - cap_activar.php   (estado = 0)
//  - cap_update.php    (editar nombre)
// Soporta JSON o form-data. Parámetros principales:
//  - action/op: add | update | activar | inactivar
//  - table OR type (p.ej. "cap_tema" o "tema")
//  - id (para update/activar/inactivar)
//  - nombre (para add/update)
// Responde JSON similar a los scripts originales.

// Apply security headers
require_once __DIR__ . '/../../../php/security_headers.php';

header('Content-Type: application/json; charset=utf-8');

/* Helpers básicos para responder y registrar */
function respond($d){ echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function api_log($m){ @file_put_contents(__DIR__.'/php_error_api.log', "[".date('Y-m-d H:i:s')."] ".$m."\n", FILE_APPEND|LOCK_EX); }

/* Intento de localizar db_postgres.php en varias rutas relativas */
$paths = [ __DIR__.'/../../../php/db_postgres.php', __DIR__.'/../../db_postgres.php', __DIR__.'/../db_postgres.php' ];
$ok = false;
foreach ($paths as $p) { if (file_exists($p)) { require_once $p; $ok = true; break; } }
if (!$ok || !isset($pg) || !($pg instanceof PDO)) { api_log("items_formulario: DB no disponible"); respond(['success'=>false,'error'=>'DB no disponible']); }

/* Leer entrada JSON si existe, y combinar con $_POST para compatibilidad */
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) $input = [];
// allow both JSON and form fields
$post = $_POST;

/* Helper para obtener valor considerando JSON o POST */
$getv = function($k, $default='') use ($input, $post){
    if (isset($input[$k])) return $input[$k];
    if (isset($post[$k])) return $post[$k];
    return $default;
};

$action = strtolower(trim((string)$getv('action', $getv('op', ''))));
$table_in = trim((string)$getv('table', ''));
$type = trim((string)$getv('type', ''));
$nombre = trim((string)$getv('nombre', $getv('name', '')));
$id_raw = $getv('id', null);
$state_raw = $getv('state', $getv('estado', null)); // allow 'state' or 'estado'

// Normalizar ID si se proporcionó
$id = null;
if ($id_raw !== null && $id_raw !== '') {
    if (!is_numeric($id_raw)) respond(['success'=>false,'error'=>'ID inválido']);
    $id = (int)$id_raw;
    if ($id <= 0) respond(['success'=>false,'error'=>'ID inválido']);
}

// Normalizar estado si se proporcionó
$state = null;
if ($state_raw !== null && $state_raw !== '') {
    if (!is_numeric($state_raw)) respond(['success'=>false,'error'=>'Estado inválido']);
    $state = (int)$state_raw;
    if (!in_array($state, [0,1], true)) respond(['success'=>false,'error'=>'Estado inválido']);
}

/* Mapeo abreviado -> tabla real */
$map = [
    'lugar'=>'cap_lugar','cap_lugar'=>'cap_lugar',
    'proceso'=>'cap_proceso','cap_proceso'=>'cap_proceso',
    'tema'=>'cap_tema','cap_tema'=>'cap_tema',
    'tipo'=>'cap_tipo_actividad','tactividad'=>'cap_tipo_actividad',
    'cap_tipo_actividad'=>'cap_tipo_actividad','tipo_actividad'=>'cap_tipo_actividad','tipoactividad'=>'cap_tipo_actividad'
];

$allowed = ['cap_lugar','cap_proceso','cap_tema','cap_tipo_actividad'];

// Resolver table desde 'type' si no se envía 'table'
if ($table_in === '' && $type !== '') {
    if (isset($map[$type])) $table_in = $map[$type];
}

// Si table_in es forma corta, mapearla a tabla real
if ($table_in !== '' && isset($map[$table_in])) $table = $map[$table_in];
else $table = $table_in;

// Intentar inferir acción si no viene explícita (comodín)
if ($action === '') {
    if ($nombre !== '' && ($id === null)) {
        $action = 'add';
    } elseif ($id !== null && $nombre !== '') {
        $action = 'update';
    } elseif ($id !== null && $state !== null) {
        $action = ($state === 0) ? 'activar' : 'inactivar';
    } else {
        respond(['success'=>false,'error'=>'Parámetros insuficientes: especifica action/op o envía datos suficientes para inferirla']);
    }
}

// Normalizar nombres de acción en español/inglés
$action_map = [
    'add'=>'add','agregar'=>'add',
    'create'=>'add',
    'update'=>'update','editar'=>'update','edit'=>'update',
    'activar'=>'activar','activate'=>'activar',
    'inactivar'=>'inactivar','deactivate'=>'inactivar','inactivate'=>'inactivar'
];
if (!isset($action_map[$action])) respond(['success'=>false,'error'=>'Acción inválida']);
$action = $action_map[$action];

try {
    // Acción: add (insertar nueva fila)
    if ($action === 'add') {
        // Validaciones básicas
        if ($table === '') respond(['success'=>false,'error'=>'Falta parámetro table o type']);
        if (!in_array($table, $allowed, true)) respond(['success'=>false,'error'=>'Tabla inválida']);
        if ($nombre === '') respond(['success'=>false,'error'=>'Nombre vacío']);

        // Obtener columnas de la tabla para detectar columna textual y columna estado
        $stmt = $pg->prepare("SELECT column_name FROM information_schema.columns WHERE table_name = :t");
        $stmt->execute([':t'=>$table]);
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        if (!$cols) respond(['success'=>false,'error'=>"Tabla {$table} no encontrada"]);

        // Preferencias de columna para nombre
        $candidates = ['nombre','name','titulo','descripcion','lugar','proceso','tema','tipo','actividad','label'];
        $nameCol = null;
        foreach ($candidates as $c) {
            foreach ($cols as $col) {
                if (strcasecmp($col,$c)===0) { $nameCol = $col; break 2; }
            }
        }
        // Fallback: primera columna distinta de id
        if (!$nameCol) {
            foreach ($cols as $col) {
                if (strcasecmp($col,'id') !== 0) { $nameCol = $col; break; }
            }
        }
        if (!$nameCol) respond(['success'=>false,'error'=>'No se detectó columna para nombre']);
        if (!in_array('estado',$cols)) respond(['success'=>false,'error'=>"Columna 'estado' no encontrada en {$table}"]);
        if (!preg_match('/^[a-zA-Z0-9_]+$/',$nameCol)){ api_log("items_formulario add: columna insegura {$nameCol} en {$table}"); respond(['success'=>false,'error'=>'Configuración inválida']); }

        $sql = "INSERT INTO {$table} ({$nameCol}, estado) VALUES (:nombre, 0) RETURNING id, {$nameCol} AS nombre, estado";
        $ins = $pg->prepare($sql);
        $ins->execute([':nombre'=>$nombre]);
        $r = $ins->fetch(PDO::FETCH_ASSOC);
        if (!$r) respond(['success'=>false,'error'=>'No se pudo insertar']);
        respond(['success'=>true,'id'=> (int)$r['id'],'nombre'=>$r['nombre'],'estado'=> (int)$r['estado']]);
    }

    // Acción: activar / inactivar (actualiza columna estado)
    if ($action === 'activar' || $action === 'inactivar') {
        if ($id === null) respond(['success'=>false,'error'=>'Falta parámetro id']);
        if ($table === '') respond(['success'=>false,'error'=>'Falta parámetro table o type']);
        if (!in_array($table, $allowed, true)) respond(['success'=>false,'error'=>'Tabla inválida']);

        // Comprobar que exista la columna 'estado' en la tabla
        $chk = $pg->prepare("SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = 'estado' LIMIT 1");
        $chk->execute([':t'=>$table]);
        if (!$chk->fetch()) respond(['success'=>false,'error'=>"Columna 'estado' no encontrada en {$table}"]);

        $new = ($action === 'activar') ? 0 : 1;
        $u = $pg->prepare("UPDATE {$table} SET estado = :new WHERE id = :id RETURNING estado AS newv, id");
        $u->execute([':new'=>$new,':id'=>$id]);
        $r = $u->fetch(PDO::FETCH_ASSOC);
        if (!$r) respond(['success'=>false,'error'=>'Registro no encontrado']);
        respond(['success'=>true,'id'=> (int)$r['id'],'new_value'=> (int)$r['newv']]);
    }

    // Acción: update (editar el campo textual detectado)
    if ($action === 'update') {
        if ($id === null) respond(['success'=>false,'error'=>'Falta parámetro id']);
        if ($nombre === '') respond(['success'=>false,'error'=>'Nombre vacío']);

        // Si no se especificó tabla, intentar inferir buscando el id en las tablas permitidas
        if ($table === '') {
            $found = [];
            foreach ($allowed as $t) {
                try {
                    $chk = $pg->prepare("SELECT 1 FROM {$t} WHERE id = :id LIMIT 1");
                    $chk->execute([':id' => $id]);
                    if ($chk->fetch()) $found[] = $t;
                } catch (Exception $e) {
                    api_log("items_formulario update: comprobando {$t} falló: ".$e->getMessage());
                }
            }
            if (count($found) === 0) {
                respond(['success'=>false,'error'=>'Registro no encontrado en ninguna tabla conocida (no se especificó table)']);
            } elseif (count($found) > 1) {
                api_log("items_formulario update: id {$id} existe en varias tablas: ".implode(',', $found));
                respond(['success'=>false,'error'=>'ID presente en varias tablas; especifica el parámetro table o type.']);
            } else {
                $table = $found[0];
                api_log("items_formulario update: inferida tabla {$table} para id {$id}");
            }
        }

        if (!in_array($table, $allowed, true)) respond(['success'=>false,'error'=>'Tabla inválida']);

        // Obtener columnas y detectar columna textual a actualizar
        $stmt = $pg->prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :t");
        $stmt->execute([':t'=>$table]);
        $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$cols) { api_log("items_formulario update: tabla {$table} sin columnas"); respond(['success'=>false,'error'=>'Tabla no encontrada']); }

        // Preferencias para detectar columna de texto
        $prefs = ['nombre','name','descripcion','titulo','lugar','proceso','tema','tipo','actividad','label'];
        $col = null;
        foreach ($prefs as $p) {
            foreach ($cols as $c) {
                if (stripos($c['column_name'], $p) !== false) { $col = $c['column_name']; break 2; }
            }
        }
        // Fallback: primera columna no numérica y no 'id'
        if (!$col) {
            foreach ($cols as $c) {
                $dt = strtolower($c['data_type']);
                if ($c['column_name'] !== 'id' && !in_array($dt, ['integer','bigint','smallint','serial','bigserial','int4','int8','int2'])) { $col = $c['column_name']; break; }
            }
        }
        if (!$col){ api_log("items_formulario update: no text column for {$table}"); respond(['success'=>false,'error'=>'Tabla no preparada para edición']); }

        // Seguridad: asegurar que el nombre de columna es seguro (sin caracteres raros)
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $col)) { api_log("items_formulario update: columna insegura {$col} en {$table}"); respond(['success'=>false,'error'=>'Configuración inválida']); }

        // Ejecutar UPDATE con RETURNING para devolver el registro actualizado
        $sql = "UPDATE {$table} SET {$col} = :nombre WHERE id = :id RETURNING id, {$col}";
        $s = $pg->prepare($sql);
        $s->execute([':nombre' => $nombre, ':id' => $id]);
        $row = $s->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            respond(['success'=>false,'error'=>'Registro no encontrado o no actualizado']);
        }
        respond(['success'=>true,'updated'=>['table'=>$table,'id'=>$row['id'],'nombre'=>$row[$col]]]);
    }

    // Si llega aquí sin coincidencias, devolver error por seguridad
    respond(['success'=>false,'error'=>'Acción no implementada']);
} catch (Exception $e) {
    api_log("items_formulario error ({$action} / {$table}): ".$e->getMessage());
    respond(['success'=>false,'error'=>'Error servidor']);
}
?>