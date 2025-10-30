<?php
header('Content-Type: application/json');
require 'db.php';

// Ejecuta consulta para obtener todos los roles
$stmt = $pdo->query("SELECT * FROM roles");

// Enviar los resultados como JSON
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
