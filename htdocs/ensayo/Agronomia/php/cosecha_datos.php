<?php
header('Content-Type: application/json');
require 'db_postgres.php'; 

$limit  = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
$sort   = $_GET['sort'] ?? 'fecha_actividad';
$order  = $_GET['order'] ?? 'desc';

// Lista de columnas válidas para filtro (según tu HTML)
$campos_validos = [
  "fecha_actividad", "colaborador", "fecha_corte", "plantacion", "finca", "siembra",
  "lote", "parcela", "labor_especifica", "tipo_labor", "cod_contratista_maquina",
  "cod_contratista_colaborador", "hora_entrada", "hora_salida", "linea_entrada",
  "linea_salida", "total_personas", "unidad", "cantidad", "n_remision",
  "colaborador_contratista", "tipo_equipo", "cod_maquina", "cod_vagon"
];

// Filtros dinámicos
$where = [];
$params = [];

foreach ($_GET as $campo => $valor) {
  if (in_array($campo, $campos_validos) && $valor !== '') {
    $where[] = "$campo ILIKE :$campo";
    $params[":$campo"] = "%$valor%";
  }
}

$where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Total con filtros
$sql_total = "SELECT COUNT(*) FROM cosecha_fruta $where_sql";
$stmt_total = $pdo->prepare($sql_total);
$stmt_total->execute($params);
$total = $stmt_total->fetchColumn();

// Datos con filtros + orden + paginación
$sql_data = "SELECT * FROM cosecha_fruta $where_sql ORDER BY $sort $order LIMIT :limit OFFSET :offset";
$stmt_data = $pdo->prepare($sql_data);

foreach ($params as $key => $val) {
  $stmt_data->bindValue($key, $val);
}
$stmt_data->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt_data->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt_data->execute();

$rows = $stmt_data->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
  'total' => $total,
  'rows' => $rows
]);
