<?php

/**
 * API de Gestión de Roles
 * 
 * Provee endpoints para listar, crear, editar, cambiar estado y eliminar roles.
 */

// Headers de seguridad
require_once __DIR__ . '/security_headers.php';

// Iniciar sesión
session_start();

// Dependencias
require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/audit_logger.php';
require_once __DIR__ . '/role_check.php';

// Intentar cargar manejador de errores si existe
if (file_exists(__DIR__ . '/error_handler.php')) {
        require_once __DIR__ . '/error_handler.php';
} else {
        // Fallback simple si no existe la clase
        class ErrorResponse
        {
                public static function success($msg)
                {
                        echo json_encode(['success' => true, 'message' => $msg]);
                        exit;
                }
                public static function error($msg)
                {
                        http_response_code(500);
                        echo json_encode(['success' => false, 'message' => $msg]);
                        exit;
                }
                public static function database($msg, $debug)
                {
                        self::error($msg);
                }
                public static function notFound($item)
                {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'message' => "$item no encontrado"]);
                        exit;
                }
                public static function badRequest($msg)
                {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'message' => $msg]);
                        exit;
                }
                public static function inUse($item, $dep)
                {
                        http_response_code(409);
                        echo json_encode(['success' => false, 'message' => "$item está en uso por $dep"]);
                        exit;
                }
                public static function log($src, $msg, $e)
                {
                        error_log("[$src] $msg: " . $e->getMessage());
                }
                public static function unknown($msg, $debug)
                {
                        self::error($msg);
                }
        }
}

$logger = new AuditLogger();

// Validar sesión
if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesión no iniciada']);
        exit;
}

// Configurar respuesta JSON
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
        switch ($method) {
                case 'GET':
                        // Listar roles
                        // Requerir permisos de admin
                        requireAdministrator($pg);

                        $sql = "SELECT * FROM adm_roles ORDER BY id ASC";
                        $stmt = $pg->query($sql);
                        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

                        echo json_encode(['success' => true, 'roles' => $roles]);
                        break;

                case 'POST':
                        // Crear rol
                        requireAdministrator($pg);
                        $data = json_decode(file_get_contents('php://input'), true);

                        if (!$data || empty($data['nombre'])) {
                                ErrorResponse::badRequest('El nombre del rol es obligatorio');
                        }

                        $nombre = trim($data['nombre']);

                        // Verificar duplicados
                        $stmt = $pg->prepare("SELECT COUNT(*) FROM adm_roles WHERE LOWER(nombre) = LOWER(?)");
                        $stmt->execute([$nombre]);
                        if ($stmt->fetchColumn() > 0) {
                                ErrorResponse::badRequest('Ya existe un rol con ese nombre');
                        }

                        $stmt = $pg->prepare("INSERT INTO adm_roles (nombre, estado) VALUES (?, 0)");
                        $stmt->execute([$nombre]);

                        $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'unknown', 'CREATE_ROLE', "Creación de rol: $nombre", ['nombre' => $nombre]);

                        echo json_encode(['success' => true, 'message' => 'Rol creado exitosamente']);
                        break;

                case 'PUT':
                        // Editar nombre de rol
                        requireAdministrator($pg);
                        $data = json_decode(file_get_contents('php://input'), true);

                        if (!$data || empty($data['id']) || empty($data['nombre'])) {
                                ErrorResponse::badRequest('ID y nombre son obligatorios');
                        }

                        $id = $data['id'];
                        $nombre = trim($data['nombre']);

                        $stmt = $pg->prepare("UPDATE adm_roles SET nombre = ? WHERE id = ?");
                        $stmt->execute([$nombre, $id]);

                        $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'unknown', 'UPDATE_ROLE', "Edición de rol ID $id", ['id' => $id, 'nombre' => $nombre]);

                        echo json_encode(['success' => true, 'message' => 'Rol actualizado exitosamente']);
                        break;

                case 'PATCH':
                        // Cambiar estado (Activar/Desactivar)
                        requireAdministrator($pg);
                        $data = json_decode(file_get_contents('php://input'), true);

                        if (!$data || empty($data['id']) || !isset($data['estado'])) {
                                ErrorResponse::badRequest('ID y estado son obligatorios');
                        }

                        $id = $data['id'];
                        $estado = intval($data['estado']);

                        $stmt = $pg->prepare("UPDATE adm_roles SET estado = ? WHERE id = ?");
                        $stmt->execute([$estado, $id]);

                        $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'unknown', 'UPDATE_ROLE_STATUS', "Cambio de estado rol ID $id a $estado", ['id' => $id, 'estado' => $estado]);

                        echo json_encode(['success' => true, 'message' => 'Estado actualizado']);
                        break;

                case 'DELETE':
                        // Eliminar rol
                        requireAdministrator($pg);
                        $data = json_decode(file_get_contents('php://input'), true);
                        $id = $data['id'] ?? null;

                        if (!$id) {
                                ErrorResponse::badRequest('ID es obligatorio');
                        }

                        // Verificar existencia
                        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
                        $stmt_exists = $pg->prepare($sql_exists);
                        $stmt_exists->execute([':id' => $id]);
                        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
                                ErrorResponse::notFound('Rol');
                        }

                        // Verificar si el rol está en uso
                        $sql_check = "SELECT COUNT(*) as count FROM adm_usuario_roles WHERE rol_id = :id";
                        $stmt_check = $pg->prepare($sql_check);
                        $stmt_check->execute([':id' => $id]);
                        $in_use = $stmt_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;

                        if ($in_use) {
                                ErrorResponse::inUse('Rol', 'usuarios');
                        }

                        // Iniciar transacción
                        $pg->beginTransaction();

                        try {
                                // Eliminar permisos asociados
                                $sql_del_perms = "DELETE FROM adm_role_permissions WHERE rol_id = :id";
                                $stmt_del_perms = $pg->prepare($sql_del_perms);
                                $stmt_del_perms->execute([':id' => $id]);

                                // Eliminar el rol
                                $sql_del = "DELETE FROM adm_roles WHERE id = :id";
                                $stmt_del = $pg->prepare($sql_del);
                                $stmt_del->execute([':id' => $id]);

                                $pg->commit();

                                $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'unknown', 'DELETE_ROLE', "Eliminación de rol ID $id", ['role_id' => $id]);

                                echo json_encode(['success' => true, 'message' => 'Rol eliminado exitosamente']);
                        } catch (Exception $e) {
                                $pg->rollBack();
                                throw $e;
                        }
                        break;

                default:
                        http_response_code(405);
                        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
                        break;
        }
} catch (PDOException $e) {
        ErrorResponse::database('Error de base de datos', $e->getMessage());
} catch (Exception $e) {
        ErrorResponse::unknown('Error inesperado', $e->getMessage());
}
