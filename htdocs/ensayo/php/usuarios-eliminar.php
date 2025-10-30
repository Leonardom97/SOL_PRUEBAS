<?php
header('Content-Type: application/json');
require 'db.php';

// Obtener datos JSON enviados en el cuerpo de la petición
$data = json_decode(file_get_contents('php://input'), true);

// Validar que exista el campo 'id' y no esté vacío
if (empty($data['id'])) {
    // Responder con error si falta el ID
    echo json_encode(['success' => false, 'message' => 'ID inválido']);
    exit;
}

// Preparar la consulta para eliminar el usuario por id
$stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");

// Ejecutar la consulta con el id recibido
$r = $stmt->execute([$data['id']]);

// Devolver resultado de la operación 
echo json_encode(['success' => $r]);
?>
