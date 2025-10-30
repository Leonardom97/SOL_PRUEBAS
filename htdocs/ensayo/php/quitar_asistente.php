<?php
// Indica que la respuesta será en formato JSON
header('Content-Type: application/json');

// Incluye el archivo de conexión a la base de datos
require_once 'db.php';

// Obtiene el parámetro 'idrel' desde la URL (GET) o 0 si no está definido
$idrel = $_GET['idrel'] ?? 0;

// Si se proporcionó un idrel válido
if ($idrel) {
    // Prepara y ejecuta la eliminación del registro en formulario_asistente por ID
    $stmt = $pdo->prepare("DELETE FROM formulario_asistente WHERE id = ?");
    $stmt->execute([$idrel]);

    // Respuesta JSON indicando éxito
    echo json_encode(['ok' => true]);
} else {
    // Si no se proporcionó idrel, responde con error
    echo json_encode(['ok' => false]);
}
?>
