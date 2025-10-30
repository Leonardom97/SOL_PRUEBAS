<?php
require_once 'db.php';

header('Content-Type: application/json');

// Función para limpiar la cédula, dejando solo los números (elimina puntos, espacios, guiones, etc.)
function limpiar_cedula($cedula) {
    return preg_replace('/[^\d]/', '', $cedula);
}

// Obtener la cédula desde el parámetro GET
$cedula_original = $_GET['cedula'] ?? '';

// Validar que se haya enviado la cédula
if (!$cedula_original) {
    echo json_encode(['ok' => false, 'msg' => 'Cédula requerida']);
    exit;
}

// Limpiar la cédula para comparar solo números
$cedula = limpiar_cedula($cedula_original);

// Preparar consulta para buscar usuario cuyo campo 'cedula' coincida limpiando caracteres no numéricos
$stmt = $pdo->prepare("SELECT id, nombre1, nombre2, apellido1, apellido2 FROM usuarios WHERE regexp_replace(cedula, '[^0-9]', '', 'g') = :cedula LIMIT 1");

// Ejecutar la consulta con la cédula limpia
$stmt->execute(['cedula' => $cedula]);

// Obtener el usuario si existe
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if ($usuario) {
    // Concatenar los nombres y apellidos en una sola cadena, quitando espacios extras
    $nombre = trim("{$usuario['nombre1']} {$usuario['nombre2']} {$usuario['apellido1']} {$usuario['apellido2']}");
    // Devolver éxito con datos del usuario
    echo json_encode(['ok' => true, 'id' => $usuario['id'], 'nombre' => $nombre]);
} else {
    // Usuario no encontrado
    echo json_encode(['ok' => false, 'msg' => 'Usuario no encontrado']);
}
?>
