/*
 Navicat Premium Data Transfer

 Source Server         : Local
 Source Server Type    : PostgreSQL
 Source Server Version : 170006 (170006)
 Source Host           : localhost:5432
 Source Catalog        : Prueba_agronomia
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170006 (170006)
 File Encoding         : 65001

 Date: 24/11/2025 11:20:49
*/


-- ----------------------------
-- Table structure for compactacion
-- ----------------------------
DROP TABLE IF EXISTS "public"."compactacion";
CREATE TABLE "public"."compactacion" (
  "compactacion_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea_compactacion" varchar(255) COLLATE "pg_catalog"."default",
  "palma_compactacion" varchar(255) COLLATE "pg_catalog"."default",
  "ubicacion_compactacion" varchar(255) COLLATE "pg_catalog"."default",
  "presion" varchar(255) COLLATE "pg_catalog"."default",
  "profundidad" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for cosecha_fruta
-- ----------------------------
DROP TABLE IF EXISTS "public"."cosecha_fruta";
CREATE TABLE "public"."cosecha_fruta" (
  "cosecha_fruta_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "fecha_actividad" varchar(255) COLLATE "pg_catalog"."default",
  "responsable" varchar(255) COLLATE "pg_catalog"."default",
  "fecha_corte" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "labor_especifica" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_corte" varchar(255) COLLATE "pg_catalog"."default",
  "equipo" varchar(255) COLLATE "pg_catalog"."default",
  "cod_colaborador_contratista" varchar(255) COLLATE "pg_catalog"."default",
  "n_grupo_dia" varchar(255) COLLATE "pg_catalog"."default",
  "hora_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "hora_salida" varchar(255) COLLATE "pg_catalog"."default",
  "linea_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "linea_salida" varchar(255) COLLATE "pg_catalog"."default",
  "total_personas" varchar(255) COLLATE "pg_catalog"."default",
  "unidad" varchar(255) COLLATE "pg_catalog"."default",
  "cantidad" varchar(255) COLLATE "pg_catalog"."default",
  "peso_promedio_lonas" varchar(255) COLLATE "pg_catalog"."default",
  "total_persona_dia" varchar(255) COLLATE "pg_catalog"."default",
  "contratista" varchar(255) COLLATE "pg_catalog"."default",
  "cod_plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion_trz" varchar(255) COLLATE "pg_catalog"."default",
  "tipo" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_cosecha" varchar(255) COLLATE "pg_catalog"."default",
  "cod_actividad" varchar(255) COLLATE "pg_catalog"."default",
  "dim_5" varchar(255) COLLATE "pg_catalog"."default",
  "horas_trabajadas" varchar(255) COLLATE "pg_catalog"."default",
  "kilos_hora" varchar(255) COLLATE "pg_catalog"."default",
  "kg_grupo_2" varchar(255) COLLATE "pg_catalog"."default",
  "kg_persona" varchar(255) COLLATE "pg_catalog"."default",
  "kg_persona_acumulado" varchar(255) COLLATE "pg_catalog"."default",
  "peso_promedio_cargue" varchar(255) COLLATE "pg_catalog"."default",
  "kg_estimado_peso_promedio_lonas" varchar(255) COLLATE "pg_catalog"."default",
  "validacion_racimos_corte" varchar(255) COLLATE "pg_catalog"."default",
  "validacion_racimos_cargue" varchar(255) COLLATE "pg_catalog"."default",
  "diferencia_racimos" varchar(255) COLLATE "pg_catalog"."default",
  "validacion_kg_corte" varchar(255) COLLATE "pg_catalog"."default",
  "validacion_kg_cargue" varchar(255) COLLATE "pg_catalog"."default",
  "diferencia_kg" varchar(255) COLLATE "pg_catalog"."default",
  "palmas_1" varchar(255) COLLATE "pg_catalog"."default",
  "palmas_2" varchar(255) COLLATE "pg_catalog"."default",
  "ajuste_palmas" varchar(255) COLLATE "pg_catalog"."default",
  "palmas" varchar(255) COLLATE "pg_catalog"."default",
  "area_1" varchar(255) COLLATE "pg_catalog"."default",
  "area_2" varchar(255) COLLATE "pg_catalog"."default",
  "ajuste_area" varchar(255) COLLATE "pg_catalog"."default",
  "area" varchar(255) COLLATE "pg_catalog"."default",
  "avance" varchar(255) COLLATE "pg_catalog"."default",
  "entrada_diaria" varchar(255) COLLATE "pg_catalog"."default",
  "jornales_totales" varchar(255) COLLATE "pg_catalog"."default",
  "area_individual" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "nuevo_operador" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for ct_cal_labores
-- ----------------------------
DROP TABLE IF EXISTS "public"."ct_cal_labores";
CREATE TABLE "public"."ct_cal_labores" (
  "ct_cal_labores_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_auditoria" varchar(255) COLLATE "pg_catalog"."default",
  "labor_especifica" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea" varchar(255) COLLATE "pg_catalog"."default",
  "palma" varchar(255) COLLATE "pg_catalog"."default",
  "linea_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "linea_salida" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_validacion" varchar(255) COLLATE "pg_catalog"."default",
  "grado_enfermedad" varchar(255) COLLATE "pg_catalog"."default",
  "numero_galerias" varchar(255) COLLATE "pg_catalog"."default",
  "promedio" varchar(255) COLLATE "pg_catalog"."default",
  "estado" varchar(255) COLLATE "pg_catalog"."default",
  "producto" varchar(255) COLLATE "pg_catalog"."default",
  "observacion" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for ct_cal_sanidad
-- ----------------------------
DROP TABLE IF EXISTS "public"."ct_cal_sanidad";
CREATE TABLE "public"."ct_cal_sanidad" (
  "ct_cal_sanidad_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "responsable" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea" varchar(255) COLLATE "pg_catalog"."default",
  "palma" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_labor" varchar(255) COLLATE "pg_catalog"."default",
  "estado" varchar(255) COLLATE "pg_catalog"."default",
  "etapa" varchar(255) COLLATE "pg_catalog"."default",
  "instar" varchar(255) COLLATE "pg_catalog"."default",
  "verificacion" varchar(255) COLLATE "pg_catalog"."default",
  "observaciones" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for ct_cal_trampas
-- ----------------------------
DROP TABLE IF EXISTS "public"."ct_cal_trampas";
CREATE TABLE "public"."ct_cal_trampas" (
  "ct_cal_trampas_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "responsable" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "trampa" varchar(255) COLLATE "pg_catalog"."default",
  "plaga" varchar(255) COLLATE "pg_catalog"."default",
  "hembra" varchar(255) COLLATE "pg_catalog"."default",
  "macho" varchar(255) COLLATE "pg_catalog"."default",
  "lado_a" varchar(255) COLLATE "pg_catalog"."default",
  "lado_b" varchar(255) COLLATE "pg_catalog"."default",
  "estado_lona" varchar(255) COLLATE "pg_catalog"."default",
  "estado_trampa" varchar(255) COLLATE "pg_catalog"."default",
  "estado_ubicacion" varchar(255) COLLATE "pg_catalog"."default",
  "estado_ventana" varchar(255) COLLATE "pg_catalog"."default",
  "estado_cania" varchar(255) COLLATE "pg_catalog"."default",
  "estado_melaza" varchar(255) COLLATE "pg_catalog"."default",
  "estado_feromona" varchar(255) COLLATE "pg_catalog"."default",
  "calificacion" varchar(255) COLLATE "pg_catalog"."default",
  "observaciones" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for fertilizacion_organica
-- ----------------------------
DROP TABLE IF EXISTS "public"."fertilizacion_organica";
CREATE TABLE "public"."fertilizacion_organica" (
  "fertilizacion_organica_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "responsable" varchar(255) COLLATE "pg_catalog"."default",
  "fecha_actividad" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "linea_salida" varchar(255) COLLATE "pg_catalog"."default",
  "hora_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "hora_salida" varchar(255) COLLATE "pg_catalog"."default",
  "labor_especifica" varchar(255) COLLATE "pg_catalog"."default",
  "producto_aplicado" varchar(255) COLLATE "pg_catalog"."default",
  "dosis_kg" varchar(255) COLLATE "pg_catalog"."default",
  "unidad_aplicacion" varchar(255) COLLATE "pg_catalog"."default",
  "contratista_colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "n_colaboradores" varchar(255) COLLATE "pg_catalog"."default",
  "colaboradores" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_labor" varchar(255) COLLATE "pg_catalog"."default",
  "contratista_maquinaria" varchar(255) COLLATE "pg_catalog"."default",
  "n_operadores" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_maquina" varchar(255) COLLATE "pg_catalog"."default",
  "nombre_operadores" varchar(255) COLLATE "pg_catalog"."default",
  "bultos_aplicados" varchar(255) COLLATE "pg_catalog"."default",
  "n_traslado" varchar(255) COLLATE "pg_catalog"."default",
  "kg_aplicados" varchar(255) COLLATE "pg_catalog"."default",
  "total_palmas_aplicadas" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "n_maquinas" varchar(255) COLLATE "pg_catalog"."default",
  "h_entrada_maq" varchar(255) COLLATE "pg_catalog"."default",
  "h_salidad_maq" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for mantenimientos
-- ----------------------------
DROP TABLE IF EXISTS "public"."mantenimientos";
CREATE TABLE "public"."mantenimientos" (
  "mantenimientos_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "responsable" varchar(255) COLLATE "pg_catalog"."default",
  "fecha_actividad" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "labor_especifica" varchar(255) COLLATE "pg_catalog"."default",
  "observacion" varchar(255) COLLATE "pg_catalog"."default",
  "contratista" varchar(255) COLLATE "pg_catalog"."default",
  "codigo" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "personas" varchar(255) COLLATE "pg_catalog"."default",
  "hora_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "hora_salida" varchar(255) COLLATE "pg_catalog"."default",
  "linea_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "linea_salida" varchar(255) COLLATE "pg_catalog"."default",
  "cantidad" varchar(255) COLLATE "pg_catalog"."default",
  "unidad" varchar(255) COLLATE "pg_catalog"."default",
  "maquina" varchar(255) COLLATE "pg_catalog"."default",
  "tractorista" varchar(255) COLLATE "pg_catalog"."default",
  "palmas_reales" varchar(255) COLLATE "pg_catalog"."default",
  "palmas_pie" varchar(255) COLLATE "pg_catalog"."default",
  "nuevo_operario" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for monitoreo_trampas
-- ----------------------------
DROP TABLE IF EXISTS "public"."monitoreo_trampas";
CREATE TABLE "public"."monitoreo_trampas" (
  "monitoreo_trampas_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "ubicacion" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_trampa" varchar(255) COLLATE "pg_catalog"."default",
  "linea" varchar(255) COLLATE "pg_catalog"."default",
  "palma" varchar(255) COLLATE "pg_catalog"."default",
  "plaga" varchar(255) COLLATE "pg_catalog"."default",
  "hembra" varchar(255) COLLATE "pg_catalog"."default",
  "macho" varchar(255) COLLATE "pg_catalog"."default",
  "lado_a" varchar(255) COLLATE "pg_catalog"."default",
  "lado_b" varchar(255) COLLATE "pg_catalog"."default",
  "numero_trampa" varchar(255) COLLATE "pg_catalog"."default",
  "estado_lona" varchar(255) COLLATE "pg_catalog"."default",
  "estado_trampa" varchar(255) COLLATE "pg_catalog"."default",
  "estado_ventana" varchar(255) COLLATE "pg_catalog"."default",
  "estado_cania" varchar(255) COLLATE "pg_catalog"."default",
  "estado_melaza" varchar(255) COLLATE "pg_catalog"."default",
  "estado_feromona" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "estado_tapa" varchar(255) COLLATE "pg_catalog"."default",
  "estado_envase" varchar(255) COLLATE "pg_catalog"."default",
  "observacion" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for monitoreos_generales
-- ----------------------------
DROP TABLE IF EXISTS "public"."monitoreos_generales";
CREATE TABLE "public"."monitoreos_generales" (
  "monitoreos_generales_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea" varchar(255) COLLATE "pg_catalog"."default",
  "palma" varchar(255) COLLATE "pg_catalog"."default",
  "grupo" varchar(255) COLLATE "pg_catalog"."default",
  "estado" varchar(255) COLLATE "pg_catalog"."default",
  "validacion" varchar(255) COLLATE "pg_catalog"."default",
  "sintoma" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "observacion" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for nivel_freatico
-- ----------------------------
DROP TABLE IF EXISTS "public"."nivel_freatico";
CREATE TABLE "public"."nivel_freatico" (
  "nivel_freatico_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea" varchar(255) COLLATE "pg_catalog"."default",
  "palma" varchar(255) COLLATE "pg_catalog"."default",
  "n_pozo_observacion" varchar(255) COLLATE "pg_catalog"."default",
  "profundidad_agua" varchar(255) COLLATE "pg_catalog"."default",
  "verificacion" varchar(255) COLLATE "pg_catalog"."default",
  "validacion" varchar(255) COLLATE "pg_catalog"."default",
  "enterrado" varchar(255) COLLATE "pg_catalog"."default",
  "nivel_freatico" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "superficie_tubo" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for oficios_varios_palma
-- ----------------------------
DROP TABLE IF EXISTS "public"."oficios_varios_palma";
CREATE TABLE "public"."oficios_varios_palma" (
  "oficios_varios_palma_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "responsable" varchar(255) COLLATE "pg_catalog"."default",
  "fecha_actividad" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "labor_especifica" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_labor" varchar(255) COLLATE "pg_catalog"."default",
  "contratista" varchar(255) COLLATE "pg_catalog"."default",
  "codigo" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "personas" varchar(255) COLLATE "pg_catalog"."default",
  "hora_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "hora_salida" varchar(255) COLLATE "pg_catalog"."default",
  "linea_entrada" varchar(255) COLLATE "pg_catalog"."default",
  "linea_salida" varchar(255) COLLATE "pg_catalog"."default",
  "cantidad" varchar(255) COLLATE "pg_catalog"."default",
  "unidad" varchar(255) COLLATE "pg_catalog"."default",
  "maquina" varchar(255) COLLATE "pg_catalog"."default",
  "tractorista" varchar(255) COLLATE "pg_catalog"."default",
  "palmas_reales" varchar(255) COLLATE "pg_catalog"."default",
  "palmas_pie" varchar(255) COLLATE "pg_catalog"."default",
  "tipo_cultivo" varchar(255) COLLATE "pg_catalog"."default",
  "nuevo_operario" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for plagas
-- ----------------------------
DROP TABLE IF EXISTS "public"."plagas";
CREATE TABLE "public"."plagas" (
  "plagas_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea" varchar(255) COLLATE "pg_catalog"."default",
  "palma" varchar(255) COLLATE "pg_catalog"."default",
  "ubicacion" varchar(255) COLLATE "pg_catalog"."default",
  "orden" varchar(255) COLLATE "pg_catalog"."default",
  "plaga" varchar(255) COLLATE "pg_catalog"."default",
  "etapa" varchar(255) COLLATE "pg_catalog"."default",
  "cantidad" varchar(255) COLLATE "pg_catalog"."default",
  "instar" varchar(255) COLLATE "pg_catalog"."default",
  "estado" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for reporte_lote_monitoreo
-- ----------------------------
DROP TABLE IF EXISTS "public"."reporte_lote_monitoreo";
CREATE TABLE "public"."reporte_lote_monitoreo" (
  "reporte_lote_monitoreo_id" varchar(255) COLLATE "pg_catalog"."default",
  "id" varchar(255) COLLATE "pg_catalog"."default",
  "fecha" varchar(255) COLLATE "pg_catalog"."default",
  "hora" varchar(255) COLLATE "pg_catalog"."default",
  "colaborador" varchar(255) COLLATE "pg_catalog"."default",
  "labor" varchar(255) COLLATE "pg_catalog"."default",
  "plantacion" varchar(255) COLLATE "pg_catalog"."default",
  "finca" varchar(255) COLLATE "pg_catalog"."default",
  "siembra" varchar(255) COLLATE "pg_catalog"."default",
  "lote" varchar(255) COLLATE "pg_catalog"."default",
  "parcela" varchar(255) COLLATE "pg_catalog"."default",
  "linea_reporte" varchar(255) COLLATE "pg_catalog"."default",
  "palma_reporte" varchar(255) COLLATE "pg_catalog"."default",
  "hallazgo" varchar(255) COLLATE "pg_catalog"."default",
  "observacion" varchar(255) COLLATE "pg_catalog"."default",
  "latitude" varchar(255) COLLATE "pg_catalog"."default",
  "longitude" varchar(255) COLLATE "pg_catalog"."default",
  "error_registro" varchar(255) COLLATE "pg_catalog"."default",
  "check" int4 DEFAULT 0,
  "supervision" varchar(50) COLLATE "pg_catalog"."default"
)
;
