<?php
/**
 * API for vehicle management
 * Handles vehicle data from SAP_OLEAGINOSAS database
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/consultas_bascula.php';

try {
    $consultas = new ConsultasBascula();
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'placas':
            // Get vehicle plates by location
            $condicion = $_GET['condicion'] ?? '';
            
            if (empty($condicion)) {
                throw new Exception('Condición requerida (1=SEMAG, 2=SAN MARCOS)');
            }
            
            $result = $consultas->placasVehiculos($condicion);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'tara':
            // Get vehicle tare weight
            $placa = $_GET['placa'] ?? '';
            
            if (empty($placa)) {
                throw new Exception('Placa requerida');
            }
            
            $result = $consultas->taraVehiculos($placa);
            echo json_encode(['success' => true, 'tara' => $result]);
            break;
            
        case 'conductor':
            // Get vehicle driver
            $placa = $_GET['placa'] ?? '';
            
            if (empty($placa)) {
                throw new Exception('Placa requerida');
            }
            
            $result = $consultas->conductorVehiculos($placa);
            echo json_encode(['success' => true, 'conductor' => $result]);
            break;
            
        case 'info_completa':
            // Get complete vehicle information
            $placa = $_GET['placa'] ?? '';
            
            if (empty($placa)) {
                throw new Exception('Placa requerida');
            }
            
            $tara = $consultas->taraVehiculos($placa);
            $conductor = $consultas->conductorVehiculos($placa);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'placa' => $placa,
                    'tara' => $tara,
                    'conductor' => $conductor
                ]
            ]);
            break;
            
        case 'conductores_locales':
            // Get drivers from local database
            $placa = $_GET['placa'] ?? '';
            
            if (empty($placa)) {
                throw new Exception('Placa requerida');
            }
            
            $result = $consultas->nombresConductores($placa);
            echo json_encode(['success' => true, 'data' => $result]);
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
