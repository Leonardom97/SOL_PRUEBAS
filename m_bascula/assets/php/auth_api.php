<?php
/**
 * API for authentication
 * Handles user login for weighing system
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/consultas_bascula.php';

session_start();

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'login':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                $data = $_POST;
            }
            
            $usuario = $data['usuario'] ?? '';
            $password = $data['password'] ?? '';
            
            if (empty($usuario) || empty($password)) {
                throw new Exception('Usuario y contraseña requeridos');
            }
            
            $consultas = new ConsultasBascula();
            $result = $consultas->login($usuario, $password);
            
            if (empty($result)) {
                throw new Exception('Usuario o contraseña incorrectos');
            }
            
            // Store user data in session
            $_SESSION['bascula_user'] = [
                'codigo' => $result[0]['codigo'],
                'nombres' => $result[0]['nombres'],
                'apellidos' => $result[0]['apellidos'],
                'rol' => $result[0]['Rol'],
                'logged_in' => true,
                'login_time' => date('Y-m-d H:i:s')
            ];
            
            echo json_encode([
                'success' => true,
                'message' => 'Inicio de sesión exitoso',
                'user' => $_SESSION['bascula_user']
            ]);
            break;
            
        case 'logout':
            // Clear session data
            unset($_SESSION['bascula_user']);
            
            echo json_encode([
                'success' => true,
                'message' => 'Sesión cerrada exitosamente'
            ]);
            break;
            
        case 'check_session':
            // Check if user is logged in
            if (isset($_SESSION['bascula_user']) && $_SESSION['bascula_user']['logged_in']) {
                echo json_encode([
                    'success' => true,
                    'logged_in' => true,
                    'user' => $_SESSION['bascula_user']
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'logged_in' => false
                ]);
            }
            break;
            
        default:
            throw new Exception('Acción no válida');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
