<?php
/**
 * Rate Limiter
 * Protege contra ataques de fuerza bruta limitando intentos por IP
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

class RateLimiter {
    private $pg;
    private $max_attempts;
    private $window_minutes;
    private $block_duration_minutes;
    
    /**
     * @param PDO $pg Conexión a base de datos
     * @param int $max_attempts Máximo de intentos permitidos
     * @param int $window_minutes Ventana de tiempo en minutos
     * @param int $block_duration_minutes Duración del bloqueo en minutos
     */
    public function __construct($pg, $max_attempts = 5, $window_minutes = 15, $block_duration_minutes = 30) {
        $this->pg = $pg;
        $this->max_attempts = $max_attempts;
        $this->window_minutes = $window_minutes;
        $this->block_duration_minutes = $block_duration_minutes;
    }
    
    /**
     * Verificar si una IP está bloqueada
     * @param string $ip_address Dirección IP
     * @param string $action Acción a verificar (ej: 'login_admin', 'login_colaborador')
     * @return array ['blocked' => bool, 'remaining_time' => int|null, 'message' => string]
     */
    public function checkRateLimit($ip_address, $action = 'login') {
        try {
            // Verificar si existe un bloqueo activo
            $stmt = $this->pg->prepare("
                SELECT blocked_until 
                FROM adm_rate_limits 
                WHERE ip_address = :ip 
                AND action = :action 
                AND blocked_until > NOW()
                LIMIT 1
            ");
            $stmt->execute([':ip' => $ip_address, ':action' => $action]);
            $block = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($block) {
                $remaining = strtotime($block['blocked_until']) - time();
                return [
                    'blocked' => true,
                    'remaining_time' => $remaining,
                    'message' => 'Demasiados intentos fallidos. Intente nuevamente en ' . ceil($remaining / 60) . ' minutos.'
                ];
            }
            
            // Contar intentos fallidos recientes
            $stmt = $this->pg->prepare("
                SELECT COUNT(*) as attempt_count
                FROM adm_intentos_login
                WHERE ip_address = :ip
                AND exitoso = FALSE
                AND fecha_intento > NOW() - INTERVAL '" . intval($this->window_minutes) . " minutes'
            ");
            $stmt->execute([':ip' => $ip_address]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $attempts = $result['attempt_count'] ?? 0;
            
            if ($attempts >= $this->max_attempts) {
                // Bloquear IP
                $this->blockIP($ip_address, $action);
                
                return [
                    'blocked' => true,
                    'remaining_time' => $this->block_duration_minutes * 60,
                    'message' => 'Demasiados intentos fallidos. Su IP ha sido bloqueada temporalmente por ' . $this->block_duration_minutes . ' minutos.'
                ];
            }
            
            $remaining_attempts = $this->max_attempts - $attempts;
            return [
                'blocked' => false,
                'remaining_attempts' => $remaining_attempts,
                'message' => 'Acceso permitido'
            ];
            
        } catch (PDOException $e) {
            error_log("Rate limiter error: " . $e->getMessage());
            // En caso de error, permitir acceso pero registrar
            return [
                'blocked' => false,
                'message' => 'Error al verificar límite de tasa'
            ];
        }
    }
    
    /**
     * Bloquear una IP
     */
    private function blockIP($ip_address, $action) {
        try {
            $duration = intval($this->block_duration_minutes);
            $stmt = $this->pg->prepare("
                INSERT INTO adm_rate_limits (ip_address, action, blocked_until, attempt_count)
                VALUES (:ip, :action, NOW() + INTERVAL '" . $duration . " minutes', :attempts)
                ON CONFLICT (ip_address, action) 
                DO UPDATE SET 
                    blocked_until = NOW() + INTERVAL '" . $duration . " minutes',
                    attempt_count = adm_rate_limits.attempt_count + 1,
                    last_attempt = NOW()
            ");
            $stmt->execute([
                ':ip' => $ip_address,
                ':action' => $action,
                ':attempts' => $this->max_attempts
            ]);
        } catch (PDOException $e) {
            error_log("Error al bloquear IP: " . $e->getMessage());
        }
    }
    
    /**
     * Registrar intento exitoso y limpiar bloqueos
     */
    public function recordSuccess($ip_address, $action = 'login') {
        try {
            // Eliminar bloqueos para esta IP
            $stmt = $this->pg->prepare("
                DELETE FROM adm_rate_limits 
                WHERE ip_address = :ip AND action = :action
            ");
            $stmt->execute([':ip' => $ip_address, ':action' => $action]);
        } catch (PDOException $e) {
            error_log("Error al limpiar rate limit: " . $e->getMessage());
        }
    }
    
    /**
     * Limpiar bloqueos expirados (mantenimiento)
     */
    public function cleanupExpiredBlocks() {
        try {
            $stmt = $this->pg->prepare("
                DELETE FROM adm_rate_limits 
                WHERE blocked_until < NOW()
            ");
            $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al limpiar bloqueos expirados: " . $e->getMessage());
        }
    }
}
