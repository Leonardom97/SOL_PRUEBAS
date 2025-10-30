<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    // Ejecuta la consulta para obtener los procesos ordenados alfabéticamente
    $stmt = $pdo->query("SELECT id, proceso FROM proceso ORDER BY proceso ASC");

    // Obtiene todos los procesos como arreglo asociativo
    $procesos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Devuelve los procesos en formato JSON
    echo json_encode($procesos);
} catch (Exception $e) {
    // Si hay error, responde con código HTTP 500 y mensaje JSON con el error
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
