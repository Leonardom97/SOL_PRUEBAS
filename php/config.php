<?php
/**
 * Configuration Loader
 * Loads environment variables from .env file or system environment
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

/**
 * Load environment variables from .env file if it exists
 */
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse KEY=VALUE format
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            if (preg_match('/^(["\'])(.*)\1$/', $value, $matches)) {
                $value = $matches[2];
            }
            
            // Only set if not already set in environment
            if (!getenv($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }
    return true;
}

// Try to load .env file from parent directory
$envPath = __DIR__ . '/../.env';
loadEnv($envPath);

/**
 * Get environment variable with fallback
 * @param string $key Environment variable name
 * @param mixed $default Default value if not found
 * @return mixed
 */
function env($key, $default = null) {
    $value = getenv($key);
    if ($value === false) {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? $default;
    }
    
    // Convert string booleans to actual booleans
    if (is_string($value)) {
        $lower = strtolower($value);
        if ($lower === 'true' || $lower === '(true)') {
            return true;
        }
        if ($lower === 'false' || $lower === '(false)') {
            return false;
        }
        if ($lower === 'null' || $lower === '(null)') {
            return null;
        }
    }
    
    return $value;
}

// Configuration constants
define('DB_PG_HOST', env('DB_PG_HOST', 'localhost'));
define('DB_PG_PORT', env('DB_PG_PORT', '5432'));
define('DB_PG_NAME', env('DB_PG_NAME', 'osm2'));
define('DB_PG_USER', env('DB_PG_USER', 'postgres'));
define('DB_PG_PASSWORD', env('DB_PG_PASSWORD', ''));

define('DB_SQLSRV_HOST', env('DB_SQLSRV_HOST', ''));
define('DB_SQLSRV_PORT', env('DB_SQLSRV_PORT', '1433'));
define('DB_SQLSRV_NAME', env('DB_SQLSRV_NAME', ''));
define('DB_SQLSRV_USER', env('DB_SQLSRV_USER', ''));
define('DB_SQLSRV_PASSWORD', env('DB_SQLSRV_PASSWORD', ''));

define('SESSION_TIMEOUT', env('SESSION_TIMEOUT', 3600));
define('UPLOAD_MAX_SIZE', env('UPLOAD_MAX_SIZE', 5242880));
define('ENABLE_DEBUG', env('ENABLE_DEBUG', false));
