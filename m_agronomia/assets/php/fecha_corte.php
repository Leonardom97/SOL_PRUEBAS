<?php
// fecha_corte.php - API de fecha de corte para el módulo de agronomía.
ob_start(); // Start output buffering immediately

/**
 * fecha_corte.php
 *
 * API para la gestión de la fecha de corte en el módulo de agronomía.
 *
 * Funcionalidades:
 *  - GET: Consulta la fecha de corte actual.
 *  - POST/PUT: Actualiza o establece la fecha de corte (Requiere privilegios de Administrador).
 *
 * Detalles de implementación:
 *  - Utiliza un registro único con id_fc = 1 en la tabla agr_fecha_corte.
 *  - Todas las operaciones son auditadas mediante AuditLogger.
 *
 * Seguridad:
 *  - Validación de roles mediante sesión y encabezados.
 *  - Protección contra escrituras no autorizadas.
 */

// Define path to DB
$dbPath = __DIR__ . '/../../../php/db_postgres.php';

// Safe include to avoid Fatal Error crashing the socket
if (!file_exists($dbPath)) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Database configuration file not found at: ' . $dbPath]);
    exit;
}

try {
    require_once $dbPath;
} catch (Throwable $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Error including database file: ' . $e->getMessage()]);
    exit;
}

// Verify connection
if (!isset($pg) || !$pg) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed internally (variable $pg not set).']);
    exit;
}

// Limpiar cualquier salida previa
ob_clean();
header('Content-Type: application/json; charset=utf-8');
// Para desarrollo local dejamos CORS abierto; en producción limita a los orígenes que correspondan.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-User-Role');

session_start();
require_once __DIR__ . '/../../../php/audit_logger.php';
$logger = new AuditLogger();

// Manejo de petición CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = $pg; // Alias for compatibility with existing code structure

/**
 * Obtiene el rol del usuario actual.
 * 
 * Intenta obtener el rol desde:
 * 1. Sesión PHP ($_SESSION['role'])
 * 2. Header HTTP X-User-Role (fallback para pruebas)
 * 
 * @return string|null El rol del usuario o nulo si no se encuentra
 */
function obtener_rol()
{
    // Si usas sessions, activa session_start() y esto leerá $_SESSION['role']
    if (session_status() === PHP_SESSION_ACTIVE && !empty($_SESSION['role'])) {
        return $_SESSION['role'];
    }
    // Fallback para pruebas: header X-User-Role
    return $_SERVER['HTTP_X_USER_ROLE'] ?? null;
}

/**
 * Valida que una fecha tenga el formato ISO (YYYY-MM-DD).
 * 
 * @param string $f Fecha a validar
 * @return bool Verdadero si la fecha tiene el formato correcto
 */
function validar_fecha_iso($f)
{
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $f);
}

try {
    // ID fijo para el registro único de fecha de corte
    $ID_FIX = 1;
    $method = $_SERVER['REQUEST_METHOD'];

    // ========== Manejo de método GET ==========
    // Obtener la fecha de corte actual (id_fc = 1)
    if ($method === 'GET') {
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
    }

    // ========== Manejo de métodos POST/PUT ==========
    // Actualizar o crear la fecha de corte (id=1)
    if ($method === 'POST' || $method === 'PUT') {
        // Leer y decodificar el cuerpo de la petición
        $body = file_get_contents('php://input');
        $input = json_decode($body, true);
        $fecha = $input['fecha_corte'] ?? null;

        // Validar que se proporcione la fecha
        if (!$fecha) {
            http_response_code(400);
            echo json_encode(['message' => 'fecha_corte es requerida (YYYY-MM-DD)']);
            exit;
        }

        // Validar formato de la fecha
        if (!validar_fecha_iso($fecha)) {
            http_response_code(400);
            echo json_encode(['message' => 'fecha_corte debe ser YYYY-MM-DD']);
            exit;
        }

        // Iniciar transacción para garantizar atomicidad
        $pdo->beginTransaction();

        // Bloquear la fila id=1 si existe (row-level lock)
        $sel = $pdo->prepare("SELECT id_fc FROM agr_fecha_corte WHERE id_fc = :id FOR UPDATE");
        $sel->execute([':id' => $ID_FIX]);
        $row = $sel->fetch();

        // Obtener y normalizar el rol del usuario
        $rol = strtolower((string)(obtener_rol() ?? ''));

        if ($row) {
            // El registro existe: actualizar la fecha (requiere rol de Administrador)
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

            // AUDIT LOG
            $logger->log(
                $_SESSION['usuario_id'] ?? null,
                $_SESSION['tipo_usuario'] ?? 'colaborador',
                'UPDATE_FECHA_CORTE',
                'Actualización de fecha de corte',
                ['previous_fecha' => $row['fecha_corte'] ?? null, 'new_fecha' => $fecha]
            );

            http_response_code(200);
            echo json_encode(['message' => 'Fecha actualizada', 'id_fc' => $res['id_fc'], 'fecha_corte' => $res['fecha_corte']]);
            exit;
        } else {
            // El registro no existe: insertar con id_fc = 1
            // ON CONFLICT por seguridad en caso de inserción concurrente
            $ins = $pdo->prepare("INSERT INTO agr_fecha_corte (id_fc, fecha_corte) VALUES (:id, :fecha)
                                    ON CONFLICT (id_fc) DO UPDATE SET fecha_corte = EXCLUDED.fecha_corte
                                    RETURNING id_fc, fecha_corte");
            $ins->execute([':id' => $ID_FIX, ':fecha' => $fecha]);
            $res = $ins->fetch();

            // Intentar ajustar la secuencia si id_fc usa serial/sequence
            try {
                $pdo->exec("SELECT setval(pg_get_serial_sequence('agr_fecha_corte','id_fc'), (SELECT COALESCE(MAX(id_fc),1) FROM agr_fecha_corte))");
            } catch (Exception $e) {
                // Ignorar errores de setval (no crítico)
            }

            $pdo->commit();

            // AUDIT LOG
            $logger->log(
                $_SESSION['usuario_id'] ?? null,
                $_SESSION['tipo_usuario'] ?? 'colaborador',
                'CREATE_FECHA_CORTE',
                'Creación de fecha de corte',
                ['new_fecha' => $fecha]
            );

            http_response_code(201);
            echo json_encode(['message' => 'Fecha creada', 'id_fc' => $res['id_fc'], 'fecha_corte' => $res['fecha_corte']]);
            exit;
        }
    }

    // Método no permitido
    if ($method !== 'OPTIONS') { // Options handled at top
        http_response_code(405);
        echo json_encode(['message' => 'Método no permitido']);
    }
} catch (Throwable $e) {
    // Catch Throwable (inclusive Fatal Errors)
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
}
exit;
