-- =====================================================
-- MIGRACIÓN UNIFICADA DEL SISTEMA DE PERMISOS DE ROLES
-- =====================================================
-- Este script combina migrate_role_permissions.sql y adm_role_permissions.sql
-- en un único archivo ejecutable desde clientes que NO interpretan comandos psql
-- (por ejemplo: pgAdmin, DBeaver, JDBC, etc.).
-- IMPORTANTE: Hacer backup antes de ejecutar.
-- =====================================================

-- Paso 0: Guardar datos existentes en tabla temporal (si existe la tabla antigua)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'adm_role_permissions'
  ) THEN
    EXECUTE 'CREATE TEMP TABLE temp_old_permissions AS SELECT * FROM public.adm_role_permissions';
    RAISE NOTICE 'temp_old_permissions creada y poblada desde public.adm_role_permissions';
  ELSE
    RAISE NOTICE 'Tabla public.adm_role_permissions no existe: temp_old_permissions no creada';
  END IF;
END
$$;

-- Paso 1: Eliminar constraints y tabla antigua (si existen)
DROP VIEW IF EXISTS v_role_permissions_full;
ALTER TABLE IF EXISTS adm_role_permissions DROP CONSTRAINT IF EXISTS fk_role_permissions_rol;
ALTER TABLE IF EXISTS adm_role_permissions DROP CONSTRAINT IF EXISTS unique_rol_permission;
ALTER TABLE IF EXISTS adm_role_permissions DROP CONSTRAINT IF EXISTS unique_rol_resource;
DROP INDEX IF EXISTS idx_role_permissions_rol_id;
DROP INDEX IF EXISTS idx_role_permissions_key;
DROP INDEX IF EXISTS idx_role_permissions_resource;
DROP TABLE IF EXISTS adm_role_permissions CASCADE;
DROP TABLE IF EXISTS adm_resources_catalog CASCADE;

-- =====================================================
-- A continuación se crean las nuevas estructuras (contenido de adm_role_permissions.sql)
-- =====================================================

-- Tabla principal de permisos de roles
-- Almacena la relación entre roles y recursos (páginas/módulos)
CREATE TABLE IF NOT EXISTS "public"."adm_role_permissions" (
  "id" SERIAL PRIMARY KEY,
  "rol_id" int4 NOT NULL,
  "resource_type" varchar(20) NOT NULL DEFAULT 'page', -- 'page', 'module', 'sidebar_item'
  "resource_path" varchar(255) NOT NULL,               -- Ruta del recurso (ej: /Usuarios.html, /m_capacitaciones/)
  "resource_name" varchar(255),                        -- Nombre legible del recurso
  "module_name" varchar(100),                          -- Nombre del módulo al que pertenece
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_role_permissions_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."adm_roles" ("id") ON DELETE CASCADE,
  CONSTRAINT "unique_rol_resource" UNIQUE ("rol_id", "resource_type", "resource_path")
);

-- Tabla catálogo de recursos disponibles en el sistema
-- Se auto-actualiza mediante el escaneo de archivos HTML
CREATE TABLE IF NOT EXISTS "public"."adm_resources_catalog" (
  "id" SERIAL PRIMARY KEY,
  "resource_type" varchar(20) NOT NULL,      -- 'page', 'module', 'sidebar_item'
  "resource_path" varchar(255) NOT NULL,     -- Ruta del recurso
  "resource_name" varchar(255),              -- Nombre descriptivo
  "module_name" varchar(100),                -- Módulo al que pertenece
  "icon" varchar(50),                        -- Icono del recurso (para UI)
  "data_roles" text,                         -- Roles originales del data-role (para referencia)
  "is_active" boolean DEFAULT TRUE,          -- Si el recurso está activo
  "last_scanned" timestamp DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unique_resource_path" UNIQUE ("resource_type", "resource_path")
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS "idx_role_permissions_rol_id" ON "public"."adm_role_permissions" ("rol_id");
CREATE INDEX IF NOT EXISTS "idx_role_permissions_resource" ON "public"."adm_role_permissions" ("resource_type", "resource_path");
CREATE INDEX IF NOT EXISTS "idx_role_permissions_module" ON "public"."adm_role_permissions" ("module_name");

CREATE INDEX IF NOT EXISTS "idx_resources_catalog_type" ON "public"."adm_resources_catalog" ("resource_type");
CREATE INDEX IF NOT EXISTS "idx_resources_catalog_module" ON "public"."adm_resources_catalog" ("module_name");
CREATE INDEX IF NOT EXISTS "idx_resources_catalog_active" ON "public"."adm_resources_catalog" ("is_active");

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_adm_role_permissions_updated_at ON "public"."adm_role_permissions";
CREATE TRIGGER update_adm_role_permissions_updated_at
    BEFORE UPDATE ON "public"."adm_role_permissions"
    FOR EACH ROW
    EXECUTE FUNCTION update_role_permissions_updated_at();

-- Comentarios descriptivos
COMMENT ON TABLE "public"."adm_role_permissions" IS 'Permisos de roles para acceder a páginas, módulos y elementos de sidebar';
COMMENT ON COLUMN "public"."adm_role_permissions"."rol_id" IS 'ID del rol al que se asigna el permiso';
COMMENT ON COLUMN "public"."adm_role_permissions"."resource_type" IS 'Tipo de recurso: page (página individual), module (módulo completo), sidebar_item (elemento de menú)';
COMMENT ON COLUMN "public"."adm_role_permissions"."resource_path" IS 'Ruta del recurso (ej: /Usuarios.html, /m_capacitaciones/)';
COMMENT ON COLUMN "public"."adm_role_permissions"."resource_name" IS 'Nombre legible del recurso para mostrar en la UI';
COMMENT ON COLUMN "public"."adm_role_permissions"."module_name" IS 'Nombre del módulo al que pertenece el recurso';

COMMENT ON TABLE "public"."adm_resources_catalog" IS 'Catálogo de todos los recursos disponibles en el sistema (páginas, módulos, items de sidebar)';
COMMENT ON COLUMN "public"."adm_resources_catalog"."resource_type" IS 'Tipo de recurso';
COMMENT ON COLUMN "public"."adm_resources_catalog"."resource_path" IS 'Ruta del recurso';
COMMENT ON COLUMN "public"."adm_resources_catalog"."resource_name" IS 'Nombre descriptivo para mostrar';
COMMENT ON COLUMN "public"."adm_resources_catalog"."module_name" IS 'Módulo al que pertenece';
COMMENT ON COLUMN "public"."adm_resources_catalog"."data_roles" IS 'Roles originales del atributo data-role (separados por coma, solo para referencia)';
COMMENT ON COLUMN "public"."adm_resources_catalog"."is_active" IS 'Indica si el recurso está activo y disponible';

-- =====================================================
-- DATOS INICIALES: Catálogo de recursos del sistema
-- =====================================================

-- Insertar módulos principales
INSERT INTO "public"."adm_resources_catalog" (resource_type, resource_path, resource_name, module_name, icon, data_roles, is_active)
VALUES
  ('module', '/m_admin/', 'Administrador', 'Administrador', 'fas fa-cogs', 'administrador', TRUE),
  ('module', '/m_capacitaciones/', 'Capacitaciones', 'Capacitaciones', 'fas fa-table', 'administrador,capacitador', TRUE),
  ('module', '/m_agronomia/', 'Agronomía', 'Agronomía', 'fas fa-leaf', 'administrador,supervisor_agronomico,aux_agronomico', TRUE),
  ('module', '/m_bascula/', 'Báscula', 'Báscula', 'fas fa-weight', 'administrador,bascula,aux_bascula', TRUE),
  ('module', '/m_almacen/', 'Almacén', 'Almacén', 'fas fa-archive', 'administrador,almacen,aux_almacen', TRUE)
ON CONFLICT (resource_type, resource_path) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  icon = EXCLUDED.icon,
  data_roles = EXCLUDED.data_roles,
  last_scanned = CURRENT_TIMESTAMP;

-- Insertar páginas principales (fuera de módulos)
INSERT INTO "public"."adm_resources_catalog" (resource_type, resource_path, resource_name, module_name, icon, data_roles, is_active)
VALUES
  ('page', '/panel.html', 'Panel Principal', 'General', 'fas fa-tachometer-alt', 'todos', TRUE),
  ('page', '/Usuarios.html', 'Usuarios', 'Usuarios', 'fas fa-user-cog', 'todos', TRUE),
  ('page', '/sesiones.html', 'Gestión de Sesiones', 'Administrador', 'fas fa-clock', 'administrador', TRUE)
ON CONFLICT (resource_type, resource_path) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  module_name = EXCLUDED.module_name,
  data_roles = EXCLUDED.data_roles,
  last_scanned = CURRENT_TIMESTAMP;

-- Insertar páginas del módulo Administrador
INSERT INTO "public"."adm_resources_catalog" (resource_type, resource_path, resource_name, module_name, data_roles, is_active)
VALUES
  ('page', '/m_admin/ed_usuario.html', 'Usuarios Principales', 'Administrador', 'administrador', TRUE),
  ('page', '/m_admin/ed_uscolaboradores.html', 'Usuarios Colaboradores', 'Administrador', 'administrador', TRUE),
  ('page', '/includes/roles.html', 'Gestión de Roles', 'Administrador', 'administrador', TRUE),
  ('page', '/includes/web_main.html', 'Configuración Web', 'Administrador', 'administrador', TRUE)
ON CONFLICT (resource_type, resource_path) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  data_roles = EXCLUDED.data_roles,
  last_scanned = CURRENT_TIMESTAMP;

-- Insertar páginas del módulo Capacitaciones
INSERT INTO "public"."adm_resources_catalog" (resource_type, resource_path, resource_name, module_name, data_roles, is_active)
VALUES
  ('page', '/m_capacitaciones/formulario.html', 'Formulario', 'Capacitaciones', 'administrador,capacitador', TRUE),
  ('page', '/m_capacitaciones/ed_formulario.html', 'Edición Formulario', 'Capacitaciones', 'administrador,capacitador', TRUE),
  ('page', '/m_capacitaciones/Consultas_capacitacion.html', 'Consulta por Capacitación', 'Capacitaciones', 'administrador,capacitador', TRUE),
  ('page', '/m_capacitaciones/programacion.html', 'Programación', 'Capacitaciones', 'administrador,capacitador', TRUE),
  ('page', '/m_capacitaciones/dashboard.html', 'Dashboard Capacitaciones', 'Capacitaciones', 'administrador,capacitador', TRUE),
  ('page', '/m_capacitaciones/items_formularios.html', 'Items Formularios', 'Capacitaciones', 'administrador,capacitador', TRUE)
ON CONFLICT (resource_type, resource_path) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  data_roles = EXCLUDED.data_roles,
  last_scanned = CURRENT_TIMESTAMP;

-- Insertar páginas del módulo Agronomía
INSERT INTO "public"."adm_resources_catalog" (resource_type, resource_path, resource_name, module_name, data_roles, is_active)
VALUES
  ('page', '/m_agronomia/tb_agronomia.html', 'Formulario', 'Agronomía', 'administrador,supervisor_agronomico', TRUE),
  ('page', '/m_agronomia/Consultas.html', 'Consulta', 'Agronomía', 'administrador,supervisor_agronomico', TRUE)
ON CONFLICT (resource_type, resource_path) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  data_roles = EXCLUDED.data_roles,
  last_scanned = CURRENT_TIMESTAMP;

-- Insertar páginas del módulo Báscula
INSERT INTO "public"."adm_resources_catalog" (resource_type, resource_path, resource_name, module_name, data_roles, is_active)
VALUES
  ('page', '/m_bascula/pesaje.html', 'Pesaje', 'Báscula', 'administrador,bascula', TRUE),
  ('page', '/m_bascula/Consultas.html', 'Consulta', 'Báscula', 'administrador,bascula', TRUE)
ON CONFLICT (resource_type, resource_path) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  data_roles = EXCLUDED.data_roles,
  last_scanned = CURRENT_TIMESTAMP;

-- Insertar páginas del módulo Almacén
INSERT INTO "public"."adm_resources_catalog" (resource_type, resource_path, resource_name, module_name, data_roles, is_active)
VALUES
  ('page', '/m_almacen/formulario.html', 'Formulario', 'Almacén', 'administrador,almacen', TRUE),
  ('page', '/m_almacen/Consultas.html', 'Consulta', 'Almacén', 'administrador,almacen', TRUE)
ON CONFLICT (resource_type, resource_path) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  data_roles = EXCLUDED.data_roles,
  last_scanned = CURRENT_TIMESTAMP;

-- =====================================================
-- VISTA AUXILIAR: Permisos con información completa
-- =====================================================
CREATE OR REPLACE VIEW "public"."v_role_permissions_full" AS
SELECT 
  rp.id,
  rp.rol_id,
  r.nombre as rol_nombre,
  rp.resource_type,
  rp.resource_path,
  rp.resource_name,
  rp.module_name,
  rc.icon,
  rc.data_roles as original_data_roles,
  rp.created_at,
  rp.updated_at
FROM adm_role_permissions rp
JOIN adm_roles r ON rp.rol_id = r.id
LEFT JOIN adm_resources_catalog rc ON rp.resource_type = rc.resource_type 
  AND rp.resource_path = rc.resource_path
WHERE rc.is_active = TRUE OR rc.is_active IS NULL;

COMMENT ON VIEW "public"."v_role_permissions_full" IS 'Vista que combina permisos de roles con información completa del catálogo de recursos';

-- Paso final: Mensaje informativo
DO $$ 
BEGIN
  RAISE NOTICE 'Migración completada. Si existía, temp_old_permissions contiene los permisos antiguos para referencia.';
  RAISE NOTICE 'Por favor, vuelva a configurar los permisos usando la nueva interfaz de Gestión de Roles (/includes/roles.html).';
END $$;