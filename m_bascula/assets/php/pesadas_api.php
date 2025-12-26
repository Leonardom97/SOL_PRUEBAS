<?php
/**
 * API for weighing operations (pesadas)
 * Handles CRUD operations for trans_pesadas table
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/consultas_bascula.php';
require_once __DIR__ . '/inserciones_bascula.php';
require_once __DIR__ . '/actualizaciones_bascula.php';

try {
    $consultas = new ConsultasBascula();
    $inserciones = new InsercionesBascula();
    $actualizaciones = new ActualizacionesBascula();
    
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'listar':
            // List today's weighings
            $result = $consultas->pesadasDia();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'detallado':
            // Get detailed report
            $fecha_inicio = $_GET['fecha_inicio'] ?? '';
            $fecha_fin = $_GET['fecha_fin'] ?? '';
            
            if (empty($fecha_inicio) || empty($fecha_fin)) {
                throw new Exception('Fechas requeridas');
            }
            
            $result = $consultas->pesadasDetallado($fecha_inicio, $fecha_fin);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'por_placa':
            // Get weighing by plate number
            $placa = $_GET['placa'] ?? '';
            
            if (empty($placa)) {
                throw new Exception('Placa requerida');
            }
            
            $result = $consultas->placa($placa);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'insertar':
            // Insert new weighing
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                $data = $_POST;
            }
            
            $required = ['placa', 'conductor', 'tt_codigo', 'tpr_codigo', 'tp_codigo', 'do_codigo', 'tara', 'au_codigo'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $inserciones->pesadas(
                $data['placa'],
                $data['conductor'],
                $data['siembra'] ?? '',
                $data['tt_codigo'],
                $data['tpr_codigo'],
                $data['tp_codigo'],
                $data['do_codigo'],
                $data['num_documento'] ?? '',
                $data['tara'],
                $data['au_codigo']
            );
            
            echo json_encode(['success' => true, 'message' => 'Pesada registrada exitosamente', 'affected_rows' => $result]);
            break;
            
        case 'actualizar_salida':
            // Update vehicle exit (complete weighing)
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                $data = $_POST;
            }
            
            $required = ['codigo', 'tp_codigo', 'peso_neto', 'peso_bruto'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $actualizaciones->salidaVehiculo(
                $data['codigo'],
                $data['tp_codigo'],
                $data['peso_neto'],
                $data['peso_bruto']
            );
            
            echo json_encode(['success' => true, 'message' => 'Salida registrada exitosamente', 'affected_rows' => $result]);
            break;
            
        case 'estadisticas':
            // Get weighing statistics by day
            $fecha_inicio = $_GET['fecha_inicio'] ?? '';
            $fecha_fin = $_GET['fecha_fin'] ?? '';
            
            if (empty($fecha_inicio) || empty($fecha_fin)) {
                throw new Exception('Fechas requeridas');
            }
            
            $result = $consultas->pesadasPorDia($fecha_inicio, $fecha_fin);
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
