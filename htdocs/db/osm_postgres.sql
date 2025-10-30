/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : PostgreSQL
 Source Server Version : 170005 (170005)
 Source Host           : localhost:5432
 Source Catalog        : osm
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170005 (170005)
 File Encoding         : 65001

 Date: 16/07/2025 21:35:23
*/


-- ----------------------------
-- Sequence structure for adm_usuario_roles_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."adm_usuario_roles_id_seq";
CREATE SEQUENCE "public"."adm_usuario_roles_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for asistente_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."asistente_id_seq";
CREATE SEQUENCE "public"."asistente_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for formulario_asistente_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."formulario_asistente_id_seq";
CREATE SEQUENCE "public"."formulario_asistente_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for formulario_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."formulario_id_seq";
CREATE SEQUENCE "public"."formulario_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for lugar_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."lugar_id_seq";
CREATE SEQUENCE "public"."lugar_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for proceso_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."proceso_id_seq";
CREATE SEQUENCE "public"."proceso_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for roles_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."roles_id_seq";
CREATE SEQUENCE "public"."roles_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for tema_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."tema_id_seq";
CREATE SEQUENCE "public"."tema_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for tipo_actividad_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."tipo_actividad_id_seq";
CREATE SEQUENCE "public"."tipo_actividad_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for usuarios_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."usuarios_id_seq";
CREATE SEQUENCE "public"."usuarios_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;

-- ----------------------------
-- Table structure for adm_cargos
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_cargos";
CREATE TABLE "public"."adm_cargos" (
  "id_cargo" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "cargo" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "rango_cargo" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of adm_cargos
-- ----------------------------
INSERT INTO "public"."adm_cargos" VALUES ('141', 'ANALISTA AGRONOMICO', 'ANALISTAS');
INSERT INTO "public"."adm_cargos" VALUES ('135', 'DIBUJANTE TECNICO', 'ANALISTAS');
INSERT INTO "public"."adm_cargos" VALUES ('122', 'LIDER ANALISTA', 'ANALISTAS');
INSERT INTO "public"."adm_cargos" VALUES ('137', 'TECNOLOGO AGRICOLA', 'ANALISTAS');
INSERT INTO "public"."adm_cargos" VALUES ('011', 'TESORERO', 'ANALISTAS');
INSERT INTO "public"."adm_cargos" VALUES ('116', 'ANALISTA DE INFORMACION', 'ANALISTAS');
INSERT INTO "public"."adm_cargos" VALUES ('027', 'ASISTENTE ADMNISTRATIVO', 'ASISTENTES');
INSERT INTO "public"."adm_cargos" VALUES ('114', 'ASISTENTE CONTABLE', 'ASISTENTES');
INSERT INTO "public"."adm_cargos" VALUES ('014', 'ASISTENTE DE ALMACEN Y COMPRAS', 'ASISTENTES');
INSERT INTO "public"."adm_cargos" VALUES ('100', 'ASISTENTE DE MANTENIMIENTO', 'ASISTENTES');
INSERT INTO "public"."adm_cargos" VALUES ('017', 'ASISTENTE DE SISTEMAS', 'ASISTENTES');
INSERT INTO "public"."adm_cargos" VALUES ('125', 'ASISTENTE PRODUCCION INDUSTRIAL', 'ASISTENTES');
INSERT INTO "public"."adm_cargos" VALUES ('119', 'PLANEADOR MANTENIMIENTO', 'ASISTENTES');
INSERT INTO "public"."adm_cargos" VALUES ('085', 'AUXILIAR ADMINISTRATIVO', 'AUXILIARES');
INSERT INTO "public"."adm_cargos" VALUES ('013', 'AUXILIAR CONTABLE', 'AUXILIARES');
INSERT INTO "public"."adm_cargos" VALUES ('052', 'AUXILIAR DE LABORATORIO', 'AUXILIARES OPERATIVOS');
INSERT INTO "public"."adm_cargos" VALUES ('030', 'AUXILIAR DE SUPERVISION AGRICOLA', 'AUXILIARES OPERATIVOS');
INSERT INTO "public"."adm_cargos" VALUES ('024', 'CONDUCTOR ', 'CONDUCTORES');
INSERT INTO "public"."adm_cargos" VALUES ('018', 'CONDUCTOR -MENSAJERO', 'CONDUCTORES');
INSERT INTO "public"."adm_cargos" VALUES ('129', 'COORDINADOR ADMINISTRATIVO', 'COORDINADORES');
INSERT INTO "public"."adm_cargos" VALUES ('081', 'COORDINADOR CONTABLE', 'COORDINADORES');
INSERT INTO "public"."adm_cargos" VALUES ('105', 'COORDINADOR DE PROYECTOS', 'COORDINADORES');
INSERT INTO "public"."adm_cargos" VALUES ('128', 'INGENIERA AGRICOLA', 'COORDINADORES');
INSERT INTO "public"."adm_cargos" VALUES ('091', 'COORDINADOR DE LOGISTICA', 'COORDINADORES');
INSERT INTO "public"."adm_cargos" VALUES ('076', 'COORDINADOR PRODUCCION INDUSTRIAL', 'COORDINADORES');
INSERT INTO "public"."adm_cargos" VALUES ('136', 'COORDINADOR AGRONOMO', 'COORDINADORES');
INSERT INTO "public"."adm_cargos" VALUES ('117', 'DIRECTOR DE MANTENIMIENTO INDUSTRIAL', 'DIRECTORES');
INSERT INTO "public"."adm_cargos" VALUES ('043', 'DIRECTOR DE PLANTA', 'DIRECTORES');
INSERT INTO "public"."adm_cargos" VALUES ('068', 'DIRECTOR LOGISTICA, COSECHA Y MANTENIMIENTO', 'DIRECTORES');
INSERT INTO "public"."adm_cargos" VALUES ('127', 'DIRECTORA ADMINISTRATIVA Y FINANCIERA', 'DIRECTORES');
INSERT INTO "public"."adm_cargos" VALUES ('007', 'JEFE DE COMPRAS', 'JEFES');
INSERT INTO "public"."adm_cargos" VALUES ('126', 'JEFE DE VENTAS', 'JEFES');
INSERT INTO "public"."adm_cargos" VALUES ('140', 'AUXILIAR DE APOYO', 'OPERATIVOS ADMINISTRATIVOS');
INSERT INTO "public"."adm_cargos" VALUES ('020', 'AUXILIAR DE SERVICIOS GENERALES I', 'OPERATIVOS ADMINISTRATIVOS');
INSERT INTO "public"."adm_cargos" VALUES ('054', 'AUXILIAR DE MANTENIMIENTO Y SOLDADURA', 'OPERATIVOS MANTENIMIENTO');
INSERT INTO "public"."adm_cargos" VALUES ('046', 'ELECTROMECANICO', 'OPERATIVOS MANTENIMIENTO');
INSERT INTO "public"."adm_cargos" VALUES ('118', 'OPERARIO ENERGIA', 'OPERATIVOS MANTENIMIENTO');
INSERT INTO "public"."adm_cargos" VALUES ('049', 'SOLDADOR MECANICO', 'OPERATIVOS MANTENIMIENTO');
INSERT INTO "public"."adm_cargos" VALUES ('031', 'OPERARIO DE MAQUINARIA AGRICOLA', 'OPERATIVOS PLANTA EXT');
INSERT INTO "public"."adm_cargos" VALUES ('055', 'OPERARIO DE PLANTA I', 'OPERATIVOS PLANTA EXT');
INSERT INTO "public"."adm_cargos" VALUES ('058', 'OPERARIO DE PLANTA II', 'OPERATIVOS PLANTA EXT');
INSERT INTO "public"."adm_cargos" VALUES ('033', 'OFICIOS VARIOS II', 'OPERATIVOS PRODUCCION AGRICOLA');
INSERT INTO "public"."adm_cargos" VALUES ('029', 'OFICIOS VARIOS III', 'OPERATIVOS PRODUCCION AGRICOLA');
INSERT INTO "public"."adm_cargos" VALUES ('095', 'OFICIOS VARIOS IV', 'OPERATIVOS PRODUCCION AGRICOLA');
INSERT INTO "public"."adm_cargos" VALUES ('104', 'OPERARIO DE LOGISTICA Y COSECHA', 'OPERATIVOS PRODUCCION AGRICOLA');
INSERT INTO "public"."adm_cargos" VALUES ('073', 'POLINIZADOR', 'OPERATIVOS PRODUCCION AGRICOLA');
INSERT INTO "public"."adm_cargos" VALUES ('130', 'SUPERVISOR DE LABORATORIO', 'SUPERVISORES');
INSERT INTO "public"."adm_cargos" VALUES ('089', 'SUPERVISOR DE LOGISTICA I', 'SUPERVISORES');
INSERT INTO "public"."adm_cargos" VALUES ('047', 'SUPERVISOR DE PROCESO', 'SUPERVISORES');
INSERT INTO "public"."adm_cargos" VALUES ('072', 'SUPERVISOR DE PRODUCCION', 'SUPERVISORES');
INSERT INTO "public"."adm_cargos" VALUES ('112', 'SUPERVISOR DE MANTENIMIENTO INDUSTRIAL', 'SUPERVISORES');
INSERT INTO "public"."adm_cargos" VALUES ('123', 'SUPERVISOR DE TOPOGRAFIA', 'SUPERVISORES');
INSERT INTO "public"."adm_cargos" VALUES ('004', 'DIRECTOR DE PROYECTOS', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('008', 'COORDINADOR DE GESTION HUMANA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('016', 'ASISTENTE DE SEGURIDAD Y SALUD EN EL TRABAJO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('078', 'AUXILIAR SERVICIOS GENERALES II', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('005', 'DIRECTORA CONTABLE', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('003', 'GERENTE ADMINISTRATIVO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('006', 'COORDINADOR DE SISTEMAS', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('001', 'GERENTE GENERAL', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('009', 'ANALISTA CONTABLE  1', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('019', 'MENSAJERO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('077', 'ASISTENTE ADMINISTRATIVO II', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('010', 'COORDINADOR AMBIENTAL Y SO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('015', 'ASISTENTE ADMINISTRATIVA I', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('021', 'ESTUDIANTE SENA ETAPA PRODUCTIVA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('040', 'ESTUDIANTE SENA ETAPA ELECTIVA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('093', 'COORDINADOR DE SEGURIDAD Y SALUD EN EL TRABAJO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('084', 'AUXILIAR DE SISTEMAS', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('106', 'AUXILIAR ADMINISTRATIVAIII', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('107', 'AUXILIAR DE CONSTRUCCION', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('108', 'ASISTENTE AMBIENTAL', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('111', 'OPERARIO PRODUCCION FIBRAS PRIMIUM', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('124', 'ANALISTA ADMINISTRATIVO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('096', 'PASANTE UNIVERSITARIO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('039', 'JARDINERO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('066', 'SOLDADOR', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('065', 'OPERADOR DE BASCULA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('115', 'INSPECTOR HSE', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('094', 'ANALISTA PRODUCCION AGRICOLA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('022', 'OFICIOS VARIOS I', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('034', 'AYUDANTE DE SANIDAD', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('032', 'VAQUERO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('035', 'OPERARIO DE PLUMA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('041', 'CONVENIO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('036', 'TECNICO MANTENIMIENTO I', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('074', 'DIRECTOR DE PRODUCCION', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('026', 'ASISTENTE AGRONOMICO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('060', 'PEPERO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('061', 'RACIMERO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('062', 'GANCHERO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('051', 'ALMACENISTA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('090', 'SUPERVISOR DE LOGISTICA II', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('097', 'SUPERVISOR PLANTA DE COMPOSTAJE', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('099', 'ASISTENTE ADMINISTRATIVO III', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('102', 'TOPÓGRAFO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('109', 'SUPERVISOR DE TALLER AGRICOLA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('131', 'ANALISTA DE INVESTIGACION', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('138', 'COORDINADOR DE PROYECTOS', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('088', 'OPERARIO MAQUINARIA AGRICOLA I', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('042', 'COORDINADOR DE PRODUCCIÓN', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('063', 'RECOGEDOR', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('079', 'ALISTADOR', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('023', 'GERENTE AGRONOMICO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('002', 'GERENTE FINANCIERO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('064', 'COORDINADOR DE PROCESOS Y CALIDAD', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('110', 'DIRECTOR ADMINISTRATIVO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('069', 'TECNICO MANTENIMIENTO AGRICOLA', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('075', 'TECNICO ELECTROMECANICO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('050', 'OPERARIO MINICARGADOR', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('083', 'OFICIAL DE CONSTRUCCION', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('098', 'ELECTROMECANICO II', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('132', 'OPERARIO MANTENIMIENTO LOCATIVO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('087', 'ASISTENTE DE LABORATORIO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('120', 'ANALISTA DE SISTEMA DE GESTION DE MANTENIMIENTO', 'NO DEFINIDO');
INSERT INTO "public"."adm_cargos" VALUES ('139', 'TECNICO EN SISTEMA HADRAULICO', 'NO DEFINIDO');

-- ----------------------------
-- Table structure for adm_colaboradores
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_colaboradores";
CREATE TABLE "public"."adm_colaboradores" (
  "ac_id" int4 NOT NULL DEFAULT nextval('asistente_id_seq'::regclass),
  "ac_cedula" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "ac_nombre1" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "ac_empresa" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "ac_id_cargo" varchar(255) COLLATE "pg_catalog"."default",
  "ac_id_area" varchar(255) COLLATE "pg_catalog"."default",
  "ac_id_situación" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "ac_contraseña" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "ac_sub_area" varchar(255) COLLATE "pg_catalog"."default",
  "ac_rango" varchar(255) COLLATE "pg_catalog"."default",
  "ac_nombre2" varchar(255) COLLATE "pg_catalog"."default",
  "ac_apellido1" varchar(255) COLLATE "pg_catalog"."default",
  "ac_apellido2" varchar(255) COLLATE "pg_catalog"."default",
  "ac_id_rol" int4 NOT NULL DEFAULT 1
)
;

-- ----------------------------
-- Records of adm_colaboradores
-- ----------------------------

-- ----------------------------
-- Table structure for adm_empresa
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_empresa";
CREATE TABLE "public"."adm_empresa" (
  "emp_id" int4 NOT NULL,
  "emp_nombre" varchar(255) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of adm_empresa
-- ----------------------------
INSERT INTO "public"."adm_empresa" VALUES (1, 'OLEAGINOSAS SAN MARCOS');
INSERT INTO "public"."adm_empresa" VALUES (2, 'INVERSIONES');
INSERT INTO "public"."adm_empresa" VALUES (3, 'SEMAG DE LOS LLANOS');

-- ----------------------------
-- Table structure for adm_roles
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_roles";
CREATE TABLE "public"."adm_roles" (
  "id" int4 NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
  "nombre" varchar(50) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of adm_roles
-- ----------------------------
INSERT INTO "public"."adm_roles" VALUES (1, 'Administrador');
INSERT INTO "public"."adm_roles" VALUES (2, 'Usuario');
INSERT INTO "public"."adm_roles" VALUES (3, 'Capacitador');
INSERT INTO "public"."adm_roles" VALUES (4, 'Aux_Capacitador');
INSERT INTO "public"."adm_roles" VALUES (5, 'Agronómico');
INSERT INTO "public"."adm_roles" VALUES (6, 'Aux_Agronómico');
INSERT INTO "public"."adm_roles" VALUES (7, 'Báscula');
INSERT INTO "public"."adm_roles" VALUES (8, 'Aux_Báscula');
INSERT INTO "public"."adm_roles" VALUES (9, 'Almacén');
INSERT INTO "public"."adm_roles" VALUES (10, 'Aux_Almacén');

-- ----------------------------
-- Table structure for adm_situación
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_situación";
CREATE TABLE "public"."adm_situación" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "situación" varchar(255) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of adm_situación
-- ----------------------------
INSERT INTO "public"."adm_situación" VALUES ('E', 'Egresado');
INSERT INTO "public"."adm_situación" VALUES ('X', 'Preegresado');
INSERT INTO "public"."adm_situación" VALUES ('A', 'Activo');
INSERT INTO "public"."adm_situación" VALUES ('V', 'Vacaciones');
INSERT INTO "public"."adm_situación" VALUES ('P', 'Permiso');

-- ----------------------------
-- Table structure for adm_usuario_roles
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_usuario_roles";
CREATE TABLE "public"."adm_usuario_roles" (
  "id" int4 NOT NULL DEFAULT nextval('adm_usuario_roles_id_seq'::regclass),
  "usuario_id" int4 NOT NULL,
  "rol_id" int4 NOT NULL
)
;

-- ----------------------------
-- Records of adm_usuario_roles
-- ----------------------------
INSERT INTO "public"."adm_usuario_roles" VALUES (1, 1, 1);

-- ----------------------------
-- Table structure for adm_usuarios
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_usuarios";
CREATE TABLE "public"."adm_usuarios" (
  "id" int4 NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  "id_usuario" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "cedula" varchar(20) COLLATE "pg_catalog"."default",
  "nombre1" varchar(100) COLLATE "pg_catalog"."default",
  "nombre2" varchar(100) COLLATE "pg_catalog"."default",
  "apellido1" varchar(100) COLLATE "pg_catalog"."default",
  "apellido2" varchar(100) COLLATE "pg_catalog"."default",
  "contraseña" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "avatar" varchar(255) COLLATE "pg_catalog"."default" DEFAULT 'avatar1.jpeg'::character varying,
  "estado_us" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of adm_usuarios
-- ----------------------------
INSERT INTO "public"."adm_usuarios" VALUES (1, '123456789', '123456789', 'Admin', 'usuario', 'Principal', 'admin', '$2y$10$/fjM7rEnJeRM/YezqFNUn.NRgh7jOHrBA9jSgKwNoiVtY7WTkgVDq', 'avatar1.jpeg', '1');

-- ----------------------------
-- Table structure for adm_área
-- ----------------------------
DROP TABLE IF EXISTS "public"."adm_área";
CREATE TABLE "public"."adm_área" (
  "id_area" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "area" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "sub_area" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of adm_área
-- ----------------------------
INSERT INTO "public"."adm_área" VALUES ('001', 'LOGISTICA Y COSECHA', 'LOGISTICA Y COSECHA');
INSERT INTO "public"."adm_área" VALUES ('002', 'PRODUCCION AGRICOLA', 'PRODUCCION AGRICOLA');
INSERT INTO "public"."adm_área" VALUES ('003', 'MANTENIMIENTO INDUSTRIAL', 'MANTENIMIENTO INDUSTRIAL');
INSERT INTO "public"."adm_área" VALUES ('004', 'FRUTA PROVEEDORES', 'FRUTA PROVEEDORES');
INSERT INTO "public"."adm_área" VALUES ('005', 'ADMINISTRACION', 'ADMINISTRACION');
INSERT INTO "public"."adm_área" VALUES ('006', 'ADMINISTRACION', 'ALMACEN');
INSERT INTO "public"."adm_área" VALUES ('007', 'AGRONOMICA', 'AGRONOMICA');
INSERT INTO "public"."adm_área" VALUES ('008', 'LOGISTICA Y COSECHA', 'SANIDAD');
INSERT INTO "public"."adm_área" VALUES ('009', 'PRODUCCION AGRICOLA', 'POLINIZACION');
INSERT INTO "public"."adm_área" VALUES ('010', 'ADMINISTRACION', 'COMPRAS');
INSERT INTO "public"."adm_área" VALUES ('011', 'ADMINISTRACION', 'CLIPA - SISTEMAS');
INSERT INTO "public"."adm_área" VALUES ('012', 'ADMINISTRACION', 'CONTABILIDAD');
INSERT INTO "public"."adm_área" VALUES ('013', 'ADMINISTRACION', 'VENTAS');
INSERT INTO "public"."adm_área" VALUES ('014', 'PLANTA EXTRACTORA', 'BASCULA');
INSERT INTO "public"."adm_área" VALUES ('015', 'PLANTA EXTRACTORA', 'LABORATORIO');
INSERT INTO "public"."adm_área" VALUES ('016', 'PLANTA EXTRACTORA', 'PLANTA EXTRACTORA');
INSERT INTO "public"."adm_área" VALUES ('017', 'COMPOST', 'COMPOST');
INSERT INTO "public"."adm_área" VALUES ('999', 'POR ASIGNAR', 'POR ASIGNAR');
INSERT INTO "public"."adm_área" VALUES ('000', '- SIN PROYECTO -', '- SIN PROYECTO -');

-- ----------------------------
-- Table structure for cap_formulario
-- ----------------------------
DROP TABLE IF EXISTS "public"."cap_formulario";
CREATE TABLE "public"."cap_formulario" (
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
-- Records of cap_formulario
-- ----------------------------

-- ----------------------------
-- Table structure for cap_formulario_asistente
-- ----------------------------
DROP TABLE IF EXISTS "public"."cap_formulario_asistente";
CREATE TABLE "public"."cap_formulario_asistente" (
  "id" int4 NOT NULL DEFAULT nextval('formulario_asistente_id_seq'::regclass),
  "id_formulario" int4 NOT NULL,
  "cedula" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "estado_aprovacion" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "nombre" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "empresa" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "cargo" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "área" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "sub_área" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "rango" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "situacion" varchar(255) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of cap_formulario_asistente
-- ----------------------------

-- ----------------------------
-- Table structure for cap_lugar
-- ----------------------------
DROP TABLE IF EXISTS "public"."cap_lugar";
CREATE TABLE "public"."cap_lugar" (
  "id" int4 NOT NULL DEFAULT nextval('lugar_id_seq'::regclass),
  "lugar" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of cap_lugar
-- ----------------------------
INSERT INTO "public"."cap_lugar" VALUES (1, 'Sala de Juntas Planta');
INSERT INTO "public"."cap_lugar" VALUES (2, 'Bascula');
INSERT INTO "public"."cap_lugar" VALUES (3, 'Oficina supervisores');
INSERT INTO "public"."cap_lugar" VALUES (4, 'Sala de capacitaciones');
INSERT INTO "public"."cap_lugar" VALUES (5, 'Laboratorio');
INSERT INTO "public"."cap_lugar" VALUES (6, 'Campamento');
INSERT INTO "public"."cap_lugar" VALUES (7, 'Planta Extractora');
INSERT INTO "public"."cap_lugar" VALUES (8, 'Oficina Jefe Ventas');
INSERT INTO "public"."cap_lugar" VALUES (9, 'Oficinas Casa Amarilla');
INSERT INTO "public"."cap_lugar" VALUES (10, 'Inversiones Sol Del Llano');

-- ----------------------------
-- Table structure for cap_proceso
-- ----------------------------
DROP TABLE IF EXISTS "public"."cap_proceso";
CREATE TABLE "public"."cap_proceso" (
  "id" int4 NOT NULL DEFAULT nextval('proceso_id_seq'::regclass),
  "proceso" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of cap_proceso
-- ----------------------------
INSERT INTO "public"."cap_proceso" VALUES (1, 'Producción industrial');
INSERT INTO "public"."cap_proceso" VALUES (2, 'Sostenibilidad');
INSERT INTO "public"."cap_proceso" VALUES (3, 'Talento Humano');
INSERT INTO "public"."cap_proceso" VALUES (4, 'Ventas');
INSERT INTO "public"."cap_proceso" VALUES (5, 'Administrativo');
INSERT INTO "public"."cap_proceso" VALUES (6, 'Compras y almacén');
INSERT INTO "public"."cap_proceso" VALUES (7, 'Gestión contable y financiera ');

-- ----------------------------
-- Table structure for cap_tema
-- ----------------------------
DROP TABLE IF EXISTS "public"."cap_tema";
CREATE TABLE "public"."cap_tema" (
  "id" int4 NOT NULL DEFAULT nextval('tema_id_seq'::regclass),
  "nombre" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of cap_tema
-- ----------------------------
INSERT INTO "public"."cap_tema" VALUES (1, 'Trabajo en equipo ');
INSERT INTO "public"."cap_tema" VALUES (2, 'Capacitación a supervisores de proceso');
INSERT INTO "public"."cap_tema" VALUES (3, 'Principios y criterios RSPO ');
INSERT INTO "public"."cap_tema" VALUES (4, 'Inducción Talento humano y gestión administrativa');
INSERT INTO "public"."cap_tema" VALUES (5, 'Procedimiento de despacho');
INSERT INTO "public"."cap_tema" VALUES (6, 'Procedimiento de producto No conforme');
INSERT INTO "public"."cap_tema" VALUES (7, 'Calidad de aceite (Índice en yodo)');
INSERT INTO "public"."cap_tema" VALUES (8, 'Perdidas de almendra');
INSERT INTO "public"."cap_tema" VALUES (9, 'Manual de cadena de suministro y socialización de responsabilidades. ');
INSERT INTO "public"."cap_tema" VALUES (10, 'Llenado de vagones');
INSERT INTO "public"."cap_tema" VALUES (11, 'Mesa de volteo');
INSERT INTO "public"."cap_tema" VALUES (12, 'Esterilización ');
INSERT INTO "public"."cap_tema" VALUES (13, 'Desfrutado, digestión, prensado y desfibrado.');
INSERT INTO "public"."cap_tema" VALUES (14, 'Clarificación ');
INSERT INTO "public"."cap_tema" VALUES (15, 'Almacenamiento y control de tanques de almacenamiento');
INSERT INTO "public"."cap_tema" VALUES (16, 'Palmisteria');
INSERT INTO "public"."cap_tema" VALUES (17, 'Caldera');
INSERT INTO "public"."cap_tema" VALUES (18, 'Proceso de extracción de aceite');
INSERT INTO "public"."cap_tema" VALUES (19, 'Procedimiento de recepción de RFF');
INSERT INTO "public"."cap_tema" VALUES (20, 'Instructivo para operar bascula');
INSERT INTO "public"."cap_tema" VALUES (21, 'Descargue y calificación de fruta');
INSERT INTO "public"."cap_tema" VALUES (22, 'Procedimiento de orden y aseo');
INSERT INTO "public"."cap_tema" VALUES (23, 'BPM e inocuidad alimentaria');
INSERT INTO "public"."cap_tema" VALUES (24, 'Manejo de plaguicidas ');
INSERT INTO "public"."cap_tema" VALUES (25, 'Socialización de instructivos - Monitoreos ');
INSERT INTO "public"."cap_tema" VALUES (26, 'Socialización de instructivos - Polinización');
INSERT INTO "public"."cap_tema" VALUES (27, 'Socialización de instructivos - logística de producción');
INSERT INTO "public"."cap_tema" VALUES (28, 'Socialización de ISCC,RSPO, ORGANICO');
INSERT INTO "public"."cap_tema" VALUES (29, 'Requerimientos Cadena de suministro RSPO');
INSERT INTO "public"."cap_tema" VALUES (30, 'Socialización de procedimiento PQRS');
INSERT INTO "public"."cap_tema" VALUES (31, 'Política de sostenibilidad');
INSERT INTO "public"."cap_tema" VALUES (32, 'MIPE');
INSERT INTO "public"."cap_tema" VALUES (33, 'Socialización de instructivos - Fertilización');
INSERT INTO "public"."cap_tema" VALUES (34, 'Manejo de Insumos orgánicos');
INSERT INTO "public"."cap_tema" VALUES (35, 'Manejo defensivo');
INSERT INTO "public"."cap_tema" VALUES (36, 'Manejo de cybertracker para el envió de información.');
INSERT INTO "public"."cap_tema" VALUES (37, 'Supervisión labores de corte de RFF.');
INSERT INTO "public"."cap_tema" VALUES (38, 'Supervisión de labores de mantenimiento en campo en palma de aceite.');
INSERT INTO "public"."cap_tema" VALUES (39, 'Supervisión de labores de fertilización en palma de aceite.');
INSERT INTO "public"."cap_tema" VALUES (40, 'Logística para cosecha de lotes orgánicos');
INSERT INTO "public"."cap_tema" VALUES (41, 'Uso eficiente de maquinaria agrícola y aplicaciones de agricultura de precisión');
INSERT INTO "public"."cap_tema" VALUES (42, 'Riesgo biológico');
INSERT INTO "public"."cap_tema" VALUES (43, 'Uso adecuado EPP/Sensibilización de limpieza y mantenimiento de epp');
INSERT INTO "public"."cap_tema" VALUES (44, 'Reporte de accidentes laborales, incidentes, y EL');
INSERT INTO "public"."cap_tema" VALUES (45, 'Identificación de riesgos y peligros');
INSERT INTO "public"."cap_tema" VALUES (46, 'Reporte de actos y condiciones inseguras');
INSERT INTO "public"."cap_tema" VALUES (47, 'Autocuidado ');
INSERT INTO "public"."cap_tema" VALUES (48, 'Identificación de peligros');
INSERT INTO "public"."cap_tema" VALUES (49, 'Riesgo Psicosocial');
INSERT INTO "public"."cap_tema" VALUES (50, 'Manejo racional de plaguicidas');
INSERT INTO "public"."cap_tema" VALUES (51, 'Riesgo químico. SGA');
INSERT INTO "public"."cap_tema" VALUES (52, 'Riesgo ergonómico');
INSERT INTO "public"."cap_tema" VALUES (53, 'Inducción y reinducción de seguridad y salud en el trabajo ');
INSERT INTO "public"."cap_tema" VALUES (54, 'Brigadistas de emergencia');
INSERT INTO "public"."cap_tema" VALUES (55, 'Capacitación al COPASST ');
INSERT INTO "public"."cap_tema" VALUES (56, 'Curso de 50 horas/ 20 horas');
INSERT INTO "public"."cap_tema" VALUES (57, 'Comunicación asertiva');
INSERT INTO "public"."cap_tema" VALUES (58, 'Excel');
INSERT INTO "public"."cap_tema" VALUES (59, 'Análisis e datos');
INSERT INTO "public"."cap_tema" VALUES (60, 'Calibración y Mantenimiento de Equipos');
INSERT INTO "public"."cap_tema" VALUES (61, 'Manejo del suelo ');
INSERT INTO "public"."cap_tema" VALUES (62, 'Control de calidad');
INSERT INTO "public"."cap_tema" VALUES (63, 'Diseño Web');
INSERT INTO "public"."cap_tema" VALUES (64, 'Electricidad industrial ');
INSERT INTO "public"."cap_tema" VALUES (65, 'Generación de energía');
INSERT INTO "public"."cap_tema" VALUES (66, 'Herramientas de Google');
INSERT INTO "public"."cap_tema" VALUES (67, 'Herramientas ofimáticas');
INSERT INTO "public"."cap_tema" VALUES (68, 'Manejo de aplicativo ATLAS');
INSERT INTO "public"."cap_tema" VALUES (69, 'Manejo de maquinaria y equipo');
INSERT INTO "public"."cap_tema" VALUES (70, 'Manejo integrado de plagas y enfermedades');
INSERT INTO "public"."cap_tema" VALUES (71, 'Mantenimiento de cámaras');
INSERT INTO "public"."cap_tema" VALUES (72, 'Mantenimientos de primer nivel ');
INSERT INTO "public"."cap_tema" VALUES (73, 'Nomina y seguridad social ');
INSERT INTO "public"."cap_tema" VALUES (74, 'Planeación de labores agrícolas');
INSERT INTO "public"."cap_tema" VALUES (75, 'Power Bi');
INSERT INTO "public"."cap_tema" VALUES (76, 'Rotación de inventario');
INSERT INTO "public"."cap_tema" VALUES (77, 'SAP');


-- ----------------------------
-- Table structure for cap_tipo_actividad
-- ----------------------------
DROP TABLE IF EXISTS "public"."cap_tipo_actividad";
CREATE TABLE "public"."cap_tipo_actividad" (
  "id" int4 NOT NULL DEFAULT nextval('tipo_actividad_id_seq'::regclass),
  "nombre" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of cap_tipo_actividad
-- ----------------------------
INSERT INTO "public"."cap_tipo_actividad" VALUES (1, 'Capacitación');
INSERT INTO "public"."cap_tipo_actividad" VALUES (2, 'Charla');
INSERT INTO "public"."cap_tipo_actividad" VALUES (3, 'Reunión');
INSERT INTO "public"."cap_tipo_actividad" VALUES (4, 'Entrenamiento');
INSERT INTO "public"."cap_tipo_actividad" VALUES (5, 'Inducción');

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."adm_usuario_roles_id_seq"
OWNED BY "public"."adm_usuario_roles"."id";
SELECT setval('"public"."adm_usuario_roles_id_seq"', 2, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."asistente_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."formulario_asistente_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."formulario_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."lugar_id_seq"', 10, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."proceso_id_seq"', 7, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."roles_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."tema_id_seq"', 77, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."tipo_actividad_id_seq"', 5, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."usuarios_id_seq"', 2, true);

-- ----------------------------
-- Indexes structure for table adm_cargos
-- ----------------------------
CREATE INDEX "idx_cargos_rango" ON "public"."adm_cargos" USING btree (
  "rango_cargo" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table adm_cargos
-- ----------------------------
ALTER TABLE "public"."adm_cargos" ADD CONSTRAINT "adm_cargos_pkey" PRIMARY KEY ("id_cargo");

-- ----------------------------
-- Indexes structure for table adm_colaboradores
-- ----------------------------
CREATE INDEX "idx_colaboradores_cedula" ON "public"."adm_colaboradores" USING btree (
  "ac_cedula" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table adm_colaboradores
-- ----------------------------
ALTER TABLE "public"."adm_colaboradores" ADD CONSTRAINT "unique_colaborador" UNIQUE ("ac_cedula", "ac_id_situación", "ac_sub_area", "ac_id_cargo", "ac_empresa");

-- ----------------------------
-- Primary Key structure for table adm_colaboradores
-- ----------------------------
ALTER TABLE "public"."adm_colaboradores" ADD CONSTRAINT "adm_colaboradores_pkey" PRIMARY KEY ("ac_id");

-- ----------------------------
-- Primary Key structure for table adm_empresa
-- ----------------------------
ALTER TABLE "public"."adm_empresa" ADD CONSTRAINT "adm_empresa_pkey" PRIMARY KEY ("emp_id");

-- ----------------------------
-- Primary Key structure for table adm_roles
-- ----------------------------
ALTER TABLE "public"."adm_roles" ADD CONSTRAINT "adm_roles_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table adm_situación
-- ----------------------------
ALTER TABLE "public"."adm_situación" ADD CONSTRAINT "adm_situación_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table adm_usuario_roles
-- ----------------------------
ALTER TABLE "public"."adm_usuario_roles" ADD CONSTRAINT "unique_usuario_rol" UNIQUE ("usuario_id", "rol_id");

-- ----------------------------
-- Primary Key structure for table adm_usuario_roles
-- ----------------------------
ALTER TABLE "public"."adm_usuario_roles" ADD CONSTRAINT "adm_usuario_roles_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table adm_usuarios
-- ----------------------------
CREATE INDEX "idx_usuarios_cedula" ON "public"."adm_usuarios" USING btree (
  "cedula" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table adm_usuarios
-- ----------------------------
ALTER TABLE "public"."adm_usuarios" ADD CONSTRAINT "adm_usuarios_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table adm_área
-- ----------------------------
CREATE INDEX "idx_area_area" ON "public"."adm_área" USING btree (
  "area" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table adm_área
-- ----------------------------
ALTER TABLE "public"."adm_área" ADD CONSTRAINT "adm_área_pkey" PRIMARY KEY ("id_area");

-- ----------------------------
-- Primary Key structure for table cap_formulario
-- ----------------------------
ALTER TABLE "public"."cap_formulario" ADD CONSTRAINT "cap_formulario_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table cap_formulario_asistente
-- ----------------------------
ALTER TABLE "public"."cap_formulario_asistente" ADD CONSTRAINT "cap_formulario_asistente_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table cap_lugar
-- ----------------------------
ALTER TABLE "public"."cap_lugar" ADD CONSTRAINT "cap_lugar_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table cap_proceso
-- ----------------------------
ALTER TABLE "public"."cap_proceso" ADD CONSTRAINT "cap_proceso_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table cap_tema
-- ----------------------------
ALTER TABLE "public"."cap_tema" ADD CONSTRAINT "cap_tema_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table cap_tipo_actividad
-- ----------------------------
ALTER TABLE "public"."cap_tipo_actividad" ADD CONSTRAINT "cap_tipo_actividad_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table adm_colaboradores
-- ----------------------------
ALTER TABLE "public"."adm_colaboradores" ADD CONSTRAINT "adm_colaboradores_ac_id_rol_fkey" FOREIGN KEY ("ac_id_rol") REFERENCES "public"."adm_roles" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table adm_usuario_roles
-- ----------------------------
ALTER TABLE "public"."adm_usuario_roles" ADD CONSTRAINT "fk_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."adm_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."adm_usuario_roles" ADD CONSTRAINT "fk_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."adm_usuarios" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table cap_formulario
-- ----------------------------
ALTER TABLE "public"."cap_formulario" ADD CONSTRAINT "cap_formulario_id_lugar_fkey" FOREIGN KEY ("id_lugar") REFERENCES "public"."cap_lugar" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."cap_formulario" ADD CONSTRAINT "cap_formulario_id_proceso_fkey" FOREIGN KEY ("id_proceso") REFERENCES "public"."cap_proceso" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."cap_formulario" ADD CONSTRAINT "cap_formulario_id_tema_fkey" FOREIGN KEY ("id_tema") REFERENCES "public"."cap_tema" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."cap_formulario" ADD CONSTRAINT "cap_formulario_id_tipo_actividad_fkey" FOREIGN KEY ("id_tipo_actividad") REFERENCES "public"."cap_tipo_actividad" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."cap_formulario" ADD CONSTRAINT "cap_formulario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."adm_usuarios" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table cap_formulario_asistente
-- ----------------------------
ALTER TABLE "public"."cap_formulario_asistente" ADD CONSTRAINT "cap_formulario_asistente_id_formulario_fkey" FOREIGN KEY ("id_formulario") REFERENCES "public"."cap_formulario" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
