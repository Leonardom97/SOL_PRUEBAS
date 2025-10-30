<?php
require_once 'db_postgres_prueba.php';
header('Content-Type: application/json');

$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$pageSize = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
$offset = ($page - 1) * $pageSize;

$where = [];
$params = [];
foreach ($_GET as $key => $value) {
    if (strpos($key, 'filtro_') === 0 && $value !== '') {
        $col = substr($key, 7);
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $col)) continue;
        $where[] = "\"$col\" ILIKE ?";
        $params[] = '%' . $value . '%';
    }
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$orderSql = '';
if (!empty($_GET['ordenColumna'])) {
    $ordenColumna = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['ordenColumna']);
    $ordenAsc = isset($_GET['ordenAsc']) && $_GET['ordenAsc'] == '0' ? 'DESC' : 'ASC';
    $orderSql = "ORDER BY \"$ordenColumna\" $ordenAsc";
}

$sql = "SELECT * FROM monitoreos_generales $whereSql $orderSql LIMIT $pageSize OFFSET $offset";
$stmt = $pg->prepare($sql);
$stmt->execute($params);
$datos = $stmt->fetchAll();

$sqlTotal = "SELECT COUNT(*) FROM monitoreos_generales $whereSql";
$stmtTotal = $pg->prepare($sqlTotal);
$stmtTotal->execute($params);
$total = $stmtTotal->fetchColumn();

echo json_encode([
    'datos' => $datos,
    'total' => intval($total)
]);
?>