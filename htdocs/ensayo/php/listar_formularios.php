<?php
// Indica que la respuesta será en formato JSON
header('Content-Type: application/json');

// Incluye el archivo de conexión a la base de datos
require_once 'db.php';

// Obtiene la página actual desde GET, mínimo 1
$page = max(1, intval($_GET['page'] ?? 1));

// Obtiene la cantidad de registros por página, mínimo 1
$per_page = max(1, intval($_GET['per_page'] ?? 10));

// Obtiene el término de búsqueda (si se proporciona)
$search = trim($_GET['search'] ?? '');

// Calcula el offset para la paginación
$offset = ($page - 1) * $per_page;

// Inicializa la cláusula WHERE y los parámetros de búsqueda
$where = '';
$params = [];

// Si se proporciona un término de búsqueda
if ($search !== '') {
    // Genera la condición WHERE para varios campos con ILIKE (búsqueda sin distinción de mayúsculas/minúsculas)
    $where = "WHERE 
        t.nombre ILIKE ? OR 
        ta.nombre ILIKE ? OR
        u.nombre1 ILIKE ? OR 
        u.nombre2 ILIKE ? OR 
        u.apellido1 ILIKE ? OR 
        u.apellido2 ILIKE ? OR 
        u.cedula ILIKE ?";
    // Crea un array con el mismo término de búsqueda repetido 7 veces para los placeholders
    $params = array_fill(0, 7, "%$search%");
}

// Consulta para contar el total de registros que cumplen el filtro
$sql_total = "SELECT COUNT(*) 
FROM formulario f
LEFT JOIN tema t ON f.id_tema = t.id
LEFT JOIN tipo_actividad ta ON f.id_tipo_actividad = ta.id
LEFT JOIN usuarios u ON f.id_usuario = u.id
$where";
$stmt_total = $pdo->prepare($sql_total);
$stmt_total->execute($params);
$total = $stmt_total->fetchColumn(); // Total de registros

// Consulta principal para obtener los datos con paginación y filtros
$sql = "SELECT 
    f.id, 
    t.nombre AS tema, 
    ta.nombre AS tipo_actividad,
    u.nombre1 || ' ' || u.nombre2 || ' ' || u.apellido1 || ' ' || u.apellido2 AS responsable,
    u.cedula,
    f.fecha,
    (SELECT COUNT(*) FROM formulario_asistente fa WHERE fa.id_formulario = f.id) as personal_capacitado
FROM formulario f
LEFT JOIN tema t ON f.id_tema = t.id
LEFT JOIN tipo_actividad ta ON f.id_tipo_actividad = ta.id
LEFT JOIN usuarios u ON f.id_usuario = u.id
$where
ORDER BY f.id DESC
LIMIT $per_page OFFSET $offset";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC); // Obtiene los datos como arreglo asociativo

// Devuelve los resultados en formato JSON, incluyendo datos, total y parámetros de paginación
echo json_encode([
    'data' => $data,
    'total' => (int)$total,
    'page' => $page,
    'per_page' => $per_page
]);
