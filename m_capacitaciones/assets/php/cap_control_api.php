<?php
// cap_control_api.php
// API para proporcionar listas de temas, procesos, lugares y tipos de actividad
// Usado por items_formularios.js para cargar las tablas dinámicas

// Apply security headers
require_once __DIR__ . '/../../../php/security_headers.php';

session_start();

header('Content-Type: application/json; charset=utf-8');

// Validar que existe una sesión activa
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Sesión no iniciada. Por favor inicie sesión.']);
    exit;
}

// Función para responder JSON y terminar
function respond($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Función para log de errores - usa error_log estándar de PHP
function api_log($msg) {
    error_log("[cap_control_api] " . $msg);
}

// Intentar conectar a la base de datos
$paths = [
    __DIR__.'/../../../php/db_postgres.php',
    __DIR__.'/../../php/db_postgres.php',
    __DIR__.'/../db_postgres.php'
];

$connected = false;
foreach ($paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $connected = true;
        break;
    }
}

if (!$connected || !isset($pg) || !($pg instanceof PDO)) {
    api_log("cap_control_api: DB no disponible");
    respond(['success' => false, 'error' => 'DB no disponible']);
}

// Obtener acción desde GET o POST
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$action = strtolower(trim($action));

// Whitelist de acciones permitidas
$allowed_actions = ['list_temas', 'list_procesos', 'list_lugares', 'list_tactividad'];
if (!in_array($action, $allowed_actions)) {
    respond(['success' => false, 'error' => 'Acción no válida']);
}

try {
    // Listar temas
    if ($action === 'list_temas') {
        $stmt = $pg->prepare("SELECT id, nombre, estado FROM cap_tema ORDER BY id ASC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convertir estado a booleano: 0 = activo (true), 1 = inactivo (false)
        $temas = array_map(function($row) {
            return [
                'id' => (string)$row['id'],
                'nombre' => $row['nombre'],
                'activo' => ((int)$row['estado'] === 0)
            ];
        }, $rows);
        
        respond(['success' => true, 'temas' => $temas]);
    }
    
    // Listar procesos
    if ($action === 'list_procesos') {
        $stmt = $pg->prepare("SELECT id, proceso, estado FROM cap_proceso ORDER BY id ASC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convertir estado a booleano y normalizar nombre de columna
        $procesos = array_map(function($row) {
            return [
                'id' => (string)$row['id'],
                'nombre' => $row['proceso'],
                'activo' => ((int)$row['estado'] === 0)
            ];
        }, $rows);
        
        respond(['success' => true, 'procesos' => $procesos]);
    }
    
    // Listar lugares
    if ($action === 'list_lugares') {
        $stmt = $pg->prepare("SELECT id, lugar, estado FROM cap_lugar ORDER BY id ASC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convertir estado a booleano y normalizar nombre de columna
        $lugares = array_map(function($row) {
            return [
                'id' => (string)$row['id'],
                'nombre' => $row['lugar'],
                'activo' => ((int)$row['estado'] === 0)
            ];
        }, $rows);
        
        respond(['success' => true, 'lugares' => $lugares]);
    }
    
    // Listar tipos de actividad
    if ($action === 'list_tactividad') {
        $stmt = $pg->prepare("SELECT id, nombre, estado FROM cap_tipo_actividad ORDER BY id ASC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convertir estado a booleano
        $tactividad = array_map(function($row) {
            return [
                'id' => (string)$row['id'],
                'nombre' => $row['nombre'],
                'activo' => ((int)$row['estado'] === 0)
            ];
        }, $rows);
        
        respond(['success' => true, 'tactividad' => $tactividad]);
    }
    
} catch (PDOException $e) {
    api_log("cap_control_api error ({$action}): ".$e->getMessage());
    respond(['success' => false, 'error' => 'Error al consultar la base de datos']);
} catch (Exception $e) {
    api_log("cap_control_api error ({$action}): ".$e->getMessage());
    respond(['success' => false, 'error' => 'Error del servidor']);
}
?>
