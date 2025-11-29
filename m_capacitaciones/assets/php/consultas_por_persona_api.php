<?php
header('Content-Type: application/json');
session_start();
require_once(__DIR__ . '/../../../php/db_postgres.php');

// Validar que existe una sesión activa
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no iniciada. Por favor inicie sesión.']);
    exit;
}

$sql = "
WITH capacitaciones_realizadas AS (
  -- Contar capacitaciones distintas asistidas por cada empleado
  SELECT 
    fa.cedula,
    COUNT(DISTINCT fa.id_formulario) as total_realizadas
  FROM cap_formulario_asistente fa
  WHERE fa.cedula IS NOT NULL
  GROUP BY fa.cedula
),
capacitaciones_programadas AS (
  -- Contar capacitaciones programadas por empleado según su cargo y sub-área
  SELECT 
    ac.ac_cedula as cedula,
    COUNT(DISTINCT cp.id) as total_programadas
  FROM adm_colaboradores ac
  LEFT JOIN cap_programacion cp ON ac.ac_id_cargo = cp.id_cargo 
    AND (cp.sub_area = ac.ac_sub_area OR cp.sub_area IS NULL)
  WHERE ac.ac_id_situación IN ('A', 'V', 'P')
    AND cp.activo = true
  GROUP BY ac.ac_cedula
),
capacitaciones_pendientes AS (
  -- Calcular capacitaciones pendientes: programadas pero no completadas o que no cumplen frecuencia
  SELECT 
    ac.ac_cedula as cedula,
    COUNT(DISTINCT cp.id) as total_pendientes
  FROM adm_colaboradores ac
  INNER JOIN cap_programacion cp ON ac.ac_id_cargo = cp.id_cargo 
    AND (cp.sub_area = ac.ac_sub_area OR cp.sub_area IS NULL)
  LEFT JOIN cap_formulario_asistente fa ON fa.cedula = ac.ac_cedula
    AND EXISTS (
      SELECT 1 FROM cap_formulario cf
      WHERE cf.id = fa.id_formulario
        AND cf.id_tema = cp.id_tema
        AND cf.fecha >= CURRENT_DATE - (COALESCE(cp.frecuencia_meses, 12) || ' months')::INTERVAL
    )
  WHERE ac.ac_id_situación IN ('A', 'V', 'P')
    AND cp.activo = true
    AND fa.id IS NULL
  GROUP BY ac.ac_cedula
)
SELECT
  ac.ac_id as id,
  ac.ac_cedula as cedula,
  TRIM(ac.ac_nombre1 || ' ' || COALESCE(ac.ac_nombre2 || ' ','') || ac.ac_apellido1 || ' ' || COALESCE(ac.ac_apellido2,'')) AS nombres_apellidos,
  c.cargo,
  ar.sub_area,
  COALESCE(cr.total_realizadas, 0) as capacitaciones_realizadas,
  COALESCE(cpe.total_pendientes, 0) as capacitaciones_pendientes,
  COALESCE(cp.total_programadas, 0) as total_esperadas
FROM adm_colaboradores ac
LEFT JOIN adm_cargos c ON ac.ac_id_cargo = c.id_cargo
LEFT JOIN adm_área ar ON ac.ac_sub_area = ar.id_area
LEFT JOIN capacitaciones_realizadas cr ON ac.ac_cedula = cr.cedula
LEFT JOIN capacitaciones_programadas cp ON ac.ac_cedula = cp.cedula
LEFT JOIN capacitaciones_pendientes cpe ON ac.ac_cedula = cpe.cedula
WHERE ac.ac_id_situación IN ('A', 'V', 'P')
ORDER BY ac.ac_cedula
";

try {
    $stmt = $pg->prepare($sql);
    $stmt->execute();
    $personas = $stmt->fetchAll();
    echo json_encode($personas);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'error' => 'Error al consultar datos por persona',
      'detalle' => $e->getMessage()
    ]);
}
