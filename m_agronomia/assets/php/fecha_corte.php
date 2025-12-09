<?php


header('Content-Type: application/json; charset=utf-8');
// Para desarrollo local dejamos CORS abierto; en producción limita a los orígenes que correspondan.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-User-Role');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Configuración DB (usa las credenciales que proporcionaste) ----------
$host = 'localhost';
$db   = 'web_osm';
$user = 'postgres';
$pass = '12345';
$port = '5432';
// --------------------------------------------------------------------------------

$dsn = "pgsql:host={$host};port={$port};dbname={$db};";
try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed']);
    exit;
}



function obtener_rol() {
    // Si usas sessions, activa session_start() y esto leerá $_SESSION['role']
    if (session_status() === PHP_SESSION_ACTIVE && !empty($_SESSION['role'])) {
        return $_SESSION['role'];
    }
    // Fallback para pruebas: header X-User-Role
    return $_SERVER['HTTP_X_USER_ROLE'] ?? null;
}

function validar_fecha_iso($f) {
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $f);
}

$ID_FIX = 1;
$method = $_SERVER['REQUEST_METHOD'];

// GET -> devolver la fila id_fc = 1 si existe
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT id_fc, fecha_corte FROM agr_fecha_corte WHERE id_fc = :id LIMIT 1");
        $stmt->execute([':id' => $ID_FIX]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['message' => 'No existe fecha de corte']);
            exit;
        }
        echo json_encode($row);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al leer la BD', 'detail' => $e->getMessage()]);
        exit;
    }
}

// POST/PUT -> actualizar o crear id=1
if ($method === 'POST' || $method === 'PUT') {
    $body = file_get_contents('php://input');
    $input = json_decode($body, true);
    $fecha = $input['fecha_corte'] ?? null;

    if (!$fecha) {
        http_response_code(400);
        echo json_encode(['message' => 'fecha_corte es requerida (YYYY-MM-DD)']);
        exit;
    }
    if (!validar_fecha_iso($fecha)) {
        http_response_code(400);
        echo json_encode(['message' => 'fecha_corte debe ser YYYY-MM-DD']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Bloquear la fila id=1 si existe
        $sel = $pdo->prepare("SELECT id_fc FROM agr_fecha_corte WHERE id_fc = :id FOR UPDATE");
        $sel->execute([':id' => $ID_FIX]);
        $row = $sel->fetch();

        $rol = strtolower((string)(obtener_rol() ?? ''));

        if ($row) {
            // Existe: actualizar -> requiere Administrador
            if (strpos($rol, 'administrador') === false) {
                $pdo->rollBack();
                http_response_code(403);
                echo json_encode(['message' => 'Solo Administrador puede actualizar la fecha']);
                exit;
            }

            $upd = $pdo->prepare("UPDATE agr_fecha_corte SET fecha_corte = :fecha WHERE id_fc = :id RETURNING id_fc, fecha_corte");
            $upd->execute([':fecha' => $fecha, ':id' => $ID_FIX]);
            $res = $upd->fetch();
            $pdo->commit();

            http_response_code(200);
            echo json_encode(['message' => 'Fecha actualizada', 'id_fc' => $res['id_fc'], 'fecha_corte' => $res['fecha_corte']]);
            exit;
        } else {
            // No existe: insertar con id_fc = 1 (ON CONFLICT por seguridad)
            $ins = $pdo->prepare("INSERT INTO agr_fecha_corte (id_fc, fecha_corte) VALUES (:id, :fecha)
                                  ON CONFLICT (id_fc) DO UPDATE SET fecha_corte = EXCLUDED.fecha_corte
                                  RETURNING id_fc, fecha_corte");
            $ins->execute([':id' => $ID_FIX, ':fecha' => $fecha]);
            $res = $ins->fetch();

            // Intentar ajustar la secuencia si id_fc usa serial/sequence (no crítico)
            try {
                $pdo->exec("SELECT setval(pg_get_serial_sequence('agr_fecha_corte','id_fc'), (SELECT COALESCE(MAX(id_fc),1) FROM agr_fecha_corte))");
            } catch (Exception $e) {
                // ignorar errores de setval
            }

            $pdo->commit();

            http_response_code(201);
            echo json_encode(['message' => 'Fecha creada', 'id_fc' => $res['id_fc'], 'fecha_corte' => $res['fecha_corte']]);
            exit;
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Error al guardar', 'error' => $e->getMessage()]);
        exit;
    }
}

// Método no permitido
http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
exit;
?>