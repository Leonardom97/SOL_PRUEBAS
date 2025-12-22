<?php
ob_start(); // Start output buffering immediately to catch any stray output/warnings

/**
 * manage_tab_permissions.php
 *
 * API para la gestión de permisos de pestañas por rol.
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

// Limpiar cualquier salida previa (warnings de includes, espacios en blanco, etc.)
ob_clean();
header('Content-Type: application/json');

/**
 * Normaliza nombres de roles ...

 * Elimina acentos, convierte a minúsculas y reemplaza caracteres no alfanuméricos.
 * 
 * Ejemplo: "Aux_Agronómico" -> "aux_agronomico"
 * 
 * @param string $s Nombre del rol original.
 * @return string Nombre normalizado.
 */
function normalize_role($s)
{
    // Fallback if mbstring is not enabled
    if (function_exists('mb_strtolower')) {
        $s = mb_strtolower($s, 'UTF-8');
    } else {
        $s = strtolower($s);
    }

    $s = str_replace(
        ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ'],
        ['a', 'e', 'i', 'o', 'u', 'n', 'a', 'e', 'i', 'o', 'u', 'n'],
        $s
    );
    // Reemplazar no alfanuméricos con _
    $s = preg_replace('/[^a-z0-9]/', '_', $s);
    return trim($s, '_');
}

/**
 * Obtiene mapa de roles ID <-> Nombre Normalizado
 */
function getRoleMap($pg)
{
    $stmt = $pg->query("SELECT id, nombre FROM public.adm_roles");
    $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $map = []; // string -> id (Para POST)
    $reverseMap = []; // id -> string (Para GET)

    foreach ($roles as $r) {
        $n = normalize_role($r['nombre']);
        $map[$n] = $r['id'];
        $reverseMap[$r['id']] = $n;

        // --- ALIAS MANUALES CRÍTICOS (Sincronizados con material-super.js) ---
        // El frontend envía/espera estos strings específicos.
        // Debemos asegurarnos de mapearlos al ID correcto de la BD.

        if (strpos($n, 'aux') !== false && strpos($n, 'agronom') !== false) {
            // DB: Aux_Agronómico (6) -> Front: aux_agronomico
            $map['aux_agronomico'] = $r['id'];
            $reverseMap[$r['id']] = 'aux_agronomico'; // Forzar salida amigable
        }

        if (strpos($n, 'asist') !== false && strpos($n, 'agron') !== false) {
            $map['asist_agronomico'] = $r['id'];
            $reverseMap[$r['id']] = 'asist_agronomico';
        }

        if (strpos($n, 'superv') !== false && strpos($n, 'agron') !== false) {
            $map['supervisor_agronomico'] = $r['id'];
            $reverseMap[$r['id']] = 'supervisor_agronomico';
        }

        if ($n == 'sup_logistica_1') {
            $map['sup_logistica1'] = $r['id'];
            $reverseMap[$r['id']] = 'sup_logistica1';
        }

        if ($n == 'administrador') {
            $map['administrador'] = $r['id'];
        }
    }
    return [$map, $reverseMap];
}

$method = $_SERVER['REQUEST_METHOD'];

// Verify DB Connection
if (!$pg) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed internally. Check server logs.']);
    exit;
}

try {
    // --- GET: Leer configuración desde BD y enviar JSON al Frontend ---
    if ($method === 'GET') {
        list($map, $reverseMap) = getRoleMap($pg);

        $sql = "SELECT tab_key, rol_id FROM public.agr_tab_permissions";
        $stmt = $pg->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $config = [];
        foreach ($rows as $row) {
            $key = $row['tab_key'];
            $rid = $row['rol_id'];

            if (!isset($config[$key])) {
                $config[$key] = ['key' => $key, 'roles' => []];
            }

            // Si el ID del rol existe en nuestro mapa, agregamos su nombre string
            if (isset($reverseMap[$rid])) {
                // Evitar duplicados si hay aliases
                if (!in_array($reverseMap[$rid], $config[$key]['roles'])) {
                    $config[$key]['roles'][] = $reverseMap[$rid];
                }
            }
        }

        // Ordenar y devolver como lista
        ksort($config);

        // Si la tabla está vacía, devolver array vacío (o defaults si se prefiere)
        echo json_encode(array_values($config));
        exit;
    }

    // --- POST: Guardar configuración desde Frontend a BD ---
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            exit;
        }

        list($roleMap, $reverseMap) = getRoleMap($pg);

        $pg->beginTransaction();

        // Estrategia: Limpiar tabla y re-insertar todo (Simple y efectivo para config global)
        $pg->exec("TRUNCATE TABLE public.agr_tab_permissions RESTART IDENTITY");

        $stmtInsert = $pg->prepare("INSERT INTO public.agr_tab_permissions (tab_key, rol_id) VALUES (:key, :rid)");

        $count = 0;
        foreach ($input as $tab) {
            $key = $tab['key'];
            if (empty($tab['roles'])) continue;

            // Usamos un SET para evitar insertar el mismo role_id varias veces para la misma tab
            // (Si el frontend manda 'aux_agronomico' y 'Aux_Agronómico' que mapean a lo mismo)
            $rolesToInsert = [];

            foreach ($tab['roles'] as $roleStr) {
                $rid = null;
                $nRole = normalize_role($roleStr);

                // Buscar ID en el mapa
                if (isset($roleMap[$roleStr])) $rid = $roleMap[$roleStr];
                elseif (isset($roleMap[$nRole])) $rid = $roleMap[$nRole];

                if ($rid) {
                    $rolesToInsert[] = $rid;
                }
            }

            $rolesToInsert = array_unique($rolesToInsert);

            foreach ($rolesToInsert as $rid) {
                $stmtInsert->execute([':key' => $key, ':rid' => $rid]);
                $count++;
            }
        }

        $pg->commit();

        // AUDIT LOG
        require_once __DIR__ . '/../../../php/audit_logger.php';
        $logger = new AuditLogger();
        $logger->log(
            $_SESSION['usuario_id'] ?? null,
            $_SESSION['tipo_usuario'] ?? 'colaborador',
            'UPDATE_TAB_PERMISSIONS',
            'Actualización de permisos de pestañas (Configuración Web)',
            ['count' => $count]
        );

        echo json_encode(['success' => true, 'count' => $count, 'message' => 'Configuracion guardada en Base de Datos']);
        exit;
    }
} catch (Throwable $e) {
    // Catch Throwable to handle both Exceptions and Fatal Errors
    if (isset($pg) && $pg instanceof PDO && $pg->inTransaction()) {
        $pg->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
}
