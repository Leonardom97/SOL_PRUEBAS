<?php
header('Content-Type: application/json');
require 'db_postgres.php'; 

// Parámetros de paginación
$limit  = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

// Parámetros de ordenamiento
$sort  = $_GET['sort'] ?? 'fecha_actividad';
$order = $_GET['order'] ?? 'desc';

// Campos permitidos para filtrar 
$campos_permitidos = [
  "fecha_actividad", "responsable", "plantacion", "finca", "siembra", "lote", "parcela",
  "linea_entrada", "linea_salida", "hora_entrada", "hora_salida", "labor_especifica",
  "producto_aplicado", "dosis_kg", "unidad_aplicacion", "contratista_colaborador",
  "n_colaboradores", "colaboradores", "tipo_labor", "contratista_maquinaria", "n_operadores",
  "tipo_maquina", "nombre_operadores", "bultos_aplicados", "n_traslado", "kg_aplicados"
];

// Armado de condiciones de filtro
$condiciones = [];
$valores = [];

foreach ($_GET as $campo => $valor) {
  if (in_array($campo, $campos_permitidos) && $valor !== '') {
    $condiciones[] = "$campo ILIKE ?";
    $valores[] = "%$valor%";
  }
}

$where = count($condiciones) ? 'WHERE ' . implode(' AND ', $condiciones) : '';

// Consulta total de registros
try {
  $stmtTotal = $pdo->prepare("SELECT COUNT(*) FROM fertilizacion_organica $where");
  $stmtTotal->execute($valores);
  $total = $stmtTotal->fetchColumn();

  // Consulta de registros paginados y ordenados
  $sql = "SELECT * FROM fertilizacion_organica $where ORDER BY $sort $order LIMIT ? OFFSET ?";
  $stmt = $pdo->prepare($sql);
  foreach ($valores as $k => $v) {
    $stmt->bindValue($k + 1, $v, PDO::PARAM_STR);
  }
  $stmt->bindValue(count($valores) + 1, $limit, PDO::PARAM_INT);
  $stmt->bindValue(count($valores) + 2, $offset, PDO::PARAM_INT);
  $stmt->execute();

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'total' => $total,
    'rows' => $rows
  ]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode([
    'error' => 'Error al consultar datos',
    'message' => $e->getMessage()
  ]);
}
