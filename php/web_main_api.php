<?php

/**
 * API de Configuración Principal Web
 * Gestiona la configuración del sitio web (título, pie de página, icono, colores del tema)
 * Acceso: Solo rol Administrador
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db_postgres.php';
require_once __DIR__ . '/audit_logger.php';

$logger = new AuditLogger();

$method = $_SERVER['REQUEST_METHOD'];

// Permitir solicitudes GET para leer configuración (acceso público)
// Requerir autenticación solo para POST/PUT (operaciones de escritura)
$requiresAuth = ($method !== 'GET');

if ($requiresAuth) {
    // Verificar si el usuario ha iniciado sesión y tiene rol de administrador
    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }

    // Solo permitir acceso a operaciones de escritura a los administradores
    if (($_SESSION['rol_nombre'] ?? '') !== 'Administrador' && ($_SESSION['rol_nombre'] ?? '') !== 'administrador') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Acceso denegado. Solo administradores pueden gestionar la configuración.']);
        exit;
    }
}

try {
    switch ($method) {
        case 'GET':
            handleGet($pg);
            break;
        case 'POST':
            handlePost($pg, $logger);
            break;
        case 'PUT':
            handlePut($pg, $logger);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}

/**
 * Obtener configuración web
 */
function handleGet($pg)
{
    $action = $_GET['action'] ?? 'get_active';

    switch ($action) {
        case 'get_active':
            // Obtener configuración activa
            $stmt = $pg->prepare("SELECT * FROM adm_webmain WHERE is_active = true LIMIT 1");
            $stmt->execute();
            $config = $stmt->fetch();

            if (!$config) {
                // Retornar valores por defecto si no hay configuración activa
                $config = [
                    'id' => 0,
                    'site_title' => 'OSM',
                    'footer_text' => '© OSM 2025',
                    'favicon_path' => 'assets/img/Sin título-2.png',
                    'login_image_path' => 'assets/img/ico.jpg',
                    'login_image_day_path' => 'assets/img/ico.jpg',
                    'login_image_night_path' => 'assets/img/ico.jpg',
                    'effect_type' => 'oil',
                    'effect_speed' => 5,
                    'primary_color' => '#772e22',
                    'is_active' => true,
                    'theme_name' => 'Default',
                    'custom_leaf_path' => null,
                    'custom_snow_path' => null
                ];
            }

            echo json_encode(['success' => true, 'data' => $config]);
            break;

        case 'get_all':
            // Obtener todos los temas guardados (máx 3)
            $stmt = $pg->prepare("SELECT * FROM adm_webmain ORDER BY created_at DESC LIMIT 3");
            $stmt->execute();
            $themes = $stmt->fetchAll();

            echo json_encode(['success' => true, 'data' => $themes]);
            break;

        case 'get_by_id':
            $id = $_GET['id'] ?? 0;
            $stmt = $pg->prepare("SELECT * FROM adm_webmain WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $config = $stmt->fetch();

            if ($config) {
                echo json_encode(['success' => true, 'data' => $config]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Configuración no encontrada']);
            }
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
            break;
    }
}

/**
 * Crear nueva configuración web
 */
function handlePost($pg, $logger)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        return;
    }

    // Verificar si ya tenemos 3 temas
    $stmt = $pg->prepare("SELECT COUNT(*) as count FROM adm_webmain");
    $stmt->execute();
    $result = $stmt->fetch();

    if ($result['count'] >= 3) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Máximo 3 temas permitidos. Elimine uno para crear otro.']);
        return;
    }

    // Si se establece como activo, desactivar todos los demás
    if (isset($data['is_active']) && $data['is_active']) {
        $stmt = $pg->prepare("UPDATE adm_webmain SET is_active = false");
        $stmt->execute();
    }

    $stmt = $pg->prepare("
        INSERT INTO adm_webmain 
        (site_title, footer_text, favicon_path, login_image_path, login_image_day_path, login_image_night_path, effect_type, effect_speed, primary_color, is_active, theme_name) 
        VALUES (:site_title, :footer_text, :favicon_path, :login_image_path, :login_image_day_path, :login_image_night_path, :effect_type, :effect_speed, :primary_color, :is_active, :theme_name)
        RETURNING id
    ");

    $stmt->execute([
        'site_title' => $data['site_title'] ?? 'OSM',
        'footer_text' => $data['footer_text'] ?? '© OSM 2025',
        'favicon_path' => $data['favicon_path'] ?? 'assets/img/Sin título-2.png',
        'login_image_path' => $data['login_image_path'] ?? 'assets/img/ico.jpg',
        'login_image_day_path' => $data['login_image_day_path'] ?? 'assets/img/ico.jpg',
        'login_image_night_path' => $data['login_image_night_path'] ?? 'assets/img/ico.jpg',
        'effect_type' => $data['effect_type'] ?? 'oil',
        'effect_speed' => $data['effect_speed'] ?? 5,
        'primary_color' => $data['primary_color'] ?? '#772e22',
        'is_active' => $data['is_active'] ?? false,
        'theme_name' => $data['theme_name'] ?? 'Nuevo Tema',
        'custom_leaf_path' => $data['custom_leaf_path'] ?? null,
        'custom_snow_path' => $data['custom_snow_path'] ?? null
    ]);

    $result = $stmt->fetch();

    // AUDIT LOG
    $logger->log(
        $_SESSION['usuario_id'],
        $_SESSION['tipo_usuario'] ?? 'colaborador',
        'CREATE_WEB_CONFIG',
        'Creación de nueva configuración web',
        ['config_id' => $result['id'], 'theme_name' => $data['theme_name'] ?? 'Nuevo Tema']
    );

    echo json_encode(['success' => true, 'message' => 'Configuración creada exitosamente', 'id' => $result['id']]);
}

/**
 * Actualizar configuración web
 */
function handlePut($pg, $logger)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requerido']);
        return;
    }

    // Si se establece como activo, desactivar todos los demás
    if (isset($data['is_active']) && $data['is_active']) {
        $stmt = $pg->prepare("UPDATE adm_webmain SET is_active = false WHERE id != :id");
        $stmt->execute(['id' => $data['id']]);
    }

    $stmt = $pg->prepare("
        UPDATE adm_webmain 
        SET site_title = :site_title,
            footer_text = :footer_text,
            favicon_path = :favicon_path,
            login_image_path = :login_image_path,
            login_image_day_path = :login_image_day_path,
            login_image_night_path = :login_image_night_path,
            effect_type = :effect_type,
            effect_speed = :effect_speed,
            primary_color = :primary_color,
            is_active = :is_active,
            theme_name = :theme_name,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");

    $result = $stmt->execute([
        'id' => $data['id'],
        'site_title' => $data['site_title'],
        'footer_text' => $data['footer_text'],
        'favicon_path' => $data['favicon_path'],
        'login_image_path' => $data['login_image_path'],
        'login_image_day_path' => $data['login_image_day_path'],
        'login_image_night_path' => $data['login_image_night_path'],
        'effect_type' => $data['effect_type'],
        'effect_speed' => $data['effect_speed'],
        'primary_color' => $data['primary_color'],
        'is_active' => $data['is_active'],
        'theme_name' => $data['theme_name']
    ]);

    if ($result) {
        // Check if any row was actually updated
        if ($stmt->rowCount() > 0) {
            // AUDIT LOG
            $logger->log(
                $_SESSION['usuario_id'],
                $_SESSION['tipo_usuario'] ?? 'colaborador',
                'UPDATE_WEB_CONFIG',
                'Actualización de configuración web',
                ['config_id' => $data['id'], 'is_active' => $data['is_active']]
            );

            echo json_encode(['success' => true, 'message' => 'Configuración actualizada exitosamente']);
        } else {
            // Success but 0 rows updated means ID not found
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'No se encontró la configuración para actualizar. intente recargar.']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar configuración']);
    }
}
