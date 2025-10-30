<?php
// Incluye la conexión a la base de datos temporal
require_once 'db_temporal.php';
// Especifica que la respuesta será JSON
header('Content-Type: application/json');

try {
    // Decodifica los datos enviados vía POST en formato JSON
    $input = json_decode(file_get_contents('php://input'), true);

    // Lista de campos esperados para monitoreos generales
    $fields = [
        'monitoreos_generales_id', 'fecha', 'hora', 'colaborador', 'plantacion', 'finca', 'siembra', 'lote', 'parcela',
        'linea', 'palma', 'grupo', 'estado', 'validacion', 'sintoma', 'labor','verificacion'
    ];

    // Validación de ID
    $id = $input['monitoreos_generales_id'] ?? null;
    if (!$id) throw new Exception("ID no especificado o vacío");

    // Verifica si el registro ya existe
    $stmtCheck = $pg->prepare("SELECT COUNT(*) FROM monitoreos_generales WHERE monitoreos_generales_id = ?");
    $stmtCheck->execute([$id]);
    $exists = $stmtCheck->fetchColumn() > 0;

    // Prepara los datos para el INSERT o UPDATE
    $data = [];
    $placeholders = [];
    $values = [];
    foreach ($fields as $field) {
        if (isset($input[$field])) {
            $data[] = $field;
            $placeholders[] = '?';
            $values[] = $input[$field];
        }
    }

    if (empty($data)) throw new Exception("No hay datos para insertar o actualizar");

    if ($exists) {
        // Si existe, realiza un UPDATE
        $setClause = [];
        $updateValues = [];
        foreach ($data as $idx => $col) {
            if ($col !== 'monitoreos_generales_id') {
                $setClause[] = "$col = ?";
                $updateValues[] = $values[$idx];
            }
        }
        $updateValues[] = $id;
        $sql = "UPDATE monitoreos_generales SET " . implode(',', $setClause) . " WHERE monitoreos_generales_id = ?";
        $stmt = $pg->prepare($sql);
        $result = $stmt->execute($updateValues);
    } else {
        // Si no existe, inserta un nuevo registro
        $sql = "INSERT INTO monitoreos_generales (" . implode(',', $data) . ") VALUES (" . implode(',', $placeholders) . ")";
        $stmt = $pg->prepare($sql);
        $result = $stmt->execute($values);
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