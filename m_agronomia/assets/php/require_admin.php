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
  $isAdmin = in_array('administrador', $roles, true) ||
             in_array('admin', $roles, true) ||
             in_array('administrator', $roles, true) ||
             in_array('supervisor_agronomico', $roles, true);
  $isAux = false;
  foreach ($roles as $r) { if (strpos($r, 'aux') !== false) { $isAux = true; break; } }
  if (!($isAdmin || $isAux)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. Se requiere rol administrador, supervisor agronómico o auxiliar.',
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
        in_array('supervisor_agronomico', $roles, true);
  if (!$ok) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => false,
      'error'   => 'Acceso denegado. Sólo el rol administrador o supervisor agronómico puede realizar esta acción.',
      'roles_detectados' => $roles
    ]);
    exit;
  }
}