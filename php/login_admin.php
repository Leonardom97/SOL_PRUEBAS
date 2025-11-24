<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/session_manager.php';

$cedula = trim($_POST['Ingreso_user'] ?? '');
$password = trim($_POST['password'] ?? '');
$force_login = isset($_POST['force_login']) && $_POST['force_login'] === 'true';

if (empty($cedula) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'La cédula y la contraseña son obligatorias']);
    exit;
}

// Inicializar gestor de sesiones
$sessionManager = new SessionManager($pg);

// Obtener información del cliente para registro
$ip_address = $_SERVER['REMOTE_ADDR'] ?? 'Desconocida';
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Desconocido';
$host_name = gethostbyaddr($ip_address);

try {
    // Buscar el usuario por cédula
    $stmt = $pg->prepare("
        SELECT u.id, u.id_usuario, u.cedula, u.contraseña, u.nombre1, u.apellido1, u.estado_us
        FROM adm_usuarios u
        WHERE u.id_usuario = :cedula
        LIMIT 1
    ");
    $stmt->execute([':cedula' => $cedula]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        // Registrar intento fallido
        $stmt = $pg->prepare("
            INSERT INTO adm_intentos_login 
            (usuario_identificador, tipo_usuario, exitoso, ip_address, user_agent, host_name, mensaje_error)
            VALUES (:cedula, 'admin', FALSE, :ip, :agent, :host, 'Usuario no encontrado')
        ");
        $stmt->execute([
            ':cedula' => $cedula,
            ':ip' => $ip_address,
            ':agent' => $user_agent,
            ':host' => $host_name
        ]);
        
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }

    if (!$usuario['estado_us']) {
        // Registrar intento fallido
        $stmt = $pg->prepare("
            INSERT INTO adm_intentos_login 
            (usuario_identificador, tipo_usuario, exitoso, ip_address, user_agent, host_name, mensaje_error)
            VALUES (:cedula, 'admin', FALSE, :ip, :agent, :host, 'Usuario desactivado')
        ");
        $stmt->execute([
            ':cedula' => $cedula,
            ':ip' => $ip_address,
            ':agent' => $user_agent,
            ':host' => $host_name
        ]);
        
        echo json_encode(['success' => false, 'message' => 'Usuario desactivado']);
        exit;
    }

    if (!password_verify($password, $usuario['contraseña'])) {
        // Registrar intento fallido
        $stmt = $pg->prepare("
            INSERT INTO adm_intentos_login 
            (usuario_identificador, tipo_usuario, exitoso, ip_address, user_agent, host_name, mensaje_error)
            VALUES (:cedula, 'admin', FALSE, :ip, :agent, :host, 'Contraseña incorrecta')
        ");
        $stmt->execute([
            ':cedula' => $cedula,
            ':ip' => $ip_address,
            ':agent' => $user_agent,
            ':host' => $host_name
        ]);
        
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
        // Registrar intento fallido
        $stmt = $pg->prepare("
            INSERT INTO adm_intentos_login 
            (usuario_identificador, tipo_usuario, exitoso, ip_address, user_agent, host_name, mensaje_error)
            VALUES (:cedula, 'admin', FALSE, :ip, :agent, :host, 'No se encontraron roles asignados')
        ");
        $stmt->execute([
            ':cedula' => $cedula,
            ':ip' => $ip_address,
            ':agent' => $user_agent,
            ':host' => $host_name
        ]);
        
        echo json_encode(['success' => false, 'message' => 'No se encontraron roles asignados']);
        exit;
    }

    // Verificar sesiones activas existentes
    if ($force_login) {
        // Forzar inicio de sesión cerrando sesiones existentes
        $sessionResult = $sessionManager->forceLogin($usuario['id'], 'admin', $cedula);
    } else {
        // Intentar registrar inicio de sesión normalmente
        $sessionResult = $sessionManager->registerLogin($usuario['id'], 'admin', $cedula);
    }
    
    if (!$sessionResult['success']) {
        // Sesión existente encontrada
        $existingSession = $sessionResult['existing_session'] ?? null;
        echo json_encode([
            'success' => false,
            'message' => $sessionResult['message'],
            'concurrent_session' => true,
            'existing_session' => [
                'ip' => $existingSession['ip_address'] ?? 'Desconocida',
                'host' => $existingSession['host_name'] ?? 'Desconocido',
                'fecha_inicio' => $existingSession['fecha_inicio'] ?? null
            ]
        ]);
        exit;
    }

    // Elegir un rol principal
    $rolPrincipal = $roles[0]['nombre'];

    // 🔐 Asignar variables de sesión
    $_SESSION['usuario_id'] = $usuario['id'];
    $_SESSION['usuario'] = $usuario['id_usuario'];
    $_SESSION['cedula'] = $usuario['cedula'] ?? $usuario['id_usuario'];  // Almacenar cédula explícitamente
    $_SESSION['nombre'] = $usuario['nombre1'] . ' ' . $usuario['apellido1'];
    $_SESSION['roles'] = $roles;
    $_SESSION['rol'] = $rolPrincipal;
    $_SESSION['rol_nombre'] = $rolPrincipal; // Para compatibilidad con web_main_api.php
    $_SESSION['tipo_usuario'] = 'admin'; // ✅ IMPORTANTE para verificar_sesion.php

    echo json_encode(['success' => true, 'redirect' => '../panel.html']);
} catch (PDOException $e) {
    error_log("Login error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
    exit;
}
