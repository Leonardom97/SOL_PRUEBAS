/*
 Navicat Premium Data Transfer

 Source Server         : osm_postgres
 Source Server Type    : PostgreSQL
 Source Server Version : 90525 (90525)
 Source Host           : 192.168.125.25:5432
 Source Catalog        : web
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 90525 (90525)
 File Encoding         : 65001

 Date: 28/05/2025 15:08:02
*/


-- ----------------------------
-- Sequence structure for asistente_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."asistente_id_seq";
CREATE SEQUENCE "public"."asistente_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for formulario_asistente_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."formulario_asistente_id_seq";
CREATE SEQUENCE "public"."formulario_asistente_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for formulario_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."formulario_id_seq";
CREATE SEQUENCE "public"."formulario_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for lugar_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."lugar_id_seq";
CREATE SEQUENCE "public"."lugar_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for proceso_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."proceso_id_seq";
CREATE SEQUENCE "public"."proceso_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for roles_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."roles_id_seq";
CREATE SEQUENCE "public"."roles_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for tema_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."tema_id_seq";
CREATE SEQUENCE "public"."tema_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for tipo_actividad_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."tipo_actividad_id_seq";
CREATE SEQUENCE "public"."tipo_actividad_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for usuarios_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."usuarios_id_seq";
CREATE SEQUENCE "public"."usuarios_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Table structure for asistente
-- ----------------------------
DROP TABLE IF EXISTS "public"."asistente";
CREATE TABLE "public"."asistente" (
  "id" int4 NOT NULL DEFAULT nextval('asistente_id_seq'::regclass),
  "cedula" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "nombre" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "empresa" varchar(100) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for formulario
-- ----------------------------
DROP TABLE IF EXISTS "public"."formulario";
CREATE TABLE "public"."formulario" (
  "id" int4 NOT NULL DEFAULT nextval('formulario_id_seq'::regclass),
  "id_proceso" int4,
  "id_lugar" int4,
  "id_usuario" int4,
  "id_tipo_actividad" int4,
  "id_tema" int4,
  "hora_inicio" time(6),
  "hora_final" time(6),
  "fecha" date,
  "observaciones" text COLLATE "pg_catalog"."default"
)
;



-- ----------------------------
-- Table structure for formulario_asistente
-- ----------------------------
DROP TABLE IF EXISTS "public"."formulario_asistente";
CREATE TABLE "public"."formulario_asistente" (
  "id" int4 NOT NULL DEFAULT nextval('formulario_asistente_id_seq'::regclass),
  "id_formulario" int4,
  "id_asistente" int4,
  "estado" varchar(20) COLLATE "pg_catalog"."default"
)
;


-- ----------------------------
-- Table structure for lugar
-- ----------------------------
DROP TABLE IF EXISTS "public"."lugar";
CREATE TABLE "public"."lugar" (
  "id" int4 NOT NULL DEFAULT nextval('lugar_id_seq'::regclass),
  "lugar" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of lugar
-- ----------------------------
INSERT INTO "public"."lugar" VALUES (1, 'Sala de Juntas Planta');
INSERT INTO "public"."lugar" VALUES (2, 'Bascula');
INSERT INTO "public"."lugar" VALUES (3, 'Oficina supervisores');
INSERT INTO "public"."lugar" VALUES (4, 'Sala de capacitaciones');
INSERT INTO "public"."lugar" VALUES (5, 'Laboratorio');
INSERT INTO "public"."lugar" VALUES (6, 'Campamento');
INSERT INTO "public"."lugar" VALUES (7, 'Planta Extractora');
INSERT INTO "public"."lugar" VALUES (8, 'Oficina Jefe Ventas');
INSERT INTO "public"."lugar" VALUES (9, 'Oficinas Casa Amarilla');
INSERT INTO "public"."lugar" VALUES (10, 'Inversiones Sol Del Llano');

-- ----------------------------
-- Table structure for proceso
-- ----------------------------
DROP TABLE IF EXISTS "public"."proceso";
CREATE TABLE "public"."proceso" (
  "id" int4 NOT NULL DEFAULT nextval('proceso_id_seq'::regclass),
  "proceso" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of proceso
-- ----------------------------
INSERT INTO "public"."proceso" VALUES (1, 'Producción industrial');
INSERT INTO "public"."proceso" VALUES (2, 'Sostenibilidad');
INSERT INTO "public"."proceso" VALUES (3, 'Talento Humano');
INSERT INTO "public"."proceso" VALUES (4, 'Ventas');
INSERT INTO "public"."proceso" VALUES (5, 'Administrativo');
INSERT INTO "public"."proceso" VALUES (6, 'Compras y almacén');
INSERT INTO "public"."proceso" VALUES (7, 'Gestión contable y financiera');

-- ----------------------------
-- Table structure for roles
-- ----------------------------
DROP TABLE IF EXISTS "public"."roles";
CREATE TABLE "public"."roles" (
  "id" int4 NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
  "nombre" varchar(50) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of roles
-- ----------------------------
INSERT INTO "public"."roles" VALUES (1, 'administrador');
INSERT INTO "public"."roles" VALUES (2, 'capacitador');
INSERT INTO "public"."roles" VALUES (3, 'usuario');

-- ----------------------------
-- Table structure for tema
-- ----------------------------
DROP TABLE IF EXISTS "public"."tema";
CREATE TABLE "public"."tema" (
  "id" int4 NOT NULL DEFAULT nextval('tema_id_seq'::regclass),
  "nombre" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of tema
-- ----------------------------
INSERT INTO "public"."tema" VALUES (1, 'Autocuidado');
INSERT INTO "public"."tema" VALUES (2, 'Brigadas de emergencia');
INSERT INTO "public"."tema" VALUES (3, 'Identificación de riesgos y peligros');
INSERT INTO "public"."tema" VALUES (4, 'Inducción Talento humano y gestión administrativa');
INSERT INTO "public"."tema" VALUES (5, 'Inducción y reinducción de seguridad y salud en el trabajo');
INSERT INTO "public"."tema" VALUES (6, 'Política de sostenibilidad');
INSERT INTO "public"."tema" VALUES (7, 'Principios y criterios RSPO');
INSERT INTO "public"."tema" VALUES (8, 'Reporte de accidentes laborales, incidentes, y EL');
INSERT INTO "public"."tema" VALUES (9, 'Reporte de actos y condiciones inseguras');
INSERT INTO "public"."tema" VALUES (10, 'Riesgo biológico');
INSERT INTO "public"."tema" VALUES (11, 'Riesgo ergonómico');
INSERT INTO "public"."tema" VALUES (12, 'Riesgo Psicosocial');
INSERT INTO "public"."tema" VALUES (13, 'Riesgo químico. SGA');
INSERT INTO "public"."tema" VALUES (14, 'Análisis e datos');
INSERT INTO "public"."tema" VALUES (15, 'Calibración y Mantenimiento de Equipos');
INSERT INTO "public"."tema" VALUES (16, 'Excel');
INSERT INTO "public"."tema" VALUES (17, 'Herramientas de Google');
INSERT INTO "public"."tema" VALUES (18, 'Herramientas ofimáticas');
INSERT INTO "public"."tema" VALUES (19, 'Manejo de aplicativo ATLAS');
INSERT INTO "public"."tema" VALUES (20, 'Power Bi');
INSERT INTO "public"."tema" VALUES (21, 'SAP');
INSERT INTO "public"."tema" VALUES (22, 'Socialización de ISCC,RSPO, ORGANICO');
INSERT INTO "public"."tema" VALUES (23, 'Socialización de procedimiento PQRS');
INSERT INTO "public"."tema" VALUES (24, 'Trabajo en equipo');
INSERT INTO "public"."tema" VALUES (25, 'Uso adecuado EPP/Sensibilización de limpieza y mantenimiento de epp');
INSERT INTO "public"."tema" VALUES (26, 'Manejo de cybertracker para el envió de información.');
INSERT INTO "public"."tema" VALUES (27, 'Riesgo químico SGA');
INSERT INTO "public"."tema" VALUES (28, 'Comunicación asertiva');
INSERT INTO "public"."tema" VALUES (29, 'Nomina y seguridad social');
INSERT INTO "public"."tema" VALUES (30, 'Actualizacion tributaria');
INSERT INTO "public"."tema" VALUES (31, 'Brigada de emergencia');
INSERT INTO "public"."tema" VALUES (32, 'Calidad de aceite (Índice en yodo)');
INSERT INTO "public"."tema" VALUES (33, 'Control de calidad');
INSERT INTO "public"."tema" VALUES (34, 'Procedimiento de despacho');
INSERT INTO "public"."tema" VALUES (35, 'Procedimiento de producto No conforme');
INSERT INTO "public"."tema" VALUES (36, 'Requerimientos Cadena de suministro RSPO');
INSERT INTO "public"."tema" VALUES (37, 'Brigadistas de emergencia');
INSERT INTO "public"."tema" VALUES (38, 'Rotación de inventario');
INSERT INTO "public"."tema" VALUES (39, 'Curso de 50 horas/ 20 horas');
INSERT INTO "public"."tema" VALUES (40, 'Manejo racional de plaguicidas');
INSERT INTO "public"."tema" VALUES (41, 'Socialización de instructivos - Fertilización');
INSERT INTO "public"."tema" VALUES (42, 'Socialización de instructivos - logística de producción');
INSERT INTO "public"."tema" VALUES (43, 'Socialización de instructivos - Monitoreos');
INSERT INTO "public"."tema" VALUES (44, 'Socialización de instructivos - Polinización');
INSERT INTO "public"."tema" VALUES (45, 'Logística para cosecha de lotes orgánicos');
INSERT INTO "public"."tema" VALUES (46, 'Manejo de cybertracker para el envió de información');
INSERT INTO "public"."tema" VALUES (47, 'Manejo de Insumos orgánicos');
INSERT INTO "public"."tema" VALUES (48, 'Manejo de plaguicidas');
INSERT INTO "public"."tema" VALUES (49, 'Manejo del suelo');
INSERT INTO "public"."tema" VALUES (50, 'Manejo integrado de plagas y enfermedades');
INSERT INTO "public"."tema" VALUES (51, 'Planeación de labores agrícolas');
INSERT INTO "public"."tema" VALUES (52, 'Supervisión de labores de fertilización en palma de aceite');
INSERT INTO "public"."tema" VALUES (53, 'Supervisión de labores de mantenimiento en campo en palma de aceite');
INSERT INTO "public"."tema" VALUES (54, 'Supervisión labores de corte de RFF');
INSERT INTO "public"."tema" VALUES (55, 'Uso eficiente de maquinaria agrícola y aplicaciones de agricultura de precisión');
INSERT INTO "public"."tema" VALUES (56, 'Electricidad industrial');
INSERT INTO "public"."tema" VALUES (57, 'Generación de energía');
INSERT INTO "public"."tema" VALUES (58, 'Instructivo para operar bascula');
INSERT INTO "public"."tema" VALUES (59, 'Almacenamiento y control de tanques de almacenamiento');
INSERT INTO "public"."tema" VALUES (60, 'Caldera');
INSERT INTO "public"."tema" VALUES (61, 'Capacitación a supervisores de proceso');
INSERT INTO "public"."tema" VALUES (62, 'Clarificación');
INSERT INTO "public"."tema" VALUES (63, 'Descargue y calificación de fruta');
INSERT INTO "public"."tema" VALUES (64, 'Desfrutado, digestión, prensado y desfibrado');
INSERT INTO "public"."tema" VALUES (65, 'Esterilización');
INSERT INTO "public"."tema" VALUES (66, 'Llenado de vagones');
INSERT INTO "public"."tema" VALUES (67, 'Mantenimientos de primer nivel');
INSERT INTO "public"."tema" VALUES (68, 'Manual de cadena de suministro y socialización de responsabilidades');
INSERT INTO "public"."tema" VALUES (69, 'Mesa de volteo');
INSERT INTO "public"."tema" VALUES (70, 'Palmisteria');
INSERT INTO "public"."tema" VALUES (71, 'Perdidas de almendra');
INSERT INTO "public"."tema" VALUES (72, 'Procedimiento de orden y aseo');
INSERT INTO "public"."tema" VALUES (73, 'Procedimiento de recepción de RFF');
INSERT INTO "public"."tema" VALUES (74, 'Proceso de extracción de aceite');
INSERT INTO "public"."tema" VALUES (75, 'Diseño Web');
INSERT INTO "public"."tema" VALUES (76, 'Mantenimiento de cámaras');
INSERT INTO "public"."tema" VALUES (77, 'Uso eficiente de maquinaria agrícola');
INSERT INTO "public"."tema" VALUES (78, 'Manejo de maquinaria y equipo');
INSERT INTO "public"."tema" VALUES (79, 'Manejo defensivo');
INSERT INTO "public"."tema" VALUES (80, 'Seguridad vial');

-- ----------------------------
-- Table structure for tipo_actividad
-- ----------------------------
DROP TABLE IF EXISTS "public"."tipo_actividad";
CREATE TABLE "public"."tipo_actividad" (
  "id" int4 NOT NULL DEFAULT nextval('tipo_actividad_id_seq'::regclass),
  "nombre" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of tipo_actividad
-- ----------------------------
INSERT INTO "public"."tipo_actividad" VALUES (1, 'Capacitación');
INSERT INTO "public"."tipo_actividad" VALUES (2, 'Charla');
INSERT INTO "public"."tipo_actividad" VALUES (3, 'Reunión');
INSERT INTO "public"."tipo_actividad" VALUES (4, 'Entrenamiento');
INSERT INTO "public"."tipo_actividad" VALUES (5, 'Inducción');

-- ----------------------------
-- Table structure for usuarios
-- ----------------------------
DROP TABLE IF EXISTS "public"."usuarios";
CREATE TABLE "public"."usuarios" (
  "id" int4 NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  "id_usuario" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "cedula" varchar(20) COLLATE "pg_catalog"."default",
  "nombre1" varchar(100) COLLATE "pg_catalog"."default",
  "nombre2" varchar(100) COLLATE "pg_catalog"."default",
  "apellido1" varchar(100) COLLATE "pg_catalog"."default",
  "apellido2" varchar(100) COLLATE "pg_catalog"."default",
  "contraseña" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "id_rol" int4,
  "avatar" varchar(255) COLLATE "pg_catalog"."default" DEFAULT 'avatar1.jpeg'::character varying
)
;

-- ----------------------------
-- Records of usuarios
-- ----------------------------
INSERT INTO "public"."usuarios" VALUES (2, 'cap_1', '987654321', 'cap1', 'usuario1', 'apellidogen1', 'apellidogen2', '$2y$10$ZsSL/zxWQ761fsYAx1TUZ.dNHCMrb2ZcwcyqYbhrafqe75T0k1F92', 2, 'avatar1.jpeg');
INSERT INTO "public"."usuarios" VALUES (3, 'usuario_1', '5432167890', 'prueba', 'usuario1', 'basico', 'normal', '$2y$10$y9uoEY4xDqT5UXM0Ch4Di.HGRabzXdGee8R1lRKnZG5XH.13rWT6i', 3, 'avatar1.jpeg');
INSERT INTO "public"."usuarios" VALUES (1, 'admin_p', '123456789', 'admin', 'super', 'sistema', 'osm', '$2y$10$McPvhndmJUpOFF2kSHnhs.F.9JnKOJYWafGGHLkMWuJ6LFuLCsbde', 1, 'avatar_admin_p_1748462271.jpeg');

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."asistente_id_seq"
OWNED BY "public"."asistente"."id";
SELECT setval('"public"."asistente_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."formulario_asistente_id_seq"
OWNED BY "public"."formulario_asistente"."id";
SELECT setval('"public"."formulario_asistente_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."formulario_id_seq"
OWNED BY "public"."formulario"."id";
SELECT setval('"public"."formulario_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."lugar_id_seq"
OWNED BY "public"."lugar"."id";
SELECT setval('"public"."lugar_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."proceso_id_seq"
OWNED BY "public"."proceso"."id";
SELECT setval('"public"."proceso_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."roles_id_seq"
OWNED BY "public"."roles"."id";
SELECT setval('"public"."roles_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."tema_id_seq"
OWNED BY "public"."tema"."id";
SELECT setval('"public"."tema_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."tipo_actividad_id_seq"
OWNED BY "public"."tipo_actividad"."id";
SELECT setval('"public"."tipo_actividad_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."usuarios_id_seq"
OWNED BY "public"."usuarios"."id";
SELECT setval('"public"."usuarios_id_seq"', 3, true);

-- ----------------------------
-- Uniques structure for table asistente
-- ----------------------------
ALTER TABLE "public"."asistente" ADD CONSTRAINT "asistente_cedula_key" UNIQUE ("cedula");

-- ----------------------------
-- Primary Key structure for table asistente
-- ----------------------------
ALTER TABLE "public"."asistente" ADD CONSTRAINT "asistente_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table formulario
-- ----------------------------
CREATE INDEX "idx_formulario_id_lugar" ON "public"."formulario" USING btree (
  "id_lugar" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_formulario_id_proceso" ON "public"."formulario" USING btree (
  "id_proceso" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_formulario_id_tema" ON "public"."formulario" USING btree (
  "id_tema" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_formulario_id_tipo_actividad" ON "public"."formulario" USING btree (
  "id_tipo_actividad" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_formulario_id_usuario" ON "public"."formulario" USING btree (
  "id_usuario" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table formulario
-- ----------------------------
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table formulario_asistente
-- ----------------------------
CREATE INDEX "idx_formulario_asistente_id_asistente" ON "public"."formulario_asistente" USING btree (
  "id_asistente" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_formulario_asistente_id_formulario" ON "public"."formulario_asistente" USING btree (
  "id_formulario" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table formulario_asistente
-- ----------------------------
ALTER TABLE "public"."formulario_asistente" ADD CONSTRAINT "formulario_asistente_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table lugar
-- ----------------------------
ALTER TABLE "public"."lugar" ADD CONSTRAINT "lugar_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table proceso
-- ----------------------------
ALTER TABLE "public"."proceso" ADD CONSTRAINT "proceso_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table roles
-- ----------------------------
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table tema
-- ----------------------------
ALTER TABLE "public"."tema" ADD CONSTRAINT "tema_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table tipo_actividad
-- ----------------------------
ALTER TABLE "public"."tipo_actividad" ADD CONSTRAINT "tipo_actividad_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table usuarios
-- ----------------------------
ALTER TABLE "public"."usuarios" ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table formulario
-- ----------------------------
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_id_lugar_fkey" FOREIGN KEY ("id_lugar") REFERENCES "public"."lugar" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_id_proceso_fkey" FOREIGN KEY ("id_proceso") REFERENCES "public"."proceso" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_id_tema_fkey" FOREIGN KEY ("id_tema") REFERENCES "public"."tema" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_id_tipo_actividad_fkey" FOREIGN KEY ("id_tipo_actividad") REFERENCES "public"."tipo_actividad" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table formulario_asistente
-- ----------------------------
ALTER TABLE "public"."formulario_asistente" ADD CONSTRAINT "formulario_asistente_id_asistente_fkey" FOREIGN KEY ("id_asistente") REFERENCES "public"."asistente" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."formulario_asistente" ADD CONSTRAINT "formulario_asistente_id_formulario_fkey" FOREIGN KEY ("id_formulario") REFERENCES "public"."formulario" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table usuarios
-- ----------------------------
ALTER TABLE "public"."usuarios" ADD CONSTRAINT "usuarios_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "public"."roles" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
