<?php
header('Content-Type: application/json');
require 'db.php'; // conexión PDO

// Detectar si es exportación
$export = isset($_GET['export']) && $_GET['export'] === 'true';

// Si es exportación, no paginar, sino todo
$limit = $export ? null : (isset($_GET['limit']) ? intval($_GET['limit']) : 100000);
$offset = $export ? null : (isset($_GET['offset']) ? intval($_GET['offset']) : 0);

$filtros = [];

if (isset($_GET['filter'])) {
    if (is_array($_GET['filter'])) {
        $filtros = $_GET['filter'];
    } elseif (is_string($_GET['filter'])) {
        $filtros = json_decode($_GET['filter'], true) ?? [];
    }
}

$where = [];
$params = [];

$columnas_validas = [
    "fecha_actividad", "colaborador", "fecha_corte", "plantacion", "finca", "siembra",
    "lote", "parcela", "labor_especifica", "tipo_labor", "cod_contratista_maquina",
    "cod_contratista_colaborador", "hora_entrada", "hora_salida", "linea_entrada",
    "linea_salida", "total_personas", "unidad", "cantidad", "n_remision",
    "colaborador_contratista", "tipo_equipo", "cod_maquina", "cod_vagon"
];

foreach ($filtros as $campo => $valor) {
    if (in_array($campo, $columnas_validas)) {
        $where[] = "$campo ILIKE :$campo";
        $params[":$campo"] = "%$valor%";
    }
}

$whereSQL = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

try {
    // Total de registros filtrados (importante para paginación)
    $stmtTotal = $pdo->prepare("SELECT COUNT(*) FROM reco_fruta $whereSQL");
    $stmtTotal->execute($params);
    $total = $stmtTotal->fetchColumn();

    // Construir consulta principal
    $sql = "
        SELECT 
            fecha_actividad, colaborador, fecha_corte, plantacion, finca, siembra,
            lote, parcela, labor_especifica, tipo_labor, cod_contratista_maquina,
            cod_contratista_colaborador, hora_entrada, hora_salida, linea_entrada,
            linea_salida, total_personas, unidad, cantidad, n_remision,
            colaborador_contratista, tipo_equipo, cod_maquina, cod_vagon
        FROM reco_fruta
        $whereSQL
    ";

    if (!$export) {
        $sql .= " LIMIT :limit OFFSET :offset";
    }

    $stmt = $pdo->prepare($sql);

    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }

    if (!$export) {
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    }

    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row['acciones'] = ''; // editable en JS, mismo que antes
    }

    echo json_encode([
        'total' => intval($total),
        'rows' => $rows
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
