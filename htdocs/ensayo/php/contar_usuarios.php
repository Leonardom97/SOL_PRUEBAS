<?php
header('Content-Type: application/json');
require_once 'db.php';
$stmt = $pdo->query("SELECT COUNT(*) AS total FROM usuarios"); // tabla debe ser 'usuarios'
echo json_encode(['total' => $stmt->fetchColumn()]);
?>