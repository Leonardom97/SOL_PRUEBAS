-- ============================================================================
-- Script para crear roles del módulo de Agronomía
-- ============================================================================
-- Este script inserta los 5 roles necesarios para el módulo de agronomía
-- con sus permisos específicos según los requerimientos.
-- 
-- Roles a crear:
-- 1. agronomico - Acceso completo sin restricciones
-- 2. aux_agronomico - Auxiliar con permisos limitados
-- 3. sup_logistica1 - Supervisor de logística con permisos de aprobación
-- 4. sup_logistica2 - Supervisor de logística con permisos de aprobación
-- 5. asist_agronomico - Asistente con permisos de reversión
-- ============================================================================

-- Insertar roles en la tabla adm_roles (estado 0 = activo, 1 = inactivo)
-- Se usa ON CONFLICT para evitar duplicados si los roles ya existen

INSERT INTO adm_roles (nombre, estado) VALUES ('agronomico', 0) 
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO adm_roles (nombre, estado) VALUES ('aux_agronomico', 0) 
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO adm_roles (nombre, estado) VALUES ('sup_logistica1', 0) 
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO adm_roles (nombre, estado) VALUES ('sup_logistica2', 0) 
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO adm_roles (nombre, estado) VALUES ('asist_agronomico', 0) 
ON CONFLICT (nombre) DO NOTHING;

-- Verificar que los roles se crearon correctamente
SELECT id, nombre, estado 
FROM adm_roles 
WHERE nombre IN ('agronomico', 'aux_agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico')
ORDER BY nombre;

-- ============================================================================
-- PERMISOS POR ROL (para referencia):
-- ============================================================================
--
-- 1. aux_agronomico (Auxiliar Agronómico):
--    - Puede ingresar información (CRUD en BD temporal)
--    - Puede ver información
--    - SIN acceso a botones de aprobación/rechazo
--    - NO revertir registros aprobados
--    - SOLO puede INACTIVAR error_registro (no activar)
--
-- 2. agronomico (Agronómico - Acceso Completo):
--    - Acceso completo a todo el módulo de agronomía sin restricciones
--    - Puede hacer todo (ingresar, aprobar, rechazar, revertir, activar, inactivar)
--
-- 3. sup_logistica1 (Supervisor Logística 1):
--    - Puede ingresar información
--    - Tiene acceso a botones de aprobar/rechazar
--    - Puede ver información
--    - NO revertir registros aprobados
--    - SOLO puede INACTIVAR error_registro (no activar)
--
-- 4. sup_logistica2 (Supervisor Logística 2):
--    - Puede ingresar información
--    - Tiene acceso a botones de aprobar/rechazar
--    - Puede ver información
--    - NO revertir registros aprobados
--    - SOLO puede INACTIVAR error_registro (no activar)
--
-- 5. asist_agronomico (Asistente Agronómico):
--    - Puede ingresar información
--    - Tiene acceso a botones de aprobar/rechazar
--    - Puede ver información
--    - PUEDE revertir registros aprobados
--    - Puede ACTIVAR error_registro (tanto activar como desactivar)
--
-- ============================================================================
-- ASIGNACIÓN DE ROLES A USUARIOS:
-- ============================================================================
--
-- Para asignar un rol a un usuario, use uno de estos métodos:
--
-- Método 1: A través de la tabla usuarios_roles (si existe)
-- INSERT INTO usuarios_roles (usuario_id, rol_id) 
-- VALUES (
--   (SELECT id FROM usuarios WHERE username = 'nombre_usuario'),
--   (SELECT id FROM adm_roles WHERE nombre = 'agronomico')
-- );
--
-- Método 2: Actualizar el campo rol en la tabla usuarios
-- UPDATE usuarios 
-- SET rol = 'agronomico' 
-- WHERE username = 'nombre_usuario';
--
-- ============================================================================
