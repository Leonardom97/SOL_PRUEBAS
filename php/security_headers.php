<?php
/**
 * Security Headers Configuration
 * Apply secure HTTP headers to all responses
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

/**
 * Apply security headers to the response
 * Call this function at the beginning of your PHP scripts
 */
function apply_security_headers() {
    // Prevent clickjacking attacks
    header("X-Frame-Options: SAMEORIGIN");
    
    // Prevent MIME type sniffing
    header("X-Content-Type-Options: nosniff");
    
    // Enable browser XSS protection
    header("X-XSS-Protection: 1; mode=block");
    
    // Referrer policy - only send origin for cross-origin requests
    header("Referrer-Policy: strict-origin-when-cross-origin");
    
    // Content Security Policy
    // Adjust this policy based on your application needs
    $csp = "default-src 'self'; " .
           "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " .
           "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " .
           "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " .
           "img-src 'self' data: https:; " .
           "connect-src 'self'; " .
           "frame-ancestors 'self'; " .
           "base-uri 'self'; " .
           "form-action 'self'";
    header("Content-Security-Policy: $csp");
    
    // Strict-Transport-Security (HSTS)
    // Only enable this if your site is fully HTTPS
    // Uncomment the following line when ready for production with HTTPS
    // header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
    
    // Permissions Policy (formerly Feature-Policy)
    header("Permissions-Policy: geolocation=(), microphone=(), camera=()");
}

/**
 * Disable error display in production
 */
function configure_error_handling() {
    require_once __DIR__ . '/config.php';
    
    if (ENABLE_DEBUG) {
        // Development mode - show errors
        error_reporting(E_ALL);
        ini_set('display_errors', '1');
    } else {
        // Production mode - hide errors, log them instead
        error_reporting(E_ALL);
        ini_set('display_errors', '0');
        ini_set('log_errors', '1');
        
        // Set error log path
        $logPath = __DIR__ . '/../logs/php_errors.log';
        $logDir = dirname($logPath);
        
        if (!file_exists($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        
        if (is_writable($logDir)) {
            ini_set('error_log', $logPath);
        }
    }
}

// Auto-apply on include
apply_security_headers();
configure_error_handling();
