<?php
/**
 * require_admin.php
 *
 * Este archivo provee funciones para validación de roles de usuario:
 *  - require_admin(): permite administrador, supervisor agronómico o roles que contengan 'aux'
 *  - require_admin_only(): SOLO administrador o supervisor agronómico
 *  - collect_roles(): obtiene roles desde sesión y header X-USER-ROLES / X-USER-ROLE
 */

function collect_roles(): array {
  if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
  }
  $raw = [];
  $push = function($v) use (&$raw) {
    if (is_array($v)) { foreach ($v as $x) $raw[] = $x; }
    elseif ($v !== null) { $raw[] = $v; }
  };

  // Sesión
  if (isset($_SESSION['roles']))              $push($_SESSION['roles']);
  if (isset($_SESSION['role']))               $push($_SESSION['role']);
  if (isset($_SESSION['rol']))                $push($_SESSION['rol']);
  if (isset($_SESSION['usuario']['roles']))   $push($_SESSION['usuario']['roles']);

  // Encabezados HTTP (plural y singular)
  if (!empty($_SERVER['HTTP_X_USER_ROLES']))  $push($_SERVER['HTTP_X_USER_ROLES']);
  if (!empty($_SERVER['HTTP_X_USER_ROLE']))   $push($_SERVER['HTTP_X_USER_ROLE']);

  $out = [];
  foreach ($raw as $item) {
    if (is_string($item)) {
      foreach (preg_split('/[,;]+/', $item) as $p) {
        $p = strtolower(trim($p));
        if ($p !== '') $out[] = $p;
      }
    } elseif (is_scalar($item)) {
      $p = strtolower(trim((string)$item));
      if ($p !== '') $out[] = $p;
    } elseif (is_array($item)) {
      foreach ($item as $x) {
        if (is_scalar($x) || is_string($x)) {
          $p = strtolower(trim((string)$x));
          if ($p !== '') $out[] = $p;
        }
      }
    }
  }
  return array_values(array_unique($out));
}

function require_admin(): void {
  $roles = collect_roles();
  $validRoles = ['administrador', 'admin', 'administrator', 'agronomico', 
                 'sup_logistica1', 'sup_logistica2', 'asist_agronomico', 'aux_agronomico'];
  $hasValidRole = false;
  foreach ($validRoles as $validRole) {
    if (in_array($validRole, $roles, true)) {
      $hasValidRole = true;
      break;
    }
  }
  // Also check for roles containing 'aux'
  if (!$hasValidRole) {
    foreach ($roles as $r) { 
      if (strpos($r, 'aux') !== false) { 
        $hasValidRole = true; 
        break; 
      } 
    }
  }
  if (!$hasValidRole) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. Se requiere rol de agronomía válido.',
      'roles_detectados' => $roles
    ]);
    exit;
  }
}

function require_admin_only(): void {
  $roles = collect_roles();
  $ok = in_array('administrador', $roles, true) ||
        in_array('admin', $roles, true) ||
        in_array('administrator', $roles, true) ||
        in_array('agronomico', $roles, true) ||
        in_array('asist_agronomico', $roles, true);
  if (!$ok) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. Sólo roles con permisos completos pueden realizar esta acción.',
      'roles_detectados' => $roles
    ]);
    exit;
  }
}

/**
 * Verifica si el usuario puede aprobar registros
 */
function can_approve(): bool {
  $roles = collect_roles();
  $allowedRoles = ['administrador', 'admin', 'administrator', 'agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico'];
  foreach ($allowedRoles as $role) {
    if (in_array($role, $roles, true)) return true;
  }
  return false;
}

/**
 * Verifica si el usuario puede rechazar registros
 */
function can_reject(): bool {
  $roles = collect_roles();
  $allowedRoles = ['administrador', 'admin', 'administrator', 'agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico'];
  foreach ($allowedRoles as $role) {
    if (in_array($role, $roles, true)) return true;
  }
  return false;
}

/**
 * Verifica si el usuario puede revertir registros aprobados
 */
function can_revert(): bool {
  $roles = collect_roles();
  $allowedRoles = ['administrador', 'admin', 'administrator', 'agronomico', 'asist_agronomico'];
  foreach ($allowedRoles as $role) {
    if (in_array($role, $roles, true)) return true;
  }
  return false;
}

/**
 * Verifica si el usuario puede activar error_registro
 */
function can_activate(): bool {
  $roles = collect_roles();
  $allowedRoles = ['administrador', 'admin', 'administrator', 'agronomico', 'asist_agronomico'];
  foreach ($allowedRoles as $role) {
    if (in_array($role, $roles, true)) return true;
  }
  return false;
}

/**
 * Verifica si el usuario puede inactivar error_registro
 */
function can_inactivate(): bool {
  $roles = collect_roles();
  // Todos los roles del módulo pueden inactivar
  $allowedRoles = ['administrador', 'admin', 'administrator', 'agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico'];
  foreach ($allowedRoles as $role) {
    if (in_array($role, $roles, true)) return true;
  }
  // También permitir roles que contengan 'aux'
  foreach ($roles as $r) {
    if (strpos($r, 'aux') !== false) return true;
  }
  return false;
}

/**
 * Requiere permiso para aprobar. Si no tiene permiso, responde 403 y termina.
 */
function require_approve_permission(): void {
  if (!can_approve()) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. No tiene permisos para aprobar registros.',
      'roles_detectados' => collect_roles()
    ]);
    exit;
  }
}

/**
 * Requiere permiso para rechazar. Si no tiene permiso, responde 403 y termina.
 */
function require_reject_permission(): void {
  if (!can_reject()) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. No tiene permisos para rechazar registros.',
      'roles_detectados' => collect_roles()
    ]);
    exit;
  }
}

/**
 * Requiere permiso para revertir. Si no tiene permiso, responde 403 y termina.
 */
function require_revert_permission(): void {
  if (!can_revert()) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. No tiene permisos para revertir registros aprobados.',
      'roles_detectados' => collect_roles()
    ]);
    exit;
  }
}

/**
 * Requiere permiso para activar. Si no tiene permiso, responde 403 y termina.
 */
function require_activate_permission(): void {
  if (!can_activate()) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. No tiene permisos para activar registros.',
      'roles_detectados' => collect_roles()
    ]);
    exit;
  }
}

/**
 * Requiere permiso para inactivar. Si no tiene permiso, responde 403 y termina.
 */
function require_inactivate_permission(): void {
  if (!can_inactivate()) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. No tiene permisos para inactivar registros.',
      'roles_detectados' => collect_roles()
    ]);
    exit;
  }
}