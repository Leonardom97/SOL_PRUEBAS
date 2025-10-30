<?php
// Incluye la conexión a la base de datos
require_once 'db.php';

// Establece que la respuesta será en formato JSON
header('Content-Type: application/json');

// Decodifica los datos JSON recibidos desde el cliente (por ejemplo, desde fetch o axios)
$data = json_decode(file_get_contents("php://input"), true);

try {
    // Inicia una transacción para asegurar integridad de datos
    $pdo->beginTransaction();

    // Inserta el formulario principal en la tabla 'formulario' y devuelve el id generado
    $stmt = $pdo->prepare("INSERT INTO formulario
        (id_proceso, id_lugar, id_usuario, id_tipo_actividad, id_tema, hora_inicio, hora_final, fecha, observaciones)
        VALUES (:id_proceso, :id_lugar, :id_usuario, :id_tipo_actividad, :id_tema, :hora_inicio, :hora_final, :fecha, :observaciones)
        RETURNING id");
    $stmt->execute([
        'id_proceso'      => $data['id_proceso'],
        'id_lugar'        => $data['id_lugar'],
        'id_usuario'      => $data['id_usuario'],
        'id_tipo_actividad' => $data['id_tipo_actividad'],
        'id_tema'         => $data['id_tema'],
        'hora_inicio'     => $data['hora_inicio'],
        'hora_final'      => $data['hora_final'],
        'fecha'           => $data['fecha'],
        'observaciones'   => $data['observaciones']
    ]);
    // Se guarda el ID del formulario recién insertado
    $formulario_id = $stmt->fetchColumn();

    // Si hay asistentes en el formulario, se procesan uno a uno
    if (!empty($data['asistentes'])) {
        // Prepara la sentencia para insertar en 'formulario_asistente'
        $ins = $pdo->prepare("INSERT INTO formulario_asistente (id_formulario, id_asistente, estado) VALUES (?, ?, ?)");
        foreach ($data['asistentes'] as $asistente) {
            // Verifica si el asistente ya existe por cédula
            $q = $pdo->prepare("SELECT id FROM asistente WHERE cedula = ?");
            $q->execute([$asistente['cedula']]);
            $asistente_id = $q->fetchColumn();

            // Si no existe, lo inserta en la tabla 'asistente'
            if (!$asistente_id) {
                $insert_asistente = $pdo->prepare("INSERT INTO asistente (cedula, nombre, empresa) VALUES (?, ?, ?)");
                $insert_asistente->execute([
                    $asistente['cedula'],
                    $asistente['nombre'] ?? '',
                    $asistente['empresa'] ?? ''
                ]);
                // Obtiene el ID del nuevo asistente insertado
                $asistente_id = $pdo->lastInsertId();
            }

            // Inserta la relación entre el formulario y el asistente
            $ins->execute([$formulario_id, $asistente_id, $asistente['estado']]);
        }
    }

    // Si todo va bien, se confirma la transacción
    $pdo->commit();
    // Respuesta de éxito con el ID del formulario insertado
    echo json_encode(['exito' => true, 'id_formulario' => $formulario_id]);
} catch (Exception $e) {
    // En caso de error, se revierte la transacción
    $pdo->rollBack();
    // Se devuelve un mensaje de error
    echo json_encode(['exito' => false, 'mensaje' => 'Error al guardar: '.$e->getMessage()]);
}
?>
