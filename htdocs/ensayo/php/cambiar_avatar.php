<?php
// Iniciar sesión para acceder a variables de sesión
session_start();

// Incluir archivo de conexión a la base de datos
require 'db.php';

// Obtener el ID del usuario desde POST o sesión
$id_usuario = $_POST['id_usuario'] ?? $_SESSION['id_usuario'] ?? null;

// Verificar que exista un ID de usuario y que se haya enviado un archivo
if (!$id_usuario || !isset($_FILES['avatar'])) {
    http_response_code(400); // Código de error HTTP 400: Bad Request
    echo json_encode(['ok' => false, 'error' => 'Datos faltantes']);
    exit;
}

// Validar que el archivo tenga una extensión permitida
$allowed = ['jpg', 'jpeg', 'png', 'gif'];
$ext = strtolower(pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowed)) {
    echo json_encode(['ok' => false, 'error' => 'Formato no permitido']);
    exit;
}

// Generar un nombre único para el archivo
$filename = 'avatar_' . $id_usuario . '_' . time() . '.' . $ext;
$destino = "../assets/img/avatars/" . $filename;

// Mover el archivo desde su ubicación temporal al destino final
if (!move_uploaded_file($_FILES['avatar']['tmp_name'], $destino)) {
    echo json_encode(['ok' => false, 'error' => 'No se pudo guardar el archivo']);
    exit;
}

// Actualizar el campo 'avatar' en la base de datos para el usuario correspondiente
$stmt = $pdo->prepare("UPDATE usuarios SET avatar = :avatar WHERE id_usuario = :id_usuario");
$stmt->execute([':avatar' => $filename, ':id_usuario' => $id_usuario]);

// Responder con éxito y el nombre del nuevo archivo
echo json_encode(['ok' => true, 'avatar' => $filename]);
