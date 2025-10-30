<?php
// Indica que la respuesta será en formato JSON
header('Content-Type: application/json');

// Incluye el archivo de conexión a la base de datos
require_once 'db.php';

// Obtiene los datos JSON enviados en el cuerpo de la solicitud
$data = json_decode(file_get_contents('php://input'), true);

// Extrae el ID del formulario, lo convierte a entero
$id = isset($data['id']) ? (int)$data['id'] : 0;

// Si no se proporciona un ID válido, se retorna un error
if (!$id) {
    echo json_encode(['success' => false, 'message' => 'ID no proporcionado']);
    exit;
}

try {
    // Elimina los asistentes relacionados al formulario para mantener integridad referencial
    $stmt1 = $pdo->prepare("DELETE FROM formulario_asistente WHERE id_formulario = ?");
    $stmt1->execute([$id]);

    // Luego elimina el formulario principal
    $stmt2 = $pdo->prepare("DELETE FROM formulario WHERE id = ?");
    $stmt2->execute([$id]);

    // Devuelve respuesta de éxito
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    // Si ocurre algún error, devuelve mensaje con la excepción
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()]);
}
?>
