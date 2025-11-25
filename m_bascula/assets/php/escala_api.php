<?php
/**
 * API for scale hardware communication
 * Communicates with weighing scale at 192.168.0.35
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/escala_comunicacion.php';
require_once __DIR__ . '/consultas_bascula.php';

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // Get scale configuration from database or use default
    $consultas = new ConsultasBascula();
    $terminales = $consultas->terminal();
    
    // Use first active terminal or default to 192.168.0.35
    $scaleIP = '192.168.0.35';
    $scalePort = 4001;
    
    if (!empty($terminales) && isset($terminales[0])) {
        $terminal = $terminales[0];
        if (!empty($terminal['ip'])) {
            $scaleIP = $terminal['ip'];
        }
        if (!empty($terminal['puerto'])) {
            $scalePort = (int)$terminal['puerto'];
        }
    }
    
    switch ($action) {
        case 'leer_peso':
            // Read current weight from scale
            $scale = new EscalaComunicacion($scaleIP, $scalePort);
            $result = $scale->readWeight();
            $scale->disconnect();
            
            echo json_encode($result);
            break;
            
        case 'estado':
            // Get scale connection status
            $scale = new EscalaComunicacion($scaleIP, $scalePort);
            $result = $scale->getStatus();
            $scale->disconnect();
            
            echo json_encode($result);
            break;
            
        case 'tara':
            // Tare the scale
            $scale = new EscalaComunicacion($scaleIP, $scalePort);
            $result = $scale->tare();
            $scale->disconnect();
            
            echo json_encode([
                'success' => $result,
                'message' => $result ? 'Báscula tarada exitosamente' : 'Error al tarar la báscula'
            ]);
            break;
            
        case 'test':
            // Test scale connection
            $result = EscalaComunicacion::testConnection($scaleIP, $scalePort);
            echo json_encode($result);
            break;
            
        case 'leer_continuo':
            // Read weight continuously (for real-time display)
            // This endpoint can be polled periodically
            $scale = new EscalaComunicacion($scaleIP, $scalePort);
            $result = $scale->readWeight();
            $scale->disconnect();
            
            // Add timestamp for tracking
            $result['timestamp'] = date('Y-m-d H:i:s');
            $result['scale_ip'] = $scaleIP;
            
            echo json_encode($result);
            break;
            
        default:
            throw new Exception('Acción no válida. Acciones disponibles: leer_peso, estado, tara, test, leer_continuo');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
