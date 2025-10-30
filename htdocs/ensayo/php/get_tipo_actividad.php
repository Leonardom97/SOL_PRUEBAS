<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    // Ejecutar consulta para obtener todos los tipos de actividad ordenados por nombre ascendente
    $stmt = $pdo->query("SELECT id, nombre FROM tipo_actividad ORDER BY nombre ASC");

    // Obtener todos los resultados como array asociativo
    $tipos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Enviar el array en formato JSON al cliente
    echo json_encode($tipos);

} catch (Exception $e) {
    // En caso de error, enviar código HTTP 500 y mensaje de error en JSON
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
