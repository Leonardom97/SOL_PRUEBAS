<?php

/**
 * create_new_tables_v2.php
 *
 * Script de migración DDL para crear tablas nuevas en PostgreSQL si no existen.
 *
 * Tablas gestionadas:
 *  - compostaje
 *  - erradicaciones
 *  - aud_maquinaria
 * 
 * Uso:
 *  - Ejecutar para asegurar que el esquema de base de datos esté sincronizado con el código.
 */
require_once __DIR__ . '/../../../php/db_postgres.php';

// SQL definitions based on API columns
$tables = [
    'compostaje' => "
        CREATE TABLE IF NOT EXISTS public.compostaje (
            compostaje_id SERIAL PRIMARY KEY,
            id TEXT,
            fecha DATE,
            hora TIME,
            fecha_actividad DATE,
            responsable TEXT,
            plantacion TEXT,
            labor TEXT,
            labor_especifica TEXT,
            bache TEXT,
            pila TEXT,
            unidad TEXT,
            cantidad NUMERIC,
            hora_inicio TIME,
            hora_fin TIME,
            operario TEXT,
            empresa TEXT,
            maquina TEXT,
            horometro_inicial NUMERIC,
            horometro_final NUMERIC,
            ubicacion TEXT,
            observaciones TEXT,
            error_registro TEXT DEFAULT 'activo',
            supervision TEXT DEFAULT 'pendiente',
            \"check\" INTEGER DEFAULT 0
        );
    ",
    'erradicaciones' => "
        CREATE TABLE IF NOT EXISTS public.erradicaciones (
            erradicaciones_id SERIAL PRIMARY KEY,
            fecha DATE,
            fecha_actividad DATE,
            hora TIME,
            colaborador TEXT,
            plantacion TEXT,
            finca TEXT,
            siembra TEXT,
            lote TEXT,
            parcela TEXT,
            linea TEXT,
            palma TEXT,
            mesamate_l NUMERIC,
            alisin_l NUMERIC,
            cal_agricola_kg NUMERIC,
            unidad_2 TEXT,
            cantidad_unidades NUMERIC,
            equipo TEXT,
            motivo TEXT,
            observacion TEXT,
            tipo_erradicacion TEXT,
            responsable TEXT,
            id TEXT,
            error_registro TEXT DEFAULT 'activo',
            supervision TEXT DEFAULT 'pendiente',
            \"check\" INTEGER DEFAULT 0
        );
    ",
    'aud_maquinaria' => "
        CREATE TABLE IF NOT EXISTS public.aud_maquinaria (
            aud_maquinaria_id SERIAL PRIMARY KEY,
            fecha DATE,
            hora TIME,
            id TEXT,
            responsable TEXT,
            labor_especifica TEXT,
            fecha_actividad DATE,
            plantacion TEXT,
            siembra TEXT,
            finca TEXT,
            lote TEXT,
            parcela TEXT,
            tipo_labor TEXT,
            linea_entrada TEXT,
            linea_salida TEXT,
            calificacion TEXT,
            observacion TEXT,
            tipo_auditoria TEXT,
            maquina TEXT,
            error_registro TEXT DEFAULT 'activo',
            supervision TEXT DEFAULT 'pendiente',
            \"check\" INTEGER DEFAULT 0
        );
    "
];

foreach ($tables as $name => $sql) {
    try {
        $pg_prueba->exec($sql);
        echo "Table '$name' created/verified successfully in CLIPA.\n";
    } catch (PDOException $e) {
        echo "Error creating table '$name' in CLIPA: " . $e->getMessage() . "\n";
    }
}
