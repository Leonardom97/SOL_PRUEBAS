<?php
/**
 * CSRF Protection Module
 * Provides token generation and validation for forms
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

class CSRFProtection {
    private static $tokenName = 'csrf_token';
    private static $tokenLifetime = 3600; // 1 hour
    
    /**
     * Generate a new CSRF token
     * @return string The generated token
     */
    public static function generateToken() {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        
        $token = bin2hex(random_bytes(32));
        $_SESSION[self::$tokenName] = $token;
        $_SESSION[self::$tokenName . '_time'] = time();
        
        return $token;
    }
    
    /**
     * Get the current CSRF token, generate if not exists
     * @return string The current token
     */
    public static function getToken() {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        
        // Check if token exists and is not expired
        if (isset($_SESSION[self::$tokenName]) && isset($_SESSION[self::$tokenName . '_time'])) {
            $age = time() - $_SESSION[self::$tokenName . '_time'];
            if ($age < self::$tokenLifetime) {
                return $_SESSION[self::$tokenName];
            }
        }
        
        // Generate new token if expired or doesn't exist
        return self::generateToken();
    }
    
    /**
     * Validate CSRF token from request
     * @param string|null $token The token to validate (if null, checks POST/GET)
     * @return bool True if valid, false otherwise
     */
    public static function validateToken($token = null) {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        
        // Get token from parameter or request
        if ($token === null) {
            $token = $_POST[self::$tokenName] ?? $_GET[self::$tokenName] ?? 
                     $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        }
        
        // Check if session token exists
        if (!isset($_SESSION[self::$tokenName]) || !isset($_SESSION[self::$tokenName . '_time'])) {
            return false;
        }
        
        // Check token age
        $age = time() - $_SESSION[self::$tokenName . '_time'];
        if ($age >= self::$tokenLifetime) {
            return false;
        }
        
        // Validate token using timing-safe comparison
        return hash_equals($_SESSION[self::$tokenName], $token);
    }
    
    /**
     * Require valid CSRF token or terminate with 403
     * @param string|null $token Optional token to validate
     */
    public static function requireToken($token = null) {
        if (!self::validateToken($token)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Token CSRF inválido o expirado'
            ]);
            exit;
        }
    }
    
    /**
     * Get HTML input field for CSRF token
     * @return string HTML input element
     */
    public static function getTokenField() {
        $token = self::getToken();
        return '<input type="hidden" name="' . self::$tokenName . '" value="' . htmlspecialchars($token) . '">';
    }
    
    /**
     * Get token meta tag for use in JavaScript
     * @return string HTML meta tag
     */
    public static function getTokenMeta() {
        $token = self::getToken();
        return '<meta name="csrf-token" content="' . htmlspecialchars($token) . '">';
    }
}
