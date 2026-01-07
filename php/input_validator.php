<?php
/**
 * Input Validator
 * Proporciona funciones de validación y sanitización de entrada
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

class InputValidator {
    
    /**
     * Validar y sanitizar cédula
     * @param string $cedula
     * @return array ['valid' => bool, 'value' => string|null, 'error' => string|null]
     */
    public static function validateCedula($cedula) {
        $cedula = trim($cedula);
        
        // Verificar longitud
        if (strlen($cedula) < 6 || strlen($cedula) > 20) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'La cédula debe tener entre 6 y 20 caracteres'
            ];
        }
        
        // Permitir solo números y guiones
        if (!preg_match('/^[0-9\-]+$/', $cedula)) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'La cédula solo puede contener números y guiones'
            ];
        }
        
        return [
            'valid' => true,
            'value' => $cedula,
            'error' => null
        ];
    }
    
    /**
     * Validar contraseña
     * @param string $password
     * @param bool $requireStrong Requiere contraseña fuerte
     * @return array ['valid' => bool, 'value' => string|null, 'error' => string|null]
     */
    public static function validatePassword($password, $requireStrong = false) {
        if (strlen($password) < 4) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'La contraseña debe tener al menos 4 caracteres'
            ];
        }
        
        if (strlen($password) > 255) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'La contraseña es demasiado larga'
            ];
        }
        
        if ($requireStrong) {
            // Verificar complejidad: al menos una mayúscula, una minúscula, un número
            if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/', $password)) {
                return [
                    'valid' => false,
                    'value' => null,
                    'error' => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
                ];
            }
        }
        
        return [
            'valid' => true,
            'value' => $password,
            'error' => null
        ];
    }
    
    /**
     * Validar nombre de usuario
     * @param string $username
     * @return array ['valid' => bool, 'value' => string|null, 'error' => string|null]
     */
    public static function validateUsername($username) {
        $username = trim($username);
        
        if (strlen($username) < 3 || strlen($username) > 50) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'El nombre de usuario debe tener entre 3 y 50 caracteres'
            ];
        }
        
        // Permitir letras, números, guiones y guiones bajos
        if (!preg_match('/^[a-zA-Z0-9\-_]+$/', $username)) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'
            ];
        }
        
        return [
            'valid' => true,
            'value' => $username,
            'error' => null
        ];
    }
    
    /**
     * Sanitizar string general
     * @param string $input
     * @param int $maxLength
     * @return string
     */
    public static function sanitizeString($input, $maxLength = 255) {
        $input = trim($input);
        $input = substr($input, 0, $maxLength);
        return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Validar email
     * @param string $email
     * @return array ['valid' => bool, 'value' => string|null, 'error' => string|null]
     */
    public static function validateEmail($email) {
        $email = trim($email);
        $email = filter_var($email, FILTER_SANITIZE_EMAIL);
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'Dirección de email inválida'
            ];
        }
        
        return [
            'valid' => true,
            'value' => $email,
            'error' => null
        ];
    }
    
    /**
     * Validar entero
     * @param mixed $value
     * @param int $min
     * @param int $max
     * @return array ['valid' => bool, 'value' => int|null, 'error' => string|null]
     */
    public static function validateInteger($value, $min = null, $max = null) {
        if (!is_numeric($value)) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'El valor debe ser numérico'
            ];
        }
        
        $intValue = intval($value);
        
        if ($min !== null && $intValue < $min) {
            return [
                'valid' => false,
                'value' => null,
                'error' => "El valor debe ser mayor o igual a $min"
            ];
        }
        
        if ($max !== null && $intValue > $max) {
            return [
                'valid' => false,
                'value' => null,
                'error' => "El valor debe ser menor o igual a $max"
            ];
        }
        
        return [
            'valid' => true,
            'value' => $intValue,
            'error' => null
        ];
    }
    
    /**
     * Validar y sanitizar JSON
     * @param string $json
     * @return array ['valid' => bool, 'value' => mixed|null, 'error' => string|null]
     */
    public static function validateJSON($json) {
        $decoded = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'JSON inválido: ' . json_last_error_msg()
            ];
        }
        
        return [
            'valid' => true,
            'value' => $decoded,
            'error' => null
        ];
    }
    
    /**
     * Prevenir ataques de path traversal en rutas de archivo
     * @param string $path
     * @param string $baseDir Directorio base permitido
     * @return array ['valid' => bool, 'value' => string|null, 'error' => string|null]
     */
    public static function validateFilePath($path, $baseDir = null) {
        // Eliminar caracteres peligrosos
        $path = str_replace(['../', '..\\', chr(0)], '', $path);
        
        // Si se proporciona un directorio base, verificar que la ruta esté dentro de él
        if ($baseDir !== null) {
            $realBase = realpath($baseDir);
            $realPath = realpath($baseDir . '/' . $path);
            
            if ($realPath === false || strpos($realPath, $realBase) !== 0) {
                return [
                    'valid' => false,
                    'value' => null,
                    'error' => 'Ruta de archivo inválida o insegura'
                ];
            }
        }
        
        return [
            'valid' => true,
            'value' => $path,
            'error' => null
        ];
    }
    
    /**
     * Validar dirección IP
     * @param string $ip
     * @return array ['valid' => bool, 'value' => string|null, 'error' => string|null]
     */
    public static function validateIP($ip) {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'Dirección IP inválida'
            ];
        }
        
        return [
            'valid' => true,
            'value' => $ip,
            'error' => null
        ];
    }
    
    /**
     * Obtener IP del cliente de forma segura
     * @return string
     */
    public static function getClientIP() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        
        // Si está detrás de un proxy, intentar obtener la IP real
        // ADVERTENCIA: Estos headers pueden ser falsificados, úsalos solo si confías en tu proxy
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            $ip = $_SERVER['HTTP_X_REAL_IP'];
        }
        
        $validated = self::validateIP(trim($ip));
        return $validated['valid'] ? $validated['value'] : '0.0.0.0';
    }
}
