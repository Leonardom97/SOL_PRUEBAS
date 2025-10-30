<?php
header('Content-Type: application/json');
require 'db.php';

// Obtener el parámetro 'id' de la URL, si no existe asignar 0
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Preparar la consulta para obtener el usuario con el ID dado
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE id = ?");

// Ejecutar la consulta con el parámetro ID
$stmt->execute([$id]);

// Obtener el resultado como un arreglo asociativo
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Enviar la respuesta JSON con el usuario o un arreglo vacío si no se encontró
echo json_encode($user ?: []);
