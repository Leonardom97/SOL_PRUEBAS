<?php
// Indica que la respuesta será en formato JSON
header('Content-Type: application/json');

// Incluye el archivo de conexión a la base de datos PostgreSQL
require_once 'db.php';

/**
 * Normaliza la cédula: elimina todos los caracteres que no son dígitos
 * y luego elimina ceros a la izquierda.
 */
function limpiar_cedula($cedula) {
    return ltrim(preg_replace('/[^\d]/', '', $cedula), '0');
}

// Obtiene la cédula original desde la URL (GET) o cadena vacía si no existe
$cedula_original = $_GET['cedula'] ?? '';

// Verifica que se haya enviado la cédula
if (!$cedula_original) {
    // Devuelve error en formato JSON si no se proporciona cédula
    echo json_encode(['ok' => false, 'msg' => 'Cédula requerida']);
    exit;
}

// Normaliza la cédula
$cedula = limpiar_cedula($cedula_original);

// 1. Buscar si ya existe un asistente con esa cédula normalizada en PostgreSQL
$stmt = $pdo->prepare("SELECT id, cedula, nombre, empresa 
    FROM asistente 
    WHERE ltrim(regexp_replace(cedula, '[^0-9]', '', 'g'), '0') = :cedula 
    LIMIT 1");
$stmt->execute(['cedula' => $cedula]);
$asistente = $stmt->fetch(PDO::FETCH_ASSOC);

// Si se encuentra un asistente con esa cédula, se devuelve y se termina la ejecución
if ($asistente) {
    echo json_encode(['ok' => true, 'asistente' => $asistente]);
    exit;
}

// 2. Buscar si existe un asistente con el mismo nombre en PostgreSQL
$nombre = '';
// Si se recibe el nombre por GET, se limpia con trim()
if (!empty($_GET['nombre'])) {
    $nombre = trim($_GET['nombre']);
}

// Si se proporcionó un nombre
if ($nombre) {
    // Consulta por coincidencia exacta de nombre (ignorando mayúsculas/minúsculas)
    $stmt2 = $pdo->prepare("SELECT id, cedula, nombre, empresa 
        FROM asistente 
        WHERE LOWER(nombre) = LOWER(:nombre)
        LIMIT 1");
    $stmt2->execute(['nombre' => $nombre]);
    $asistente_nombre = $stmt2->fetch(PDO::FETCH_ASSOC);
    
    // Si se encuentra, se devuelve con un mensaje informativo
    if ($asistente_nombre) {
        echo json_encode(['ok' => true, 'asistente' => $asistente_nombre, 'msg' => 'Ya existe asistente con este nombre en la base local.']);
        exit;
    }
}

// 3. Buscar en SQL Server (empleados externos), solo consulta, no inserta nada
try {
    // Parámetros de conexión al servidor SQL Server
    $serverName = "192.168.150.199";
    $database = "SVN_G4026_OSM";
    $username = "sa";
    $password = "Sap2015";
    
    // Conexión PDO a SQL Server
    $conn_sqlsrv = new PDO("sqlsrv:server=$serverName;Database=$database", $username, $password);

    // Consulta por cédula normalizada (sin puntos, espacios ni guiones)
    $sql = "SELECT TOP 1 * FROM TEMPLEADOS WHERE REPLACE(REPLACE(REPLACE(SCEDULA, '.', ''), ' ', ''), '-', '') = ?";
    $q = $conn_sqlsrv->prepare($sql);
    $q->execute([$cedula]);
    $row = $q->fetch(PDO::FETCH_ASSOC);

    // Si se encuentra un empleado en SQL Server
    if ($row) {
        // Mapea los códigos de empresa a sus nombres reales
        $empresaMap = [
            '1' => 'Oleaginosas San Marcos',
            '2' => 'Inversiones',
            '3' => 'Semag de los Llanos'
        ];
        
        // Construye el nombre completo del empleado
        $nombre_emp = trim(($row['NOMBRE_1'] ?? '') . ' ' . ($row['NOMBRE_2'] ?? '') . ' ' . ($row['APELLIDO_1'] ?? '') . ' ' . ($row['APELLIDO_2'] ?? ''));
        
        // Traduce el código de empresa si existe en el mapa
        $empresa = $row['EMPRESA'] ?? null;
        if (isset($empresaMap[$empresa])) {
            $empresa = $empresaMap[$empresa];
        }

        // Devuelve los datos obtenidos desde SQL Server sin insertar en PostgreSQL
        echo json_encode(['ok' => true, 'asistente' => [
            'id' => null,
            'cedula' => $cedula,
            'nombre' => $nombre_emp,
            'empresa' => $empresa
        ]]);
        exit;
    } else {
        // No se encontró en PostgreSQL ni en SQL Server
        echo json_encode(['ok' => false, 'msg' => 'No encontrado en ninguna base']);
    }
} catch (Exception $e) {
    // Captura y devuelve errores de conexión o consulta a SQL Server
    echo json_encode(['ok' => false, 'msg' => 'Error SQL Server: ' . $e->getMessage()]);
}
?>
