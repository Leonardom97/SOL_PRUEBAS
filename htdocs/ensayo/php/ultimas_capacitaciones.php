<?php
// Establece que la salida será en formato JSON
header('Content-Type: application/json');

// Incluye el archivo de conexión a la base de datos
require_once 'db.php';

// Ejecuta una consulta para obtener los últimos 3 formularios con información del tema y número de asistentes
$stmt = $pdo->query("
    SELECT 
        t.nombre AS nombre, -- Nombre del tema asociado al formulario
        TO_CHAR(f.fecha, 'DD/MM/YYYY') as fecha, -- Fecha del formulario en formato día/mes/año
        (SELECT COUNT(*) FROM formulario_asistente fa WHERE fa.id_formulario = f.id) AS asistentes -- Total de asistentes por formulario
    FROM formulario f
    LEFT JOIN tema t ON f.id_tema = t.id -- Relación con la tabla tema para obtener el nombre
    ORDER BY f.fecha DESC, f.id DESC -- Ordena por fecha más reciente y luego por ID en orden descendente
    LIMIT 3 -- Limita el resultado a los últimos 3 formularios
");

// Obtiene los resultados como arreglo asociativo
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Devuelve los datos en formato JSON
echo json_encode($data);
?>
