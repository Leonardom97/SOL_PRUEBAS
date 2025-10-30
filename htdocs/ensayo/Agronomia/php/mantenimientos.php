<?php
<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
require 'db_postgres.php'; 

$limit  = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
$sort   = $_GET['sort'] ?? 'fecha_actividad';
$order  = $_GET['order'] ?? 'desc';

$campos_validos = [
  "fecha_actividad", "responsable", "plantacion", "finca", "siembra",
  "lote", "parcela", "labor_especifica", "observacion", "contratista",
  "codigo", "colaborador", "personas", "hora_entrada", "hora_salida",
  "linea_entrada", "linea_salida", "cantidad", "unidad",
  "maquina", "tractorista", "nuevo_operario"
];

$where = [];
$params = [];

foreach ($_GET as $campo => $valor) {
  if (in_array($campo, $campos_validos) && $valor !== '') {
    $where[] = "$campo ILIKE :$campo";
    $params[":$campo"] = "%$valor%";
  }
}

$where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql_total = "SELECT COUNT(*) FROM mantenimientos $where_sql";
$stmt_total = $pg->prepare($sql_total);
$stmt_total->execute($params);
$total = $stmt_total->fetchColumn();

$sql_data = "SELECT * FROM mantenimientos $where_sql ORDER BY $sort $order LIMIT :limit OFFSET :offset";
$stmt_data = $pg->prepare($sql_data);

foreach ($params as $key => $val) {
  $stmt_data->bindValue($key, $val);
}
$stmt_data->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt_data->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt_data->execute();

$rows = $stmt_data->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
  'total' => $total,
  'rows'  => $rows
]);