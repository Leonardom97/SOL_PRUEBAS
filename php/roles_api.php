<?php
// Apply security headers
require_once __DIR__ . '/security_headers.php';

session_start();
require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/role_check.php';

// Validar que existe una sesión activa
if (!isset($_SESSION['usuario_id'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no iniciada. Por favor inicie sesión.']);
    exit;
}

// Validar que el usuario es administrador
requireAdministrator($pg);

// GET: consultar roles
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT id, nombre, estado FROM adm_roles ORDER BY id";
        $stmt = $pg->query($sql);
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'roles' => $roles]);
        exit;
    } catch (PDOException $e) {
        error_log("Error fetching roles: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al obtener roles. Por favor intente nuevamente.']);
        exit;
    } catch (Exception $e) {
        error_log("Unexpected error fetching roles: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
        exit;
    }
}

// POST: crear nuevo rol
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['nombre']) || trim($input['nombre']) === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre del rol es obligatorio.']);
        exit;
    }
    
    $nombre = trim($input['nombre']);
    
    // Validar longitud del nombre
    if (strlen($nombre) < 3) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre del rol debe tener al menos 3 caracteres.']);
        exit;
    }
    
    if (strlen($nombre) > 50) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre del rol no puede exceder 50 caracteres.']);
        exit;
    }
    
    // Validar caracteres permitidos (letras, números, espacios, guiones bajos y guiones medios)
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s_-]+$/', $nombre)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre del rol contiene caracteres no permitidos. Use solo letras, números, espacios y guiones.']);
        exit;
    }
    
    try {
        // Verificar si el rol ya existe
        $sql_check = "SELECT COUNT(*) as count FROM adm_roles WHERE LOWER(nombre) = LOWER(:nombre)";
        $stmt_check = $pg->prepare($sql_check);
        $stmt_check->execute([':nombre' => $nombre]);
        $exists = $stmt_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($exists) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Ya existe un rol con ese nombre.']);
            exit;
        }
        
        // Insertar el nuevo rol
        $sql = "INSERT INTO adm_roles (nombre, estado) VALUES (:nombre, 0) RETURNING id";
        $stmt = $pg->prepare($sql);
        $stmt->execute([':nombre' => $nombre]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'message' => 'Rol creado exitosamente.',
            'id' => $result['id']
        ]);
        exit;
    } catch (PDOException $e) {
        error_log("Error creating role: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al crear rol. Por favor intente nuevamente.']);
        exit;
    } catch (Exception $e) {
        error_log("Unexpected error creating role: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
        exit;
    }
}

// PUT: actualizar rol
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id']) || !isset($input['nombre']) || trim($input['nombre']) === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID y nombre del rol son obligatorios.']);
        exit;
    }
    
    $id = intval($input['id']);
    $nombre = trim($input['nombre']);
    
    // Validar que el ID sea válido
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID de rol inválido.']);
        exit;
    }
    
    // Prevent editing the Administrator role (ID=1)
    if ($id === 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No se puede modificar el rol de Administrador.']);
        exit;
    }
    
    // Validar longitud del nombre
    if (strlen($nombre) < 3) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre del rol debe tener al menos 3 caracteres.']);
        exit;
    }
    
    if (strlen($nombre) > 50) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre del rol no puede exceder 50 caracteres.']);
        exit;
    }
    
    // Validar caracteres permitidos
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s_-]+$/', $nombre)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre del rol contiene caracteres no permitidos. Use solo letras, números, espacios y guiones.']);
        exit;
    }
    
    try {
        // Verificar si el rol existe
        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
        $stmt_exists = $pg->prepare($sql_exists);
        $stmt_exists->execute([':id' => $id]);
        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'El rol especificado no existe.']);
            exit;
        }
        
        // Verificar si otro rol ya usa ese nombre
        $sql_check = "SELECT COUNT(*) as count FROM adm_roles WHERE LOWER(nombre) = LOWER(:nombre) AND id != :id";
        $stmt_check = $pg->prepare($sql_check);
        $stmt_check->execute([':nombre' => $nombre, ':id' => $id]);
        $exists = $stmt_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($exists) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Ya existe otro rol con ese nombre.']);
            exit;
        }
        
        // Actualizar el rol
        $sql = "UPDATE adm_roles SET nombre = :nombre WHERE id = :id";
        $stmt = $pg->prepare($sql);
        $stmt->execute([':nombre' => $nombre, ':id' => $id]);
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Rol actualizado exitosamente.']);
        exit;
    } catch (PDOException $e) {
        error_log("Error updating role: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar rol. Por favor intente nuevamente.']);
        exit;
    } catch (Exception $e) {
        error_log("Unexpected error updating role: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
        exit;
    }
}

// PATCH: toggle estado del rol
if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id']) || !isset($input['estado'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID y estado son obligatorios.']);
        exit;
    }
    
    $id = intval($input['id']);
    $estado = intval($input['estado']);
    
    // Validar que el ID sea válido
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID de rol inválido.']);
        exit;
    }
    
    // Prevent modifying the Administrator role status (ID=1)
    if ($id === 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No se puede modificar el estado del rol de Administrador.']);
        exit;
    }
    
    // Validar que el estado sea válido (0 o 1)
    if ($estado !== 0 && $estado !== 1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Estado inválido. Debe ser 0 (activo) o 1 (inactivo).']);
        exit;
    }
    
    try {
        // Verificar si el rol existe
        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
        $stmt_exists = $pg->prepare($sql_exists);
        $stmt_exists->execute([':id' => $id]);
        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'El rol especificado no existe.']);
            exit;
        }
        
        $sql = "UPDATE adm_roles SET estado = :estado WHERE id = :id";
        $stmt = $pg->prepare($sql);
        $stmt->execute([':estado' => $estado, ':id' => $id]);
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Estado del rol actualizado exitosamente.']);
        exit;
    } catch (PDOException $e) {
        error_log("Error updating role status: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar estado. Por favor intente nuevamente.']);
        exit;
    } catch (Exception $e) {
        error_log("Unexpected error updating role status: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
        exit;
    }
}

// DELETE: eliminar rol
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID del rol es obligatorio.']);
        exit;
    }
    
    $id = intval($input['id']);
    
    // Validar que el ID sea válido
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID de rol inválido.']);
        exit;
    }
    
    // Prevent deleting the Administrator role (ID=1)
    if ($id === 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No se puede eliminar el rol de Administrador.']);
        exit;
    }
    
    try {
        // Verificar si el rol existe
        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
        $stmt_exists = $pg->prepare($sql_exists);
        $stmt_exists->execute([':id' => $id]);
        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'El rol especificado no existe.']);
            exit;
        }
        
        // Verificar si el rol está en uso (tiene usuarios asignados)
        $sql_check = "SELECT COUNT(*) as count FROM adm_usuario_roles WHERE rol_id = :id";
        $stmt_check = $pg->prepare($sql_check);
        $stmt_check->execute([':id' => $id]);
        $in_use = $stmt_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($in_use) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'No se puede eliminar el rol porque tiene usuarios asignados.']);
            exit;
        }
        
        // Iniciar transacción para asegurar atomicidad
        $pg->beginTransaction();
        
        // Eliminar permisos asociados al rol
        $sql_del_perms = "DELETE FROM adm_role_permissions WHERE rol_id = :id";
        $stmt_del_perms = $pg->prepare($sql_del_perms);
        $stmt_del_perms->execute([':id' => $id]);
        
        // Eliminar el rol
        $sql = "DELETE FROM adm_roles WHERE id = :id";
        $stmt = $pg->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        // Confirmar transacción
        $pg->commit();
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Rol eliminado exitosamente.']);
        exit;
    } catch (PDOException $e) {
        // Revertir transacción en caso de error
        if ($pg->inTransaction()) {
            $pg->rollBack();
        }
        error_log("Error deleting role: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al eliminar rol. Por favor intente nuevamente.']);
        exit;
    } catch (Exception $e) {
        // Revertir transacción en caso de error
        if ($pg->inTransaction()) {
            $pg->rollBack();
        }
        error_log("Unexpected error deleting role: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
