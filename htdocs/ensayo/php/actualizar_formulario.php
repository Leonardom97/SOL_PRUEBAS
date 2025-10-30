<?php
// Indica que la respuesta será en formato JSON
header('Content-Type: application/json');

// Incluye la conexión a la base de datos
require_once 'db.php';

// Obtiene y decodifica los datos recibidos en formato JSON desde el cuerpo de la solicitud
$data = json_decode(file_get_contents('php://input'), true);

// Verifica que se recibieron datos y que contienen el ID del formulario
if (!$data || !isset($data['id'])) {
    echo json_encode(['success' => false, 'msg' => 'Datos incompletos']);
    exit;
}

// Actualiza los campos del formulario en la base de datos
$stmt = $pdo->prepare("UPDATE formulario SET id_proceso=?, id_lugar=?, id_usuario=?, id_tipo_actividad=?, id_tema=?, hora_inicio=?, hora_final=?, fecha=?, observaciones=?
    WHERE id=?");
$ok = $stmt->execute([
    $data['id_proceso'],
    $data['id_lugar'],
    $data['id_usuario'],
    $data['id_tipo_actividad'],
    $data['id_tema'],
    $data['hora_inicio'],
    $data['hora_final'],
    $data['fecha'],
    $data['observaciones'],
    $data['id']
]);

// Si la actualización fue exitosa
if ($ok) {
    // Elimina todos los asistentes asociados al formulario actual
    $pdo->prepare("DELETE FROM formulario_asistente WHERE id_formulario=?")->execute([$data['id']]);

    // Recorre el array de asistentes enviado y los vuelve a insertar
    if (!empty($data['asistentes'])) {
        foreach ($data['asistentes'] as $a) {
            // Busca el ID del asistente según la cédula
            $stmtA = $pdo->prepare("SELECT id FROM asistente WHERE cedula=? LIMIT 1");
            $stmtA->execute([$a['cedula']]);
            $id_asistente = $stmtA->fetchColumn();

            // Si se encuentra el asistente, lo asocia al formulario con su estado
            if ($id_asistente) {
                $pdo->prepare("INSERT INTO formulario_asistente (id_formulario, id_asistente, estado) VALUES (?, ?, ?)")
                    ->execute([$data['id'], $id_asistente, $a['estado']]);
            }
        }
    }

    // Respuesta en caso de éxito
    echo json_encode(['success' => true]);
} else {
    // Respuesta en caso de error en la actualización
    echo json_encode(['success' => false, 'msg' => 'Error al actualizar']);
}
