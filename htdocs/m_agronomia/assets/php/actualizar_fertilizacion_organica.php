<?php
// Incluye la conexión a la base de datos temporal
require_once 'db_temporal.php';
// Especifica que la respuesta será JSON
header('Content-Type: application/json');

try {
    // Decodifica los datos enviados vía POST en formato JSON
    $input = json_decode(file_get_contents('php://input'), true);

    // Lista de campos esperados para la fertilización orgánica
    $fields = [
        'fertilizacion_organica_id','fecha_actividad', 'responsable', 'plantacion', 'finca', 'siembra', 'lote', 'parcela',
        'linea_entrada', 'linea_salida', 'hora_entrada', 'hora_salida', 'labor_especifica',
        'producto_aplicado', 'dosis_kg', 'unidad_aplicacion', 'contratista_colaborador',
        'n_colaboradores', 'colaboradores', 'tipo_labor', 'contratista_maquinaria', 'n_operadores',
        'tipo_maquina', 'nombre_operadores', 'bultos_aplicados', 'n_traslado', 'kg_aplicados'
    ];

    // Validación de ID
    $id = $input['fertilizacion_organica_id'] ?? null;
    if (!$id) throw new Exception("ID no especificado o vacío");

    // Prepara los datos para la consulta SQL
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
    
    // Realiza el INSERT en la tabla correspondiente
    $sql = "INSERT INTO fertilizacion_organica (" . implode(',', $data) . ") VALUES (" . implode(',', $placeholders) . ")";
    $stmtInsert = $pg->prepare($sql);
    $result = $stmtInsert->execute($values);

    // Responde en JSON según el resultado
    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'No se pudo insertar']);
    }
} catch(Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>