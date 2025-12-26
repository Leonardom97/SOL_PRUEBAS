<?php

/**
 * roles_auth.php
 *
 * Funciones auxiliares para manejo de roles y autorización.
 * Provee mecanismos para leer roles de la sesión y verificar permisos.
 * 
 * NOTA: Existe redundancia con `require_admin.php`. Se recomienda consolidar en el futuro.
 */

// Inicia sesión si no está activa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Recolecta roles disponibles en sesión y los devuelve como array en minúscula.
 * 
 * @return array Lista de roles del usuario.
 */
function get_user_roles(): array
{
    $roles = [];
    $add = function ($val) use (&$roles, &$add) {
        if ($val === null) return;
        if (is_array($val)) {
            foreach ($val as $v) $add($v);
            return;
        }
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
 * Verifica si el usuario tiene el rol exacto o uno auxiliar.
 * 
 * @param string $needle El rol a buscar.
 * @param array|null $userRoles (Opcional) Roles del usuario. Si es null, se obtienen automáticamente.
 * @return bool True si el usuario tiene el rol, False en caso contrario.
 */
function has_role(string $needle, ?array $userRoles = null): bool
{
    $needle = strtolower($needle);
    if ($userRoles === null) $userRoles = get_user_roles();
    foreach ($userRoles as $r) {
        if ($r === $needle) return true;
        // Si needle y el rol contienen 'aux', se consideran equivalentes
        if (strpos($needle, 'aux') !== false && strpos($r, 'aux') !== false) return true;
    }
    return false;
}

/**
 * Exige que el usuario tenga al menos uno de los roles indicados.
 * Si no cumple, responde 403 y termina la ejecución.
 * 
 * @param array $rolesNeeded Lista de roles permitidos.
 * @return void
 */
function require_any_role(array $rolesNeeded)
{
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
 * Regla de acceso para lectura: requiere rol administrador o auxiliar.
 * @return void
 */
function require_read_roles()
{
    require_any_role(['administrador', 'auxiliar']);
}

/**
 * Acciones con privilegio admin/auxiliar (aprobación/rechazo).
 * Para que sólo admin pueda aprobar/rechazar, cambia a ['administrador'].
 * @return void
 */
function require_admin_role()
{
    require_any_role(['administrador', 'auxiliar']);
}
