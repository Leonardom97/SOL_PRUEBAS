<?php
// Establece que la respuesta será en formato JSON
header('Content-Type: application/json');

// Incluye el archivo de conexión a la base de datos
require 'db.php';

// Decodifica el cuerpo de la solicitud JSON en un array asociativo
$data = json_decode(file_get_contents('php://input'), true);

// Prepara la consulta para insertar un nuevo usuario en la tabla 'usuarios'
$stmt = $pdo->prepare("INSERT INTO usuarios (id_usuario, cedula, nombre1, nombre2, apellido1, apellido2, contraseña, id_rol, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

// Ejecuta la consulta con los datos proporcionados
$r = $stmt->execute([
    $data['id_usuario'],                            // ID del usuario (puede ser definido manualmente o por el sistema)
    $data['cedula'],                                // Cédula del usuario
    $data['nombre1'],                               // Primer nombre
    $data['nombre2'],                               // Segundo nombre
    $data['apellido1'],                             // Primer apellido
    $data['apellido2'],                             // Segundo apellido
    password_hash($data['contraseña'], PASSWORD_DEFAULT), // Contraseña encriptada de forma segura
    $data['id_rol'],                                // ID del rol asignado al usuario
    $data['avatar'] ?? 'avatar1.jpeg'               // Avatar por defecto si no se proporciona uno
]);

// Devuelve una respuesta JSON con el resultado de la operación
echo json_encode(['success' => $r]);
