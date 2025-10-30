<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db_postgres.php';

$cedula = trim($_POST['Ingreso_user'] ?? '');
$password = trim($_POST['password'] ?? '');

if (empty($cedula) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'La cédula y la contraseña son obligatorias']);
    exit;
}

try {
    // Buscar el usuario por cédula
    $stmt = $pg->prepare("
        SELECT u.id, u.id_usuario, u.contraseña, u.nombre1, u.apellido1, u.estado_us
        FROM adm_usuarios u
        WHERE u.id_usuario = :cedula
        LIMIT 1
    ");
    $stmt->execute([':cedula' => $cedula]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }

    if (!$usuario['estado_us']) {
        echo json_encode(['success' => false, 'message' => 'Usuario desactivado']);
        exit;
    }

    if (!password_verify($password, $usuario['contraseña'])) {
        echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
        exit;
    }

    // Obtener todos los roles del usuario desde la tabla intermedia
    $stmtRoles = $pg->prepare("
        SELECT r.id, r.nombre
        FROM adm_usuario_roles ur
        JOIN adm_roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = :id_usuario
    ");
    $stmtRoles->execute([':id_usuario' => $usuario['id']]);
    $roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

    if (!$roles) {
        echo json_encode(['success' => false, 'message' => 'No se encontraron roles asignados']);
        exit;
    }

    // Elegir un rol principal
    $rolPrincipal = $roles[0]['nombre'];

    // 🔐 Asignar variables de sesión
    $_SESSION['usuario_id'] = $usuario['id'];
    $_SESSION['usuario'] = $usuario['id_usuario'];
    $_SESSION['nombre'] = $usuario['nombre1'] . ' ' . $usuario['apellido1'];
    $_SESSION['roles'] = $roles;
    $_SESSION['rol'] = $rolPrincipal;
    $_SESSION['tipo_usuario'] = 'admin'; // ✅ IMPORTANTE para verificar_sesion.php

    echo json_encode(['success' => true, 'redirect' => '../panel.html']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
    exit;
}

