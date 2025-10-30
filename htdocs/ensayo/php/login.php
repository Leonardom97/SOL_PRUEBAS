<?php
require_once 'db.php'; // Asegúrate de que este archivo contiene la conexión a PostgreSQL

header('Content-Type: application/json');

$tipo = $_POST['tipo'] ?? '';
$usuario = $_POST['usuario'] ?? '';
$contrasena = $_POST['contrasena'] ?? '';

if (!$tipo || !$usuario || !$contrasena) {
    echo json_encode(['exito' => false, 'mensaje' => 'Faltan datos obligatorios.']);
    exit;
}

try {
    if ($tipo === 'colaborador') {
        // Buscar por cédula
        $stmt = $conn->prepare("SELECT * FROM usuarios WHERE cedula = :usuario AND id_rol = 3");
        $stmt->bindParam(':usuario', $usuario);
    } else {
        // Buscar por ID de usuario
        $stmt = $conn->prepare("SELECT * FROM usuarios WHERE id_usuario = :usuario AND id_rol IN (1, 2)");
        $stmt->bindParam(':usuario', $usuario);
    }

    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($contrasena, $user['contraseña'])) {
        echo json_encode([
            'exito' => true,
            'usuario' => $user['id_usuario'],
            'nombre1' => $user['nombre1'],
            'rol' => $user['id_rol']
        ]);
    } else {
        echo json_encode(['exito' => false, 'mensaje' => 'Usuario o contraseña incorrectos.']);
    }
} catch (PDOException $e) {
    echo json_encode(['exito' => false, 'mensaje' => 'Error de servidor.']);
}
?>
