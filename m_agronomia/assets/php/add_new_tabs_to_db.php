<?php

/**
 * add_new_tabs_to_db.php
 *
 * Script de utilidad para registrar manualmente nuevas pestañas en el sistema de permisos (agr_tab_permissions).
 * 
 * Uso:
 *  - Ejecutar CLI o visitar vía web con protección.
 *  - Define pestañas nuevas en $newTabs.
 *  - Asigna permisos predeterminados a Admin y Aux. Agronómico.
 */
require_once __DIR__ . '/../../../php/db_postgres.php';

$newTabs = ['compostaje', 'erradicaciones', 'aud-maquinaria'];

// Roles we want to enable by default (IDs)
// Administrador (ID: 1), Aux_Agronómico (ID: 6) - guessed IDs from previous context 
// or fetching them again to be safe.

$stmtRoles = $pg->query("SELECT id, nombre FROM public.adm_roles WHERE nombre IN ('Administrador', 'Aux_Agronómico')");
$roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

if (empty($roles)) {
    die("Error: Could not find required roles (Administrador, Aux_Agronómico)\n");
}

$stmtInsert = $pg->prepare("INSERT INTO public.agr_tab_permissions (tab_key, rol_id) VALUES (:key, :rid) ON CONFLICT DO NOTHING");

$count = 0;
foreach ($newTabs as $key) {
    foreach ($roles as $r) {
        $stmtInsert->execute([':key' => $key, ':rid' => $r['id']]);
        $count++;
        echo "Granted access to '$key' for role '{$r['nombre']}'\n";
    }
}

echo "Done. Inserted $count permissions for new tabs.\n";
