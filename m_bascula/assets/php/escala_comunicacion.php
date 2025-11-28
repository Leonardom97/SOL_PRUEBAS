<?php
/**
 * Scale Hardware Communication Class
 * Handles TCP/IP communication with weighing scale at 192.168.0.35
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

class EscalaComunicacion {
    private $scaleIP;
    private $scalePort;
    private $socket;
    private $timeout;
    
    /**
     * Constructor
     * @param string $ip Scale IP address (default: 192.168.0.35)
     * @param int $port Scale port
     * @param int $timeout Connection timeout in seconds
     */
    public function __construct($ip = '192.168.0.35', $port = 4001, $timeout = 5) {
        $this->scaleIP = $ip;
        $this->scalePort = $port;
        $this->timeout = $timeout;
    }
    
    /**
     * Connect to the scale
     * @return bool True if connected successfully
     */
    public function connect() {
        $this->socket = @socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        
        if ($this->socket === false) {
            error_log("Scale: Failed to create socket - " . socket_strerror(socket_last_error()));
            return false;
        }
        
        socket_set_option($this->socket, SOL_SOCKET, SO_RCVTIMEO, ['sec' => $this->timeout, 'usec' => 0]);
        socket_set_option($this->socket, SOL_SOCKET, SO_SNDTIMEO, ['sec' => $this->timeout, 'usec' => 0]);
        
        $result = @socket_connect($this->socket, $this->scaleIP, $this->scalePort);
        
        if ($result === false) {
            error_log("Scale: Failed to connect to {$this->scaleIP}:{$this->scalePort} - " . 
                     socket_strerror(socket_last_error($this->socket)));
            return false;
        }
        
        return true;
    }
    
    /**
     * Disconnect from the scale
     */
    public function disconnect() {
        if ($this->socket) {
            socket_close($this->socket);
            $this->socket = null;
        }
    }
    
    /**
     * Read current weight from scale
     * @return array ['success' => bool, 'weight' => int, 'unit' => string, 'stable' => bool]
     */
    public function readWeight() {
        if (!$this->socket) {
            if (!$this->connect()) {
                return [
                    'success' => false,
                    'weight' => 0,
                    'unit' => 'kg',
                    'stable' => false,
                    'error' => 'No se pudo conectar a la báscula'
                ];
            }
        }
        
        // Request weight data (common command, may vary by scale model)
        $command = "R\r\n"; // Read command
        socket_write($this->socket, $command, strlen($command));
        
        // Read response
        $response = '';
        $buffer = '';
        while ($data = @socket_read($this->socket, 1024)) {
            $response .= $data;
            if (strpos($response, "\r\n") !== false) {
                break;
            }
        }
        
        if (empty($response)) {
            return [
                'success' => false,
                'weight' => 0,
                'unit' => 'kg',
                'stable' => false,
                'error' => 'No se recibió respuesta de la báscula'
            ];
        }
        
        // Parse response (format may vary by scale model)
        // Common formats: "ST,GS,    123.45kg" or "US,GS,    123.45kg"
        $weight = $this->parseWeightResponse($response);
        
        return $weight;
    }
    
    /**
     * Parse weight response from scale
     * @param string $response Raw response from scale
     * @return array Parsed weight data
     */
    private function parseWeightResponse($response) {
        $response = trim($response);
        
        // Check for stable weight indicator (ST = Stable, US = Unstable)
        $stable = (strpos($response, 'ST') !== false);
        
        // Extract numeric weight value
        // Try to match different formats
        if (preg_match('/([+-]?\d+\.?\d*)\s*(kg|g|lb)/i', $response, $matches)) {
            $weight = floatval($matches[1]);
            $unit = strtolower($matches[2]);
            
            // Convert to kg if in grams
            if ($unit === 'g') {
                $weight = $weight / 1000;
                $unit = 'kg';
            }
            
            // Convert to integer (kilograms as integer)
            $weightInt = (int)round($weight);
            
            return [
                'success' => true,
                'weight' => $weightInt,
                'unit' => $unit,
                'stable' => $stable,
                'raw' => $response
            ];
        }
        
        // If no match, try simple numeric extraction
        if (preg_match('/([+-]?\d+\.?\d*)/', $response, $matches)) {
            $weight = (int)round(floatval($matches[1]));
            
            return [
                'success' => true,
                'weight' => $weight,
                'unit' => 'kg',
                'stable' => $stable,
                'raw' => $response
            ];
        }
        
        return [
            'success' => false,
            'weight' => 0,
            'unit' => 'kg',
            'stable' => false,
            'error' => 'No se pudo interpretar el peso',
            'raw' => $response
        ];
    }
    
    /**
     * Get scale status
     * @return array Scale connection status
     */
    public function getStatus() {
        if (!$this->socket) {
            if (!$this->connect()) {
                return [
                    'connected' => false,
                    'ip' => $this->scaleIP,
                    'port' => $this->scalePort,
                    'error' => 'No conectada'
                ];
            }
        }
        
        return [
            'connected' => true,
            'ip' => $this->scaleIP,
            'port' => $this->scalePort
        ];
    }
    
    /**
     * Tare the scale (zero the display)
     * @return bool Success status
     */
    public function tare() {
        if (!$this->socket) {
            if (!$this->connect()) {
                return false;
            }
        }
        
        $command = "T\r\n"; // Tare command
        $result = socket_write($this->socket, $command, strlen($command));
        
        return $result !== false;
    }
    
    /**
     * Test connection to scale
     * @return array Test result
     */
    public static function testConnection($ip = '192.168.0.35', $port = 4001) {
        $scale = new self($ip, $port);
        $connected = $scale->connect();
        
        if (!$connected) {
            return [
                'success' => false,
                'message' => 'No se pudo conectar a la báscula',
                'ip' => $ip,
                'port' => $port
            ];
        }
        
        $weight = $scale->readWeight();
        $scale->disconnect();
        
        return [
            'success' => $weight['success'],
            'message' => $weight['success'] ? 'Conexión exitosa' : 'Conexión establecida pero no se pudo leer el peso',
            'ip' => $ip,
            'port' => $port,
            'weight' => $weight
        ];
    }
}
?>
