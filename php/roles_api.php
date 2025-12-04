<?php
// Apply security headers
require_once __DIR__ . '/security_headers.php';

session_start();
require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/role_check.php';
require_once __DIR__ . '/error_handler.php';

// Validar que existe una sesión activa
if (!isset($_SESSION['usuario_id'])) {
    ErrorResponse::unauthorized();
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
        ErrorResponse::log('roles_api', 'Error fetching roles', $e);
        ErrorResponse::database('Error al obtener roles.', $e->getMessage());
    } catch (Exception $e) {
        ErrorResponse::log('roles_api', 'Unexpected error fetching roles', $e);
        ErrorResponse::unknown('Error inesperado al obtener roles.', $e->getMessage());
    }
}

// POST: crear nuevo rol
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['nombre']) || trim($input['nombre']) === '') {
        ErrorResponse::validation('El nombre del rol es obligatorio.');
    }
    
    $nombre = trim($input['nombre']);
    
    // Validar longitud del nombre
    if (strlen($nombre) < 3) {
        ErrorResponse::validation('El nombre del rol debe tener al menos 3 caracteres.');
    }
    
    if (strlen($nombre) > 50) {
        ErrorResponse::validation('El nombre del rol no puede exceder 50 caracteres.');
    }
    
    // Validar caracteres permitidos (letras, números, espacios, guiones bajos y guiones medios)
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s_-]+$/', $nombre)) {
        ErrorResponse::validation('El nombre del rol contiene caracteres no permitidos. Use solo letras, números, espacios y guiones.');
    }
    
    try {
        // Verificar si el rol ya existe
        $sql_check = "SELECT COUNT(*) as count FROM adm_roles WHERE LOWER(nombre) = LOWER(:nombre)";
        $stmt_check = $pg->prepare($sql_check);
        $stmt_check->execute([':nombre' => $nombre]);
        $exists = $stmt_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($exists) {
            ErrorResponse::duplicate('rol');
        }
        
        // Insertar el nuevo rol
        $sql = "INSERT INTO adm_roles (nombre, estado) VALUES (:nombre, 0) RETURNING id";
        $stmt = $pg->prepare($sql);
        $stmt->execute([':nombre' => $nombre]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        ErrorResponse::success('Rol creado exitosamente.', ['id' => $result['id']]);
    } catch (PDOException $e) {
        ErrorResponse::log('roles_api', 'Error creating role', $e);
        ErrorResponse::database('Error al crear rol.', $e->getMessage());
    } catch (Exception $e) {
        ErrorResponse::log('roles_api', 'Unexpected error creating role', $e);
        ErrorResponse::unknown('Error inesperado al crear rol.', $e->getMessage());
    }
}

// PUT: actualizar rol
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id']) || !isset($input['nombre']) || trim($input['nombre']) === '') {
        ErrorResponse::validation('ID y nombre del rol son obligatorios.');
    }
    
    $id = intval($input['id']);
    $nombre = trim($input['nombre']);
    
    // Validar que el ID sea válido
    if ($id <= 0) {
        ErrorResponse::validation('ID de rol inválido.');
    }
    
    // Prevent editing the Administrator role (ID=1)
    if ($id === 1) {
        ErrorResponse::forbidden('No se puede modificar el rol de Administrador.');
    }
    
    // Validar longitud del nombre
    if (strlen($nombre) < 3) {
        ErrorResponse::validation('El nombre del rol debe tener al menos 3 caracteres.');
    }
    
    if (strlen($nombre) > 50) {
        ErrorResponse::validation('El nombre del rol no puede exceder 50 caracteres.');
    }
    
    // Validar caracteres permitidos
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s_-]+$/', $nombre)) {
        ErrorResponse::validation('El nombre del rol contiene caracteres no permitidos. Use solo letras, números, espacios y guiones.');
    }
    
    try {
        // Verificar si el rol existe
        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
        $stmt_exists = $pg->prepare($sql_exists);
        $stmt_exists->execute([':id' => $id]);
        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            ErrorResponse::notFound('rol');
        }
        
        // Verificar si otro rol ya usa ese nombre
        $sql_check = "SELECT COUNT(*) as count FROM adm_roles WHERE LOWER(nombre) = LOWER(:nombre) AND id != :id";
        $stmt_check = $pg->prepare($sql_check);
        $stmt_check->execute([':nombre' => $nombre, ':id' => $id]);
        $exists = $stmt_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($exists) {
            ErrorResponse::duplicate('rol');
        }
        
        // Actualizar el rol
        $sql = "UPDATE adm_roles SET nombre = :nombre WHERE id = :id";
        $stmt = $pg->prepare($sql);
        $stmt->execute([':nombre' => $nombre, ':id' => $id]);
        
        ErrorResponse::success('Rol actualizado exitosamente.');
    } catch (PDOException $e) {
        ErrorResponse::log('roles_api', 'Error updating role', $e);
        ErrorResponse::database('Error al actualizar rol.', $e->getMessage());
    } catch (Exception $e) {
        ErrorResponse::log('roles_api', 'Unexpected error updating role', $e);
        ErrorResponse::unknown('Error inesperado al actualizar rol.', $e->getMessage());
    }
}

// PATCH: toggle estado del rol
if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id']) || !isset($input['estado'])) {
        ErrorResponse::validation('ID y estado son obligatorios.');
    }
    
    $id = intval($input['id']);
    $estado = intval($input['estado']);
    
    // Validar que el ID sea válido
    if ($id <= 0) {
        ErrorResponse::validation('ID de rol inválido.');
    }
    
    // Prevent modifying the Administrator role status (ID=1)
    if ($id === 1) {
        ErrorResponse::forbidden('No se puede modificar el estado del rol de Administrador.');
    }
    
    // Validar que el estado sea válido (0 o 1)
    if ($estado !== 0 && $estado !== 1) {
        ErrorResponse::validation('Estado inválido. Debe ser 0 (activo) o 1 (inactivo).');
    }
    
    try {
        // Verificar si el rol existe
        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
        $stmt_exists = $pg->prepare($sql_exists);
        $stmt_exists->execute([':id' => $id]);
        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            ErrorResponse::notFound('rol');
        }
        
        $sql = "UPDATE adm_roles SET estado = :estado WHERE id = :id";
        $stmt = $pg->prepare($sql);
        $stmt->execute([':estado' => $estado, ':id' => $id]);
        
        ErrorResponse::success('Estado del rol actualizado exitosamente.');
    } catch (PDOException $e) {
        ErrorResponse::log('roles_api', 'Error updating role status', $e);
        ErrorResponse::database('Error al actualizar estado.', $e->getMessage());
    } catch (Exception $e) {
        ErrorResponse::log('roles_api', 'Unexpected error updating role status', $e);
        ErrorResponse::unknown('Error inesperado al actualizar estado.', $e->getMessage());
    }
}

// DELETE: eliminar rol
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        ErrorResponse::validation('ID del rol es obligatorio.');
    }
    
    $id = intval($input['id']);
    
    // Validar que el ID sea válido
    if ($id <= 0) {
        ErrorResponse::validation('ID de rol inválido.');
    }
    
    // Prevent deleting the Administrator role (ID=1)
    if ($id === 1) {
        ErrorResponse::forbidden('No se puede eliminar el rol de Administrador.');
    }
    
    try {
        // Verificar si el rol existe
        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
        $stmt_exists = $pg->prepare($sql_exists);
        $stmt_exists->execute([':id' => $id]);
        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            ErrorResponse::notFound('rol');
        }
        
        // Verificar si el rol está en uso (tiene usuarios asignados)
        $sql_check = "SELECT COUNT(*) as count FROM adm_usuario_roles WHERE rol_id = :id";
        $stmt_check = $pg->prepare($sql_check);
        $stmt_check->execute([':id' => $id]);
        $in_use = $stmt_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($in_use) {
            ErrorResponse::inUse('rol', 'usuarios');
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
        
        ErrorResponse::success('Rol eliminado exitosamente.');
    } catch (PDOException $e) {
        // Revertir transacción en caso de error
        if ($pg->inTransaction()) {
            $pg->rollBack();
        }
        ErrorResponse::log('roles_api', 'Error deleting role', $e);
        ErrorResponse::database('Error al eliminar rol.', $e->getMessage());
    } catch (Exception $e) {
        // Revertir transacción en caso de error
        if ($pg->inTransaction()) {
            $pg->rollBack();
        }
        ErrorResponse::log('roles_api', 'Unexpected error deleting role', $e);
        ErrorResponse::unknown('Error inesperado al eliminar rol.', $e->getMessage());
    }
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
