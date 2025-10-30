<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    // Ejecuta la consulta para obtener los lugares ordenados alfabéticamente
    $stmt = $pdo->query("SELECT id, lugar FROM lugar ORDER BY lugar ASC");

    // Obtiene todos los lugares como arreglo asociativo
    $lugares = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Devuelve los lugares en formato JSON
    echo json_encode($lugares);
} catch (Exception $e) {
    http_response_code(500);     // Si ocurre un error, responde con código HTTP 500 y mensaje JSON con el error
    echo json_encode(['error' => $e->getMessage()]);
}
?>
