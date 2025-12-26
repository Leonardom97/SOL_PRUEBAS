<?php

/**
 * require_admin.php
 *
 * Provee funciones para la validación de roles de usuario en el contexto de la API.
 * Gestiona la recolección de roles desde la sesión y encabezados HTTP, y
 * ofrece funciones para restringir el acceso a usuarios con privilegios elevados.
 */

/**
 * Recolecta los roles del usuario desde la sesión activa y los encabezados HTTP.
 * 
 * Busca roles en $_SESSION y en los encabezados X-USER-ROLES / X-USER-ROLE.
 * Normaliza los roles a minúsculas y devuelve un array de strings únicos.
 * 
 * @return array Lista de roles detectados.
 */
function collect_roles(): array
{
  if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
  }
  $raw = [];
  $push = function ($v) use (&$raw) {
    if (is_array($v)) {
      foreach ($v as $x) $raw[] = $x;
    } elseif ($v !== null) {
      $raw[] = $v;
    }
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

/**
 * Restringe el acceso a Administradores o Auxiliares.
 * 
 * Permite el acceso si el usuario tiene rol de 'administrador', 'admin', 
 * 'supervisor_agronomico' o cualquier rol que contenga la subcadena 'aux'.
 * Si no cumple, envía respuesta 403 y termina la ejecución.
 * 
 * @return void
 */
function require_admin(): void
{
  $roles = collect_roles();
  $isAdmin = in_array('administrador', $roles, true) ||
    in_array('admin', $roles, true) ||
    in_array('administrator', $roles, true) ||
    in_array('supervisor_agronomico', $roles, true);
  $isAux = false;
  foreach ($roles as $r) {
    if (strpos($r, 'aux') !== false) {
      $isAux = true;
      break;
    }
  }
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

/**
 * Restringe el acceso estrictamente a Administradores (o Supervisores).
 * 
 * Permite el acceso SOLO si el usuario tiene rol de 'administrador', 'admin',
 * 'administrator' o 'supervisor_agronomico'. NO permite auxiliares.
 * Si no cumple, envía respuesta 403 y termina la ejecución.
 * 
 * @return void
 */
function require_admin_only(): void
{
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
