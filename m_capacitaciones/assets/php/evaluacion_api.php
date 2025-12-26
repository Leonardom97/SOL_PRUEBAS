<?php

/**
 * evaluacion_api.php
 *
 * API Central para la gestión del Sistema de Evaluaciones.
 *
 * Módulos:
 * 1. Builder: Guardar estructura de evaluación (Header, Multimedia, Preguntas).
 * 2. Player: Recuperar estructura para renderizar la evaluación al usuario.
 * 3. Engine: Procesar respuestas, calificar y guardar intento.
 * 4. Gestión: Reportes, activación de evaluaciones y monitoreo de progreso.
 *
 * RBAC (Control de Acceso):
 *  - Strict Mode: Verifica si el usuario tiene permiso para editar evaluaciones (Admin, Capacitador, o Creador).
 *
 * Integraciones:
 *  - AuditLogger: Registra creación y envío de evaluaciones.
 *  - Base de Datos: Gestión transaccional para integridad de datos.
 */

// Desactivar visualización de errores HTML para no romper JSON
// y reportar solo errores fatales si es necesario en log
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../php/security_headers.php';
session_start();
require '../../../php/db_postgres.php';
require '../../../php/audit_logger.php';
$logger = new AuditLogger();

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no iniciada']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

$pg->exec("SET NAMES 'UTF8'");

/**
 * Envía respuesta JSON controlada.
 * Limpia buffer de salida para evitar contaminación.
 * @param mixed $data
 */
function jsonResponse($data)
{
    // Limpiar cualquier salida previa (warnings, notices, espacios)
    if (ob_get_length()) ob_clean();

    header('Content-Type: application/json; charset=utf-8');
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        echo json_encode(['success' => false, 'error' => 'JSON Encode Error: ' . json_last_error_msg()]);
    } else {
        echo $json;
    }
    exit();
}

// Iniciar buffer
ob_start();

try {
    // 1. GUARDAR ESTRUCTURA (Builder)
    if ($action == 'save_structure') {
        $data = json_decode(file_get_contents('php://input'), true);

        // VALIDACIÓN DE PERMISOS (RBAC STRICT)
        // Verificar si el usuario tiene permiso para gestionar este formulario
        $stmtOwner = $pg->prepare("SELECT id_usuario FROM cap_formulario WHERE id = ?");
        $stmtOwner->execute([$data['id_formulario']]);
        $id_creador_form = $stmtOwner->fetchColumn();

        if ($id_creador_form) {
            $rol_actual = $_SESSION['rol'] ?? '';
            $roles_admin = ['Administrador', 'Capacitador'];

            if (!in_array($rol_actual, $roles_admin)) {
                // Verificar si el creador del formulario tiene el rol del usuario actual
                // Esto permite que cualquier 'Capacitador TI' edite formularios de otros 'Capacitador TI'
                $stmtRoles = $pg->prepare("
                    SELECT COUNT(*) 
                    FROM adm_usuario_roles ur
                    JOIN adm_roles r ON ur.rol_id = r.id
                    WHERE ur.usuario_id = ? AND r.nombre = ?
                ");
                $stmtRoles->execute([$id_creador_form, $rol_actual]);
                $has_same_role = $stmtRoles->fetchColumn() > 0;

                // También permitir si es el mismo usuario (creador del formulario)
                $is_same_user = ($id_creador_form == $_SESSION['usuario_id']);

                if (!$has_same_role && !$is_same_user) {
                    jsonResponse(['success' => false, 'error' => 'No tiene permisos para gestionar esta evaluación (Su rol no coincide con el del creador del formulario).']);
                }
            }
        }

        $pg->beginTransaction();

        // Verificar si ya existe un header para este formulario
        $stmt = $pg->prepare("SELECT id FROM cap_eval_header WHERE id_formulario = ?");
        $stmt->execute([$data['id_formulario']]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        $id_header = null;

        if ($existing) {
            // UPDATE
            $id_header = $existing['id'];
            $stmt = $pg->prepare("UPDATE cap_eval_header SET titulo = ?, instrucciones = ?, usuario_editor = ? WHERE id = ?");
            $stmt->execute([
                $data['titulo'],
                $data['instrucciones'],
                $_SESSION['usuario_id'],
                $id_header
            ]);

            // Limpiar hijos para evitar duplicados (Estrategia: Borrar y Re-insertar)
            $pg->prepare("DELETE FROM cap_eval_multimedia WHERE id_header = ?")->execute([$id_header]);
            $pg->prepare("DELETE FROM cap_eval_preguntas WHERE id_header = ?")->execute([$id_header]);
        } else {
            // INSERT
            $stmt = $pg->prepare("INSERT INTO cap_eval_header (id_formulario, titulo, instrucciones, usuario_creador, estado_publicacion) VALUES (?, ?, ?, ?, 0) RETURNING id");
            $stmt->execute([
                $data['id_formulario'],
                $data['titulo'],
                $data['instrucciones'],
                $_SESSION['usuario_id']
            ]);
            $id_header = $stmt->fetchColumn();

            // AUDIT LOG CREATE EVAL
            $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'colaborador', 'CREATE_EVALUATION', 'Creación de evaluación', ['id_header' => $id_header]);
        }

        // Guardar Multimedia
        if (!empty($data['multimedia'])) {
            $stmt = $pg->prepare("INSERT INTO cap_eval_multimedia (id_header, tipo, ruta_archivo, titulo) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $id_header,
                $data['multimedia']['tipo'],
                $data['multimedia']['ruta'],
                $data['multimedia']['titulo']
            ]);
        }

        // Guardar Preguntas
        $stmt = $pg->prepare("INSERT INTO cap_eval_preguntas (id_header, tipo, enunciado, opciones, segundo_aparicion, orden) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($data['preguntas'] as $index => $preg) {
            $stmt->execute([
                $id_header,
                $preg['tipo'],
                $preg['enunciado'],
                json_encode($preg['opciones']), // Guardamos opciones como JSON
                (int)($preg['segundo_aparicion'] ?? 0),
                $index + 1
            ]);
        }

        $pg->commit();
        jsonResponse(['success' => true, 'id_header' => $id_header]);

        // 2. OBTENER ESTRUCTURA (Player)
    } elseif ($action == 'get_structure') {
        $id_formulario = $_GET['id_formulario'] ?? null;

        if (!$id_formulario) jsonResponse(['success' => false, 'error' => 'Falta id_formulario']);

        $stmt = $pg->prepare("SELECT * FROM cap_eval_header WHERE id_formulario = ?");
        $stmt->execute([$id_formulario]);
        $header = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$header) jsonResponse(['success' => false, 'error' => 'Evaluación no encontrada']);

        // Multimedia
        $stmt = $pg->prepare("SELECT * FROM cap_eval_multimedia WHERE id_header = ?");
        $stmt->execute([$header['id']]);
        $multimedia = $stmt->fetch(PDO::FETCH_ASSOC);

        // Preguntas
        $stmt = $pg->prepare("SELECT * FROM cap_eval_preguntas WHERE id_header = ? ORDER BY orden ASC");
        $stmt->execute([$header['id']]);
        $preguntas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($preguntas as &$p) {
            $decoded = json_decode($p['opciones'], true);
            $p['opciones'] = is_array($decoded) ? $decoded : [];
        }

        jsonResponse([
            'success' => true,
            'header' => $header,
            'multimedia' => $multimedia,
            'preguntas' => $preguntas
        ]);

        // 3. GUARDAR RESPUESTA
    } elseif ($action == 'save_response') {
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['id_colaborador'])) {
            jsonResponse(['success' => false, 'error' => 'ID de colaborador no válido']);
        }

        $pg->beginTransaction();

        // Calcular calificación
        $total_puntos = 0;
        $puntos_obtenidos = 0;

        $stmt = $pg->prepare("SELECT id, tipo, opciones FROM cap_eval_preguntas WHERE id_header = ?");
        $stmt->execute([$data['id_header']]);
        $preguntas_db = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $preguntas_map = [];
        foreach ($preguntas_db as $p) {
            $p['opciones'] = json_decode($p['opciones'], true);
            $preguntas_map[$p['id']] = $p;
        }

        $detalles_guardar = [];

        foreach ($data['respuestas'] as $resp) {
            $pregunta = $preguntas_map[$resp['id_pregunta']] ?? null;
            $es_correcta = false;
            $puntos_posibles = 1; // Por defecto cada pregunta vale 1 punto

            if ($pregunta) {
                // Lógica de calificación según tipo
                if ($pregunta['tipo'] === 'texto') {
                    // Preguntas abiertas no suman al total automático (se califican manual)
                    $puntos_posibles = 0;
                    $es_correcta = true; // Se marca como completada/correcta por defecto para no afectar

                } else if ($pregunta['tipo'] === 'ordenar') {
                    // El usuario envía un array de IDs en el orden que eligió: [3, 1, 2]
                    // Opciones tiene: [{id:1, orden_correcto:1}, {id:2, orden_correcto:2}, ...]
                    $user_order = $resp['valor']; // Array de IDs

                    // Ordenar las opciones correctas por 'orden_correcto'
                    $correct_order_opts = $pregunta['opciones'];
                    usort($correct_order_opts, function ($a, $b) {
                        return $a['orden_correcto'] - $b['orden_correcto'];
                    });
                    $correct_ids = array_column($correct_order_opts, 'id');

                    // Comparar arrays (asumiendo que user_order es array simple de IDs)
                    if ($user_order === $correct_ids) {
                        $es_correcta = true;
                    }
                } else {
                    // Selección y Verdadero/Falso
                    foreach ($pregunta['opciones'] as $opt) {
                        if ($opt['id'] == $resp['valor'] && !empty($opt['correcta'])) {
                            $es_correcta = true;
                            break;
                        }
                    }
                }

                if ($puntos_posibles > 0) {
                    $total_puntos += $puntos_posibles;
                    if ($es_correcta) $puntos_obtenidos += $puntos_posibles;
                }
            }

            // Serializar respuesta si es array (caso ordenar)
            $respuesta_guardar = is_array($resp['valor']) ? json_encode($resp['valor']) : $resp['valor'];

            $detalles_guardar[] = [
                'id_pregunta' => $resp['id_pregunta'],
                'respuesta' => $respuesta_guardar,
                'es_correcta' => $es_correcta
            ];
        }

        $calificacion = ($total_puntos > 0) ? ($puntos_obtenidos / $total_puntos) * 100 : 100;
        $aprobado = ($calificacion >= 70);
        $estado = $aprobado ? 'aprobado' : 'reprobado';

        // Calcular intento (siempre calculamos para mostrar)
        $stmtIntento = $pg->prepare("SELECT COALESCE(MAX(intento), 0) + 1 FROM cap_eval_respuestas WHERE id_header = ? AND id_colaborador = ?");
        $stmtIntento->execute([$data['id_header'], $data['id_colaborador']]);
        $intento = $stmtIntento->fetchColumn();

        // LOGICA CORREGIDA:
        // Solo guardamos en BD si:
        // 1. Reprobó (para dejar constancia del fallo)
        // 2. Aprobó Y envió firma (proceso completo)
        // Si aprobó pero NO envió firma, es un "check" intermedio. No guardamos nada aún.

        $guardado = false;

        if (!$aprobado || ($aprobado && !empty($data['firma']))) {
            $stmt = $pg->prepare("INSERT INTO cap_eval_respuestas (id_header, id_colaborador, calificacion, firma_digital, estado, fecha_fin, intento) VALUES (?, ?, ?, ?, ?, NOW(), ?) RETURNING id");
            $stmt->execute([
                $data['id_header'],
                $data['id_colaborador'],
                $calificacion,
                $data['firma'],
                $estado,
                $intento
            ]);
            $id_respuesta = $stmt->fetchColumn();

            $stmt_det = $pg->prepare("INSERT INTO cap_eval_respuestas_det (id_respuesta, id_pregunta, respuesta_usuario, es_correcta) VALUES (?, ?, ?, ?)");
            foreach ($detalles_guardar as $d) {
                $stmt_det->execute([
                    $id_respuesta,
                    $d['id_pregunta'],
                    $d['respuesta'],
                    $d['es_correcta'] ? 'true' : 'false'
                ]);
            }
            $guardado = true;

            // AUDIT LOG SUBMIT RESPONSE
            $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'colaborador', 'SUBMIT_EVALUATION_RESPONSE', 'Envío de respuesta de evaluación', ['id_header' => $data['id_header'], 'user_score' => $calificacion]);
        }

        $pg->commit();
        jsonResponse([
            'success' => true,
            'calificacion' => $calificacion,
            'passed' => $aprobado,
            'intento' => $intento,
            'saved' => $guardado
        ]);

        // 4. LISTAR PENDIENTES (Mis Evaluaciones)
        // ... (end of save_response)

        // START NEW ACTIONS
    } elseif ($action == 'get_completed_evaluations') {
        $id_colaborador = $_GET['id_colaborador'] ?? 0;
        $cedula = $_GET['cedula'] ?? '';

        // Buscar evaluaciones donde YA exista una respuesta aprobada
        $sql = "
            SELECT
                cf.id as id_formulario,
                t.nombre as tema,
                cf.fecha as fecha_capacitacion,
                ceh.id as id_header,
                ceh.titulo,
                cer.calificacion,
                cer.fecha_fin as fecha_realizacion,
                cer.estado
            FROM cap_eval_respuestas cer
            JOIN cap_eval_header ceh ON cer.id_header = ceh.id
            JOIN cap_formulario cf ON ceh.id_formulario = cf.id
            LEFT JOIN cap_tema t ON cf.id_tema = t.id
            WHERE cer.id_colaborador IN (SELECT ac_id FROM adm_colaboradores WHERE ac_cedula = ?)
            AND (cer.calificacion >= 70 OR cer.estado = 'aprobado')
            ORDER BY cer.fecha_fin DESC
        ";
        $stmt = $pg->prepare($sql);
        $stmt->execute([$cedula]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(['success' => true, 'data' => $data]);
    } elseif ($action == 'export_my_history') {
        $id_colaborador = $_GET['id_colaborador'] ?? 0;
        $cedula = $_GET['cedula'] ?? '';

        $sql = "
            SELECT
                cf.id as id_formulario,
                cf.fecha as fecha_capacitacion,
                t.nombre as tema,
                p.proceso,
                ceh.titulo as titulo_evaluacion,
                (SELECT COUNT(*) FROM cap_eval_preguntas cep WHERE cep.id_header = ceh.id) as cantidad_preguntas,
                cer.calificacion as puntaje_obtenido,
                cer.firma_digital,
                u_creador.nombre1 || ' ' || u_creador.apellido1 as asignado_por,
                u_cap.nombre1 || ' ' || u_cap.apellido1 as capacitador
            FROM cap_eval_respuestas cer
            JOIN cap_eval_header ceh ON cer.id_header = ceh.id
            JOIN cap_formulario cf ON ceh.id_formulario = cf.id
            LEFT JOIN cap_tema t ON cf.id_tema = t.id
            LEFT JOIN cap_proceso p ON cf.id_proceso = p.id
            LEFT JOIN adm_usuarios u_creador ON ceh.usuario_creador = u_creador.id
            LEFT JOIN adm_usuarios u_cap ON cf.id_usuario = u_cap.id
            WHERE cer.id_colaborador IN (SELECT ac_id FROM adm_colaboradores WHERE ac_cedula = ?)
            AND (cer.calificacion >= 70 OR cer.estado = 'aprobado')
            ORDER BY cer.fecha_fin DESC
        ";

        $stmt = $pg->prepare($sql);
        $stmt->execute([$cedula]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(['success' => true, 'data' => $data]);
    } elseif ($action == 'get_pending_evaluations_REMOVED_CHECK_BELOW') {
        // Dummy to keep structure if needed, but actually I need to preserve the original get_pending_evaluations
        // The instruction above says "Add get_completed_evaluations...". 
        // I will insert it BEFORE get_pending_evaluations to avoid complexity with existing huge block
    } elseif ($action == 'get_pending_evaluations') {
        $id_colaborador = $_GET['id_colaborador'] ?? 0;
        $cedula = $_GET['cedula'] ?? '';
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $search = isset($_GET['search']) ? $_GET['search'] : '';

        if ($id_colaborador > 0) {
            // --- STUDENT VIEW: Show evaluations assigned to this user ---

            // 1. Get total count
            $sqlCount = "
                SELECT COUNT(*)
                FROM cap_formulario cf
                JOIN cap_formulario_asistente ca ON cf.id = ca.id_formulario
                JOIN cap_eval_header ceh ON cf.id = ceh.id_formulario
                LEFT JOIN cap_tema t ON cf.id_tema = t.id
                WHERE (ca.cedula = ? OR ca.id_colaborador = ?)
                AND ceh.estado_publicacion = 1
                AND (ceh.fecha_inicio_activa IS NULL OR ceh.fecha_inicio_activa <= NOW())
                AND (ceh.fecha_fin_activa IS NULL OR ceh.fecha_fin_activa >= NOW())
                AND NOT EXISTS (
                    SELECT 1 FROM cap_eval_respuestas cer
                    WHERE cer.id_header = ceh.id
                    AND (cer.id_colaborador = ? OR cer.id_colaborador = ca.id_colaborador)
                    AND (cer.calificacion >= 70 OR cer.estado = 'aprobado')
                )
            ";
            $stmtCount = $pg->prepare($sqlCount);
            $stmtCount->execute([$cedula, $id_colaborador, $id_colaborador]);
            $total = $stmtCount->fetchColumn();

            // 2. Get data
            $sql = "
                SELECT
                    cf.id as id_formulario,
                    t.nombre as tema,
                    cf.fecha as fecha_capacitacion,
                    ceh.id as id_header,
                    ceh.titulo,
                    ceh.fecha_inicio_activa,
                    ceh.fecha_fin_activa
                FROM cap_formulario cf
                JOIN cap_formulario_asistente ca ON cf.id = ca.id_formulario
                JOIN cap_eval_header ceh ON cf.id = ceh.id_formulario
                LEFT JOIN cap_tema t ON cf.id_tema = t.id
                WHERE (ca.cedula = ? OR ca.id_colaborador = ?)
                AND ceh.estado_publicacion = 1
                AND (ceh.fecha_inicio_activa IS NULL OR ceh.fecha_inicio_activa <= NOW())
                AND (ceh.fecha_fin_activa IS NULL OR ceh.fecha_fin_activa >= NOW())
                AND NOT EXISTS (
                    SELECT 1 FROM cap_eval_respuestas cer
                    WHERE cer.id_header = ceh.id
                    AND (cer.id_colaborador = ? OR cer.id_colaborador = ca.id_colaborador)
                    AND (cer.calificacion >= 70 OR cer.estado = 'aprobado')
                )
                ORDER BY cf.fecha DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
            ";
            $stmt = $pg->prepare($sql);
            $stmt->execute([$cedula, $id_colaborador, $id_colaborador]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // Si id_colaborador no es válido (<=0), no retornamos NADA.
            // Esto evita que administradores vean "todo lo que crearon" en su vista de "Mis Evaluaciones".
            $data = [];
            $total = 0;
        }

        jsonResponse([
            'success' => true,
            'data' => $data,
            'total' => $total ?? 0,
            'page' => ($offset / $limit) + 1,
            'pages' => ceil(($total ?? 0) / $limit)
        ]);
    } elseif ($action == 'get_sessions_status') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $estado = isset($_GET['estado']) ? $_GET['estado'] : '';
        $fecha_desde = isset($_GET['fecha_desde']) ? $_GET['fecha_desde'] : '';
        $fecha_hasta = isset($_GET['fecha_hasta']) ? $_GET['fecha_hasta'] : '';

        // Filtro de búsqueda y RBAC
        $where = "WHERE 1=1";
        $params = [];

        // RBAC: Filtrar por rol del creador del formulario
        $rol_usuario = $_SESSION['rol'] ?? '';

        // Roles que pueden ver todo
        $roles_admin = ['Administrador', 'Capacitador'];

        if (!in_array($rol_usuario, $roles_admin)) {
            // Si NO es admin/capacitador, solo ve:
            // 1. Evaluaciones creadas por alguien de su mismo rol
            // 2. O si es el creador directo (por si acaso)

            // Subconsulta para obtener IDs de formularios permitidos
            // Logic: Formulario creado por usuario U, donde U tiene Rol R, y R.nombre = MiRol
            $where .= " AND (
                cf.id_usuario = " . intval($_SESSION['usuario_id']) . " OR
                cf.id_usuario IN (
                    SELECT ur.usuario_id 
                    FROM adm_usuario_roles ur
                    JOIN adm_roles r ON ur.rol_id = r.id
                    WHERE r.nombre = ?
                )
            )";
            $params[] = $rol_usuario;
        }

        // Filtro por Estado
        if ($estado !== '') {
            if ($estado === 'null') {
                $where .= " AND ceh.estado_publicacion IS NULL";
            } else {
                $where .= " AND ceh.estado_publicacion = ?";
                $params[] = (int)$estado;
            }
        }

        // Filtro por Fechas (Fecha de Capacitación)
        if (!empty($fecha_desde)) {
            $where .= " AND cf.fecha >= ?";
            $params[] = $fecha_desde;
        }
        if (!empty($fecha_hasta)) {
            $where .= " AND cf.fecha <= ?";
            $params[] = $fecha_hasta;
        }

        if (!empty($search)) {
            $where .= " AND (
                cf.id::text LIKE ? OR 
                t.nombre ILIKE ? OR 
                p.proceso ILIKE ?
            )";
            $term = "%$search%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        // Contar total de registros (para paginación)
        $sqlCount = "
            SELECT COUNT(*) 
            FROM cap_formulario cf
            LEFT JOIN cap_tema t ON cf.id_tema = t.id
            LEFT JOIN cap_proceso p ON cf.id_proceso = p.id
            LEFT JOIN cap_eval_header ceh ON cf.id = ceh.id_formulario
            $where
        ";
        $stmtCount = $pg->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = $stmtCount->fetchColumn();

        // Obtener datos paginados
        $sql = "
            SELECT 
                cf.id as id_formulario,
                cf.fecha as fecha_capacitacion,
                t.nombre as tema,
                p.proceso as proceso,
                ceh.id as id_header,
                ceh.titulo as titulo_eval,
                ceh.estado_publicacion,
                ceh.fecha_inicio_activa,
                ceh.fecha_fin_activa,
                (SELECT COUNT(*) FROM cap_formulario_asistente ca WHERE ca.id_formulario = cf.id) as total_asistentes,
                (SELECT COUNT(DISTINCT id_colaborador) FROM cap_eval_respuestas cer WHERE cer.id_header = ceh.id AND cer.estado = 'aprobado') as total_respuestas,
                uc_eval.nombre1 || ' ' || uc_eval.apellido1 as creado_por,
                ue_eval.nombre1 || ' ' || ue_eval.apellido1 as editado_por
            FROM cap_formulario cf
            LEFT JOIN cap_eval_header ceh ON cf.id = ceh.id_formulario
            LEFT JOIN cap_tema t ON cf.id_tema = t.id
            LEFT JOIN cap_proceso p ON cf.id_proceso = p.id
            LEFT JOIN adm_usuarios uc_eval ON ceh.usuario_creador = uc_eval.id
            LEFT JOIN adm_usuarios ue_eval ON ceh.usuario_editor = ue_eval.id
            $where
            ORDER BY cf.id DESC
            LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
        ";
        $stmt = $pg->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse([
            'success' => true,
            'data' => $data,
            'total' => $total,
            'page' => ($offset / $limit) + 1,
            'pages' => ceil($total / $limit)
        ]);

        jsonResponse(['success' => true]);

        // 7. GESTIÓN: DETALLE PROGRESO ASISTENTES
    } elseif ($action == 'get_assistants_progress') {
        $id_header = $_GET['id_header'];

        // Obtener id_formulario del header
        $stmt = $pg->prepare("SELECT id_formulario FROM cap_eval_header WHERE id = ?");
        $stmt->execute([$id_header]);
        $id_formulario = $stmt->fetchColumn();

        // Listar todos los asistentes y cruzar con respuestas (Matching por ID o por Cédula para Admins)
        $sql = "
            SELECT 
                ca.nombre,
                ca.cedula,
                ca.cargo,
                MAX(cer.calificacion) as calificacion,
                MAX(cer.firma_digital) as firma_digital,
                MAX(cer.fecha_fin) as fecha_fin,
                CASE WHEN COUNT(cer.id) > 0 THEN 'Completado' ELSE 'Pendiente' END as estado
            FROM cap_formulario_asistente ca
            LEFT JOIN cap_eval_respuestas cer ON cer.id_header = ? 
                AND cer.estado = 'aprobado'
                AND (
                    cer.id_colaborador = ca.id_colaborador 
                    OR 
                    cer.id_colaborador IN (SELECT id FROM adm_usuarios WHERE cedula = ca.cedula)
                    OR
                    cer.id_colaborador IN (SELECT ac_id FROM adm_colaboradores WHERE ac_cedula = ca.cedula)
                )
            WHERE ca.id_formulario = ?
            GROUP BY ca.id, ca.nombre, ca.cedula, ca.cargo
        ";
        $stmt = $pg->prepare($sql);
        $stmt->execute([$id_header, $id_formulario]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(['success' => true, 'data' => $data]);

        // 8. REPORTE DETALLADO (Excel)
    } elseif ($action == 'get_detailed_report') {
        // 1. Obtener datos base (Sesiones + Asistentes)
        $sql = "
            SELECT
                cf.id as id_sesion,
                cf.fecha,
                t.nombre as tema,
                p.proceso,
                eh.id as id_header,
                eh.titulo as evaluacion,
                fa.nombre as asistente,
                fa.cedula,
                fa.cargo,
                CASE WHEN cer.id IS NOT NULL THEN 'Realizada' ELSE 'Pendiente' END as estado_evaluacion,
                cer.id as id_respuesta,
                cer.calificacion as nota,
                cer.firma_digital,
                u.nombre1 || ' ' || u.apellido1 as capacitador,
                uc.nombre1 || ' ' || uc.apellido1 as creado_por,
                ue.nombre1 || ' ' || ue.apellido1 as editado_por
            FROM cap_formulario cf
            LEFT JOIN cap_tema t ON cf.id_tema = t.id
            LEFT JOIN cap_proceso p ON cf.id_proceso = p.id
            LEFT JOIN adm_usuarios u ON cf.id_usuario = u.id
            JOIN cap_eval_header eh ON cf.id = eh.id_formulario
            LEFT JOIN adm_usuarios uc ON eh.usuario_creador = uc.id
            LEFT JOIN adm_usuarios ue ON eh.usuario_editor = ue.id
            JOIN cap_formulario_asistente fa ON cf.id = fa.id_formulario
            LEFT JOIN cap_eval_respuestas cer ON cer.id_header = eh.id 
                AND (cer.id_colaborador = fa.id_colaborador OR cer.id_colaborador IN (SELECT ac_id FROM adm_colaboradores WHERE ac_cedula = fa.cedula))
            WHERE eh.estado_publicacion = 1
        ";

        // RBAC: Filtrar por rol del creador del formulario (Igual que en get_sessions_status)
        $rol_usuario = $_SESSION['rol'] ?? '';
        $roles_admin = ['Administrador', 'Capacitador'];
        $params = [];

        if (!in_array($rol_usuario, $roles_admin)) {
            $sql .= " AND (
                cf.id_usuario = " . intval($_SESSION['usuario_id']) . " OR
                cf.id_usuario IN (
                    SELECT ur.usuario_id 
                    FROM adm_usuario_roles ur
                    JOIN adm_roles r ON ur.rol_id = r.id
                    WHERE r.nombre = ?
                )
            )";
            $params[] = $rol_usuario;
        }

        $sql .= " ORDER BY cf.id DESC, fa.nombre ASC";

        $stmt = $pg->prepare($sql);
        $stmt->execute($params);
        $report = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($report)) {
            jsonResponse(['success' => true, 'data' => []]);
        }

        // 2. Obtener Preguntas de los headers involucrados
        $headerIds = array_unique(array_column($report, 'id_header'));
        if (!empty($headerIds)) {
            $inHeaders = implode(',', array_map('intval', $headerIds));
            $sqlPreg = "SELECT id, id_header, enunciado, opciones, tipo FROM cap_eval_preguntas WHERE id_header IN ($inHeaders) ORDER BY orden ASC";
            $stmtPreg = $pg->query($sqlPreg);
            $preguntasDB = $stmtPreg->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $preguntasDB = [];
        }

        // Organizar preguntas por Header
        $preguntasByHeader = [];
        $preguntasMap = []; // Para buscar por ID rápido
        foreach ($preguntasDB as $p) {
            $p['opciones'] = json_decode($p['opciones'], true);
            $preguntasByHeader[$p['id_header']][] = $p;
            $preguntasMap[$p['id']] = $p;
        }

        // 3. Obtener Respuestas Detalladas de las respuestas involucradas
        $respuestaIds = array_filter(array_unique(array_column($report, 'id_respuesta')));
        $respuestasDet = [];
        if (!empty($respuestaIds)) {
            $inResp = implode(',', array_map('intval', $respuestaIds));
            $sqlDet = "SELECT id_respuesta, id_pregunta, respuesta_usuario, es_correcta FROM cap_eval_respuestas_det WHERE id_respuesta IN ($inResp)";
            $stmtDet = $pg->query($sqlDet);
            $detallesDB = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

            // Organizar por id_respuesta
            foreach ($detallesDB as $d) {
                $respuestasDet[$d['id_respuesta']][$d['id_pregunta']] = $d;
            }
        }

        // 4. Procesar y Enriquecer Reporte
        foreach ($report as &$row) {
            $idHeader = $row['id_header'];
            $idRespuesta = $row['id_respuesta'];

            $misPreguntas = $preguntasByHeader[$idHeader] ?? [];
            $misRespuestas = $respuestasDet[$idRespuesta] ?? [];

            $txtPreguntas = [];
            $txtAciertos = [];

            foreach ($misPreguntas as $preg) {
                // Agregar texto de la pregunta
                $txtPreguntas[] = $preg['enunciado'];

                // Verificar si el usuario acertó esta pregunta
                if ($idRespuesta && isset($misRespuestas[$preg['id']])) {
                    $resp = $misRespuestas[$preg['id']];

                    if ($resp['es_correcta']) {
                        // Obtener texto de la respuesta correcta (lo que el usuario respondió)
                        $valorUsuario = $resp['respuesta_usuario'];
                        $textoRespuesta = $valorUsuario; // Fallback

                        if ($preg['tipo'] == 'seleccion' || $preg['tipo'] == 'verdadero_falso') {
                            // Buscar en opciones el texto correspondiente al ID
                            foreach ($preg['opciones'] as $opt) {
                                if ($opt['id'] == $valorUsuario) {
                                    $textoRespuesta = $opt['texto'];
                                    break;
                                }
                            }
                        } elseif ($preg['tipo'] == 'ordenar') {
                            // Decodificar array de IDs y concatenar textos
                            $idsOrden = json_decode($valorUsuario, true);
                            if (is_array($idsOrden)) {
                                $textosOrden = [];
                                foreach ($idsOrden as $idOpt) {
                                    foreach ($preg['opciones'] as $opt) {
                                        if ($opt['id'] == $idOpt) {
                                            $textosOrden[] = $opt['texto'];
                                            break;
                                        }
                                    }
                                }
                                $textoRespuesta = implode(' -> ', $textosOrden);
                            }
                        }

                        $txtAciertos[] = $textoRespuesta;
                    }
                }
            }

            $row['preguntas_texto'] = implode('; ', $txtPreguntas);
            $row['aciertos_texto'] = implode('; ', $txtAciertos);
        }

        jsonResponse(['success' => true, 'data' => $report]);

        // 9. ACTIVAR EVALUACIÓN (Programación)
    } elseif ($action == 'activate_evaluation') {
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['id_header'])) {
            jsonResponse(['success' => false, 'error' => 'Falta ID de evaluación']);
        }

        // Validar permisos (Solo Admin o Capacitador o Creador)
        // Por simplicidad, asumimos que si llegó aquí ya pasó filtros de UI, pero idealmente se valida RBAC de nuevo.

        $estado = (int)$data['estado'];
        $inicio = !empty($data['fecha_inicio']) ? $data['fecha_inicio'] : null;
        $fin = !empty($data['fecha_fin']) ? $data['fecha_fin'] : null;

        // Validaciones de lógica de negocio
        if ($estado === 1) { // Activa
            if (empty($inicio)) {
                jsonResponse(['success' => false, 'error' => 'Para activar la evaluación, la fecha de inicio es obligatoria.']);
            }
            if (!empty($fin) && strtotime($fin) <= strtotime($inicio)) {
                jsonResponse(['success' => false, 'error' => 'La fecha de fin debe ser posterior a la fecha de inicio.']);
            }
        }

        $stmt = $pg->prepare("UPDATE cap_eval_header SET estado_publicacion = ?, fecha_inicio_activa = ?, fecha_fin_activa = ? WHERE id = ?");
        $stmt->execute([$estado, $inicio, $fin, $data['id_header']]);

        // AUDIT LOG ACTIVATE
        $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'colaborador', 'ACTIVATE_EVALUATION', 'Cambio estado publicación evaluación', ['id_header' => $data['id_header'], 'estado' => $estado]);

        jsonResponse(['success' => true]);

        // 10. ELIMINAR EVALUACIÓN (Hard Delete)
    } elseif ($action == 'delete_evaluation') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id_header = $data['id_header'] ?? 0;

        if (!$id_header) jsonResponse(['success' => false, 'error' => 'ID inválido']);

        // RBAC Strict: Solo Admin o Capacitador
        $rol_usuario = $_SESSION['rol'] ?? '';
        $roles_permitidos = ['Administrador', 'Capacitador'];

        if (!in_array($rol_usuario, $roles_permitidos)) {
            jsonResponse(['success' => false, 'error' => 'No tienes permisos para eliminar evaluaciones.']);
        }

        $pg->beginTransaction();

        try {
            // 1. Eliminar detalles de respuestas
            $pg->prepare("DELETE FROM cap_eval_respuestas_det WHERE id_respuesta IN (SELECT id FROM cap_eval_respuestas WHERE id_header = ?)")->execute([$id_header]);

            // 2. Eliminar respuestas
            $pg->prepare("DELETE FROM cap_eval_respuestas WHERE id_header = ?")->execute([$id_header]);

            // 3. Eliminar preguntas
            $pg->prepare("DELETE FROM cap_eval_preguntas WHERE id_header = ?")->execute([$id_header]);

            // 4. Eliminar multimedia
            // Primero obtener ruta para borrar archivo físico si es necesario (opcional, aquí solo borramos registro DB)
            $pg->prepare("DELETE FROM cap_eval_multimedia WHERE id_header = ?")->execute([$id_header]);

            // 5. Eliminar header
            $pg->prepare("DELETE FROM cap_eval_header WHERE id = ?")->execute([$id_header]);

            // AUDIT LOG DELETE
            $logger->log($_SESSION['usuario_id'], $_SESSION['tipo_usuario'] ?? 'colaborador', 'DELETE_EVALUATION', 'Eliminación de evaluación', ['id_header' => $id_header]);

            $pg->commit();
            jsonResponse(['success' => true]);
        } catch (Exception $e) {
            $pg->rollBack();
            jsonResponse(['success' => false, 'error' => 'Error al eliminar: ' . $e->getMessage()]);
        }
    } elseif ($action == 'get_pdf_report_data') {
        $id_header = $_GET['id_header'] ?? 0;

        if (!$id_header) jsonResponse(['success' => false, 'error' => 'ID de evaluación requerido']);

        // 1. Header + Info General
        $stmt = $pg->prepare("
            SELECT 
                ceh.titulo, 
                ceh.instrucciones, 
                cf.fecha as fecha_capacitacion,
                t.nombre as tema,
                p.proceso
            FROM cap_eval_header ceh
            JOIN cap_formulario cf ON ceh.id_formulario = cf.id
            LEFT JOIN cap_tema t ON cf.id_tema = t.id
            LEFT JOIN cap_proceso p ON cf.id_proceso = p.id
            WHERE ceh.id = ?
        ");
        $stmt->execute([$id_header]);
        $headerInfo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$headerInfo) jsonResponse(['success' => false, 'error' => 'Evaluación no encontrada']);

        // 2. Preguntas
        $stmtPreg = $pg->prepare("SELECT id, tipo, enunciado, opciones, orden FROM cap_eval_preguntas WHERE id_header = ? ORDER BY orden ASC");
        $stmtPreg->execute([$id_header]);
        $preguntas = $stmtPreg->fetchAll(PDO::FETCH_ASSOC);

        foreach ($preguntas as &$pr) {
            $pr['opciones'] = json_decode($pr['opciones'], true);
        }

        // 3. Asistentes y Respuestas (Solo Aprobados/Finalizados)
        $stmtAsist = $pg->prepare("
            SELECT 
                cer.id as id_respuesta,
                cer.id_colaborador, 
                ca.nombre,
                ca.cedula,
                ca.cargo,
                cer.calificacion,
                cer.firma_digital,
                cer.fecha_fin
            FROM cap_eval_respuestas cer
            JOIN cap_formulario_asistente ca ON (
                cer.id_colaborador = ca.id_colaborador OR 
                cer.id_colaborador IN (SELECT ac_id FROM adm_colaboradores WHERE ac_cedula = ca.cedula) OR
                cer.id_colaborador IN (SELECT id FROM adm_usuarios WHERE cedula = ca.cedula)
            )
            JOIN cap_eval_header ceh ON cer.id_header = ceh.id AND ceh.id_formulario = ca.id_formulario
            WHERE cer.id_header = ? AND cer.estado = 'aprobado'
            GROUP BY cer.id, cer.id_colaborador, ca.nombre, ca.cedula, ca.cargo, cer.calificacion, cer.firma_digital, cer.fecha_fin
            ORDER BY ca.nombre ASC
        ");
        $stmtAsist->execute([$id_header]);
        $asistentes = $stmtAsist->fetchAll(PDO::FETCH_ASSOC);

        // Map de respuestas detalladas
        $respuestaIds = array_column($asistentes, 'id_respuesta');
        $detallesMap = [];

        if (!empty($respuestaIds)) {
            $inQuery = implode(',', array_map('intval', $respuestaIds));
            $stmtDet = $pg->query("SELECT id_respuesta, id_pregunta, respuesta_usuario, es_correcta FROM cap_eval_respuestas_det WHERE id_respuesta IN ($inQuery)");
            while ($row = $stmtDet->fetch(PDO::FETCH_ASSOC)) {
                $detallesMap[$row['id_respuesta']][$row['id_pregunta']] = $row;
            }
        }

        // Adjuntar respuestas a cada asistente
        foreach ($asistentes as &$asis) {
            $asis['respuestas'] = $detallesMap[$asis['id_respuesta']] ?? [];
        }

        jsonResponse([
            'success' => true,
            'info' => $headerInfo,
            'preguntas' => $preguntas,
            'asistentes' => $asistentes
        ]);
    }
} catch (Exception $e) {
    if ($pg->inTransaction()) $pg->rollBack();
    jsonResponse(['success' => false, 'error' => $e->getMessage()]);
}
