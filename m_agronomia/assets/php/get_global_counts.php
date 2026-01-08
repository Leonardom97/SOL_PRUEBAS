<?php
/**
 * get_global_counts.php
 * 
 * Consulta el conteo de registros pendientes de aprobación en TODAS las tablas configuradas.
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../php/db_postgres.php';

// Usar conexión temporal donde residen los pendientes
$pg = $pg_temporal;

// Lista blanca de tablas (entidades) para evitar SQL Injection y errores
$tables = [
    'cosecha_fruta',
    'mantenimientos',
    'oficios_varios_palma',
    'fertilizacion_organica',
    'monitoreos_generales',
    'ct_cal_sanidad',
    'monitoreo_trampas',
    'nivel_freatico',
    'ct_cal_labores',
    'reporte_lote_monitoreo',
    'ct_cal_trampas',
    'compactacion',
    'plagas',
    'coberturas',
    'ct_polinizacion_flores',
    'aud_cosecha',
    'aud_fertilizacion',
    'aud_mantenimiento',
    'aud_perdidas',
    'aud_vagones',
    'aud_maquinaria',
    'labores_diarias',
    'polinizacion',
    'resiembra',
    'salida_vivero',
    'siembra_nueva',
    'erradicaciones',
    'compostaje'
];

$response = [
    'total' => 0,
    'details' => []
];

try {
    foreach ($tables as $table) {
        // Verificar existencia de tabla (opcional pero recomendado si la DB varía)
        // Por eficiencia asumimos que existen. Si una falla, capturamos silenciosamente para no romper todo.
        try {
            $sql = "SELECT COUNT(*) FROM $table WHERE LOWER(COALESCE(supervision,'pendiente')) = 'pendiente'";
            $stmt = $pg->query($sql);
            $count = (int)$stmt->fetchColumn();
            
            if ($count > 0) {
                $response['details'][$table] = $count;
                $response['total'] += $count;
            }
        } catch (Exception $ex) {
            // Ignorar tabla si no existe o error sql
            continue; 
        }
    }
    
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
