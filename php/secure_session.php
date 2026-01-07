<?php
/**
 * Secure Session Configuration
 * Configura las sesiones PHP con las mejores prácticas de seguridad
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

/**
 * Configurar sesión segura
 * Debe llamarse ANTES de session_start()
 */
function configure_secure_session() {
    // No iniciar sesión si ya está iniciada
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    
    // Configurar nombre de sesión personalizado (no usar PHPSESSID por defecto)
    session_name('OSM_SESSION');
    
    // Configurar parámetros de cookie de sesión
    $cookieParams = [
        'lifetime' => 0, // Sesión expira al cerrar navegador
        'path' => '/',
        'domain' => '', // Dejar vacío para usar dominio actual
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', // Solo HTTPS si está disponible
        'httponly' => true, // Prevenir acceso JavaScript a cookie de sesión
        'samesite' => 'Strict' // Protección CSRF adicional
    ];
    
    session_set_cookie_params($cookieParams);
    
    // Configurar directiva de garbage collection
    ini_set('session.gc_probability', 1);
    ini_set('session.gc_divisor', 100);
    ini_set('session.gc_maxlifetime', 3600); // 1 hora
    
    // Usar solo cookies para ID de sesión (no URL)
    ini_set('session.use_only_cookies', 1);
    ini_set('session.use_trans_sid', 0);
    
    // Prevenir fijación de sesión
    ini_set('session.use_strict_mode', 1);
    
    // Configurar directorio de almacenamiento de sesión (opcional)
    // ini_set('session.save_path', '/path/to/secure/sessions');
}

/**
 * Regenerar ID de sesión de forma segura
 * Previene ataques de fijación de sesión
 */
function regenerate_session_id() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
}

/**
 * Validar sesión contra fingerprinting
 * Detecta cambios sospechosos en el navegador
 */
function validate_session_fingerprint() {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return false;
    }
    
    $current_fingerprint = generate_fingerprint();
    
    // Primera vez - guardar fingerprint
    if (!isset($_SESSION['_fingerprint'])) {
        $_SESSION['_fingerprint'] = $current_fingerprint;
        return true;
    }
    
    // Validar fingerprint
    if ($_SESSION['_fingerprint'] !== $current_fingerprint) {
        // Fingerprint no coincide - posible secuestro de sesión
        return false;
    }
    
    return true;
}

/**
 * Generar fingerprint del navegador
 */
function generate_fingerprint() {
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $accept_language = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
    $accept_encoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
    
    return hash('sha256', $user_agent . $accept_language . $accept_encoding);
}

/**
 * Validar tiempo de inactividad de sesión
 * @param int $timeout Tiempo máximo de inactividad en segundos
 */
function validate_session_timeout($timeout = 3600) {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return false;
    }
    
    // Primera vez - establecer timestamp
    if (!isset($_SESSION['_last_activity'])) {
        $_SESSION['_last_activity'] = time();
        return true;
    }
    
    $elapsed = time() - $_SESSION['_last_activity'];
    
    if ($elapsed > $timeout) {
        // Sesión expirada por inactividad
        return false;
    }
    
    // Actualizar timestamp de actividad
    $_SESSION['_last_activity'] = time();
    return true;
}

/**
 * Destruir sesión de forma segura
 */
function destroy_session_secure() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        // Limpiar variables de sesión
        $_SESSION = [];
        
        // Destruir cookie de sesión
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
        
        // Destruir sesión
        session_destroy();
    }
}

/**
 * Iniciar sesión segura
 * Wrapper que configura e inicia la sesión con validaciones
 */
function start_secure_session($timeout = 3600) {
    configure_secure_session();
    
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    
    // Validar fingerprint del navegador
    if (!validate_session_fingerprint()) {
        destroy_session_secure();
        return false;
    }
    
    // Validar timeout de inactividad
    if (!validate_session_timeout($timeout)) {
        destroy_session_secure();
        return false;
    }
    
    return true;
}
