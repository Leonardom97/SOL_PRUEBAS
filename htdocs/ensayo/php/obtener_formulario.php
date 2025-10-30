<?php
header('Content-Type: application/json');  // Indica que la respuesta será en formato JSON

// Incluye el archivo de conexión a la base de datos
require_once 'db.php';

// Obtiene el parámetro 'id' desde la URL (GET), o 0 si no está definido
$id = $_GET['id'] ?? 0;

// Verifica que se haya recibido un ID válido
if (!$id) {
    echo json_encode(['ok' => false, 'msg' => 'ID requerido']);   // Devuelve un mensaje de error en formato JSON y termina la ejecución
    exit;
}

// Datos del formulario
$stmt = $pdo->prepare("SELECT * FROM formulario WHERE id = ?");  // Consulta el formulario con el ID proporcionado
$stmt->execute([$id]);
$formulario = $stmt->fetch(PDO::FETCH_ASSOC);

// Asistentes asociados a este formulario
$asistentes = [];
// Consulta los asistentes relacionados al formulario mediante JOIN
$stmt2 = $pdo->prepare("SELECT a.cedula, a.nombre, a.empresa, fa.estado
    FROM formulario_asistente fa
    JOIN asistente a ON a.id = fa.id_asistente
    WHERE fa.id_formulario = ?");
$stmt2->execute([$id]);
// Recorre los resultados y los guarda en el array $asistentes
while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    $asistentes[] = $row;
}

// Devuelve los datos del formulario y sus asistentes en formato JSON
echo json_encode([
    'ok' => true,
    'formulario' => $formulario,
    'asistentes' => $asistentes
]);
