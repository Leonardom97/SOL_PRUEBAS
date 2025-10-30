<?php
session_start();
require 'db.php';   //requiere de la base de datos principal

$id_usuario = $_SESSION['id_usuario'] ?? null;    // verifica la autenticacion del id_usuario
if (!$id_usuario) {
    http_response_code(401);  //genera error si no encuentra al usuario 
    exit;
}

// Traer usuario junto con el nombre del rol desde la tabla roles
$stmt = $pdo->prepare("
    SELECT u.*, r.nombre AS rol_nombre
    FROM usuarios u
    LEFT JOIN roles r ON u.id_rol = r.id
    WHERE u.id_usuario = :id_usuario
");
$stmt->execute([':id_usuario' => $id_usuario]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$usuario) {
    http_response_code(404);
    exit;
}

// Ajusta la ruta del avatar para el frontend
if (!empty($usuario['avatar'])) {
    // Si ya empieza con 'assets/', no agregar nada
    if (strpos($usuario['avatar'], 'assets/') === 0) {
        $usuario['avatar_url'] = $usuario['avatar'];
    } else {
        $usuario['avatar_url'] = 'assets/img/avatars/' . $usuario['avatar'];
    }
} else {
    $usuario['avatar_url'] = 'assets/img/default-avatar.png';
}

echo json_encode($usuario);   // devuelve toda la informacion en formato Json 
?>