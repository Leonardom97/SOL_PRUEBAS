<?php

/**
 * migrate_tabs_to_db.php
 *
 * Script principal de migración para el sistema de permisos de pestañas.
 *
 * Funcionalidad:
 * 1. Crea la tabla `agr_tab_permissions` (si no existe).
 * 2. Normaliza nombres de roles (elimina acentos, minúsculas) para mapeo seguro.
 * 3. Importa configuración desde JSON (`tab_permissions.json`) hacia la base de datos PostgreSQL.
 *
 * Notas:
 *  - Limpia la tabla antes de insertar (TRUNCATE) para evitar duplicados.
 */
require_once __DIR__ . '/../../../php/db_postgres.php';

// 1. Create Table according to user request (agr_pestañas -> agr_tab_permissions normalized)
// using comments in Spanish as requested
$sqlCreate = '
CREATE TABLE IF NOT EXISTS public.agr_tab_permissions (
    id SERIAL PRIMARY KEY,
    tab_key VARCHAR(100) NOT NULL, -- Clave única de la pestaña
    rol_id INTEGER NOT NULL REFERENCES public.adm_roles(id) ON DELETE CASCADE, -- ID del rol permitido
    UNIQUE(tab_key, rol_id)
);
COMMENT ON TABLE public.agr_tab_permissions IS \'Tabla de configuración de visibilidad de pestañas de Agronomía por Rol\';
';
$pg->exec($sqlCreate);
echo "Table created.\n";

// 2. Load Roles Map from DB to match JSON strings
$stmt = $pg->query("SELECT id, nombre FROM public.adm_roles");
$roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

function normalize($s)
{
    $s = mb_strtolower($s, 'UTF-8');
    // Replace accents
    $s = str_replace(
        ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ'],
        ['a', 'e', 'i', 'o', 'u', 'n', 'a', 'e', 'i', 'o', 'u', 'n'],
        $s
    );
    // Replace non-alphanumeric with _
    $s = preg_replace('/[^a-z0-9]/', '_', $s);
    return trim($s, '_');
}

$roleMap = [];
echo "Mapping Roles...\n";
foreach ($roles as $r) {
    $n = normalize($r['nombre']);
    $id = $r['id'];
    $roleMap[$n] = $id;
    echo "DB Role: '{$r['nombre']}' -> Normalized: '$n' -> ID: $id\n";

    // Add aliases specific to current JSON config
    if (strpos($n, 'aux') !== false && strpos($n, 'agronom') !== false) {
        $roleMap['aux_agronomico'] = $id;
    }
    if (strpos($n, 'asist') !== false && strpos($n, 'agron') !== false) {
        $roleMap['asist_agronomico'] = $id;
    }
    if (strpos($n, 'superv') !== false && strpos($n, 'agron') !== false) {
        $roleMap['supervisor_agronomico'] = $id;
    }
    if ($n == 'sup_logistica1' || $n == 'sup_logistica_1') $roleMap['sup_logistica1'] = $id;
    if ($n == 'administrador') $roleMap['administrador'] = $id;
}

// 3. Load JSON and Insert
$jsonPath = __DIR__ . '/../config/tab_permissions.json';
if (!file_exists($jsonPath)) die("No JSON file found at $jsonPath\n");
$data = json_decode(file_get_contents($jsonPath), true);

$count = 0;
$stmtInsert = $pg->prepare("INSERT INTO public.agr_tab_permissions (tab_key, rol_id) VALUES (:key, :rid) ON CONFLICT DO NOTHING");
// Clear table before migration to avoid dupes/stale data if run multiple times
$pg->exec("TRUNCATE TABLE public.agr_tab_permissions RESTART IDENTITY");

foreach ($data as $tab) {
    $key = $tab['key'];
    foreach ($tab['roles'] as $roleName) {
        $nRole = normalize($roleName);
        $rid = null;

        if (isset($roleMap[$roleName])) $rid = $roleMap[$roleName]; // Exact match with alias
        elseif (isset($roleMap[$nRole])) $rid = $roleMap[$nRole]; // Match normalized

        if ($rid) {
            $stmtInsert->execute([':key' => $key, ':rid' => $rid]);
            $count++;
        } else {
            echo "Warning: No matching DB rol_id found for JSON role '$roleName' (Normalized: '$nRole') in Tab: $key\n";
        }
    }
}

echo "Migration complete. Inserted $count permission records.\n";
