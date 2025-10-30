<?php
// Establecer el tipo de contenido de la respuesta como JSON
header('Content-Type: application/json');

require_once 'db.php';  // Incluir archivo de conexión a la base de datos

// Ejecutar una consulta para contar el total de registros en la tabla 'formulario'
$stmt = $pdo->query("SELECT COUNT(*) AS total FROM formulario");

// Obtener el resultado y devolverlo en formato JSON
echo json_encode(['total' => $stmt->fetchColumn()]);
?>
