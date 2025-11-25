<?php
/**
 * API de Gestión de Permisos de Roles - VERSIÓN MEJORADA
 * 
 * Maneja permisos basados en recursos (páginas, módulos, items de sidebar)
 * Incluye auto-descubrimiento de recursos del sistema
 */

// Debug mode - set to false in production
define('PERMISSIONS_DEBUG', false);

// Apply security headers
require_once __DIR__ . '/security_headers.php';

session_start();
require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/role_check.php';

// Validar que existe una sesión activa
if (!isset($_SESSION['usuario_id'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no iniciada. Por favor inicie sesión.']);
    exit;
}

// NOTA: No validamos administrador aquí porque el endpoint check_access 
// debe estar disponible para todos los usuarios autenticados.
// La validación de administrador se hace en cada endpoint específico.

/**
 * Actualiza el catálogo de recursos escaneando archivos HTML
 */
function updateResourcesCatalog($pg) {
    $base_path = realpath(__DIR__ . '/../');
    
    if ($base_path === false) {
        throw new Exception('Invalid base path');
    }
    
    $resources = [];
    
    // Escanear módulos automáticamente (directorios m_*)
    $module_pattern = $base_path . '/m_*';
    $module_dirs = glob($module_pattern, GLOB_ONLYDIR);
    
    if ($module_dirs !== false) {
        foreach ($module_dirs as $module_dir) {
            $real_dir = realpath($module_dir);
            if ($real_dir === false || strpos($real_dir, $base_path) !== 0) {
                continue;
            }
            
            $module_name = ucfirst(str_replace('m_', '', basename($module_dir)));
            $module_path = '/' . basename($module_dir) . '/';
            
            // Escanear archivos HTML en el módulo
            $html_files = glob($real_dir . '/*.html');
            if ($html_files !== false) {
                foreach ($html_files as $html_file) {
                    $file_name = basename($html_file);
                    $file_path = $module_path . $file_name;
                    
                    // Extraer nombre legible del archivo
                    $page_name = ucfirst(str_replace(['.html', '_', '-'], [' ', ' ', ' '], pathinfo($file_name, PATHINFO_FILENAME)));
                    
                    // Extraer data-roles del archivo
                    $data_roles = extractDataRolesFromFile($html_file, $base_path);
                    
                    $resources[] = [
                        'type' => 'page',
                        'path' => $file_path,
                        'name' => $page_name,
                        'module' => $module_name,
                        'data_roles' => $data_roles
                    ];
                }
            }
        }
    }
    
    // Escanear páginas principales (raíz y includes)
    $root_files = [
        'panel.html' => 'Panel Principal',
        'Usuarios.html' => 'Usuarios',
        'sesiones.html' => 'Gestión de Sesiones',
        'includes/roles.html' => 'Gestión de Roles',
        'includes/web_main.html' => 'Configuración Web',
        'm_admin/ed_usuario.html' => 'Usuarios Principales',
        'm_admin/ed_uscolaboradores.html' => 'Usuarios Colaboradores'
    ];
    
    foreach ($root_files as $file_path => $page_name) {
        $full_path = $base_path . '/' . $file_path;
        if (file_exists($full_path)) {
            $data_roles = extractDataRolesFromFile($full_path, $base_path);
            
            // Determinar módulo basado en la ruta del archivo
            $module = determineModuleFromPath($file_path);
            
            $resources[] = [
                'type' => 'page',
                'path' => '/' . $file_path,
                'name' => $page_name,
                'module' => $module,
                'data_roles' => $data_roles
            ];
        }
    }
    
    // Insertar/actualizar en el catálogo
    $updated_count = 0;
    foreach ($resources as $resource) {
        try {
            $sql = "INSERT INTO adm_resources_catalog 
                    (resource_type, resource_path, resource_name, module_name, data_roles, last_scanned)
                    VALUES (:type, :path, :name, :module, :data_roles, CURRENT_TIMESTAMP)
                    ON CONFLICT (resource_type, resource_path) 
                    DO UPDATE SET 
                        resource_name = EXCLUDED.resource_name,
                        module_name = EXCLUDED.module_name,
                        data_roles = EXCLUDED.data_roles,
                        last_scanned = CURRENT_TIMESTAMP";
            
            $stmt = $pg->prepare($sql);
            $stmt->execute([
                ':type' => $resource['type'],
                ':path' => $resource['path'],
                ':name' => $resource['name'],
                ':module' => $resource['module'],
                ':data_roles' => $resource['data_roles']
            ]);
            $updated_count++;
        } catch (Exception $e) {
            error_log("Error updating resource catalog: " . $e->getMessage());
        }
    }
    
    return $updated_count;
}

/**
 * Determinar el módulo al que pertenece un archivo basado en su ruta
 */
function determineModuleFromPath($file_path) {
    // Mapeo de rutas a módulos
    $module_mappings = [
        'm_admin/' => 'Administrador',
        'm_capacitaciones/' => 'Capacitaciones',
        'm_agronomia/' => 'Agronomía',
        'm_bascula/' => 'Báscula',
        'm_almacen/' => 'Almacén',
        'includes/roles.html' => 'Administrador',
        'sesiones.html' => 'Administrador',
        'Usuarios.html' => 'Usuarios'
    ];
    
    // Buscar coincidencia exacta o por prefijo
    foreach ($module_mappings as $path_pattern => $module_name) {
        if ($file_path === $path_pattern || strpos($file_path, $path_pattern) === 0) {
            return $module_name;
        }
    }
    
    // Si no coincide con ningún patrón, usar "General"
    return 'General';
}

/**
 * Extrae data-roles de un archivo HTML
 */
function extractDataRolesFromFile($file_path, $base_path) {
    $real_path = realpath($file_path);
    if ($real_path === false || strpos($real_path, $base_path) !== 0) {
        return '';
    }
    
    // Check file size (max 5MB)
    if (filesize($real_path) > 5 * 1024 * 1024) {
        return '';
    }
    
    $content = file_get_contents($real_path);
    if ($content === false) {
        return '';
    }
    
    $roles = [];
    
    // Buscar data-role en body
    if (preg_match('/<body[^>]*data-role=["\']([^"\']+)["\'][^>]*>/', $content, $matches)) {
        $roles = array_merge($roles, array_map('trim', explode(',', $matches[1])));
    }
    
    // Buscar otros data-role
    preg_match_all('/data-role=["\']([^"\']+)["\']/', $content, $matches);
    if (!empty($matches[1])) {
        foreach ($matches[1] as $match) {
            $roles = array_merge($roles, array_map('trim', explode(',', $match)));
        }
    }
    
    $roles = array_unique($roles);
    return implode(',', $roles);
}

/**
 * GET: Obtener recursos disponibles o permisos de un rol
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Actualizar catálogo de recursos (solo administradores)
    if (isset($_GET['update_catalog'])) {
        requireAdministrator($pg);
        
        try {
            $count = updateResourcesCatalog($pg);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true, 
                'message' => "Catálogo actualizado: $count recursos",
                'updated_count' => $count
            ]);
            exit;
        } catch (PDOException $e) {
            error_log("Error updating catalog: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar catálogo. Por favor intente nuevamente.']);
            exit;
        } catch (Exception $e) {
            error_log("Unexpected error updating catalog: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
            exit;
        }
    }
    
    // Obtener todos los recursos disponibles (desde el catálogo) - solo administradores
    if (isset($_GET['available'])) {
        requireAdministrator($pg);
        
        try {
            // Primero actualizar el catálogo
            updateResourcesCatalog($pg);
            
            // Obtener recursos del catálogo agrupados por módulo
            $sql = "SELECT resource_type, resource_path, resource_name, module_name, icon, data_roles
                    FROM adm_resources_catalog
                    WHERE is_active = TRUE AND resource_type = 'page'
                    ORDER BY module_name, resource_name";
            
            $stmt = $pg->query($sql);
            $all_resources = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Agrupar por módulo
            $modules = [];
            foreach ($all_resources as $resource) {
                $module = $resource['module_name'] ?: 'Otros';
                if (!isset($modules[$module])) {
                    $modules[$module] = [];
                }
                $modules[$module][] = [
                    'path' => $resource['resource_path'],
                    'name' => $resource['resource_name'],
                    'data_roles' => $resource['data_roles']
                ];
            }
            
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'modules' => $modules]);
            exit;
        } catch (PDOException $e) {
            error_log("Error fetching resources: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener recursos. Por favor intente nuevamente.']);
            exit;
        } catch (Exception $e) {
            error_log("Unexpected error fetching resources: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
            exit;
        }
    }
    
    // Obtener permisos de un rol específico - solo administradores
    if (isset($_GET['rol_id'])) {
        requireAdministrator($pg);
        
        $rol_id = intval($_GET['rol_id']);
        
        // Validar que el ID sea válido
        if ($rol_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de rol inválido.']);
            exit;
        }
        
        try {
            $sql = "SELECT resource_path FROM adm_role_permissions WHERE rol_id = :rol_id";
            $stmt = $pg->prepare($sql);
            $stmt->execute([':rol_id' => $rol_id]);
            $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'permissions' => $permissions]);
            exit;
        } catch (PDOException $e) {
            error_log("Error fetching permissions: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener permisos. Por favor intente nuevamente.']);
            exit;
        } catch (Exception $e) {
            error_log("Unexpected error fetching permissions: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
            exit;
        }
    }
    
    // Verificar si un usuario tiene permiso para una página
    // NOTA: Este endpoint NO requiere ser administrador, está disponible para todos los usuarios autenticados
    if (isset($_GET['check_access']) && isset($_GET['page'])) {
        $page = $_GET['page'];
        $usuario_id = $_SESSION['usuario_id'];
        
        // Log the request for debugging
        if (PERMISSIONS_DEBUG) {
            error_log("[permissions_api] Checking access for user_id: $usuario_id, page: $page");
        }
        
        // Páginas siempre accesibles (públicas)
        $public_pages = ['/', '/index.html', '/panel.html'];
        if (in_array($page, $public_pages)) {
            if (PERMISSIONS_DEBUG) {
                error_log("[permissions_api] Access granted (public page): $page");
            }
            echo json_encode(['success' => true, 'has_access' => true]);
            exit;
        }
        
        // Páginas de perfil de usuario (accesibles para todos los usuarios autenticados)
        $user_profile_pages = ['/Usuarios.html'];
        if (in_array($page, $user_profile_pages)) {
            if (PERMISSIONS_DEBUG) {
                error_log("[permissions_api] Access granted (user profile page): $page");
            }
            echo json_encode(['success' => true, 'has_access' => true]);
            exit;
        }
        
        try {
            // Obtener roles del usuario
            $sqlRoles = "SELECT r.id, r.nombre FROM adm_usuario_roles ur
                        JOIN adm_roles r ON ur.rol_id = r.id
                        WHERE ur.usuario_id = :usuario_id AND r.estado = 0";
            $stmtRoles = $pg->prepare($sqlRoles);
            $stmtRoles->execute([':usuario_id' => $usuario_id]);
            $user_roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);
            
            if (PERMISSIONS_DEBUG) {
                error_log("[permissions_api] User roles: " . json_encode(array_column($user_roles, 'nombre')));
            }
            
            if (empty($user_roles)) {
                if (PERMISSIONS_DEBUG) {
                    error_log("[permissions_api] Access denied (no roles): user_id $usuario_id");
                }
                echo json_encode(['success' => true, 'has_access' => false]);
                exit;
            }
            
            // Verificar si el usuario es administrador
            $is_admin = false;
            foreach ($user_roles as $role) {
                if (strcasecmp(trim($role['nombre']), 'administrador') === 0) {
                    $is_admin = true;
                    break;
                }
            }
            
            // Los administradores tienen acceso especial a páginas administrativas
            if ($is_admin) {
                if (PERMISSIONS_DEBUG) {
                    error_log("[permissions_api] User is administrator");
                }
                // NOTA: Esta lista también existe en assets/js/auth_guard.js
                // Mantener ambas listas sincronizadas al agregar/remover páginas administrativas
                $admin_paths = [
                    '/includes/roles.html',      // Gestión de roles
                    '/includes/web_main.html',   // Configuración web
                    '/sesiones.html',             // Gestión de sesiones
                    '/m_admin/',                  // Módulo administrativo
                    '/Usuarios.html'              // Gestión de usuarios
                ];
                
                foreach ($admin_paths as $admin_path) {
                    if ($page === $admin_path || strpos($page, $admin_path) === 0) {
                        if (PERMISSIONS_DEBUG) {
                            error_log("[permissions_api] Access granted (admin path): $page");
                        }
                        echo json_encode(['success' => true, 'has_access' => true]);
                        exit;
                    }
                }
            }
            
            // Verificar si alguno de los roles tiene permiso para esta página
            $role_ids = array_column($user_roles, 'id');
            
            // Validar que todos los IDs son enteros
            $role_ids = array_map('intval', $role_ids);
            $role_ids = array_filter($role_ids, function($id) { return $id > 0; });
            
            if (empty($role_ids)) {
                if (PERMISSIONS_DEBUG) {
                    error_log("[permissions_api] Access denied (invalid role IDs): user_id $usuario_id");
                }
                echo json_encode(['success' => true, 'has_access' => false]);
                exit;
            }
            
            if (PERMISSIONS_DEBUG) {
                error_log("[permissions_api] Checking permissions for role_ids: " . implode(',', $role_ids) . " and page: $page");
            }
            
            $placeholders = implode(',', array_fill(0, count($role_ids), '?'));
            
            // Check for exact match first
            $sqlPerm = "SELECT COUNT(*) as count FROM adm_role_permissions
                       WHERE rol_id IN ($placeholders) AND resource_path = ?";
            $stmtPerm = $pg->prepare($sqlPerm);
            $stmtPerm->execute(array_merge($role_ids, [$page]));
            $has_permission = $stmtPerm->fetch(PDO::FETCH_ASSOC)['count'] > 0;
            
            if ($has_permission && PERMISSIONS_DEBUG) {
                error_log("[permissions_api] Access granted (exact match): user_id $usuario_id, page: $page");
            }
            
            // If no exact match, try case-insensitive match
            if (!$has_permission) {
                $sqlPermCI = "SELECT COUNT(*) as count FROM adm_role_permissions
                             WHERE rol_id IN ($placeholders) AND LOWER(resource_path) = LOWER(?)";
                $stmtPermCI = $pg->prepare($sqlPermCI);
                $stmtPermCI->execute(array_merge($role_ids, [$page]));
                $has_permission = $stmtPermCI->fetch(PDO::FETCH_ASSOC)['count'] > 0;
                
                if ($has_permission && PERMISSIONS_DEBUG) {
                    error_log("[permissions_api] Access granted (case-insensitive match): user_id $usuario_id, page: $page");
                }
            }
            
            // If still no match, try matching by module path (if page is in a module directory)
            if (!$has_permission && preg_match('#^(/m_[^/]+/)#', $page, $matches)) {
                $module_path = $matches[1];
                $sqlPermModule = "SELECT COUNT(*) as count FROM adm_role_permissions
                                 WHERE rol_id IN ($placeholders) AND resource_type = 'module' AND resource_path = ?";
                $stmtPermModule = $pg->prepare($sqlPermModule);
                $stmtPermModule->execute(array_merge($role_ids, [$module_path]));
                $has_permission = $stmtPermModule->fetch(PDO::FETCH_ASSOC)['count'] > 0;
                
                if ($has_permission && PERMISSIONS_DEBUG) {
                    error_log("[permissions_api] Access granted (module permission): user_id $usuario_id, page: $page, module: $module_path");
                }
            }
            
            // Log for debugging (only in debug mode to avoid performance impact)
            if (!$has_permission && PERMISSIONS_DEBUG) {
                // Log which permissions this role actually has
                $sqlDebug = "SELECT resource_path FROM adm_role_permissions WHERE rol_id IN ($placeholders)";
                $stmtDebug = $pg->prepare($sqlDebug);
                $stmtDebug->execute($role_ids);
                $actual_permissions = $stmtDebug->fetchAll(PDO::FETCH_COLUMN);
                error_log("[permissions_api] Access denied for user $usuario_id to page: $page. Roles: " . implode(',', array_column($user_roles, 'nombre')) . ". Available permissions: " . implode(', ', $actual_permissions));
            }
            
            echo json_encode(['success' => true, 'has_access' => $has_permission]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al verificar acceso: ' . $e->getMessage()]);
            exit;
        }
    }
    
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parámetro inválido.']);
    exit;
}

/**
 * POST: Guardar permisos de un rol - solo administradores
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAdministrator($pg);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['rol_id']) || !isset($input['permissions'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID del rol y permisos son obligatorios.']);
        exit;
    }
    
    $rol_id = intval($input['rol_id']);
    $permissions = $input['permissions']; // Array de resource_paths
    
    // Validar que el ID sea válido
    if ($rol_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID de rol inválido.']);
        exit;
    }
    
    if (!is_array($permissions)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Los permisos deben ser un array.']);
        exit;
    }
    
    // Validar cantidad de permisos
    if (count($permissions) > 1000) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Demasiados permisos (máximo 1000).']);
        exit;
    }
    
    try {
        // Verificar que el rol existe
        $sql_exists = "SELECT COUNT(*) as count FROM adm_roles WHERE id = :id";
        $stmt_exists = $pg->prepare($sql_exists);
        $stmt_exists->execute([':id' => $rol_id]);
        if ($stmt_exists->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'El rol especificado no existe.']);
            exit;
        }
        
        // Iniciar transacción
        $pg->beginTransaction();
        
        // Eliminar permisos existentes del rol
        $sql_delete = "DELETE FROM adm_role_permissions WHERE rol_id = :rol_id";
        $stmt_delete = $pg->prepare($sql_delete);
        $stmt_delete->execute([':rol_id' => $rol_id]);
        
        // Insertar nuevos permisos
        $inserted_count = 0;
        if (!empty($permissions)) {
            foreach ($permissions as $resource_path) {
                // Validar formato de resource_path
                if (!is_string($resource_path) || strlen(trim($resource_path)) == 0) {
                    continue; // Skip invalid paths
                }
                
                // Obtener información del recurso del catálogo
                $sql_resource = "SELECT resource_name, module_name FROM adm_resources_catalog
                                WHERE resource_path = :path AND is_active = TRUE
                                LIMIT 1";
                $stmt_resource = $pg->prepare($sql_resource);
                $stmt_resource->execute([':path' => trim($resource_path)]);
                $resource_info = $stmt_resource->fetch(PDO::FETCH_ASSOC);
                
                if ($resource_info) {
                    $sql_insert = "INSERT INTO adm_role_permissions 
                                  (rol_id, resource_type, resource_path, resource_name, module_name) 
                                  VALUES (:rol_id, 'page', :path, :name, :module)";
                    $stmt_insert = $pg->prepare($sql_insert);
                    $stmt_insert->execute([
                        ':rol_id' => $rol_id,
                        ':path' => trim($resource_path),
                        ':name' => $resource_info['resource_name'],
                        ':module' => $resource_info['module_name']
                    ]);
                    $inserted_count++;
                }
            }
        }
        
        // Confirmar transacción
        $pg->commit();
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true, 
            'message' => 'Permisos actualizados exitosamente.',
            'count' => $inserted_count
        ]);
        exit;
    } catch (PDOException $e) {
        // Revertir transacción en caso de error
        if ($pg->inTransaction()) {
            $pg->rollBack();
        }
        error_log("Error updating permissions: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar permisos. Por favor intente nuevamente.']);
        exit;
    } catch (Exception $e) {
        // Revertir transacción en caso de error
        if ($pg->inTransaction()) {
            $pg->rollBack();
        }
        error_log("Unexpected error updating permissions: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error inesperado. Por favor intente nuevamente.']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
