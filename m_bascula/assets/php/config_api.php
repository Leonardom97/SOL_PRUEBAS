<?php
/**
 * API for configuration and catalog data
 * Handles products, users, terminals, transaction types, etc.
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
        // Queries
        case 'productos':
            $result = $consultas->productos();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'productos_select':
            $result = $consultas->productosSelect();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'usuarios':
            $result = $consultas->usuarios();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'terminales':
            $result = $consultas->terminal();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'basculas':
            $result = $consultas->selectBasculas();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'roles':
            $result = $consultas->roles();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'estados':
            $result = $consultas->estados();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'destinos':
            $result = $consultas->destino();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'transacciones':
            $result = $consultas->transaccion();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'doc_origen':
            $result = $consultas->docOrigen();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'procedencia':
            $condicion = $_GET['condicion'] ?? '';
            if (empty($condicion)) {
                throw new Exception('Condición requerida');
            }
            $result = $consultas->procedencia($condicion);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'siembras':
            $result = $consultas->siembras();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'num_documento':
            $procedencia = $_GET['procedencia'] ?? '';
            $siembra = $_GET['siembra'] ?? '';
            $transaccion = $_GET['transaccion'] ?? '';
            
            $result = $consultas->numDocumento($procedencia, $siembra, $transaccion);
            echo json_encode(['success' => true, 'num_documento' => $result]);
            break;
            
        case 'recibo':
            $result = $consultas->recibo();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        // Insertions
        case 'insertar_usuario':
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            $required = ['nombres', 'apellidos', 'usuario', 'password', 'tr_codigo'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $inserciones->usuario(
                $data['nombres'],
                $data['apellidos'],
                $data['usuario'],
                $data['password'],
                $data['tr_codigo'],
                $data['est_codigo'] ?? 1
            );
            
            echo json_encode(['success' => true, 'message' => 'Usuario creado exitosamente']);
            break;
            
        case 'insertar_producto':
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            $required = ['nombre', 'sap_codigo', 'est_codigo'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $inserciones->infoProductos(
                $data['nombre'],
                $data['sap_codigo'],
                $data['est_codigo']
            );
            
            echo json_encode(['success' => true, 'message' => 'Producto creado exitosamente']);
            break;
            
        case 'insertar_destino':
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            if (!isset($data['nombre'])) {
                throw new Exception("Campo requerido: nombre");
            }
            
            $result = $inserciones->destino($data['nombre']);
            echo json_encode(['success' => true, 'message' => 'Destino creado exitosamente']);
            break;
            
        case 'actualizar_recibo':
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            $required = ['nombre_empresa', 'nit_empresa', 'titulo_recibo'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $inserciones->recibo(
                $data['nombre_empresa'],
                $data['nit_empresa'],
                $data['titulo_recibo']
            );
            
            echo json_encode(['success' => true, 'message' => 'Información de recibo actualizada']);
            break;
            
        // Updates
        case 'actualizar_usuario':
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            $required = ['codigo', 'nombres', 'apellidos', 'usuario', 'password', 'tr_codigo', 'est_codigo'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $actualizaciones->usuario(
                $data['codigo'],
                $data['nombres'],
                $data['apellidos'],
                $data['usuario'],
                $data['password'],
                $data['tr_codigo'],
                $data['est_codigo']
            );
            
            echo json_encode(['success' => true, 'message' => 'Usuario actualizado exitosamente']);
            break;
            
        case 'actualizar_producto':
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            $required = ['codigo', 'nombre', 'sap_codigo', 'est_codigo'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $actualizaciones->infoProductos(
                $data['codigo'],
                $data['nombre'],
                $data['sap_codigo'],
                $data['est_codigo']
            );
            
            echo json_encode(['success' => true, 'message' => 'Producto actualizado exitosamente']);
            break;
            
        case 'actualizar_terminal':
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            $required = ['com', 'velocidad_transmision', 'paridad', 'bitsdatos', 'bitsparada', 'ip', 'puerto', 'conexion'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new Exception("Campo requerido: $field");
                }
            }
            
            $result = $actualizaciones->terminal(
                $data['com'],
                $data['velocidad_transmision'],
                $data['paridad'],
                $data['bitsdatos'],
                $data['bitsparada'],
                $data['ip'],
                $data['puerto'],
                $data['conexion']
            );
            
            echo json_encode(['success' => true, 'message' => 'Terminal actualizado exitosamente']);
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
