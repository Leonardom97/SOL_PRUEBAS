<?php
require 'db.php';   // requiere de la base de datos principal
$tablas_validas = [
    'proceso' => ['table' => 'proceso', 'value' => 'id', 'label' => 'proceso'],
    'lugar' => ['table' => 'lugar', 'value' => 'id', 'label' => 'lugar'],
    'tipo_actividad' => ['table' => 'tipo_actividad', 'value' => 'id', 'label' => 'nombre'],
    'tema' => ['table' => 'tema', 'value' => 'id', 'label' => 'nombre']
];
$tabla = $_GET['tabla'] ?? '';  // define las tablas y extrae los datos de cada una de ellas 
if (!isset($tablas_validas[$tabla])) { 
    http_response_code(400);
    echo json_encode(['error' => 'Catálogo no permitido.']);
    exit;
}
$info = $tablas_validas[$tabla]; // verifica si la tabla solicitada es una de las permitidas
$sql = "SELECT {$info['value']} as id, {$info['label']} as nombre FROM {$info['table']} ORDER BY {$info['label']} ASC";
$stmt = $pdo->query($sql);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>