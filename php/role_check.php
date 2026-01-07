<?php
/**
 * Role verification helper functions
 * Provides utilities to check if a user has specific roles
 */

/**
 * Check if the current user has a specific role
 * 
 * @param string $roleName The name of the role to check (e.g., 'administrador')
 * @param PDO $pg Database connection (optional, will query if roles not in session)
 * @return bool True if user has the role, false otherwise
 */
function hasRole($roleName, $pg = null) {
    // Check if session is started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Check if user is logged in
    if (!isset($_SESSION['usuario_id'])) {
        return false;
    }
    
    // Trim role name once for efficiency
    $trimmedRoleName = trim($roleName);
    
    // First check session for roles
    if (isset($_SESSION['roles']) && is_array($_SESSION['roles'])) {
        foreach ($_SESSION['roles'] as $role) {
            if (is_array($role) && isset($role['nombre'])) {
                if (strcasecmp(trim($role['nombre']), $trimmedRoleName) === 0) {
                    return true;
                }
            } elseif (is_string($role)) {
                if (strcasecmp(trim($role), $trimmedRoleName) === 0) {
                    return true;
                }
            }
        }
        // If roles exist in session but role not found, return false
        return false;
    }
    
    // If roles not in session and database connection provided, query database
    if ($pg !== null && $pg instanceof PDO) {
        try {
            $usuario_id = $_SESSION['usuario_id'];
            $stmt = $pg->prepare("
                SELECT r.nombre
                FROM adm_usuario_roles ur
                JOIN adm_roles r ON ur.rol_id = r.id
                WHERE ur.usuario_id = :usuario_id AND r.estado = 0
            ");
            $stmt->execute(['usuario_id' => $usuario_id]);
            $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // Save roles to session for future checks
            $_SESSION['roles'] = array_map(function($r) { return ['nombre' => $r]; }, $roles);
            
            foreach ($roles as $role) {
                if (strcasecmp(trim($role), $trimmedRoleName) === 0) {
                    return true;
                }
            }
        } catch (PDOException $e) {
            error_log("Error checking role: " . $e->getMessage());
            return false;
        }
    }
    
    return false;
}

/**
 * Check if the current user is an administrator
 * 
 * @param PDO $pg Database connection (optional)
 * @return bool True if user is administrator, false otherwise
 */
function isAdministrator($pg = null) {
    return hasRole('administrador', $pg);
}

/**
 * Require administrator role or return 403 error
 * 
 * @param PDO $pg Database connection (optional)
 * @return void Exits if user is not administrator
 */
function requireAdministrator($pg = null) {
    if (!isAdministrator($pg)) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Acceso denegado',
            'message' => 'Solo los administradores pueden realizar esta operación.'
        ]);
        exit;
    }
}
