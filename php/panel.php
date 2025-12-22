<?php
// www/php/panel.php
// Endpoint que devuelve JSON con los datos mínimos para el panel.
// Usa la conexión definida en www/php/db_postgres.php (require_once).

header('Content-Type: application/json; charset=utf-8');
// Para pruebas locales puedes dejarlo en '*' ; en producción restringe al origen adecuado.
header('Access-Control-Allow-Origin: *');

try {
    // incluir la conexión; db_postgres.php define $pg = new PDO(...).
    require_once __DIR__ . '/db_postgres.php';

    // Validar conexión a Postgres
    if (!isset($pg) || !($pg instanceof PDO)) {
        // Si falla Postgres, inicializamos valores en 0/null pero NO matamos el script
        // para permitir que SQL Server (Báscula) intente cargar sus datos.
        $pg = null;
        error_log("[panel.php] PostgreSQL no disponible. Continuando con carga parcial.");
    }

    // --- 1. DATOS DE POSTGRESQL ---
    $usuarios = 0;
    $colaboradores = 0;
    $capacitaciones_total = 0;
    $fecha_corte = null;
    $capacitaciones_recientes = [];
    $capacitaciones_mes = 0;

    if ($pg) {
        // Usuarios
        $stmt = $pg->query("SELECT COUNT(*)::int AS total FROM public.adm_usuarios");
        $usuarios = (int) ($stmt->fetchColumn() ?? 0);

        // Colaboradores (Activos, Vacaciones, Permiso)
        // Se asume que ac_id_situación contiene 'A','V','P'
        $stmt = $pg->query("SELECT COUNT(*)::int AS total FROM public.adm_colaboradores WHERE ac_id_situación IN ('A', 'V', 'P')");
        $colaboradores = (int) ($stmt->fetchColumn() ?? 0);

        // Capacitaciones Total
        $stmt = $pg->query("SELECT COUNT(*)::int AS total FROM public.cap_formulario");
        $capacitaciones_total = (int) ($stmt->fetchColumn() ?? 0);

        // Fecha Corte
        $stmt = $pg->query("SELECT fecha_corte::text AS fecha_corte FROM public.agr_fecha_corte ORDER BY id_fc DESC LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['fecha_corte'])) $fecha_corte = $row['fecha_corte'];

        // Capacitaciones Recientes (Mini tabla)
        $sql = "
            SELECT
              f.id,
              COALESCE(t.nombre, '') AS nombre,
              f.fecha::text AS fecha,
              COUNT(a.id)::int AS asistentes
            FROM public.cap_formulario f
            LEFT JOIN public.cap_tema t ON f.id_tema = t.id
            LEFT JOIN public.cap_formulario_asistente a ON a.id_formulario = f.id
            GROUP BY f.id, t.nombre, f.fecha
            ORDER BY f.fecha DESC, f.id DESC
            LIMIT 5
        ";
        $stmt = $pg->query($sql);
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $capacitaciones_recientes[] = [
                'id' => isset($r['id']) ? (int)$r['id'] : null,
                'nombre' => $r['nombre'],
                'fecha' => $r['fecha'],
                'asistentes' => isset($r['asistentes']) ? (int)$r['asistentes'] : 0
            ];
        }

        // Capacitaciones por Periodo (Matemática integral)
        // Default: mes actual. Soporta ?period_capacitaciones=month|year|6months|2months
        // Legacy support for ?period=
        $period_cap = $_GET['period_capacitaciones'] ?? ($_GET['period'] ?? 'month');
        $start_cap = $_GET['start_cap'] ?? null;
        $end_cap = $_GET['end_cap'] ?? null;
        
        $dateCondition = "fecha >= date_trunc('month', current_date)"; // Default

        switch($period_cap) {
            case 'today':
                $dateCondition = "fecha = current_date";
                break;
            case 'yesterday':
                $dateCondition = "fecha = current_date - 1";
                break;
            case 'week':
                $dateCondition = "fecha >= current_date - interval '7 days'";
                break;
            case 'year':
                $dateCondition = "fecha >= date_trunc('year', current_date)"; // This year
                break;
            case 'total':
                $dateCondition = "1=1";
                break;
            case 'month':
            default:
                $dateCondition = "fecha >= date_trunc('month', current_date)"; // This month
                break;
        }

        $stmt = $pg->prepare("SELECT COUNT(*)::int as total FROM cap_formulario WHERE $dateCondition");
        $stmt->execute();
        $capacitaciones_mes = (int) ($stmt->fetchColumn() ?? 0);

        // Evaluaciones Realizadas (Total)
        $stmt = $pg->query("SELECT COUNT(*)::int AS total FROM public.cap_eval_respuestas WHERE estado = 'aprobado'");
        $evaluaciones_realizadas = (int) ($stmt->fetchColumn() ?? 0);

        // Chart: Evaluaciones Programadas por Tema
        $stmtChart = $pg->query("
            SELECT t.nombre as tema, COUNT(eh.id) as total
            FROM cap_eval_header eh
            JOIN cap_formulario cf ON eh.id_formulario = cf.id
            JOIN cap_tema t ON cf.id_tema = t.id
            GROUP BY t.nombre
            ORDER BY total DESC
        ");
        $chart_evaluaciones_tema = $stmtChart->fetchAll(PDO::FETCH_ASSOC);
    }

    // --- 2. DATOS DE SQL SERVER (BÁSCULA) ---
    // Inicializar variables de báscula por defecto
    $pesadas_count = 0;
    $chart_pesadas = [];
    $chart_productos = [];

    // Intentar conectar a SQL Server
    try {
        $db_sqlserver_path = __DIR__ . '/db_sqlserver.php';
        if (file_exists($db_sqlserver_path)) {
            require_once $db_sqlserver_path;
            
            if (isset($sqlsrvBascula) && $sqlsrvBascula instanceof PDO) {
                // 1. Pesadas KPI (Filtrable)
                $period_pesadas_kpi = $_GET['period_pesadas_kpi'] ?? 'month';
                $period_pesadas_chart = $_GET['period_pesadas_chart'] ?? 'month';

                // Helper function for where clause
                function getWhereClause($period) {
                    $where = "fecha_entrada >= DATEADD(day, -30, GETDATE())"; // Default Month
                    if ($period === 'today') {
                        $where = "fecha_entrada >= CAST(GETDATE() AS DATE) AND fecha_entrada < CAST(DATEADD(day, 1, GETDATE()) AS DATE)";
                    } elseif ($period === 'yesterday') {
                        $where = "fecha_entrada >= CAST(DATEADD(day, -1, GETDATE()) AS DATE) AND fecha_entrada < CAST(GETDATE() AS DATE)";
                    } elseif ($period === 'week') {
                        $where = "fecha_entrada >= DATEADD(day, -7, GETDATE())";
                    } elseif ($period === 'year') {
                        $where = "fecha_entrada >= DATEADD(month, -12, GETDATE())";
                    } elseif ($period === 'total') {
                        $where = "1=1";
                    }
                    return $where;
                }

                $whereClauseKPI = getWhereClause($period_pesadas_kpi);
                $whereClauseChart = getWhereClause($period_pesadas_chart);

                // KPI Count
                $sql = "SELECT COUNT(*) as total FROM trans_pesadas WHERE $whereClauseKPI";
                $stmt = $sqlsrvBascula->query($sql);
                $pesadas_count = (int)($stmt->fetchColumn() ?? 0);

                // 2. Gráfico: Pesadas
                // Grouping logic based on chart period
                if ($period_pesadas_chart === 'year' || $period_pesadas_chart === 'total') {
                     // Group by Month (YYYY-MM)
                     $stmt = $sqlsrvBascula->query("
                        SELECT CONVERT(varchar(7), fecha_entrada, 120) + '-01' as fecha, COUNT(*) as total 
                        FROM trans_pesadas 
                        WHERE $whereClauseChart
                        GROUP BY CONVERT(varchar(7), fecha_entrada, 120)
                        ORDER BY fecha ASC
                    ");
                } else {
                    // Group by Day (YYYY-MM-DD)
                    $stmt = $sqlsrvBascula->query("
                        SELECT CONVERT(varchar, fecha_entrada, 23) as fecha, COUNT(*) as total 
                        FROM trans_pesadas 
                        WHERE $whereClauseChart
                        GROUP BY CONVERT(varchar, fecha_entrada, 23)
                        ORDER BY fecha ASC
                    ");
                }
                $chart_pesadas = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // 3. Gráfico: Distribución por Producto (Top 5)
                $stmt = $sqlsrvBascula->query("
                    SELECT TOP 5 p.nombre as nombre_producto, COUNT(*) as total
                    FROM trans_pesadas tp
                    LEFT JOIN tipos_productos p ON tp.tp_codigo = p.sap_codigo
                    WHERE tp.fecha_entrada >= DATEADD(day, -30, GETDATE())
                    GROUP BY p.nombre
                    ORDER BY total DESC
                ");
                $chart_productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
        }
    } catch (Exception $e) {
        error_log("[panel.php] SQL Server error: " . $e->getMessage());
    }

    echo json_encode([
        'ok' => true,
        'usuarios' => $usuarios,
        'colaboradores' => $colaboradores,
        'capacitaciones_total' => $capacitaciones_total,
        'fecha_corte' => $fecha_corte,
        'capacitaciones_recientes' => $capacitaciones_recientes,
        'pesadas_count' => $pesadas_count, 
        'capacitaciones_mes' => $capacitaciones_mes,
        'evaluaciones_realizadas' => $evaluaciones_realizadas,
        'chart_pesadas' => $chart_pesadas,
        'chart_productos' => $chart_productos,
        'chart_evaluaciones_tema' => $chart_evaluaciones_tema
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("[panel.php] DB error: " . $e->getMessage());
    echo json_encode([
        'ok' => false,
        'error' => 'DB_ERROR',
        'message' => 'Error en la base de datos'
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    error_log("[panel.php] General error: " . $e->getMessage());
    echo json_encode([
        'ok' => false,
        'error' => 'SERVER_ERROR',
        'message' => 'Error interno'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
?>