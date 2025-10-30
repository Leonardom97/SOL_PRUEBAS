-- ============================================================================
-- Migration: Add id_colaborador to capacitation tables
-- Description: Partial migration to add id_colaborador columns while keeping
--              cedula for audit purposes. Implements final training module.
-- Date: 2025-10-26
-- ============================================================================

-- IMPORTANT: Execute this in STAGING first, then in PRODUCTION after testing

BEGIN;

-- ============================================================================
-- PHASE B.1: Add id_colaborador to cap_formulario_asistente
-- ============================================================================

-- Add column if it doesn't exist
ALTER TABLE cap_formulario_asistente 
ADD COLUMN IF NOT EXISTS id_colaborador INTEGER;

COMMENT ON COLUMN cap_formulario_asistente.id_colaborador 
IS 'Reference to adm_colaboradores.ac_id - populated from cedula match';

-- ============================================================================
-- PHASE B.2: Populate id_colaborador in cap_formulario_asistente
-- ============================================================================

-- Update id_colaborador by matching cedula (normalized - removing non-digit chars)
UPDATE cap_formulario_asistente a
SET id_colaborador = c.ac_id
FROM adm_colaboradores c
WHERE regexp_replace(a.cedula, '\D', '', 'g') = regexp_replace(c.ac_cedula, '\D', '', 'g')
  AND a.id_colaborador IS NULL;

-- Report: Count of successfully mapped records
DO $$
DECLARE
    mapped_count INTEGER;
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapped_count 
    FROM cap_formulario_asistente 
    WHERE id_colaborador IS NOT NULL;
    
    SELECT COUNT(*) INTO unmapped_count 
    FROM cap_formulario_asistente 
    WHERE id_colaborador IS NULL;
    
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'cap_formulario_asistente mapping results:';
    RAISE NOTICE 'Successfully mapped: % records', mapped_count;
    RAISE NOTICE 'Unmapped (need manual review): % records', unmapped_count;
    RAISE NOTICE '=============================================================';
END $$;

-- ============================================================================
-- PHASE B.3: Report unmapped cedulas in cap_formulario_asistente
-- ============================================================================

-- Create a temporary table to store unmapped cedulas for review
DROP TABLE IF EXISTS tmp_unmapped_asistentes;
CREATE TEMP TABLE tmp_unmapped_asistentes AS
SELECT 
    a.cedula,
    COUNT(*) AS ocurrencias,
    STRING_AGG(DISTINCT a.nombre, ', ') AS nombres_registrados
FROM cap_formulario_asistente a
WHERE a.id_colaborador IS NULL
GROUP BY a.cedula
ORDER BY ocurrencias DESC;

-- Display unmapped records
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'UNMAPPED CEDULAS IN cap_formulario_asistente (Need Manual Review):';
    RAISE NOTICE '=============================================================';
    
    FOR rec IN 
        SELECT * FROM tmp_unmapped_asistentes 
        LIMIT 20
    LOOP
        counter := counter + 1;
        RAISE NOTICE '%. Cedula: % | Occurrences: % | Names: %', 
            counter, rec.cedula, rec.ocurrencias, rec.nombres_registrados;
    END LOOP;
    
    IF counter = 20 THEN
        RAISE NOTICE '... (showing first 20 only)';
    END IF;
    
    RAISE NOTICE '=============================================================';
END $$;

-- ============================================================================
-- PHASE B.4: Add id_colaborador to cap_notificaciones (if not exists)
-- ============================================================================

-- Add cedula column to cap_notificaciones for audit purposes
ALTER TABLE cap_notificaciones 
ADD COLUMN IF NOT EXISTS cedula VARCHAR(255);

COMMENT ON COLUMN cap_notificaciones.cedula 
IS 'Cedula for audit purposes - never deleted';

-- Populate cedula from adm_colaboradores if empty
UPDATE cap_notificaciones n
SET cedula = c.ac_cedula
FROM adm_colaboradores c
WHERE n.id_colaborador = c.ac_id
  AND (n.cedula IS NULL OR n.cedula = '');

-- ============================================================================
-- PHASE B.5: Create indexes for performance
-- ============================================================================

-- Index on id_colaborador in cap_formulario_asistente
CREATE INDEX IF NOT EXISTS idx_cfa_id_colaborador 
ON cap_formulario_asistente(id_colaborador);

-- Index on id_colaborador in cap_notificaciones (should already exist, but ensure)
CREATE INDEX IF NOT EXISTS idx_notif_id_colaborador 
ON cap_notificaciones(id_colaborador);

-- Index on fecha_proxima in cap_notificaciones for efficient date queries
CREATE INDEX IF NOT EXISTS idx_notif_fecha_proxima 
ON cap_notificaciones(fecha_proxima);

-- Index on estado in cap_notificaciones for filtering
CREATE INDEX IF NOT EXISTS idx_notif_estado 
ON cap_notificaciones(estado);

-- Index on cedula in cap_formulario_asistente for lookups
CREATE INDEX IF NOT EXISTS idx_cfa_cedula 
ON cap_formulario_asistente(cedula);

COMMENT ON INDEX idx_cfa_id_colaborador IS 'Fast lookup by collaborator ID';
COMMENT ON INDEX idx_notif_id_colaborador IS 'Fast lookup by collaborator ID';
COMMENT ON INDEX idx_notif_fecha_proxima IS 'Fast filtering by next training date';
COMMENT ON INDEX idx_notif_estado IS 'Fast filtering by notification state';
COMMENT ON INDEX idx_cfa_cedula IS 'Fast lookup by cedula for form saves';

-- ============================================================================
-- PHASE B.6: Optional Foreign Key (Commented - add after QA approval)
-- ============================================================================

-- IMPORTANT: Only add these foreign keys after all cedulas are mapped and QA approved
-- Uncomment these lines when ready to enforce referential integrity:

/*
-- Foreign key for cap_formulario_asistente
ALTER TABLE cap_formulario_asistente 
ADD CONSTRAINT fk_asistente_colaborador 
FOREIGN KEY (id_colaborador) 
REFERENCES adm_colaboradores(ac_id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_asistente_colaborador ON cap_formulario_asistente 
IS 'Links attendee to collaborator - SET NULL on delete to preserve audit trail';
*/

-- ============================================================================
-- PHASE C: Verify actualizar_notificaciones_capacitacion function
-- ============================================================================

-- The function already exists and implements the correct logic:
-- - fecha_proxima = fecha_ultima + (frecuencia_meses months)
-- - dias_para_vencimiento = fecha_proxima - current_date
-- - estado: pendiente, vencida, proximo_vencer (<=30 days), vigente
-- No changes needed to the function itself.

-- Test the function
DO $$
BEGIN
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'Testing actualizar_notificaciones_capacitacion()...';
    RAISE NOTICE '=============================================================';
    
    -- Execute the function
    PERFORM actualizar_notificaciones_capacitacion();
    
    RAISE NOTICE 'Function executed successfully';
    RAISE NOTICE '=============================================================';
END $$;

-- ============================================================================
-- PHASE F: Cron Job Setup Documentation
-- ============================================================================

-- Add this to the server crontab to run daily at 00:05 AM:
-- 5 0 * * * psql -d your_database_name -c "SELECT actualizar_notificaciones_capacitacion();" >> /var/log/cap_notif_recalc.log 2>&1

-- Alternative: Using pg_cron extension (if installed)
-- SELECT cron.schedule(
--     'daily-training-notification-update',
--     '5 0 * * *',
--     'SELECT actualizar_notificaciones_capacitacion();'
-- );

-- ============================================================================
-- Migration Summary and Statistics
-- ============================================================================

DO $$
DECLARE
    total_asistentes INTEGER;
    mapped_asistentes INTEGER;
    unmapped_asistentes INTEGER;
    total_notificaciones INTEGER;
    notif_with_cedula INTEGER;
    pct_mapped NUMERIC;
BEGIN
    -- cap_formulario_asistente stats
    SELECT COUNT(*) INTO total_asistentes FROM cap_formulario_asistente;
    SELECT COUNT(*) INTO mapped_asistentes FROM cap_formulario_asistente WHERE id_colaborador IS NOT NULL;
    SELECT COUNT(*) INTO unmapped_asistentes FROM cap_formulario_asistente WHERE id_colaborador IS NULL;
    
    IF total_asistentes > 0 THEN
        pct_mapped := ROUND((mapped_asistentes::NUMERIC / total_asistentes::NUMERIC) * 100, 2);
    ELSE
        pct_mapped := 0;
    END IF;
    
    -- cap_notificaciones stats
    SELECT COUNT(*) INTO total_notificaciones FROM cap_notificaciones;
    SELECT COUNT(*) INTO notif_with_cedula FROM cap_notificaciones WHERE cedula IS NOT NULL AND cedula != '';
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'cap_formulario_asistente:';
    RAISE NOTICE '  Total records: %', total_asistentes;
    RAISE NOTICE '  Mapped to id_colaborador: % (%%)', mapped_asistentes, pct_mapped;
    RAISE NOTICE '  Unmapped (needs review): %', unmapped_asistentes;
    RAISE NOTICE '';
    RAISE NOTICE 'cap_notificaciones:';
    RAISE NOTICE '  Total records: %', total_notificaciones;
    RAISE NOTICE '  Records with cedula: %', notif_with_cedula;
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes created: 5';
    RAISE NOTICE '  - idx_cfa_id_colaborador';
    RAISE NOTICE '  - idx_notif_id_colaborador';
    RAISE NOTICE '  - idx_notif_fecha_proxima';
    RAISE NOTICE '  - idx_notif_estado';
    RAISE NOTICE '  - idx_cfa_cedula';
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE '1. Review unmapped cedulas (listed above)';
    RAISE NOTICE '2. Correct cedulas in adm_colaboradores or cap_formulario_asistente';
    RAISE NOTICE '3. Re-run the UPDATE statements to map remaining records';
    RAISE NOTICE '4. Test PHP endpoints (programacion_save, formulario_save)';
    RAISE NOTICE '5. After QA approval, uncomment and add foreign keys';
    RAISE NOTICE '6. Set up daily cron job for notification updates';
    RAISE NOTICE '=============================================================';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if needed to undo changes)
-- ============================================================================
/*
BEGIN;

-- Remove indexes
DROP INDEX IF EXISTS idx_cfa_id_colaborador;
DROP INDEX IF EXISTS idx_notif_id_colaborador;
DROP INDEX IF EXISTS idx_notif_fecha_proxima;
DROP INDEX IF EXISTS idx_notif_estado;
DROP INDEX IF EXISTS idx_cfa_cedula;

-- Remove columns (WARNING: This will delete data)
-- Only use if absolutely necessary
-- ALTER TABLE cap_formulario_asistente DROP COLUMN IF EXISTS id_colaborador;
-- ALTER TABLE cap_notificaciones DROP COLUMN IF EXISTS cedula;

COMMIT;
*/
