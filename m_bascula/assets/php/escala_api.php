<?php
/**
 * API for scale hardware communication
 * Communicates with weighing scale at IP configured in admin_terminales
 * 
 * Based on C# VscaleX implementation that reads scale config from database.
 * Default configuration:
 * - IP: 192.168.0.35
 * - Ports to try: 1701, 1409, 4001 (as mentioned by user)
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
    
    // Get scale configuration from database (like C# does)
    $consultas = new ConsultasBascula();
    $terminales = $consultas->terminal();
    
    // Default scale configuration
    $scaleIP = '192.168.0.35';
    $scalePort = 1701; // Changed default from 4001 to 1701 as mentioned by user
    $connectionType = 'ethernet';
    
    // Read from database if available
    if (!empty($terminales) && isset($terminales[0])) {
        $terminal = $terminales[0];
        if (!empty($terminal['ip'])) {
            $scaleIP = trim($terminal['ip']);
        }
        if (!empty($terminal['puerto'])) {
            $scalePort = (int)$terminal['puerto'];
        }
        if (!empty($terminal['conx_predeterminada'])) {
            $connectionType = trim($terminal['conx_predeterminada']);
        }
    }
    
    switch ($action) {
        case 'leer_peso':
            // Read current weight from scale
            $scale = new EscalaComunicacion($scaleIP, $scalePort);
            $result = $scale->readWeight();
            $scale->disconnect();
            
            // Add configuration info to response
            $result['scale_ip'] = $scaleIP;
            $result['scale_port'] = $scalePort;
            
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
                'message' => $result ? 'Báscula tarada exitosamente' : 'Error al tarar la báscula',
                'scale_ip' => $scaleIP,
                'scale_port' => $scalePort
            ]);
            break;
            
        case 'test':
            // Test scale connection
            $result = EscalaComunicacion::testConnection($scaleIP, $scalePort);
            echo json_encode($result);
            break;
            
        case 'test_ports':
            // Test multiple ports to find working configuration
            // User mentioned ports 1701 and 1409
            $portsToTest = [1701, 1409, 4001, 9100];
            
            // Add configured port if different
            if (!in_array($scalePort, $portsToTest)) {
                array_unshift($portsToTest, $scalePort);
            }
            
            $results = EscalaComunicacion::testMultiplePorts($scaleIP, $portsToTest);
            
            // Find first working port
            $workingPort = null;
            foreach ($results as $port => $testResult) {
                if ($testResult['success']) {
                    $workingPort = $port;
                    break;
                }
            }
            
            echo json_encode([
                'success' => $workingPort !== null,
                'ip' => $scaleIP,
                'working_port' => $workingPort,
                'configured_port' => $scalePort,
                'connection_type' => $connectionType,
                'port_results' => $results,
                'recommendation' => $workingPort !== null 
                    ? "Puerto $workingPort funciona correctamente" 
                    : "Ningún puerto responde. Verificar conexión física de la báscula."
            ]);
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
            $result['scale_port'] = $scalePort;
            
            echo json_encode($result);
            break;
            
        case 'config':
            // Get current scale configuration from database
            echo json_encode([
                'success' => true,
                'ip' => $scaleIP,
                'port' => $scalePort,
                'connection_type' => $connectionType,
                'terminal_data' => $terminales[0] ?? null,
                'message' => 'Configuración leída de admin_terminales'
            ]);
            break;
            
        case 'diagnostico':
            // Full diagnostic test
            $diagnostic = [
                'timestamp' => date('Y-m-d H:i:s'),
                'config' => [
                    'ip' => $scaleIP,
                    'port' => $scalePort,
                    'connection_type' => $connectionType
                ],
                'network' => [],
                'connection' => [],
                'ports_test' => []
            ];
            
            // Test network connectivity
            $fp = @fsockopen($scaleIP, $scalePort, $errno, $errstr, 5);
            $diagnostic['network'] = [
                'reachable' => $fp !== false,
                'error_code' => $errno,
                'error_message' => $errstr
            ];
            if ($fp) {
                fclose($fp);
            }
            
            // Test scale connection
            $diagnostic['connection'] = EscalaComunicacion::testConnection($scaleIP, $scalePort);
            
            // Test alternative ports
            $diagnostic['ports_test'] = EscalaComunicacion::testMultiplePorts($scaleIP, [1701, 1409, 4001]);
            
            echo json_encode([
                'success' => true,
                'diagnostic' => $diagnostic
            ]);
            break;
            
        default:
            throw new Exception('Acción no válida. Acciones disponibles: leer_peso, estado, tara, test, test_ports, leer_continuo, config, diagnostico');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
