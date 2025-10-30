<?php
// Incluye la conexión a la base de datos temporal
require_once 'db_temporal.php';
// Especifica que la respuesta será JSON
header('Content-Type: application/json');

try {
    // Decodifica los datos enviados vía POST en formato JSON
    $input = json_decode(file_get_contents('php://input'), true);

    // Lista de campos esperados para oficios varios palma
    $fields = [
        'oficios_varios_palma_id', 
        'fecha', 'responsable', 'plantacion', 'finca', 'siembra', 'lote', 'parcela', 'labor_especifica',
        'tipo_labor', 'contratista', 'codigo', 'colaborador', 'personas', 'hora_entrada',
        'hora_salida', 'linea_entrada', 'linea_salida', 'cantidad', 'unidad', 'maquina',
        'tractorista', 'nuevo_operario'
    ];

    // Validación de ID
    $id = $input['oficios_varios_palma_id'] ?? null;
    if (!$id) throw new Exception("ID no especificado o vacío");

    // Prepara los datos para el INSERT
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
    if (empty($data)) throw new Exception("No hay datos para insertar");
    // Inserta en la base de datos
    $sql = "INSERT INTO oficios_varios_palma (" . implode(',', $data) . ") VALUES (" . implode(',', $placeholders) . ")";
    $stmtInsert = $pg->prepare($sql);
    $result = $stmtInsert->execute($values);

    // Devuelve la respuesta en formato JSON
    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'No se pudo insertar']);
    }
} catch(Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>