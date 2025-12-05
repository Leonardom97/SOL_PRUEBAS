<?php
// formulario_api.php
// API para manejar selects, búsqueda de usuarios/colaboradores, guardado de formularios y relaciones.
// Este archivo se coloca en assets/php/formulario_api.php (según uso desde JS del front-end).

// Apply security headers
require_once __DIR__ . '/../../../php/security_headers.php';

session_start();
require '../../../php/db_postgres.php'; // incluye conexión $pg

// Validar que existe una sesión activa
if (!isset($_SESSION['usuario_id'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no iniciada. Por favor inicie sesión.']);
    exit;
}

// Obtiene la acción enviada por GET o POST
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Función utilitaria para responder JSON y terminar ejecución
function jsonResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

/* Acción: Obtener datos para llenar un select HTML
   Parámetros esperados: tabla, col
   Devuelve filas con id y la columna indicada.
   Para tablas cap_* filtra por estado = 0 (activo).
*/
if ($action == 'get_select') {
    $tabla = $_GET['tabla'] ?? '';
    $col = $_GET['col'] ?? '';
    
    // SECURITY: Whitelist of allowed tables and columns to prevent SQL injection
    $allowedTables = [
        'cap_proceso' => ['proceso'],
        'cap_tema' => ['nombre'],
        'cap_lugar' => ['lugar'],
        'cap_tipo_actividad' => ['nombre'],
        'adm_roles' => ['nombre'],
        'adm_empresa' => ['emp_nombre'],
        'adm_cargos' => ['cargo'],
        'adm_área' => ['area', 'sub_area']
    ];
    
    // Validate table exists in whitelist
    if (!isset($allowedTables[$tabla])) {
        http_response_code(400);
        jsonResponse(['error' => 'Tabla no permitida']);
    }
    
    // Validate column exists in whitelist for this table
    if (!in_array($col, $allowedTables[$tabla])) {
        http_response_code(400);
        jsonResponse(['error' => 'Columna no permitida para esta tabla']);
    }

    // Solo muestra registros con estado = 0 para ciertas tablas específicas
    if (in_array($tabla, ['cap_proceso', 'cap_tema', 'cap_lugar', 'cap_tipo_actividad'])) {
        // Safe to use $tabla and $col now as they are validated against whitelist
        $stmt = $pg->prepare("SELECT id, \"$col\" FROM \"$tabla\" WHERE estado = 0 ORDER BY \"$col\" ASC");
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($datos);
        
    } else {
        // Para otras tablas, muestra todos los registros
        // Safe to use $tabla and $col now as they are validated against whitelist
        $stmt = $pg->prepare("SELECT id, \"$col\" FROM \"$tabla\" ORDER BY \"$col\" ASC");
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($datos);
    }

// Acción: Obtener información básica de usuario por cédula (tabla adm_usuarios)
} elseif ($action == 'get_usuario') {
    $cedula = $_GET['cedula'];
    $stmt = $pg->prepare("SELECT nombre1, nombre2, apellido1, apellido2 FROM adm_usuarios WHERE cedula = ?");
    $stmt->execute([$cedula]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse($row ?: []);

// Acción: Obtener información de colaborador por cédula (solo estados permitidos A/V/P)
} elseif ($action == 'get_colaborador') {
    $cedula = $_GET['cedula'];
    // Nota: Usar el nombre correcto de columna: ac_id_situación (con tilde) según la BD provista
    $stmt = $pg->prepare("SELECT * FROM adm_colaboradores WHERE ac_cedula = ? AND ac_id_situación IN ('A', 'V', 'P') LIMIT 1");
    $stmt->execute([$cedula]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse($row ?: []);

// Acción: Obtener nombres relacionados con colaborador (empresa, cargo, área, etc.)
} elseif ($action == 'get_colaborador_relations') {
    $empresa_id = $_GET['ac_empresa'];
    $cargo_id = $_GET['ac_id_cargo'];
    $area_id = $_GET['ac_id_area'];
    $sub_area_id = $_GET['ac_sub_area'];
    $rango_id = $_GET['ac_rango'];
    $situacion_id = $_GET['ac_id_situacion'];

    // Obtener nombre de la empresa
    $empresa = $pg->prepare("SELECT emp_nombre FROM adm_empresa WHERE emp_id = ?");
    $empresa->execute([$empresa_id]);
    $empresa_nombre = $empresa->fetchColumn();

    // Obtener nombre de cargo y rango (ambos en la misma tabla)
    $cargo = $pg->prepare("SELECT cargo, rango_cargo FROM adm_cargos WHERE id_cargo = ?");
    $cargo->execute([$cargo_id]);
    $cargo_row = $cargo->fetch(PDO::FETCH_ASSOC);
    $cargo_nombre = $cargo_row['cargo'] ?? '';
    $rango_nombre = $cargo_row['rango_cargo'] ?? '';

    // Obtener nombre del área
    $area = $pg->prepare("SELECT area FROM adm_área WHERE id_area = ?");
    $area->execute([$area_id]);
    $area_nombre = $area->fetchColumn();

    // Obtener nombre de la sub-área (si aplica)
    $sub_area = $pg->prepare("SELECT sub_area FROM adm_área WHERE id_area = ?");
    $sub_area->execute([$sub_area_id]);
    $sub_area_nombre = $sub_area->fetchColumn();

    // Obtener nombre de la situación
    $situacion = $pg->prepare("SELECT situación FROM adm_situación WHERE id = ?");
    $situacion->execute([$situacion_id]);
    $situacion_nombre = $situacion->fetchColumn();

    // Responder con todos los nombres relacionados
    jsonResponse([
        'empresa' => $empresa_nombre ?: '',
        'cargo' => $cargo_nombre ?: '',
        'area' => $area_nombre ?: '',
        'sub_area' => $sub_area_nombre ?: '',
        'rango' => $rango_nombre ?: '',
        'situacion' => $situacion_nombre ?: ''
    ]);

// Acción: Guardar un nuevo formulario de capacitación
} elseif ($action == 'save_formulario') {
    // Recibe los datos enviados como JSON
    $data = json_decode(file_get_contents('php://input'), true);

    // Valida que los campos obligatorios estén presentes
    $required = ['proceso', 'lugar', 'responsable_cedula', 'responsable_nombre', 'tipo_actividad', 'tema', 'hora_inicio', 'hora_final', 'fecha', 'asistentes'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '') || ($field == 'asistentes' && (!is_array($data[$field]) || count($data[$field]) == 0))) {
            jsonResponse(['success' => false, 'error' => "Falta campo obligatorio: $field"]);
        }
    }

    // Busca el id de usuario por cédula del responsable
    $stmt = $pg->prepare("SELECT id FROM adm_usuarios WHERE cedula = ?");
    $stmt->execute([$data['responsable_cedula']]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    $id_usuario = $usuario ? $usuario['id'] : null;

    // Si no se encuentra el responsable, devuelve error
    if (!$id_usuario) {
        jsonResponse(['success' => false, 'error' => 'Responsable no encontrado']);
    }

    // Obtiene el id del usuario que está en sesión (quien crea el formulario)
    $creado_por = $_SESSION['usuario_id'] ?? null;
    if (!$creado_por) {
        jsonResponse(['success' => false, 'error' => 'No hay sesión activa']);
    }

    // Inserta el formulario en la base de datos, guardando quién lo creó
    $stmt = $pg->prepare("INSERT INTO cap_formulario (id_proceso, id_lugar, id_usuario, id_tipo_actividad, id_tema, hora_inicio, hora_final, fecha, observaciones, creado_por, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) RETURNING id");
    $stmt->execute([
        $data['proceso'],
        $data['lugar'],
        $id_usuario,
        $data['tipo_actividad'],
        $data['tema'],
        $data['hora_inicio'],
        $data['hora_final'],
        $data['fecha'],
        $data['observaciones'] ?? '',
        $creado_por
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $id_formulario = $row['id'];

    // Prepara la inserción de asistentes al formulario
    $stmt_asistente = $pg->prepare("INSERT INTO cap_formulario_asistente (
            id_formulario, cedula, id_colaborador, estado_aprobacion, nombre, empresa, cargo, área, sub_área, rango, situacion
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )");
    
    // Prepara la consulta para buscar el colaborador por cédula (quitando caracteres no numéricos)
    $stmt_lookup = $pg->prepare("
        SELECT ac_id 
        FROM adm_colaboradores 
        WHERE regexp_replace(ac_cedula, '\D', '', 'g') = ?
        LIMIT 1
    ");
    
    $mapped_colaboradores = [];
    $unmapped_cedulas = [];

    // Recorre cada asistente, busca si existe como colaborador y lo inserta
    foreach ($data['asistentes'] as $asistente) {
        // Normaliza la cédula (solo números)
        $cedula_normalizada = preg_replace('/\D/', '', $asistente['cedula']);
        
        // Busca el id_colaborador por la cédula normalizada
        $id_colaborador = null;
        if (!empty($cedula_normalizada)) {
            $stmt_lookup->execute([$cedula_normalizada]);
            $colaborador = $stmt_lookup->fetch(PDO::FETCH_ASSOC);
            if ($colaborador) {
                $id_colaborador = $colaborador['ac_id'];
                $mapped_colaboradores[] = $id_colaborador;
            } else {
                // Guarda las cédulas no mapeadas para auditoría
                $unmapped_cedulas[] = [
                    'cedula' => $asistente['cedula'],
                    'nombre' => $asistente['nombre'] ?? 'N/A'
                ];
                error_log("Warning: Cedula not found in adm_colaboradores: " . $asistente['cedula'] . " (" . ($asistente['nombre'] ?? 'N/A') . ")");
            }
        }
        
        // Inserta el asistente; el id_colaborador puede ser NULL si no se encontró
        $stmt_asistente->execute([
            $id_formulario,
            $asistente['cedula'],
            $id_colaborador,  // Puede ser NULL si no se encuentra
            $asistente['estado_aprobacion'],
            $asistente['nombre'] ?? '',
            $asistente['empresa'] ?? '',
            $asistente['cargo'] ?? '',
            $asistente['area'] ?? '',
            $asistente['sub_area'] ?? '',
            $asistente['rango'] ?? '',
            $asistente['situacion'] ?? ''
        ]);
    }
    
    // Obtiene los ids de colaboradores únicos que fueron mapeados
    $mapped_colaboradores = array_unique($mapped_colaboradores);
    
    // Actualiza las notificaciones de capacitación para los colaboradores afectados
    try {
        // Llama a la función global para recalcular notificaciones
        // Nota: en el futuro se podría optimizar para aceptar solo los IDs afectados
        $pg->query("SELECT actualizar_notificaciones_capacitacion()");
    } catch (Exception $e) {
        // Si hay error, lo registra pero no afecta el guardado del formulario
        error_log("Error updating training notifications: " . $e->getMessage());
    }
    
    // Prepara la respuesta con información de auditoría
    $response = [
        'success' => true, 
        'id_formulario' => $id_formulario,
        'asistentes_mapeados' => count($mapped_colaboradores),
        'asistentes_total' => count($data['asistentes'])
    ];
    
    // Si hubo asistentes no mapeados, los incluye en la respuesta
    if (!empty($unmapped_cedulas)) {
        $response['asistentes_sin_mapear'] = $unmapped_cedulas;
        $response['warning'] = 'Algunos asistentes no pudieron ser mapeados a colaboradores. Revisar el log.';
    }
    
    // Responde con el resultado final
    jsonResponse($response);
}

// Si la acción no es reconocida, responde con error
jsonResponse(['success' => false, 'error' => 'Acción no reconocida']);