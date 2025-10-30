<?php
// Incluir conexión a base de datos
require 'db.php';

// Obtener el parámetro 'id' desde la URL (GET)
$id = $_GET['id'] ?? null;

// Validar que se haya enviado un ID
if (!$id) {
    http_response_code(400); // Código de respuesta 400: Solicitud incorrecta
    echo json_encode(['error' => 'ID faltante']);
    exit;
}

// Preparar consulta para obtener datos del formulario y datos del capacitador relacionado
$stmt = $pdo->prepare('SELECT *, 
    (SELECT cedula FROM usuarios WHERE id = f.capacitador_id) AS cedula_capacitador,
    (SELECT CONCAT(nombre1, " ", apellido1) FROM usuarios WHERE id = f.capacitador_id) AS nombre_capacitador
    FROM formularios f WHERE f.id = ?');

// Ejecutar consulta con el ID proporcionado
$stmt->execute([$id]);

// Obtener el formulario como arreglo asociativo
$formulario = $stmt->fetch(PDO::FETCH_ASSOC);

// Verificar si existe el formulario consultado
if (!$formulario) {
    echo json_encode(['error' => 'No existe']);
    exit;
}

// Preparar consulta para obtener los asistentes asociados al formulario
$stmt2 = $pdo->prepare('SELECT id, nombre, cedula, empresa, estado FROM asistentes_formulario WHERE formulario_id = ?');

// Ejecutar consulta con el mismo ID de formulario
$stmt2->execute([$id]);

// Agregar los asistentes al arreglo del formulario
$formulario['asistentes'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);

// Devolver la información completa del formulario con sus asistentes en formato JSON
echo json_encode($formulario);
