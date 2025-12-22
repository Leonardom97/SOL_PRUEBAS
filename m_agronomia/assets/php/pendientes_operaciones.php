<?php

/**
 * pendientes_operaciones.php
 *
 * API para consultar operaciones pendientes de aprobación.
 *
 * Funcionalidad:
 *  - Recupera registros de la base de datos temporal con estado de supervisión 'pendiente'.
 *  - Soporta filtrado por entidad (nombre de tabla).
 *  - Utilizado para indicadores visuales (campana de notificaciones, iconos de estado).
 *
 * Parámetros GET:
 *  - entidad: Nombre de la tabla a consultar (alfanumérico + guion bajo). Default: 'monitoreos_generales'.
 *
 * Respuesta JSON:
 *  - datos: Lista de registros pendientes.
 *  - total: Conteo total.
 *  - idCol: Nombre de la columna clave primaria detectada.
 *  - columnas: Estructura de columnas de la tabla.
 *
 * Seguridad:
 *  - Validación estricta del nombre de la tabla para prevenir SQL Injection.
 */

require_once __DIR__ . '/../../../php/db_postgres.php';
$pg = $pg_temporal;
header('Content-Type: application/json; charset=utf-8');

// Obtener y validar el parámetro de entidad
$entidad = isset($_GET['entidad']) ? strtolower(trim($_GET['entidad'])) : 'monitoreos_generales';

// Validación de seguridad: solo permitir nombres de tabla válidos
if (!preg_match('/^[a-zA-Z0-9_]+$/', $entidad)) {
    echo json_encode(['datos' => [], 'total' => 0, 'idCol' => '', 'columnas' => []]);
    exit;
}

/**
 * Obtiene la lista de columnas de una tabla.
 * 
 * @param PDO $pg - Conexión a la base de datos
 * @param string $table - Nombre de la tabla
 * @return array Arreglo de nombres de columnas en orden
 */
function list_columns(PDO $pg, $table)
{
    $st = $pg->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=:t ORDER BY ordinal_position");
    $st->execute(['t' => $table]);
    return $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
}

// Determinar el nombre de la columna ID (convención: {entidad}_id)
$idCol = $entidad . '_id';

// Obtener las columnas de la tabla
$columnas = list_columns($pg, $entidad);

// Consultar registros pendientes (supervision='pendiente' o NULL)
$sql = "SELECT * FROM $entidad WHERE LOWER(COALESCE(supervision,'pendiente')) = 'pendiente'";
$stmt = $pg->prepare($sql);
$stmt->execute();
$datos = $stmt->fetchAll();

// Devolver respuesta JSON
echo json_encode([
    'datos' => $datos,
    'total' => count($datos),
    'idCol' => $idCol,
    'columnas' => $columnas
]);
