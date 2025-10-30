<?php
header('Content-Type: application/json');
require 'db.php';

// Obtener los datos JSON enviados en el cuerpo de la petición
$data = json_decode(file_get_contents('php://input'), true);

// Validar que el campo 'id' exista y sea válido, si no, responder error y salir
if (!$data['id']) exit(json_encode(['success'=>false, 'message'=>'ID inválido']));

// Preparar los parámetros base para el UPDATE
$params = [
    $data['id_usuario'],
    $data['cedula'],
    $data['nombre1'],
    $data['nombre2'],
    $data['apellido1'],
    $data['apellido2'],
    $data['id_rol'],
    $data['id'], // El ID para la cláusula WHERE
];

$setPass = ''; // Variable para agregar el campo contraseña si es necesario

// Si se envió una contraseña nueva, añadir la actualización del campo contraseña
if (!empty($data['contraseña'])) {
    $setPass = ', contraseña = ?';
    // Añadir la contraseña hasheada a los parámetros
    $params[] = password_hash($data['contraseña'], PASSWORD_DEFAULT);
}

$sql = "UPDATE usuarios SET id_usuario=?, cedula=?, nombre1=?, nombre2=?, apellido1=?, apellido2=?, id_rol=?$setPass WHERE id=?"; // Preparar la sentencia SQL dinámica según si se actualiza contraseña o no

$stmt = $pdo->prepare($sql);

// Ejecutar la actualización con los parámetros
if ($stmt->execute($params)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
}
