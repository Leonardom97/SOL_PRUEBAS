<?php
/**
 * roles_auth.php
 *
 * Funciones auxiliares para manejo de roles en módulo agronomía:
 *  - Obtener roles del usuario desde la sesión
 *  - Verificar si el usuario posee cierto rol (o algún rol auxiliar)
 *  - Exigir roles para endpoints protegidos
 *
 * ROLES Y PERMISOS PARA MÓDULO AGRONOMÍA:
 * 
 * 1. aux_agronomico: Puede ingresar, NO aprobar/rechazar, NO revertir, solo INACTIVAR error_registro
 * 2. agronomico: Acceso completo sin restricciones
 * 3. sup_logistica1: Puede ingresar, aprobar/rechazar, NO revertir, solo INACTIVAR error_registro
 * 4. sup_logistica2: Puede ingresar, aprobar/rechazar, NO revertir, solo INACTIVAR error_registro
 * 5. asist_agronomico: Puede ingresar, aprobar/rechazar, revertir, puede ACTIVAR error_registro
 *
 * ============================================================================
 * CONFIGURACIÓN DE ROLES EN BASE DE DATOS:
 * ============================================================================
 * 
 * Para agregar los roles necesarios en la base de datos, ejecute los siguientes
 * comandos SQL en su base de datos PostgreSQL:
 * 
 * -- 1. Crear roles si no existen (tabla adm_roles)
 * INSERT INTO adm_roles (nombre, estado) VALUES ('agronomico', 0) 
 * ON CONFLICT DO NOTHING;
 * 
 * INSERT INTO adm_roles (nombre, estado) VALUES ('aux_agronomico', 0) 
 * ON CONFLICT DO NOTHING;
 * 
 * INSERT INTO adm_roles (nombre, estado) VALUES ('sup_logistica1', 0) 
 * ON CONFLICT DO NOTHING;
 * 
 * INSERT INTO adm_roles (nombre, estado) VALUES ('sup_logistica2', 0) 
 * ON CONFLICT DO NOTHING;
 * 
 * INSERT INTO adm_roles (nombre, estado) VALUES ('asist_agronomico', 0) 
 * ON CONFLICT DO NOTHING;
 * 
 * -- 2. Asignar rol a un usuario (reemplace USER_ID y ROLE_ID según corresponda)
 * -- Primero obtenga el ID del rol:
 * -- SELECT id FROM adm_roles WHERE nombre = 'agronomico';
 * 
 * -- Luego asigne el rol al usuario:
 * -- INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (USER_ID, ROLE_ID);
 * 
 * -- O actualice el campo rol en la tabla de usuarios:
 * -- UPDATE usuarios SET rol = 'agronomico' WHERE id = USER_ID;
 * 
 * NOTA: El campo 'estado' en adm_roles usa 0 para activo y 1 para inactivo.
 * ============================================================================
 */

// Inicia sesión si no está activa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Recolecta roles disponibles en sesión y los devuelve como array en minúscula.
 */
function get_user_roles(): array {
    $roles = [];
    $add = function($val) use (&$roles, &$add) {
        if ($val === null) return;
        if (is_array($val)) { foreach ($val as $v) $add($v); return; }
        $parts = preg_split('/[,;]+/', (string)$val);
        foreach ($parts as $p) {
            $p = strtolower(trim($p));
            if ($p !== '') $roles[] = $p;
        }
    };
    if (isset($_SESSION['rol']))    $add($_SESSION['rol']);
    if (isset($_SESSION['roles']))  $add($_SESSION['roles']);
    if (isset($_SESSION['user']['roles'])) $add($_SESSION['user']['roles']);
    $roles = array_values(array_unique($roles));
    return $roles;
}

/**
 * Verifica si el usuario tiene el rol exacto o uno auxiliar (contiene 'aux').
 */
function has_role(string $needle, array $userRoles = null): bool {
    $needle = strtolower($needle);
    if ($userRoles === null) $userRoles = get_user_roles();
    foreach ($userRoles as $r) {
        if ($r === $needle) return true;
        // Si needle y el rol contienen 'aux', se consideran equivalentes
        if (strpos($needle,'aux') !== false && strpos($r,'aux') !== false) return true;
    }
    return false;
}

/**
 * Exige que el usuario tenga al menos uno de los roles indicados. Si no, responde 403 y termina.
 */
function require_any_role(array $rolesNeeded) {
    $userRoles = get_user_roles();
    foreach ($rolesNeeded as $rn) {
        if (has_role($rn, $userRoles)) return;
    }
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error'   => 'forbidden',
        'message' => 'No autorizado'
    ]);
    exit;
}

/**
 * Verifica si el usuario puede INGRESAR/EDITAR datos (todos los roles de agronomía pueden)
 */
function can_enter_data(): bool {
    return has_role('administrador') || has_role('agronomico') || 
           has_role('aux_agronomico') || has_role('sup_logistica1') || 
           has_role('sup_logistica2') || has_role('asist_agronomico');
}

/**
 * Verifica si el usuario puede APROBAR/RECHAZAR
 * aux_agronomico NO puede aprobar/rechazar
 */
function can_approve_reject(): bool {
    $userRoles = get_user_roles();
    // aux_agronomico NO puede
    if (has_role('aux_agronomico', $userRoles)) return false;
    // Los demás sí pueden
    return has_role('administrador', $userRoles) || has_role('agronomico', $userRoles) || 
           has_role('sup_logistica1', $userRoles) || has_role('sup_logistica2', $userRoles) || 
           has_role('asist_agronomico', $userRoles);
}

/**
 * Verifica si el usuario puede REVERTIR aprobaciones
 * Solo agronomico y asist_agronomico pueden revertir
 */
function can_revert_approved(): bool {
    return has_role('administrador') || has_role('agronomico') || has_role('asist_agronomico');
}

/**
 * Verifica si el usuario puede ACTIVAR error_registro
 * Solo agronomico y asist_agronomico pueden activar
 */
function can_activate_error_registro(): bool {
    return has_role('administrador') || has_role('agronomico') || has_role('asist_agronomico');
}

/**
 * Verifica si el usuario puede INACTIVAR error_registro
 * Todos los roles de agronomía pueden inactivar
 */
function can_inactivate_error_registro(): bool {
    return can_enter_data(); // Mismo criterio
}

/**
 * Requiere permiso para ingresar/editar datos
 */
function require_enter_data_permission(): void {
    if (!can_enter_data()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para ingresar o editar datos.'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para aprobar/rechazar
 */
function require_approve_reject_permission(): void {
    if (!can_approve_reject()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para aprobar o rechazar registros.'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para revertir aprobaciones
 */
function require_revert_permission(): void {
    if (!can_revert_approved()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para revertir registros aprobados.'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para activar error_registro
 */
function require_activate_error_registro_permission(): void {
    if (!can_activate_error_registro()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para activar registros. Solo puede inactivar.'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para inactivar error_registro
 */
function require_inactivate_error_registro_permission(): void {
    if (!can_inactivate_error_registro()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para inactivar registros.'
        ]);
        exit;
    }
}

/**
 * Reglas de lectura: requiere admin o auxiliar.
 */
function require_read_roles() {
    require_any_role(['administrador','auxiliar']);
}

/**
 * Acciones con privilegio admin/auxiliar (aprobación/rechazo).
 * Para que sólo admin pueda aprobar/rechazar, cambia a ['administrador'].
 */
function require_admin_role() {
    require_any_role(['administrador','auxiliar']);
}