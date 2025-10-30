<?php
header('Content-Type: application/json');
require 'db.php';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Paginación
    $limit  = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
    $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
    $sort   = $_GET['sort'] ?? 'fecha_actividad';
    $order  = $_GET['order'] ?? 'desc';

    // Campos válidos para filtrar (basados en tu tabla HTML)
    $campos_validos = [
        "fecha_actividad", "responsable", "fecha_corte", "plantacion", "finca", "siembra",
        "lote", "parcela", "labor_especifica", "tipo_corte", "equipo", "cod_colaborador_contratista",
        "n_grupo_dia", "hora_entrada", "hora_salida", "linea_entrada", "linea_salida",
        "total_personas", "unidad", "cantidad", "peso_promedio_lonas", "total_persona_dia",
        "colaborador", "nuevo_operador"
    ];

    // Filtros dinámicos
    $where = [];
    $params = [];

    foreach ($_GET as $campo => $valor) {
        if (in_array($campo, $campos_validos) && $valor !== '') {
            $where[] = "$campo ILIKE :$campo";
            $params[":$campo"] = '%' . $valor . '%';
        }
    }

    $where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Total filtrado
    $sql_total = "SELECT COUNT(*) FROM reco_fruta $where_sql";
    $stmt_total = $pdo->prepare($sql_total);
    $stmt_total->execute($params);
    $total = $stmt_total->fetchColumn();

    // Consulta de datos
    $sql = "SELECT * FROM reco_fruta $where_sql ORDER BY $sort $order LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);

    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();
    $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'total' => $total,
        'rows'  => $datos
    ]);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
