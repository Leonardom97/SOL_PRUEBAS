<?php
header('Content-Type: application/json');
require 'db_postgres.php'; 

$limit  = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
$sort   = $_GET['sort'] ?? 'fecha_actividad';
$order  = $_GET['order'] ?? 'desc';

// Campos válidos según el HTML
$campos_validos = [
  "fecha_actividad", "responsable", "plantacion", "finca", "siembra",
  "lote", "parcela", "labor_especifica", "tipo_labor", "contratista",
  "codigo", "colaborador", "personas", "hora_entrada", "hora_salida",
  "linea_entrada", "linea_salida", "cantidad", "unidad",
  "maquina", "tractorista", "nuevo_operario"
];

// Filtros
$where = [];
$params = [];

foreach ($_GET as $campo => $valor) {
  if (in_array($campo, $campos_validos) && $valor !== '') {
    $where[] = "$campo ILIKE :$campo";
    $params[":$campo"] = "%$valor%";
  }
}

$where_sql = count($where) ? "WHERE " . implode(' AND ', $where) : "";

// Total filtrado
$sql_total = "SELECT COUNT(*) FROM oficios_varios_palma $where_sql";
$stmt_total = $pdo->prepare($sql_total);
$stmt_total->execute($params);
$totalRows = $stmt_total->fetchColumn();

// Datos paginados
$sql_data = "SELECT * FROM oficios_varios_palma $where_sql ORDER BY $sort $order LIMIT :limit OFFSET :offset";
$stmt_data = $pdo->prepare($sql_data);

foreach ($params as $key => $val) {
  $stmt_data->bindValue($key, $val);
}
$stmt_data->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt_data->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt_data->execute();

$rows = $stmt_data->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
  "total" => $totalRows,
  "rows" => $rows
]);
