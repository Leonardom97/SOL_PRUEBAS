<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    // Ejecuta una consulta para obtener todos los temas ordenados alfabéticamente por nombre
    $stmt = $pdo->query("SELECT id, nombre FROM tema ORDER BY nombre ASC");

    // Obtiene todos los resultados como un arreglo asociativo
    $temas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Envía los datos como JSON al cliente
    echo json_encode($temas);

} catch (Exception $e) {
    // En caso de error, envía código HTTP 500 y un mensaje JSON con el error
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
