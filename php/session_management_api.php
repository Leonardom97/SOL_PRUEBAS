<?php

/**
 * API de Gestión de Sesiones
 * Proporciona endpoints para ver y gestionar sesiones de usuario
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/session_manager.php';

// Verificar si el usuario está autenticado
if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

// Inicializar gestor de sesiones
$sessionManager = new SessionManager($pg);

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'get_active_sessions':
            // Solo administradores pueden ver todas las sesiones activas
            if (($_SESSION['tipo_usuario'] ?? '') !== 'admin') {
                echo json_encode(['success' => false, 'message' => 'No autorizado']);
                exit;
            }

            $sessions = $sessionManager->getActiveSessions();
            echo json_encode(['success' => true, 'sessions' => $sessions]);
            break;

        case 'get_my_sessions':
            // Obtener historial de sesiones del usuario actual
            $tipo_usuario = $_SESSION['tipo_usuario'] ?? 'admin';
            // Validate and constrain limit parameter (min: 1, max: 1000)
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $limit = max(1, min($limit, 1000));
            $sessions = $sessionManager->getUserSessionHistory(
                $_SESSION['usuario_id'],
                $tipo_usuario,
                $limit
            );
            echo json_encode(['success' => true, 'sessions' => $sessions]);
            break;

        case 'get_user_sessions':
            // Obtener historial de un usuario específico (solo admin)
            if (($_SESSION['tipo_usuario'] ?? '') !== 'admin') {
                echo json_encode(['success' => false, 'message' => 'No autorizado']);
                exit;
            }

            $cedula = $_GET['cedula'] ?? '';
            if (!$cedula) {
                echo json_encode(['success' => false, 'message' => 'Cédula requerida']);
                exit;
            }

            // Find user by cedula
            $stmt = $pg->prepare("
                SELECT id, 'admin' AS tipo FROM adm_usuarios WHERE cedula = ?
                UNION
                SELECT ac_id AS id, 'colaborador' AS tipo FROM adm_colaboradores WHERE ac_cedula = ?
                LIMIT 1
            ");
            $stmt->execute([$cedula, $cedula]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
                exit;
            }

            $sessions = $sessionManager->getUserSessionHistory(
                $user['id'],
                $user['tipo'],
                50
            );
            echo json_encode(['success' => true, 'sessions' => $sessions]);
            break;

        case 'disconnect_session':
            // Solo administradores pueden desconectar a otros usuarios
            if (($_SESSION['tipo_usuario'] ?? '') !== 'admin') {
                echo json_encode(['success' => false, 'message' => 'No autorizado']);
                exit;
            }

            $session_id = $_POST['session_id'] ?? 0;
            if (!$session_id) {
                echo json_encode(['success' => false, 'message' => 'ID de sesión requerido']);
                exit;
            }

            $success = $sessionManager->closeSession(
                $session_id,
                'admin_disconnect',
                $_SESSION['usuario_id']
            );

            if ($success) {
                echo json_encode(['success' => true, 'message' => 'Sesión desconectada exitosamente']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Error al desconectar sesión']);
            }
            break;

        case 'get_login_attempts':
            // Only admins can view login attempts
            if (($_SESSION['tipo_usuario'] ?? '') !== 'admin') {
                echo json_encode(['success' => false, 'message' => 'No autorizado']);
                exit;
            }

            $limit = (int)($_GET['limit'] ?? 50);
            $exitoso = $_GET['exitoso'] ?? null;
            if ($exitoso !== null) {
                $exitoso = $exitoso === 'true';
            }

            $attempts = $sessionManager->getLoginAttempts($limit, $exitoso);
            echo json_encode(['success' => true, 'attempts' => $attempts]);
            break;

        case 'cleanup_inactive':
            // Only admins can cleanup inactive sessions
            if (($_SESSION['tipo_usuario'] ?? '') !== 'admin') {
                echo json_encode(['success' => false, 'message' => 'No autorizado']);
                exit;
            }

            $timeout = (int)($_POST['timeout'] ?? 120);
            $count = $sessionManager->closeInactiveSessions($timeout);
            echo json_encode([
                'success' => true,
                'message' => "Se cerraron $count sesiones inactivas"
            ]);
            break;

        case 'check_session_status':
            // Verificar si hay alerta de nuevo intento de login
            $tipo_usuario = $_SESSION['tipo_usuario'] ?? 'admin';
            $session_db_id = $_SESSION['sesion_db_id'] ?? null;

            if (!$session_db_id) {
                echo json_encode(['success' => true, 'has_notification' => false]);
                exit;
            }

            // Check if session is still valid
            $isValid = $sessionManager->isSessionValid($session_db_id);

            if (!$isValid) {
                // Session was closed by admin
                echo json_encode([
                    'success' => true,
                    'has_notification' => true,
                    'notification_type' => 'session_closed',
                    'message' => 'Tu sesión ha sido cerrada por un administrador'
                ]);
                exit;
            }

            // Verificar nuevos intentos de login en esta cuenta
            $stmt = $pg->prepare("
                SELECT COUNT(*) as count
                FROM adm_intentos_login
                WHERE usuario_identificador = :identificador
                AND fecha > (SELECT fecha_inicio FROM adm_sesiones WHERE id = :session_id)
                AND exitoso = FALSE
            ");
            $stmt->execute([
                ':identificador' => $_SESSION['usuario'],
                ':session_id' => $session_db_id
            ]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result['count'] > 0) {
                // Get the latest failed attempt
                $stmt = $pg->prepare("
                    SELECT ip_address, host_name, fecha
                    FROM adm_intentos_login
                    WHERE usuario_identificador = :identificador
                    AND fecha > (SELECT fecha_inicio FROM adm_sesiones WHERE id = :session_id)
                    AND exitoso = FALSE
                    ORDER BY fecha DESC
                    LIMIT 1
                ");
                $stmt->execute([
                    ':identificador' => $_SESSION['usuario'],
                    ':session_id' => $session_db_id
                ]);
                $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'has_notification' => true,
                    'notification_type' => 'failed_attempt',
                    'message' => 'Alguien intentó acceder a tu cuenta',
                    'attempt' => $attempt
                ]);
                exit;
            }

            echo json_encode(['success' => true, 'has_notification' => false]);
            break;

        case 'get_logs':
            require_once __DIR__ . '/audit_logger.php';
            $logger = new AuditLogger();

            // 1% chance to run cleanup
            if (rand(1, 100) === 1) {
                $logger->cleanup();
            }

            $currentUserId = $_SESSION['usuario_id'];
            $isAdmin = ($_SESSION['tipo_usuario'] ?? '') === 'admin';

            // Allow admin or users with specific roles (if applicable)
            // For now, mirroring previous logic: Admins see all, others see own.
            // Simplified logic: Admin = see all (null), Others = see own ($currentUserId)

            $targetUserId = $currentUserId;
            $targetUserType = $_SESSION['tipo_usuario'] ?? 'colaborador';

            if ($isAdmin) {
                $targetUserId = null; // View all
                $targetUserType = null;
            }

            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
            if ($limit > 500) $limit = 500;

            $logs = $logger->getLogs($targetUserId, $targetUserType, $limit);

            echo json_encode([
                'success' => true,
                'logs' => $logs,
                'is_admin_view' => $isAdmin,
                'current_user_type' => $targetUserType
            ]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
            break;
    }
} catch (PDOException $e) {
    error_log("Session management API error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}
