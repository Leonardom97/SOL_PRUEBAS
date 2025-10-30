<?php
// Establecer el encabezado de respuesta como JSON
header('Content-Type: application/json');

// Incluir archivo de conexión a la base de datos
require 'db.php';

// Obtener parámetros de paginación y búsqueda desde la URL (GET)
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1; // Página actual
$per_page = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 10; // Resultados por página
$search = isset($_GET['search']) ? trim($_GET['search']) : ''; // Término de búsqueda

// Calcular el desplazamiento para paginación
$offset = ($page - 1) * $per_page;

// Función auxiliar para limpiar la cédula y dejar solo los números
function limpiar_cedula($cedula) {
    return preg_replace('/[^\d]/', '', $cedula); // Eliminar todo excepto dígitos
}

// Inicializar cláusula WHERE y parámetros de consulta
$where = '';
$params = [];

// Construir cláusula WHERE si hay término de búsqueda
if ($search !== '') {
    // Limpiar cédula para búsqueda numérica
    $search_cedula = limpiar_cedula($search);

    // Si parece una cédula (mínimo 5 dígitos), usar búsqueda avanzada
    if (strlen($search_cedula) >= 5) {
        $where = "WHERE u.id_usuario ILIKE :search 
                  OR regexp_replace(u.cedula, '[^0-9]', '', 'g') ILIKE :search_cedula
                  OR u.cedula ILIKE :search
                  OR u.nombre1 ILIKE :search 
                  OR u.nombre2 ILIKE :search 
                  OR u.apellido1 ILIKE :search 
                  OR u.apellido2 ILIKE :search";
        $params[':search'] = "%$search%";
        $params[':search_cedula'] = "%$search_cedula%";
    } else {
        // Búsqueda básica por coincidencia parcial
        $where = "WHERE u.id_usuario ILIKE :search 
                  OR u.cedula ILIKE :search
                  OR u.nombre1 ILIKE :search 
                  OR u.nombre2 ILIKE :search 
                  OR u.apellido1 ILIKE :search 
                  OR u.apellido2 ILIKE :search";
        $params[':search'] = "%$search%";
    }
}

// Consulta principal para obtener usuarios con sus roles
$sql = "SELECT u.*, r.nombre AS rol_nombre FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id $where ORDER BY u.id DESC LIMIT :per_page OFFSET :offset";

// Preparar y ejecutar la consulta con los parámetros
$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':per_page', $per_page, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

// Obtener resultados como array asociativo
$usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Consulta para contar el total de registros coincidentes
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios u $where");
foreach ($params as $k => $v) $countStmt->bindValue($k, $v);
$countStmt->execute();
$total = $countStmt->fetchColumn();

// Enviar respuesta JSON con los resultados y datos de paginación
echo json_encode([
    'data' => $usuarios,
    'total' => (int)$total,
    'page' => $page,
    'per_page' => $per_page
]);
