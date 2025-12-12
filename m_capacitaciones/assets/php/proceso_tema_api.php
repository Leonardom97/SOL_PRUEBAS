<?php
// proceso_tema_api.php
// API endpoint for managing proceso-tema relationships
// Supports operations: list, add, delete, get_temas_by_proceso

// Apply security headers
require_once __DIR__ . '/../../../php/security_headers.php';

header('Content-Type: application/json; charset=utf-8');

// Helper functions
function respond($data) { 
    echo json_encode($data, JSON_UNESCAPED_UNICODE); 
    exit; 
}

function api_log($message) { 
    @file_put_contents(__DIR__.'/php_error_api.log', "[".date('Y-m-d H:i:s')."] ".$message."\n", FILE_APPEND|LOCK_EX); 
}

// Load database connection
$paths = [
    __DIR__.'/../../../php/db_postgres.php',
    __DIR__.'/../../php/db_postgres.php',
    __DIR__.'/../php/db_postgres.php'
];
$db_loaded = false;
foreach ($paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $db_loaded = true;
        break;
    }
}

if (!$db_loaded || !isset($pg) || !($pg instanceof PDO)) {
    api_log("proceso_tema_api: Database not available");
    respond(['success' => false, 'error' => 'Database connection not available']);
}

// Read input (support both JSON and form data)
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) $input = [];
$post = $_POST;
$get = $_GET;

// Helper to get parameter from multiple sources
$getParam = function($key, $default = null) use ($input, $post, $get) {
    if (isset($input[$key])) return $input[$key];
    if (isset($post[$key])) return $post[$key];
    if (isset($get[$key])) return $get[$key];
    return $default;
};

$action = strtolower(trim((string)$getParam('action', '')));

try {
    switch ($action) {
        case 'list':
            // List all proceso-tema relationships with proceso and tema names
            $stmt = $pg->prepare("
                SELECT 
                    pt.id,
                    pt.id_proceso,
                    pt.id_tema,
                    pt.activo,
                    pt.fecha_creacion,
                    p.proceso as proceso_nombre,
                    t.nombre as tema_nombre
                FROM cap_proceso_tema pt
                INNER JOIN cap_proceso p ON pt.id_proceso = p.id
                INNER JOIN cap_tema t ON pt.id_tema = t.id
                ORDER BY p.proceso, t.nombre
            ");
            $stmt->execute();
            $relations = $stmt->fetchAll();
            respond(['success' => true, 'relations' => $relations]);
            break;

        case 'add':
            // Add a new proceso-tema relationship
            $id_proceso = $getParam('id_proceso');
            $id_tema = $getParam('id_tema');
            
            if (!$id_proceso || !$id_tema) {
                respond(['success' => false, 'error' => 'Se requiere id_proceso e id_tema']);
            }
            
            if (!is_numeric($id_proceso) || !is_numeric($id_tema)) {
                respond(['success' => false, 'error' => 'IDs inválidos']);
            }
            
            // Check if relationship already exists
            $check = $pg->prepare("SELECT id, activo FROM cap_proceso_tema WHERE id_proceso = ? AND id_tema = ?");
            $check->execute([$id_proceso, $id_tema]);
            $exists = $check->fetch();
            
            if ($exists) {
                if ($exists['activo']) {
                    respond(['success' => false, 'error' => 'La relación ya existe']);
                } else {
                    // Reactivate existing relationship
                    $update = $pg->prepare("UPDATE cap_proceso_tema SET activo = true WHERE id = ?");
                    $update->execute([$exists['id']]);
                    respond(['success' => true, 'message' => 'Relación reactivada', 'id' => $exists['id']]);
                }
            }
            
            // Insert new relationship
            $stmt = $pg->prepare("
                INSERT INTO cap_proceso_tema (id_proceso, id_tema, activo)
                VALUES (?, ?, true)
                RETURNING id
            ");
            $stmt->execute([$id_proceso, $id_tema]);
            $result = $stmt->fetch();
            
            respond(['success' => true, 'message' => 'Relación agregada', 'id' => $result['id']]);
            break;

        case 'delete':
            // Soft delete (set activo = false) or hard delete
            $id = $getParam('id');
            $hard_delete = $getParam('hard_delete', false);
            
            if (!$id || !is_numeric($id)) {
                respond(['success' => false, 'error' => 'ID inválido']);
            }
            
            if ($hard_delete) {
                $stmt = $pg->prepare("DELETE FROM cap_proceso_tema WHERE id = ?");
            } else {
                $stmt = $pg->prepare("UPDATE cap_proceso_tema SET activo = false WHERE id = ?");
            }
            
            $stmt->execute([$id]);
            respond(['success' => true, 'message' => 'Relación eliminada']);
            break;

        case 'toggle':
            // Toggle active status
            $id = $getParam('id');
            
            if (!$id || !is_numeric($id)) {
                respond(['success' => false, 'error' => 'ID inválido']);
            }
            
            $stmt = $pg->prepare("
                UPDATE cap_proceso_tema 
                SET activo = NOT activo 
                WHERE id = ?
                RETURNING activo
            ");
            $stmt->execute([$id]);
            $result = $stmt->fetch();
            
            respond(['success' => true, 'activo' => $result['activo']]);
            break;

        case 'get_temas_by_proceso':
            // Get all active temas for a specific proceso
            $id_proceso = $getParam('id_proceso');
            
            if (!$id_proceso || !is_numeric($id_proceso)) {
                respond(['success' => false, 'error' => 'ID de proceso inválido']);
            }
            
            $stmt = $pg->prepare("
                SELECT 
                    t.id,
                    t.nombre
                FROM cap_tema t
                INNER JOIN cap_proceso_tema pt ON t.id = pt.id_tema
                WHERE pt.id_proceso = ? AND pt.activo = true
                ORDER BY t.nombre
            ");
            $stmt->execute([$id_proceso]);
            $temas = $stmt->fetchAll();
            
            respond(['success' => true, 'temas' => $temas]);
            break;

        case 'get_procesos':
            // Get all procesos for dropdown
            $stmt = $pg->prepare("SELECT id, proceso as nombre FROM cap_proceso ORDER BY proceso");
            $stmt->execute();
            $procesos = $stmt->fetchAll();
            respond(['success' => true, 'procesos' => $procesos]);
            break;

        case 'get_all_temas':
            // Get all temas for dropdown
            $stmt = $pg->prepare("SELECT id, nombre FROM cap_tema ORDER BY nombre");
            $stmt->execute();
            $temas = $stmt->fetchAll();
            respond(['success' => true, 'temas' => $temas]);
            break;

        default:
            respond(['success' => false, 'error' => 'Acción no válida']);
    }
} catch (PDOException $e) {
    api_log("Database error in proceso_tema_api: " . $e->getMessage());
    respond(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    api_log("Error in proceso_tema_api: " . $e->getMessage());
    respond(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}
