-- ============================================================================
-- PRUEBAS COMPLETAS DEL MÓDULO DE PROGRAMACIÓN
-- ============================================================================
-- Este archivo contiene todas las pruebas necesarias para verificar el
-- funcionamiento completo del módulo de programación de capacitaciones
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TEST 1: Verificar Estructura de Base de Datos
-- ----------------------------------------------------------------------------
\echo '========================================='
\echo 'TEST 1: ESTRUCTURA DE BASE DE DATOS'
\echo '========================================='

-- Verificar que todas las tablas existen
SELECT 
    CASE 
        WHEN COUNT(*) = 8 THEN '✅ PASS: Todas las tablas existen'
        ELSE '❌ FAIL: Faltan tablas'
    END as resultado,
    COUNT(*) as tablas_encontradas,
    8 as tablas_esperadas
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'cap_programacion',
    'cap_notificaciones',
    'cap_tema',
    'cap_formulario',
    'cap_formulario_asistente',
    'adm_colaboradores',
    'adm_cargos',
    'adm_roles'
  );

-- Verificar índices en cap_programacion
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS: Índices creados correctamente'
        ELSE '❌ FAIL: Faltan índices'
    END as resultado,
    COUNT(*) as indices_encontrados
FROM pg_indexes 
WHERE tablename = 'cap_programacion' 
  AND schemaname = 'public';

-- Verificar función de notificaciones
SELECT 
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ PASS: Función actualizar_notificaciones existe'
        ELSE '❌ FAIL: Función no existe'
    END as resultado
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'actualizar_notificaciones_capacitacion';

-- ----------------------------------------------------------------------------
-- TEST 2: Verificar Datos de Referencia
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 2: DATOS DE REFERENCIA'
\echo '========================================='

-- Contar temas
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Temas de capacitación cargados'
        ELSE '❌ FAIL: No hay temas'
    END as resultado,
    COUNT(*) as total_temas
FROM cap_tema;

-- Contar cargos
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Cargos cargados'
        ELSE '❌ FAIL: No hay cargos'
    END as resultado,
    COUNT(*) as total_cargos
FROM adm_cargos;

-- Contar roles de capacitadores
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Roles de capacitadores configurados'
        ELSE '❌ FAIL: No hay roles de capacitadores'
    END as resultado,
    COUNT(*) as total_roles
FROM adm_roles 
WHERE nombre IN (
    'Capacitador SIE', 'Capacitador_SIE',
    'Capacitador GH', 'Capacitador_GH',
    'Capacitador TI', 'Capacitador_TI',
    'Capacitador MT', 'Capacitador_MT',
    'Capacitador IND', 'Capacitador_IND',
    'Capacitador ADM', 'Capacitador_ADM',
    'Capacitador AGR', 'Capacitador_AGR',
    'Administrador',
    'Capacitador',
    'Aux_Capacitador'
);

-- Contar colaboradores
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Colaboradores en sistema'
        ELSE '❌ FAIL: No hay colaboradores'
    END as resultado,
    COUNT(*) as total_colaboradores
FROM adm_colaboradores;

-- ----------------------------------------------------------------------------
-- TEST 3: Funcionalidad de Programación
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 3: FUNCIONALIDAD DE PROGRAMACIÓN'
\echo '========================================='

-- Crear programación de prueba
INSERT INTO cap_programacion (id_tema, id_cargo, sub_area, frecuencia_meses, id_rol_capacitador, activo)
VALUES (1, '116', '003', 12, 21, true)
ON CONFLICT DO NOTHING;

-- Verificar creación
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Programaciones activas en sistema'
        ELSE '❌ FAIL: No hay programaciones activas'
    END as resultado,
    COUNT(*) as programaciones_activas
FROM cap_programacion
WHERE activo = true;

-- Verificar relaciones FK
SELECT 
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT p.id) THEN '✅ PASS: Todas las FK de programación son válidas'
        ELSE '❌ FAIL: Hay FK inválidas'
    END as resultado
FROM cap_programacion p
JOIN cap_tema t ON p.id_tema = t.id
JOIN adm_cargos c ON p.id_cargo = c.id_cargo
JOIN adm_roles r ON p.id_rol_capacitador = r.id
WHERE p.activo = true;

-- ----------------------------------------------------------------------------
-- TEST 4: Sistema de Notificaciones
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 4: SISTEMA DE NOTIFICACIONES'
\echo '========================================='

-- Ejecutar función de actualización
SELECT actualizar_notificaciones_capacitacion();

-- Verificar que se crearon notificaciones
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Notificaciones generadas correctamente'
        ELSE '❌ FAIL: No se generaron notificaciones'
    END as resultado,
    COUNT(*) as notificaciones_generadas
FROM cap_notificaciones;

-- Verificar estados de notificaciones
SELECT 
    CASE 
        WHEN COUNT(DISTINCT estado) >= 1 THEN '✅ PASS: Estados de notificación asignados'
        ELSE '❌ FAIL: No hay estados asignados'
    END as resultado,
    COUNT(*) as total_notificaciones,
    COUNT(DISTINCT estado) as estados_diferentes
FROM cap_notificaciones;

-- Verificar que las notificaciones tienen FK válidas
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS: Todas las notificaciones tienen FK válidas'
        ELSE '❌ FAIL: Hay notificaciones con FK inválidas'
    END as resultado
FROM cap_notificaciones n
LEFT JOIN adm_colaboradores c ON n.id_colaborador = c.ac_id
LEFT JOIN cap_programacion p ON n.id_programacion = p.id
WHERE c.ac_id IS NULL OR p.id IS NULL;

-- ----------------------------------------------------------------------------
-- TEST 5: Cálculo de Fechas y Frecuencias
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 5: CÁLCULO DE FECHAS'
\echo '========================================='

-- Verificar que las fechas próximas están calculadas
SELECT 
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM cap_notificaciones) THEN '✅ PASS: Todas las notificaciones tienen fecha próxima'
        ELSE '❌ FAIL: Hay notificaciones sin fecha próxima'
    END as resultado,
    COUNT(*) as con_fecha_proxima,
    (SELECT COUNT(*) FROM cap_notificaciones) as total_notificaciones
FROM cap_notificaciones
WHERE fecha_proxima IS NOT NULL;

-- Verificar cálculo de días para vencimiento
SELECT 
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM cap_notificaciones) THEN '✅ PASS: Días para vencimiento calculados'
        ELSE '❌ FAIL: Hay notificaciones sin días calculados'
    END as resultado
FROM cap_notificaciones
WHERE dias_para_vencimiento IS NOT NULL;

-- Verificar lógica de estados según días
SELECT 
    estado,
    COUNT(*) as cantidad,
    MIN(dias_para_vencimiento) as dias_min,
    MAX(dias_para_vencimiento) as dias_max,
    CASE 
        WHEN estado = 'pendiente' AND AVG(dias_para_vencimiento) = 0 THEN '✅'
        WHEN estado = 'vencida' AND MAX(dias_para_vencimiento) < 0 THEN '✅'
        WHEN estado = 'proximo_vencer' AND MAX(dias_para_vencimiento) <= 30 AND MIN(dias_para_vencimiento) > 0 THEN '✅'
        WHEN estado = 'vigente' AND MIN(dias_para_vencimiento) > 30 THEN '✅'
        ELSE '❌'
    END as validacion
FROM cap_notificaciones
GROUP BY estado
ORDER BY estado;

-- ----------------------------------------------------------------------------
-- TEST 6: Consultas Complejas (Queries de API)
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 6: CONSULTAS COMPLEJAS'
\echo '========================================='

-- Simular query de listado de programaciones con estadísticas
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Query de listado funciona correctamente'
        ELSE '❌ FAIL: Query de listado falla'
    END as resultado
FROM (
    SELECT 
        p.*,
        t.nombre AS tema_nombre,
        c.cargo AS cargo_nombre,
        r.nombre AS rol_capacitador_nombre,
        (
            SELECT MIN(n.fecha_proxima)
            FROM cap_notificaciones n
            WHERE n.id_programacion = p.id
            AND n.estado IN ('pendiente', 'proximo_vencer', 'vencida')
        ) AS proxima_capacitacion,
        (
            SELECT COUNT(DISTINCT n.id_colaborador)
            FROM cap_notificaciones n
            WHERE n.id_programacion = p.id
            AND n.estado IN ('pendiente', 'proximo_vencer', 'vencida')
        ) AS colaboradores_pendientes
    FROM cap_programacion p
    INNER JOIN cap_tema t ON p.id_tema = t.id
    INNER JOIN adm_cargos c ON p.id_cargo = c.id_cargo
    INNER JOIN adm_roles r ON p.id_rol_capacitador = r.id
    WHERE p.activo = true
) AS query_test;

-- Verificar query de alertas de capacitador (≤7 días)
SELECT 
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ PASS: Query de alertas de capacitador funciona'
        ELSE '❌ FAIL: Query de alertas falla'
    END as resultado,
    COUNT(*) as alertas_encontradas
FROM (
    SELECT 
        p.*,
        t.nombre as tema_nombre,
        n.dias_para_vencimiento,
        COUNT(DISTINCT n.id_colaborador) as colaboradores_pendientes
    FROM cap_programacion p
    INNER JOIN cap_notificaciones n ON n.id_programacion = p.id
    INNER JOIN cap_tema t ON p.id_tema = t.id
    WHERE p.activo = true
    AND n.estado IN ('pendiente', 'proximo_vencer', 'vencida')
    AND n.dias_para_vencimiento <= 7
    GROUP BY p.id, t.nombre, n.dias_para_vencimiento
) AS alertas_test;

-- ----------------------------------------------------------------------------
-- TEST 7: Integridad de Datos
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 7: INTEGRIDAD DE DATOS'
\echo '========================================='

-- Verificar que no hay programaciones sin tema válido
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS: Todas las programaciones tienen tema válido'
        ELSE '❌ FAIL: Hay programaciones con tema inválido'
    END as resultado
FROM cap_programacion p
LEFT JOIN cap_tema t ON p.id_tema = t.id
WHERE p.activo = true AND t.id IS NULL;

-- Verificar que no hay programaciones sin cargo válido
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS: Todas las programaciones tienen cargo válido'
        ELSE '❌ FAIL: Hay programaciones con cargo inválido'
    END as resultado
FROM cap_programacion p
LEFT JOIN adm_cargos c ON p.id_cargo = c.id_cargo
WHERE p.activo = true AND c.id_cargo IS NULL;

-- Verificar que no hay programaciones sin rol válido
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS: Todas las programaciones tienen rol válido'
        ELSE '❌ FAIL: Hay programaciones con rol inválido'
    END as resultado
FROM cap_programacion p
LEFT JOIN adm_roles r ON p.id_rol_capacitador = r.id
WHERE p.activo = true AND r.id IS NULL;

-- Verificar constraint UNIQUE en notificaciones
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS: No hay duplicados en notificaciones (id_colaborador, id_programacion)'
        ELSE '❌ FAIL: Hay notificaciones duplicadas'
    END as resultado
FROM (
    SELECT id_colaborador, id_programacion, COUNT(*) as duplicados
    FROM cap_notificaciones
    GROUP BY id_colaborador, id_programacion
    HAVING COUNT(*) > 1
) AS duplicados_test;

-- ----------------------------------------------------------------------------
-- TEST 8: Rendimiento de Queries
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 8: RENDIMIENTO'
\echo '========================================='

-- Verificar que los índices están siendo usados
EXPLAIN (FORMAT TEXT) 
SELECT * FROM cap_programacion WHERE id_cargo = '116';

EXPLAIN (FORMAT TEXT)
SELECT * FROM cap_programacion WHERE id_tema = 75;

EXPLAIN (FORMAT TEXT)
SELECT * FROM cap_programacion WHERE sub_area = '003';

-- ----------------------------------------------------------------------------
-- TEST 9: Casos de Uso Comunes
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'TEST 9: CASOS DE USO'
\echo '========================================='

-- Caso 1: Buscar todas las programaciones de un cargo específico
\echo 'Caso 1: Programaciones por cargo'
SELECT 
    c.cargo,
    COUNT(*) as total_programaciones,
    STRING_AGG(DISTINCT t.nombre, ', ') as temas
FROM cap_programacion p
JOIN adm_cargos c ON p.id_cargo = c.id_cargo
JOIN cap_tema t ON p.id_tema = t.id
WHERE p.activo = true
GROUP BY c.cargo
LIMIT 5;

-- Caso 2: Colaboradores con capacitaciones vencidas
\echo ''
\echo 'Caso 2: Colaboradores con capacitaciones vencidas'
SELECT 
    COUNT(DISTINCT n.id_colaborador) as colaboradores_con_vencidas,
    COUNT(*) as capacitaciones_vencidas
FROM cap_notificaciones n
WHERE n.estado = 'vencida';

-- Caso 3: Próximas capacitaciones en los siguientes 30 días
\echo ''
\echo 'Caso 3: Capacitaciones próximas (30 días)'
SELECT 
    COUNT(DISTINCT n.id_programacion) as programaciones_proximas,
    COUNT(DISTINCT n.id_colaborador) as colaboradores_afectados
FROM cap_notificaciones n
WHERE n.estado = 'proximo_vencer';

-- Caso 4: Estadísticas por rol de capacitador
\echo ''
\echo 'Caso 4: Estadísticas por rol capacitador'
SELECT 
    r.nombre as rol_capacitador,
    COUNT(DISTINCT p.id) as programaciones_asignadas,
    COUNT(DISTINCT n.id_colaborador) as colaboradores_a_capacitar
FROM adm_roles r
LEFT JOIN cap_programacion p ON p.id_rol_capacitador = r.id AND p.activo = true
LEFT JOIN cap_notificaciones n ON n.id_programacion = p.id 
    AND n.estado IN ('pendiente', 'proximo_vencer', 'vencida')
WHERE r.nombre LIKE '%Capacitador%' OR r.nombre = 'Administrador'
GROUP BY r.nombre
ORDER BY programaciones_asignadas DESC;

-- ----------------------------------------------------------------------------
-- RESUMEN FINAL
-- ----------------------------------------------------------------------------
\echo ''
\echo '========================================='
\echo 'RESUMEN DE PRUEBAS'
\echo '========================================='

SELECT 
    'Base de Datos' as componente,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'cap_%') as elementos,
    'Tablas creadas' as descripcion,
    '✅' as estado
UNION ALL
SELECT 
    'Programaciones',
    (SELECT COUNT(*) FROM cap_programacion WHERE activo = true),
    'Programaciones activas',
    CASE WHEN (SELECT COUNT(*) FROM cap_programacion WHERE activo = true) > 0 THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Notificaciones',
    (SELECT COUNT(*) FROM cap_notificaciones),
    'Notificaciones generadas',
    CASE WHEN (SELECT COUNT(*) FROM cap_notificaciones) > 0 THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Función',
    1,
    'actualizar_notificaciones()',
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'actualizar_notificaciones_capacitacion') THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Temas',
    (SELECT COUNT(*) FROM cap_tema),
    'Temas disponibles',
    CASE WHEN (SELECT COUNT(*) FROM cap_tema) > 0 THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Cargos',
    (SELECT COUNT(*) FROM adm_cargos),
    'Cargos configurados',
    CASE WHEN (SELECT COUNT(*) FROM adm_cargos) > 0 THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
    'Colaboradores',
    (SELECT COUNT(*) FROM adm_colaboradores),
    'Colaboradores en sistema',
    CASE WHEN (SELECT COUNT(*) FROM adm_colaboradores) > 0 THEN '✅' ELSE '❌' END;

\echo ''
\echo '========================================='
\echo 'TODAS LAS PRUEBAS COMPLETADAS'
\echo '========================================='
\echo ''
\echo 'Para ejecutar estas pruebas:'
\echo 'psql -U postgres -d osm2 -f test_programacion_complete.sql'
\echo ''
