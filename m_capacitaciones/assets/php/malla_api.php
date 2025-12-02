<?php
session_start();
require '../../../php/db_postgres.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

function jsonResponse($data) {
    echo json_encode($data);
    exit();
}

// Verify user is logged in
if (!isset($_SESSION['usuario_id'])) {
    jsonResponse(['success' => false, 'error' => 'No autorizado']);
}

try {
    switch ($action) {
        case 'get_malla':
            // Get the complete training matrix for all active employees
            // Match employees to programacion based on cargo and sub_area
            // Calculate training status based on individual user's last training completion
            
            $stmt = $pg->query("
                WITH colaborador_programacion AS (
                    -- Match active employees to their required trainings
                    SELECT DISTINCT
                        c.ac_id,
                        c.ac_cedula,
                        c.ac_id_situación AS situacion,
                        c.ac_nombre1 || ' ' || COALESCE(c.ac_nombre2, '') || ' ' || c.ac_apellido1 || ' ' || COALESCE(c.ac_apellido2, '') AS nombre_completo,
                        c.ac_id_cargo,
                        cg.cargo AS cargo_nombre,
                        c.ac_sub_area,
                        a.sub_area AS sub_area_nombre,
                        p.id AS id_programacion,
                        p.id_tema,
                        t.nombre AS tema_nombre,
                        p.frecuencia_meses,
                        p.id_rol_capacitador,
                        r.nombre AS rol_capacitador_nombre,
                        p.fecha_proxima_capacitacion AS programacion_proxima_fecha
                    FROM adm_colaboradores c
                    INNER JOIN adm_cargos cg ON c.ac_id_cargo = cg.id_cargo
                    LEFT JOIN adm_área a ON c.ac_sub_area = a.id_area
                    INNER JOIN cap_programacion p ON p.id_cargo = c.ac_id_cargo 
                        AND (p.sub_area = c.ac_sub_area OR (p.sub_area IS NULL AND c.ac_sub_area IS NULL))
                    INNER JOIN cap_tema t ON p.id_tema = t.id
                    INNER JOIN adm_roles r ON p.id_rol_capacitador = r.id
                    WHERE c.ac_id_situación IN ('A', 'V', 'P')
                    AND p.activo = true
                ),
                ultima_capacitacion_colaborador AS (
                    -- Get the most recent training completion date for each employee+tema
                    -- Handle both id_colaborador (new records) and cedula-based matching (legacy records)
                    SELECT 
                        COALESCE(fa.id_colaborador, c.ac_id) AS id_colaborador,
                        f.id_tema,
                        MAX(f.fecha)::date AS ultima_fecha_ejecutada
                    FROM cap_formulario_asistente fa
                    INNER JOIN cap_formulario f ON fa.id_formulario = f.id
                    LEFT JOIN adm_colaboradores c ON fa.cedula = c.ac_cedula AND fa.id_colaborador IS NULL
                    WHERE fa.estado_aprobacion = 'aprobo'
                    GROUP BY COALESCE(fa.id_colaborador, c.ac_id), f.id_tema
                )
                SELECT 
                    cp.*,
                    uc.ultima_fecha_ejecutada AS ultima_capacitacion,
                    CASE 
                        -- If user has completed training, calculate next date from their completion
                        WHEN uc.ultima_fecha_ejecutada IS NOT NULL THEN
                            (uc.ultima_fecha_ejecutada + (cp.frecuencia_meses || ' months')::INTERVAL)::date
                        -- Otherwise use programmed next date
                        ELSE
                            cp.programacion_proxima_fecha
                    END AS proxima_capacitacion,
                    CASE 
                        -- If user has completed training, calculate days from their next due date
                        WHEN uc.ultima_fecha_ejecutada IS NOT NULL THEN
                            EXTRACT(DAY FROM (uc.ultima_fecha_ejecutada + (cp.frecuencia_meses || ' months')::INTERVAL - CURRENT_DATE))::int
                        -- Otherwise calculate from programmed date
                        WHEN cp.programacion_proxima_fecha IS NOT NULL THEN
                            (cp.programacion_proxima_fecha - CURRENT_DATE)::int
                        ELSE
                            NULL
                    END AS dias_restantes,
                    CASE 
                        -- User has never completed this training and no programmed date
                        WHEN uc.ultima_fecha_ejecutada IS NULL AND cp.programacion_proxima_fecha IS NULL THEN 'pendiente'
                        -- User has completed: check if their next due date has passed
                        WHEN uc.ultima_fecha_ejecutada IS NOT NULL AND 
                             uc.ultima_fecha_ejecutada + (cp.frecuencia_meses || ' months')::INTERVAL < CURRENT_DATE THEN 'vencida'
                        WHEN uc.ultima_fecha_ejecutada IS NOT NULL AND 
                             uc.ultima_fecha_ejecutada + (cp.frecuencia_meses || ' months')::INTERVAL - INTERVAL '30 days' <= CURRENT_DATE THEN 'proximo_vencer'
                        -- User has not completed: check programmed date
                        WHEN uc.ultima_fecha_ejecutada IS NULL AND cp.programacion_proxima_fecha < CURRENT_DATE THEN 'vencida'
                        WHEN uc.ultima_fecha_ejecutada IS NULL AND cp.programacion_proxima_fecha - INTERVAL '30 days' <= CURRENT_DATE THEN 'proximo_vencer'
                        -- User has completed and is up to date
                        WHEN uc.ultima_fecha_ejecutada IS NOT NULL THEN 'al_dia'
                        -- User has not completed but programmed date is in the future
                        ELSE 'pendiente'
                    END AS estado
                FROM colaborador_programacion cp
                LEFT JOIN ultima_capacitacion_colaborador uc 
                    ON cp.ac_id = uc.id_colaborador AND cp.id_tema = uc.id_tema
                ORDER BY 
                    CASE 
                        WHEN uc.ultima_fecha_ejecutada IS NULL AND cp.programacion_proxima_fecha IS NULL THEN 0
                        WHEN uc.ultima_fecha_ejecutada IS NULL AND cp.programacion_proxima_fecha < CURRENT_DATE THEN 1
                        WHEN uc.ultima_fecha_ejecutada IS NOT NULL AND 
                             uc.ultima_fecha_ejecutada + (cp.frecuencia_meses || ' months')::INTERVAL < CURRENT_DATE THEN 1
                        ELSE 2
                    END,
                    cp.nombre_completo, cp.tema_nombre
            ");
            
            $malla = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(['success' => true, 'data' => $malla]);
            break;

        case 'get_summary':
            // Get summary statistics for the dashboard
            $stmt = $pg->query("
                WITH colaborador_programacion AS (
                    SELECT DISTINCT
                        c.ac_id,
                        p.id AS id_programacion,
                        p.id_tema,
                        p.frecuencia_meses,
                        p.fecha_proxima_capacitacion AS programacion_proxima_fecha
                    FROM adm_colaboradores c
                    INNER JOIN cap_programacion p ON p.id_cargo = c.ac_id_cargo 
                        AND (p.sub_area = c.ac_sub_area OR (p.sub_area IS NULL AND c.ac_sub_area IS NULL))
                    WHERE c.ac_id_situación IN ('A', 'V', 'P')
                    AND p.activo = true
                ),
                ultima_capacitacion_colaborador AS (
                    -- Handle both id_colaborador (new records) and cedula-based matching (legacy records)
                    SELECT 
                        COALESCE(fa.id_colaborador, c.ac_id) AS id_colaborador,
                        f.id_tema,
                        MAX(f.fecha)::date AS ultima_fecha_ejecutada
                    FROM cap_formulario_asistente fa
                    INNER JOIN cap_formulario f ON fa.id_formulario = f.id
                    LEFT JOIN adm_colaboradores c ON fa.cedula = c.ac_cedula AND fa.id_colaborador IS NULL
                    WHERE fa.estado_aprobacion = 'aprobo'
                    GROUP BY COALESCE(fa.id_colaborador, c.ac_id), f.id_tema
                ),
                estados AS (
                    SELECT 
                        CASE 
                            WHEN uc.ultima_fecha_ejecutada IS NULL AND cp.programacion_proxima_fecha IS NULL THEN 'pendiente'
                            WHEN uc.ultima_fecha_ejecutada IS NOT NULL AND 
                                 uc.ultima_fecha_ejecutada + (cp.frecuencia_meses || ' months')::INTERVAL < CURRENT_DATE THEN 'vencida'
                            WHEN uc.ultima_fecha_ejecutada IS NULL AND cp.programacion_proxima_fecha < CURRENT_DATE THEN 'vencida'
                            WHEN uc.ultima_fecha_ejecutada IS NOT NULL THEN 'al_dia'
                            ELSE 'pendiente'
                        END AS estado
                    FROM colaborador_programacion cp
                    LEFT JOIN ultima_capacitacion_colaborador uc 
                        ON cp.ac_id = uc.id_colaborador AND cp.id_tema = uc.id_tema
                )
                SELECT 
                    COUNT(DISTINCT ac_id) AS total_colaboradores_activos,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS total_pendientes,
                    SUM(CASE WHEN estado = 'vencida' THEN 1 ELSE 0 END) AS total_vencidas,
                    SUM(CASE WHEN estado = 'al_dia' THEN 1 ELSE 0 END) AS total_al_dia
                FROM estados, 
                (SELECT COUNT(DISTINCT ac_id) AS total_colaboradores_activos 
                 FROM adm_colaboradores WHERE ac_id_situación IN ('A', 'V', 'P')) AS activos
            ");
            
            $summary = $stmt->fetch(PDO::FETCH_ASSOC);
            jsonResponse(['success' => true, 'data' => $summary]);
            break;

        case 'get_user_pending_trainings':
            // Get pending trainings for a specific user (for usuarios.html)
            $cedula = $_GET['cedula'] ?? $_SESSION['cedula'] ?? null;
            
            if (!$cedula) {
                jsonResponse(['success' => false, 'error' => 'Cédula no especificada']);
            }

            $stmt = $pg->prepare("
                WITH colaborador_info AS (
                    SELECT ac_id, ac_id_cargo, ac_sub_area, ac_cedula
                    FROM adm_colaboradores
                    WHERE ac_cedula = ? AND ac_id_situación IN ('A', 'V', 'P')
                    LIMIT 1
                ),
                programaciones_aplicables AS (
                    SELECT 
                        p.id AS id_programacion,
                        p.id_tema,
                        t.nombre AS tema_nombre,
                        p.frecuencia_meses,
                        p.fecha_proxima_capacitacion,
                        r.nombre AS rol_capacitador_nombre
                    FROM cap_programacion p
                    INNER JOIN colaborador_info ci ON p.id_cargo = ci.ac_id_cargo 
                        AND (p.sub_area = ci.ac_sub_area OR (p.sub_area IS NULL AND ci.ac_sub_area IS NULL))
                    INNER JOIN cap_tema t ON p.id_tema = t.id
                    INNER JOIN adm_roles r ON p.id_rol_capacitador = r.id
                    WHERE p.activo = true
                ),
                ultimas_capacitaciones AS (
                    -- Handle both id_colaborador (new records) and cedula-based matching (legacy records)
                    SELECT 
                        f.id_tema,
                        MAX(f.fecha)::date AS ultima_fecha
                    FROM cap_formulario_asistente fa
                    INNER JOIN cap_formulario f ON fa.id_formulario = f.id
                    INNER JOIN colaborador_info ci ON (fa.id_colaborador = ci.ac_id OR fa.cedula = ci.ac_cedula)
                    WHERE fa.estado_aprobacion = 'aprobo'
                    GROUP BY f.id_tema
                )
                SELECT 
                    pa.*,
                    uc.ultima_fecha AS ultima_capacitacion,
                    CASE 
                        -- If user has completed, calculate next from their completion date
                        WHEN uc.ultima_fecha IS NOT NULL THEN
                            (uc.ultima_fecha + (pa.frecuencia_meses || ' months')::INTERVAL)::date
                        -- Otherwise use programmed date
                        ELSE
                            pa.fecha_proxima_capacitacion
                    END AS proxima_capacitacion,
                    CASE 
                        -- User has never completed and no programmed date
                        WHEN uc.ultima_fecha IS NULL AND pa.fecha_proxima_capacitacion IS NULL THEN 'pendiente'
                        -- User has completed: check their next due date
                        WHEN uc.ultima_fecha IS NOT NULL AND 
                             uc.ultima_fecha + (pa.frecuencia_meses || ' months')::INTERVAL < CURRENT_DATE THEN 'vencida'
                        WHEN uc.ultima_fecha IS NOT NULL AND 
                             uc.ultima_fecha + (pa.frecuencia_meses || ' months')::INTERVAL - INTERVAL '30 days' <= CURRENT_DATE THEN 'proximo_vencer'
                        -- User has not completed: check programmed date
                        WHEN uc.ultima_fecha IS NULL AND pa.fecha_proxima_capacitacion < CURRENT_DATE THEN 'vencida'
                        WHEN uc.ultima_fecha IS NULL AND pa.fecha_proxima_capacitacion - INTERVAL '30 days' <= CURRENT_DATE THEN 'proximo_vencer'
                        -- User has completed and is up to date
                        WHEN uc.ultima_fecha IS NOT NULL THEN 'al_dia'
                        -- User has not completed but programmed date is in future
                        ELSE 'pendiente'
                    END AS estado,
                    CASE 
                        -- If user has completed, calculate days from their next due date
                        WHEN uc.ultima_fecha IS NOT NULL THEN
                            EXTRACT(DAY FROM (uc.ultima_fecha + (pa.frecuencia_meses || ' months')::INTERVAL - CURRENT_DATE))::int
                        -- Otherwise calculate from programmed date
                        WHEN pa.fecha_proxima_capacitacion IS NOT NULL THEN
                            (pa.fecha_proxima_capacitacion - CURRENT_DATE)::int
                        ELSE
                            NULL
                    END AS dias_restantes
                FROM programaciones_aplicables pa
                LEFT JOIN ultimas_capacitaciones uc ON pa.id_tema = uc.id_tema
                ORDER BY 
                    CASE 
                        WHEN uc.ultima_fecha IS NULL AND pa.fecha_proxima_capacitacion IS NULL THEN 0
                        WHEN uc.ultima_fecha IS NULL AND pa.fecha_proxima_capacitacion < CURRENT_DATE THEN 1
                        WHEN uc.ultima_fecha IS NOT NULL AND 
                             uc.ultima_fecha + (pa.frecuencia_meses || ' months')::INTERVAL < CURRENT_DATE THEN 1
                        ELSE 2
                    END,
                    pa.tema_nombre
            ");
            
            $stmt->execute([$cedula]);
            $trainings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(['success' => true, 'data' => $trainings]);
            break;

        case 'get_filters':
            // Get filter options
            $cargos = $pg->query("
                SELECT DISTINCT id_cargo AS id, cargo 
                FROM adm_cargos 
                ORDER BY cargo
            ")->fetchAll(PDO::FETCH_ASSOC);
            
            $subAreas = $pg->query("
                SELECT DISTINCT id_area, sub_area 
                FROM adm_área 
                WHERE sub_area IS NOT NULL 
                  AND sub_area != '' 
                  AND sub_area NOT IN ('- SIN PROYECTO -', 'POR ASIGNAR')
                ORDER BY sub_area
            ")->fetchAll(PDO::FETCH_ASSOC);
            
            $temas = $pg->query("
                SELECT id, nombre 
                FROM cap_tema 
                ORDER BY nombre
            ")->fetchAll(PDO::FETCH_ASSOC);
            
            $roles = $pg->query("
                SELECT id, nombre 
                FROM adm_roles 
                WHERE nombre LIKE 'Capacitador%' OR nombre IN ('Administrador', 'Aux_Capacitador')
                ORDER BY nombre
            ")->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse([
                'success' => true,
                'data' => [
                    'cargos' => $cargos,
                    'sub_areas' => $subAreas,
                    'temas' => $temas,
                    'roles' => $roles
                ]
            ]);
            break;

        default:
            jsonResponse(['success' => false, 'error' => 'Acción no válida']);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()]);
}
