<?php
/**
 * roles_auth.php
 *
 * Funciones auxiliares para manejo de roles:
 *  - Obtener roles del usuario desde la sesión
 *  - Verificar si el usuario posee cierto rol (o algún rol auxiliar)
 *  - Exigir roles para endpoints protegidos
 *
 * Nota: Puede unificarse con require_admin.php para evitar duplicidad.
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

/**
 * Verifica si el usuario puede aprobar registros.
 * Roles permitidos: administrador, agronomico, sup_logistica1, sup_logistica2, asist_agronomico
 */
function can_approve(): bool {
    $userRoles = get_user_roles();
    $allowedRoles = ['administrador', 'agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico'];
    foreach ($allowedRoles as $role) {
        if (has_role($role, $userRoles)) return true;
    }
    return false;
}

/**
 * Verifica si el usuario puede rechazar registros.
 * Roles permitidos: administrador, agronomico, sup_logistica1, sup_logistica2, asist_agronomico
 */
function can_reject(): bool {
    $userRoles = get_user_roles();
    $allowedRoles = ['administrador', 'agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico'];
    foreach ($allowedRoles as $role) {
        if (has_role($role, $userRoles)) return true;
    }
    return false;
}

/**
 * Verifica si el usuario puede revertir registros aprobados.
 * Roles permitidos: administrador, agronomico, asist_agronomico
 */
function can_revert(): bool {
    $userRoles = get_user_roles();
    $allowedRoles = ['administrador', 'agronomico', 'asist_agronomico'];
    foreach ($allowedRoles as $role) {
        if (has_role($role, $userRoles)) return true;
    }
    return false;
}

/**
 * Verifica si el usuario puede activar error_registro.
 * Roles permitidos: administrador, agronomico, asist_agronomico
 */
function can_activate(): bool {
    $userRoles = get_user_roles();
    $allowedRoles = ['administrador', 'agronomico', 'asist_agronomico'];
    foreach ($allowedRoles as $role) {
        if (has_role($role, $userRoles)) return true;
    }
    return false;
}

/**
 * Verifica si el usuario puede inactivar error_registro.
 * Roles permitidos: Todos los roles del módulo de agronomía
 */
function can_inactivate(): bool {
    $userRoles = get_user_roles();
    $allowedRoles = ['administrador', 'agronomico', 'aux_agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico'];
    foreach ($allowedRoles as $role) {
        if (has_role($role, $userRoles)) return true;
    }
    return false;
}

/**
 * Requiere permiso para aprobar. Si no tiene permiso, responde 403 y termina.
 */
function require_approve_permission() {
    if (!can_approve()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para aprobar registros'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para rechazar. Si no tiene permiso, responde 403 y termina.
 */
function require_reject_permission() {
    if (!can_reject()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para rechazar registros'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para revertir. Si no tiene permiso, responde 403 y termina.
 */
function require_revert_permission() {
    if (!can_revert()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para revertir registros aprobados'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para activar. Si no tiene permiso, responde 403 y termina.
 */
function require_activate_permission() {
    if (!can_activate()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para activar registros'
        ]);
        exit;
    }
}

/**
 * Requiere permiso para inactivar. Si no tiene permiso, responde 403 y termina.
 */
function require_inactivate_permission() {
    if (!can_inactivate()) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error'   => 'forbidden',
            'message' => 'No tiene permisos para inactivar registros'
        ]);
        exit;
    }
}