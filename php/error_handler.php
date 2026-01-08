<?php
/**
 * Sistema Centralizado de Manejo de Errores
 * Proporciona códigos de error consistentes y mensajes apropiados
 */

class ErrorResponse {
    // Códigos de error estandarizados
    const ERR_UNAUTHORIZED = 'UNAUTHORIZED';
    const ERR_FORBIDDEN = 'FORBIDDEN';
    const ERR_NOT_FOUND = 'NOT_FOUND';
    const ERR_VALIDATION = 'VALIDATION_ERROR';
    const ERR_DUPLICATE = 'DUPLICATE_ENTRY';
    const ERR_IN_USE = 'RESOURCE_IN_USE';
    const ERR_DATABASE = 'DATABASE_ERROR';
    const ERR_NETWORK = 'NETWORK_ERROR';
    const ERR_UNKNOWN = 'UNKNOWN_ERROR';
    
    /**
     * Enviar respuesta de error JSON
     * 
     * @param string $errorCode Código de error de la clase
     * @param string $message Mensaje amigable para el usuario
     * @param int $httpCode Código HTTP
     * @param string $userAction Acción sugerida para el usuario (opcional)
     * @param mixed $debugInfo Información adicional de debug (solo si DEBUG activo)
     */
    public static function send($errorCode, $message, $httpCode = 500, $userAction = null, $debugInfo = null) {
        header('Content-Type: application/json');
        http_response_code($httpCode);
        
        $response = [
            'success' => false,
            'error' => $errorCode,
            'message' => $message
        ];
        
        if ($userAction) {
            $response['userAction'] = $userAction;
        }
        
        // Solo incluir debugInfo si DEBUG está activo o en desarrollo
        // Verifica múltiples posibles configuraciones de debug
        $isDebugMode = (defined('ENABLE_DEBUG') && ENABLE_DEBUG) || 
                       (defined('DEBUG') && DEBUG) ||
                       (getenv('DEBUG') === 'true') ||
                       (isset($_ENV['DEBUG']) && $_ENV['DEBUG'] === 'true');
        
        if ($debugInfo && $isDebugMode) {
            $response['debugInfo'] = $debugInfo;
        }
        
        echo json_encode($response);
        exit;
    }
    
    /**
     * Enviar respuesta de éxito JSON
     */
    public static function success($message, $data = null) {
        header('Content-Type: application/json');
        http_response_code(200);
        
        $response = [
            'success' => true,
            'message' => $message
        ];
        
        if ($data !== null) {
            $response = array_merge($response, $data);
        }
        
        echo json_encode($response);
        exit;
    }
    
    /**
     * Manejadores de errores comunes
     */
    public static function unauthorized($message = 'Sesión no iniciada. Por favor inicie sesión.') {
        self::send(self::ERR_UNAUTHORIZED, $message, 401);
    }
    
    public static function forbidden($message = 'No tiene permisos para realizar esta operación.') {
        self::send(
            self::ERR_FORBIDDEN, 
            $message, 
            403,
            'Contacte al administrador del sistema si necesita acceso.'
        );
    }
    
    public static function notFound($resource = 'recurso') {
        self::send(
            self::ERR_NOT_FOUND, 
            "El $resource especificado no existe.", 
            404,
            'Verifique que el ID sea correcto.'
        );
    }
    
    public static function validation($message) {
        self::send(self::ERR_VALIDATION, $message, 400);
    }
    
    public static function duplicate($resource = 'recurso') {
        self::send(
            self::ERR_DUPLICATE, 
            "Ya existe un $resource con esos datos.", 
            409,
            'Use un nombre o identificador diferente.'
        );
    }
    
    public static function inUse($resource = 'recurso', $dependency = '') {
        $msg = "No se puede eliminar el $resource";
        if ($dependency) {
            $msg .= " porque está en uso por $dependency";
        }
        $msg .= ".";
        
        self::send(
            self::ERR_IN_USE, 
            $msg, 
            409,
            'Elimine primero las dependencias antes de eliminar este recurso.'
        );
    }
    
    public static function database($userMessage = 'Error de base de datos.', $debugInfo = null) {
        self::send(
            self::ERR_DATABASE, 
            $userMessage, 
            500,
            'Por favor intente nuevamente. Si el problema persiste, contacte al administrador.',
            $debugInfo
        );
    }
    
    public static function network($message = 'Error de conexión.') {
        self::send(
            self::ERR_NETWORK, 
            $message, 
            503,
            'Verifique su conexión a Internet y que el servidor esté disponible.'
        );
    }
    
    public static function unknown($message = 'Error inesperado.', $debugInfo = null) {
        self::send(
            self::ERR_UNKNOWN, 
            $message, 
            500,
            'Por favor intente nuevamente. Si el problema persiste, contacte al soporte técnico.',
            $debugInfo
        );
    }
    
    /**
     * Registrar error en log del servidor (sin exponer al cliente)
     */
    public static function log($context, $message, $exception = null) {
        $logMessage = "[$context] $message";
        if ($exception instanceof Exception) {
            $logMessage .= " | Exception: " . $exception->getMessage();
            $logMessage .= " | File: " . $exception->getFile();
            $logMessage .= " | Line: " . $exception->getLine();
        }
        error_log($logMessage);
    }
}
