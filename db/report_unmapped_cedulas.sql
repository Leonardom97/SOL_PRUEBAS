-- ============================================================================
-- Query: Report Unmapped Cedulas for Manual Review
-- ============================================================================
-- This script helps identify cedulas that couldn't be automatically mapped
-- to collaborators in the adm_colaboradores table.
-- 
-- Use this to:
-- 1. Find typos in cedulas
-- 2. Identify missing collaborators
-- 3. Track which records need manual correction
-- ============================================================================

-- Report 1: Unmapped cedulas in cap_formulario_asistente
-- ============================================================================
SELECT 
    '=== UNMAPPED CEDULAS IN cap_formulario_asistente ===' as report_title;

SELECT 
    a.cedula,
    COUNT(*) as ocurrencias,
    STRING_AGG(DISTINCT a.nombre, ', ') as nombres_registrados,
    STRING_AGG(DISTINCT a.cargo, ', ') as cargos_registrados,
    STRING_AGG(DISTINCT a.empresa, ', ') as empresas_registradas,
    MIN(f.fecha) as primera_ocurrencia,
    MAX(f.fecha) as ultima_ocurrencia
FROM cap_formulario_asistente a
LEFT JOIN cap_formulario f ON a.id_formulario = f.id
WHERE a.id_colaborador IS NULL
GROUP BY a.cedula
ORDER BY ocurrencias DESC, a.cedula;

-- Report 2: Summary statistics
-- ============================================================================
SELECT 
    '=== SUMMARY STATISTICS ===' as report_title;

SELECT 
    'Total asistentes' as metric,
    COUNT(*) as value
FROM cap_formulario_asistente
UNION ALL
SELECT 
    'Asistentes con id_colaborador' as metric,
    COUNT(*) as value
FROM cap_formulario_asistente
WHERE id_colaborador IS NOT NULL
UNION ALL
SELECT 
    'Asistentes sin id_colaborador' as metric,
    COUNT(*) as value
FROM cap_formulario_asistente
WHERE id_colaborador IS NULL
UNION ALL
SELECT 
    'Porcentaje mapeado' as metric,
    ROUND(
        (COUNT(*) FILTER (WHERE id_colaborador IS NOT NULL)::NUMERIC / 
         COUNT(*)::NUMERIC * 100), 2
    ) as value
FROM cap_formulario_asistente;

-- Report 3: Potential matches (fuzzy matching)
-- ============================================================================
SELECT 
    '=== POTENTIAL MATCHES (Review Manually) ===' as report_title;

-- Find potential matches where normalized cedulas are similar
SELECT 
    a.cedula as asistente_cedula,
    a.nombre as asistente_nombre,
    c.ac_cedula as colaborador_cedula,
    (c.ac_nombre1 || ' ' || COALESCE(c.ac_nombre2, '') || ' ' || 
     c.ac_apellido1 || ' ' || COALESCE(c.ac_apellido2, '')) as colaborador_nombre,
    c.ac_id as colaborador_id,
    -- Calculate similarity
    CASE 
        WHEN regexp_replace(a.cedula, '\D', '', 'g') = regexp_replace(c.ac_cedula, '\D', '', 'g') 
        THEN 'EXACT MATCH (should have mapped)'
        WHEN LENGTH(regexp_replace(a.cedula, '\D', '', 'g')) = LENGTH(regexp_replace(c.ac_cedula, '\D', '', 'g'))
        THEN 'SAME LENGTH (check typo)'
        WHEN LENGTH(regexp_replace(a.cedula, '\D', '', 'g')) = LENGTH(regexp_replace(c.ac_cedula, '\D', '', 'g')) - 1
        THEN 'MISSING ONE DIGIT'
        WHEN LENGTH(regexp_replace(a.cedula, '\D', '', 'g')) = LENGTH(regexp_replace(c.ac_cedula, '\D', '', 'g')) + 1
        THEN 'EXTRA ONE DIGIT'
        ELSE 'CHECK MANUALLY'
    END as match_type
FROM cap_formulario_asistente a
CROSS JOIN adm_colaboradores c
WHERE a.id_colaborador IS NULL
    AND (
        -- Check for similar cedulas (off by 1-2 characters)
        levenshtein(
            regexp_replace(a.cedula, '\D', '', 'g'),
            regexp_replace(c.ac_cedula, '\D', '', 'g')
        ) <= 2
        OR
        -- Check for similar names
        similarity(
            LOWER(a.nombre),
            LOWER(c.ac_nombre1 || ' ' || COALESCE(c.ac_nombre2, '') || ' ' || 
                  c.ac_apellido1 || ' ' || COALESCE(c.ac_apellido2, ''))
        ) > 0.5
    )
ORDER BY a.cedula, match_type;

-- Note: The levenshtein and similarity functions require the pg_trgm extension
-- If not installed, run: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- If levenshtein is not available, run: CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Report 4: Check for cedulas in adm_colaboradores that might match
-- ============================================================================
SELECT 
    '=== CEDULAS IN COLABORADORES NOT IN ASISTENTES ===' as report_title;

-- This helps identify if the cedula exists but is formatted differently
SELECT DISTINCT
    c.ac_cedula,
    c.ac_nombre1 || ' ' || COALESCE(c.ac_nombre2, '') || ' ' || 
    c.ac_apellido1 || ' ' || COALESCE(c.ac_apellido2, '') as nombre_completo,
    c.ac_id,
    c.ac_id_situación as situacion
FROM adm_colaboradores c
WHERE c.ac_id_situación IN ('A', 'V', 'P')
    AND NOT EXISTS (
        SELECT 1 
        FROM cap_formulario_asistente a
        WHERE regexp_replace(a.cedula, '\D', '', 'g') = regexp_replace(c.ac_cedula, '\D', '', 'g')
    )
ORDER BY c.ac_cedula
LIMIT 50;

-- Report 5: Action Items
-- ============================================================================
SELECT 
    '=== ACTION ITEMS ===' as report_title;

SELECT 
    CASE 
        WHEN unmapped_count = 0 THEN '✓ All cedulas successfully mapped!'
        WHEN unmapped_count > 0 AND pct_mapped >= 99 THEN 
            '⚠ ' || unmapped_count || ' cedulas need review (but >99% mapped)'
        WHEN unmapped_count > 0 AND pct_mapped >= 95 THEN 
            '⚠ ' || unmapped_count || ' cedulas need review (>95% mapped)'
        ELSE
            '✗ ' || unmapped_count || ' cedulas need urgent review (<95% mapped)'
    END as status,
    unmapped_count as cedulas_sin_mapear,
    pct_mapped || '%' as porcentaje_mapeado
FROM (
    SELECT 
        COUNT(*) FILTER (WHERE id_colaborador IS NULL) as unmapped_count,
        ROUND(
            (COUNT(*) FILTER (WHERE id_colaborador IS NOT NULL)::NUMERIC / 
             COUNT(*)::NUMERIC * 100), 2
        ) as pct_mapped
    FROM cap_formulario_asistente
) stats;

-- Recommended Actions:
-- 1. Review "UNMAPPED CEDULAS" list
-- 2. Check "POTENTIAL MATCHES" for typos
-- 3. For each unmapped cedula:
--    a. Check if colaborador exists in adm_colaboradores
--    b. Verify cedula format (dots, spaces, etc.)
--    c. Update either adm_colaboradores.ac_cedula or cap_formulario_asistente.cedula
-- 4. After corrections, re-run the UPDATE statement:
--    UPDATE cap_formulario_asistente a
--    SET id_colaborador = c.ac_id
--    FROM adm_colaboradores c
--    WHERE regexp_replace(a.cedula, '\D', '', 'g') = regexp_replace(c.ac_cedula, '\D', '', 'g')
--      AND a.id_colaborador IS NULL;
