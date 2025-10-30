<?php
// Incluye la conexión a la base de datos temporal
require_once 'db_temporal.php';
// Especifica que la respuesta será JSON
header('Content-Type: application/json');

try {
    // Decodifica los datos enviados vía POST en formato JSON
    $input = json_decode(file_get_contents('php://input'), true);

    // Lista de columnas que se esperan recibir
    $cols = [
        'cosecha_fruta_id', 'fecha_actividad', 'responsable', 'plantacion', 'finca', 'siembra', 'lote',
        'parcela', 'labor_especifica', 'tipo_corte', 'equipo', 'cod_colaborador_contratista', 'n_grupo_dia',
        'hora_entrada', 'hora_salida', 'linea_entrada', 'linea_salida', 'total_personas', 'unidad',
        'cantidad', 'peso_promedio_lonas', 'total_persona_dia', 'colaborador', 'nuevo_operador'
    ];

    // Validación: se requiere ID para identificar el registro
    $id = $input['cosecha_fruta_id'] ?? null;
    if (!$id) throw new Exception("ID no especificado o vacío");

    // Prepara datos para inserción/actualización
    $data = [];
    $placeholders = [];
    $values = [];
    $updates = [];
    foreach ($cols as $col) {
        if (isset($input[$col])) {
            $data[] = $col;
            $placeholders[] = '?';
            $values[] = $input[$col];
            if ($col !== 'cosecha_fruta_id') {
                $updates[] = "$col = ?";
            }
        }
    }
    if (empty($data)) throw new Exception("No hay datos para insertar");

    // Verifica si el registro ya existe
    $sqlCheck = "SELECT COUNT(*) FROM cosecha_fruta WHERE cosecha_fruta_id = ?";
    $stmtCheck = $pg->prepare($sqlCheck);
    $stmtCheck->execute([$id]);
    $existe = $stmtCheck->fetchColumn();

    if ($existe) {
        // Si existe, realiza un UPDATE
        $sql = "UPDATE cosecha_fruta SET " . implode(',', $updates) . " WHERE cosecha_fruta_id = ?";
        $valuesUpdate = array_merge(array_slice($values, 1), [$id]);
        $stmtUpdate = $pg->prepare($sql);
        $result = $stmtUpdate->execute($valuesUpdate);
    } else {
        // Si no existe, inserta un nuevo registro
        $sql = "INSERT INTO cosecha_fruta (" . implode(',', $data) . ") VALUES (" . implode(',', $placeholders) . ")";
        $stmtInsert = $pg->prepare($sql);
        $result = $stmtInsert->execute($values);
    }

    // Devuelve la respuesta en formato JSON
    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'No se pudo guardar']);
    }
} catch(Exception $e) {
    // Devuelve el error en formato JSON
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>