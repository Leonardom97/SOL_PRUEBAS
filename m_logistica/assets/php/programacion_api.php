<?php
header('Content-Type: application/json');
require_once '../../../php/db_postgres.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        case 'get_programacion':
            getProgramacion($pg);
            break;
        case 'save_programacion':
            if ($method === 'POST') saveProgramacion($pg);
            break;
        case 'get_viajes':
            getViajes($pg);
            break;
        case 'save_viaje':
            if ($method === 'POST') saveViaje($pg);
            break;
        case 'get_master_data':
            getMasterData($pg);
            break;
        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

function getProgramacion($pg)
{
    $semana = $_GET['semana'] ?? date('Y-\WW'); // Default to current week

    // Join with Viajes, Vehicles, and Conductores to get status
    $sql = "SELECT lp.*, 
            lv.id as viaje_id, lv.estado_viaje, lv.fecha_salida,
            pv.placa, pv.tipo_vehiculo,
            pc.nombres as conductor_nombres, pc.apellidos as conductor_apellidos,
            f.nombre_finca, f.nombre_empresa as proveedor_nombre,
            a.identificador as acopio_nombre
            FROM logi_programacion lp
            LEFT JOIN logi_viajes lv ON lp.id = lv.programacion_id
            LEFT JOIN port_vehiculos pv ON lv.vehiculo_id = pv.id
            LEFT JOIN port_conductores pc ON lv.conductor_id = pc.id
            LEFT JOIN logi_fincas f ON NULLIF(lp.finca_id, '')::integer = f.id
            LEFT JOIN logi_acopios a ON NULLIF(lp.acopio_id, '')::integer = a.id
            WHERE lp.semana_anio = :semana 
            ORDER BY lp.fecha_programacion, lp.id";

    $stmt = $pg->prepare($sql);
    $stmt->execute([':semana' => $semana]);
    echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
}

function saveProgramacion($pg)
{
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST; // Fallback if sent as form data
    $id = $data['id'] ?? '';

    try {
        if ($id) {
            $sql = "UPDATE logi_programacion SET 
                    fecha_programacion = :fecha, 
                    semana_anio = :semana,
                    jornada = :jornada,
                    cajon_id = :cajon_id, 
                    cajon_color = :cajon_color, 
                    cajon_empresa = :cajon_empresa, 
                    cajon_tipo = :cajon_tipo, 
                    cantidad_cajones = :cantidad, 
                    toneladas_estimadas = :toneladas, 
                    variedad_fruto = :variedad, -- Keeping for backward compatibility
                    tipo_material = :tipo_material,
                    acopio_id = :acopio_id, 
                    finca_id = :finca_id, 
                    finca_empresa = :finca_empresa, 
                    finca_nit = :finca_nit, 
                    finca_distancia_km = :distancia 
                    WHERE id = :id";
            $stmt = $pg->prepare($sql);
            $stmt->bindValue(':id', $id);
        } else {
            $sql = "INSERT INTO logi_programacion (
                        fecha_programacion, semana_anio, jornada, cajon_id, cajon_color, cajon_empresa, cajon_tipo, 
                        cantidad_cajones, toneladas_estimadas, variedad_fruto, tipo_material,
                        acopio_id, finca_id, finca_empresa, finca_nit, finca_distancia_km
                    ) VALUES (
                        :fecha, :semana, :jornada, :cajon_id, :cajon_color, :cajon_empresa, :cajon_tipo, 
                        :cantidad, :toneladas, :variedad, :tipo_material,
                        :acopio_id, :finca_id, :finca_empresa, :finca_nit, :distancia
                    )";
            $stmt = $pg->prepare($sql);
        }

        // Calculate week string (ISO-8601 year and week)
        $date = new DateTime($data['fecha_programacion']);
        // Adjust to ensure correct week calculation (Monday start)
        $semana_anio = $date->format('o-\WW');

        $stmt->bindValue(':fecha', $data['fecha_programacion']);
        $stmt->bindValue(':semana', $semana_anio);
        $stmt->bindValue(':jornada', $data['jornada'] ?? 'Mañana');
        $stmt->bindValue(':cajon_id', $data['cajon_id'] ?? null);
        $stmt->bindValue(':cajon_color', $data['cajon_color'] ?? null);
        $stmt->bindValue(':cajon_empresa', $data['cajon_empresa'] ?? null);
        $stmt->bindValue(':cajon_tipo', $data['cajon_tipo'] ?? null);
        $stmt->bindValue(':cantidad', $data['cantidad_cajones'] ?? 0);
        $stmt->bindValue(':toneladas', $data['toneladas_estimadas'] ?? 0);
        $stmt->bindValue(':variedad', $data['variedad_fruto'] ?? ($data['tipo_material'] ?? null));
        $stmt->bindValue(':tipo_material', $data['tipo_material'] ?? ($data['variedad_fruto'] ?? null));
        $stmt->bindValue(':acopio_id', !empty($data['acopio_id']) ? $data['acopio_id'] : null);
        $stmt->bindValue(':finca_id', $data['finca_id'] ?? null);
        $stmt->bindValue(':finca_empresa', $data['finca_empresa'] ?? null);
        $stmt->bindValue(':finca_nit', $data['finca_nit'] ?? null);
        $stmt->bindValue(':distancia', $data['finca_distancia_km'] ?? 0);

        $stmt->execute();
        echo json_encode(['status' => 'success']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

function getViajes($pg)
{
    $progId = $_GET['programacion_id'] ?? 0;
    $sql = "SELECT lv.*, pv.placa, pc.nombres, pc.apellidos 
            FROM logi_viajes lv
            LEFT JOIN port_vehiculos pv ON lv.vehiculo_id = pv.id
            LEFT JOIN port_conductores pc ON lv.conductor_id = pc.id
            WHERE lv.programacion_id = :progId";
    $stmt = $pg->prepare($sql);
    $stmt->execute([':progId' => $progId]);
    echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
}

function saveViaje($pg)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['programacion_id']) || empty($data['vehiculo_id'])) {
        throw new Exception("Programacion and Vehiculo are required");
    }

    // Insert
    $sql = "INSERT INTO logi_viajes 
            (programacion_id, vehiculo_id, conductor_id, fecha_salida, estado_viaje) 
            VALUES 
            (:progId, :vehiculoId, :conductorId, NOW(), 'programado')";

    $stmt = $pg->prepare($sql);
    $stmt->execute([
        ':progId' => $data['programacion_id'],
        ':vehiculoId' => $data['vehiculo_id'],
        ':conductorId' => $data['conductor_id']
    ]);

    echo json_encode(['status' => 'success', 'message' => 'Viaje programado']);
}

function getMasterData($pg)
{
    // Check if tables exist to avoid errors during migration
    try {
        $cajones = $pg->query("SELECT * FROM logi_cajones ORDER BY codigo")->fetchAll();
        // Fetch Fincas with Provider info
        $fincas = $pg->query("SELECT id, codigo, nombre_finca, nombre_empresa, nit, distancia_km FROM logi_fincas ORDER BY nombre_finca")->fetchAll();
        // Fetch Acopios with Finca ID for filtering
        $acopios = $pg->query("SELECT * FROM logi_acopios ORDER BY identificador")->fetchAll();
    } catch (PDOException $e) {
        // Fallback for empty tables or missing columns
        $cajones = [];
        $fincas = [];
        $acopios = [];
    }

    echo json_encode([
        'status' => 'success',
        'data' => [
            'cajones' => $cajones,
            'fincas' => $fincas,
            'acopios' => $acopios
        ]
    ]);
}
