<?php
/**
 * Debug script to check permissions configuration
 * This helps diagnose permission assignment issues
 */

session_start();
require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/role_check.php';

// Only allow administrators to run this
if (!isset($_SESSION['usuario_id'])) {
    die('ERROR: No session. Please login first.');
}

// Verify user is administrator
requireAdministrator($pg);

// Simple HTML output
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Permission Debug Tool</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; background: white; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .section { margin: 30px 0; padding: 20px; background: white; border-radius: 5px; }
        .warning { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
        .success { background: #d4edda; padding: 10px; border-left: 4px solid #28a745; margin: 10px 0; }
        .error { background: #f8d7da; padding: 10px; border-left: 4px solid #dc3545; margin: 10px 0; }
        pre { background: #f8f9fa; padding: 10px; border: 1px solid #dee2e6; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 Permission System Debugger</h1>
    <p>Current User ID: <strong><?php echo htmlspecialchars($_SESSION['usuario_id']); ?></strong></p>
    
<?php

try {
    // Check if tables exist
    echo "<div class='section'>";
    echo "<h2>1. Database Tables Check</h2>";
    
    $tables_check = $pg->query("SELECT tablename FROM pg_tables WHERE tablename IN ('adm_role_permissions', 'adm_resources_catalog', 'adm_roles', 'adm_usuario_roles')");
    $existing_tables = $tables_check->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($existing_tables) === 4) {
        echo "<div class='success'>✓ All required tables exist</div>";
    } else {
        echo "<div class='error'>✗ Missing tables: " . implode(', ', array_diff(['adm_role_permissions', 'adm_resources_catalog', 'adm_roles', 'adm_usuario_roles'], $existing_tables)) . "</div>";
        echo "<p>You need to run the migration: db/migrate_role_permissions.sql</p>";
    }
    echo "</div>";
    
    // Check current user's roles
    echo "<div class='section'>";
    echo "<h2>2. Current User's Roles</h2>";
    $stmt = $pg->prepare("SELECT r.id, r.nombre, r.estado FROM adm_usuario_roles ur
                         JOIN adm_roles r ON ur.rol_id = r.id
                         WHERE ur.usuario_id = :usuario_id");
    $stmt->execute([':usuario_id' => $_SESSION['usuario_id']]);
    $user_roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($user_roles)) {
        echo "<div class='warning'>⚠ Current user has no roles assigned</div>";
    } else {
        echo "<table>";
        echo "<tr><th>Role ID</th><th>Role Name</th><th>Estado</th></tr>";
        foreach ($user_roles as $role) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($role['id']) . "</td>";
            echo "<td>" . htmlspecialchars($role['nombre']) . "</td>";
            echo "<td>" . ($role['estado'] == 0 ? 'Activo' : 'Inactivo') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";
    
    // Check all roles
    echo "<div class='section'>";
    echo "<h2>3. All Roles in System</h2>";
    $all_roles = $pg->query("SELECT id, nombre, estado FROM adm_roles ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($all_roles)) {
        echo "<div class='error'>✗ No roles found in system</div>";
    } else {
        echo "<table>";
        echo "<tr><th>ID</th><th>Name</th><th>Estado</th><th># Permissions</th></tr>";
        foreach ($all_roles as $role) {
            $perm_count = $pg->prepare("SELECT COUNT(*) FROM adm_role_permissions WHERE rol_id = ?");
            $perm_count->execute([$role['id']]);
            $count = $perm_count->fetchColumn();
            
            echo "<tr>";
            echo "<td>" . htmlspecialchars($role['id']) . "</td>";
            echo "<td>" . htmlspecialchars($role['nombre']) . "</td>";
            echo "<td>" . ($role['estado'] == 0 ? 'Activo' : 'Inactivo') . "</td>";
            echo "<td>" . $count . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";
    
    // Check resources catalog
    echo "<div class='section'>";
    echo "<h2>4. Resources Catalog</h2>";
    $catalog_count = $pg->query("SELECT COUNT(*) FROM adm_resources_catalog WHERE is_active = TRUE")->fetchColumn();
    
    if ($catalog_count == 0) {
        echo "<div class='warning'>⚠ Resources catalog is empty! Click 'Actualizar catálogo' in roles management.</div>";
    } else {
        echo "<div class='success'>✓ Catalog has $catalog_count active resources</div>";
        
        // Show catalog grouped by module
        $catalog = $pg->query("SELECT module_name, COUNT(*) as count FROM adm_resources_catalog 
                              WHERE is_active = TRUE GROUP BY module_name ORDER BY module_name")->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<table>";
        echo "<tr><th>Module</th><th>Page Count</th></tr>";
        foreach ($catalog as $module) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($module['module_name']) . "</td>";
            echo "<td>" . htmlspecialchars($module['count']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";
    
    // Check permissions for each role
    echo "<div class='section'>";
    echo "<h2>5. Permissions by Role</h2>";
    foreach ($all_roles as $role) {
        echo "<h3>Role: " . htmlspecialchars($role['nombre']) . " (ID: " . $role['id'] . ")</h3>";
        
        $perms = $pg->prepare("SELECT resource_path, resource_name, module_name FROM adm_role_permissions 
                              WHERE rol_id = ? ORDER BY module_name, resource_name");
        $perms->execute([$role['id']]);
        $permissions = $perms->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($permissions)) {
            echo "<div class='warning'>⚠ No permissions assigned to this role</div>";
        } else {
            echo "<table>";
            echo "<tr><th>Module</th><th>Page Name</th><th>Path</th></tr>";
            foreach ($permissions as $perm) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($perm['module_name']) . "</td>";
                echo "<td>" . htmlspecialchars($perm['resource_name']) . "</td>";
                echo "<td><code>" . htmlspecialchars($perm['resource_path']) . "</code></td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    }
    echo "</div>";
    
    // Test permission check for current user
    echo "<div class='section'>";
    echo "<h2>6. Test Permission Check</h2>";
    echo "<p>Testing if current user can access common pages:</p>";
    
    $test_pages = [
        '/panel.html',
        '/Usuarios.html',
        '/m_admin/ed_usuario.html',
        '/m_capacitaciones/formulario.html',
        '/includes/roles.html'
    ];
    
    echo "<table>";
    echo "<tr><th>Page</th><th>Access</th></tr>";
    
    foreach ($test_pages as $test_page) {
        // Simulate the same check as permissions_api.php
        $role_ids = array_column($user_roles, 'id');
        $placeholders = implode(',', array_fill(0, count($role_ids), '?'));
        
        $sqlPerm = "SELECT COUNT(*) as count FROM adm_role_permissions
                   WHERE rol_id IN ($placeholders) AND resource_path = ?";
        $stmtPerm = $pg->prepare($sqlPerm);
        $stmtPerm->execute(array_merge($role_ids, [$test_page]));
        $has_permission = $stmtPerm->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        echo "<tr>";
        echo "<td><code>" . htmlspecialchars($test_page) . "</code></td>";
        echo "<td>" . ($has_permission ? "<span style='color: green;'>✓ GRANTED</span>" : "<span style='color: red;'>✗ DENIED</span>") . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='error'>";
    echo "<h2>Error</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
}

?>

<div class='section'>
    <h2>7. Actions</h2>
    <p><a href="/includes/roles.html">→ Go to Roles Management</a></p>
    <p><a href="/panel.html">→ Go to Dashboard</a></p>
    <p><a href="?refresh=1">🔄 Refresh This Page</a></p>
</div>

<div class='section' style='background: #e7f3ff; border-left: 4px solid #2196F3;'>
    <h2>💡 Common Issues and Solutions</h2>
    <ul>
        <li><strong>Catalog is empty:</strong> Open /includes/roles.html, edit any role, and click "Actualizar catálogo"</li>
        <li><strong>Role has no permissions:</strong> Edit the role and check the pages you want to allow</li>
        <li><strong>User has no roles:</strong> Assign a role to the user in user management</li>
        <li><strong>Tables missing:</strong> Run db/migrate_role_permissions.sql</li>
    </ul>
</div>

</body>
</html>
