<?php
/**
 * Scale Hardware Communication Class
 * Handles TCP/IP communication with weighing scale at 192.168.0.35
 * 
 * Supports two connection methods:
 * 1. stream_socket_client (preferred, as mentioned by user)
 * 2. socket_create (fallback)
 * 
 * Based on original C# VscaleX implementation (frm_operacion.cs)
 * that uses TcpClient for ethernet connections.
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

class EscalaComunicacion {
    private $scaleIP;
    private $scalePort;
    private $socket;
    private $stream;
    private $timeout;
    private $connectionType; // 'stream' or 'socket'
    
    /**
     * Constructor
     * @param string $ip Scale IP address (default: 192.168.0.35)
     * @param int $port Scale port (from admin_terminales, common ports: 1701, 1409, 4001)
     * @param int $timeout Connection timeout in seconds
     */
    public function __construct($ip = '192.168.0.35', $port = 1701, $timeout = 5) {
        $this->scaleIP = $ip;
        $this->scalePort = $port;
        $this->timeout = $timeout;
        $this->connectionType = null;
        $this->socket = null;
        $this->stream = null;
    }
    
    /**
     * Connect to the scale using stream_socket_client (preferred method)
     * This method was mentioned by the user as working previously
     * @return bool True if connected successfully
     */
    public function connectStream() {
        $address = "tcp://{$this->scaleIP}:{$this->scalePort}";
        
        $context = stream_context_create([
            'socket' => [
                'connect_timeout' => $this->timeout
            ]
        ]);
        
        $errno = 0;
        $errstr = '';
        
        $this->stream = @stream_socket_client(
            $address,
            $errno,
            $errstr,
            $this->timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );
        
        if ($this->stream === false) {
            error_log("Scale (stream): Failed to connect to {$address} - Error $errno: $errstr");
            return false;
        }
        
        // Set stream timeout
        stream_set_timeout($this->stream, $this->timeout);
        
        $this->connectionType = 'stream';
        return true;
    }
    
    /**
     * Connect to the scale using socket_create (fallback method)
     * @return bool True if connected successfully
     */
    public function connectSocket() {
        $this->socket = @socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        
        if ($this->socket === false) {
            error_log("Scale (socket): Failed to create socket - " . socket_strerror(socket_last_error()));
            return false;
        }
        
        socket_set_option($this->socket, SOL_SOCKET, SO_RCVTIMEO, ['sec' => $this->timeout, 'usec' => 0]);
        socket_set_option($this->socket, SOL_SOCKET, SO_SNDTIMEO, ['sec' => $this->timeout, 'usec' => 0]);
        
        $result = @socket_connect($this->socket, $this->scaleIP, $this->scalePort);
        
        if ($result === false) {
            error_log("Scale (socket): Failed to connect to {$this->scaleIP}:{$this->scalePort} - " . 
                     socket_strerror(socket_last_error($this->socket)));
            return false;
        }
        
        $this->connectionType = 'socket';
        return true;
    }
    
    /**
     * Connect to the scale (tries stream first, then socket)
     * @return bool True if connected successfully
     */
    public function connect() {
        // Try stream_socket_client first (user mentioned this worked before)
        if ($this->connectStream()) {
            return true;
        }
        
        // Fallback to raw socket
        return $this->connectSocket();
    }
    
    /**
     * Disconnect from the scale
     */
    public function disconnect() {
        if ($this->stream) {
            fclose($this->stream);
            $this->stream = null;
        }
        if ($this->socket) {
            socket_close($this->socket);
            $this->socket = null;
        }
        $this->connectionType = null;
    }
    
    /**
     * Write data to the scale
     * @param string $data Data to send
     * @return bool Success status
     */
    private function write($data) {
        if ($this->connectionType === 'stream' && $this->stream) {
            $result = fwrite($this->stream, $data);
            fflush($this->stream);
            return $result !== false;
        }
        if ($this->connectionType === 'socket' && $this->socket) {
            $result = socket_write($this->socket, $data, strlen($data));
            return $result !== false;
        }
        return false;
    }
    
    /**
     * Read data from the scale
     * @param int $length Maximum bytes to read
     * @return string|false Data read or false on failure
     */
    private function read($length = 1024) {
        if ($this->connectionType === 'stream' && $this->stream) {
            return fread($this->stream, $length);
        }
        if ($this->connectionType === 'socket' && $this->socket) {
            return @socket_read($this->socket, $length);
        }
        return false;
    }
    
    /**
     * Read a line from the scale (until \r\n or \n)
     * @return string|false Line read or false on failure
     */
    private function readLine() {
        if ($this->connectionType === 'stream' && $this->stream) {
            return fgets($this->stream);
        }
        if ($this->connectionType === 'socket' && $this->socket) {
            $response = '';
            while (($data = @socket_read($this->socket, 1)) !== false && $data !== '') {
                $response .= $data;
                if (strpos($response, "\n") !== false) {
                    break;
                }
                if (strlen($response) > 1024) {
                    break;
                }
            }
            return $response;
        }
        return false;
    }
    
    /**
     * Read current weight from scale
     * Based on C# code that sends "SIR" command and parses response at position 5-9
     * @return array ['success' => bool, 'weight' => int, 'unit' => string, 'stable' => bool]
     */
    public function readWeight() {
        if (!$this->stream && !$this->socket) {
            if (!$this->connect()) {
                return [
                    'success' => false,
                    'weight' => 0,
                    'unit' => 'kg',
                    'stable' => false,
                    'error' => 'No se pudo conectar a la báscula',
                    'ip' => $this->scaleIP,
                    'port' => $this->scalePort
                ];
            }
        }
        
        // Based on C# code (frm_operacion.cs line 789):
        // The command "SIR" is sent to request weight data
        // Alternative commands based on scale type: "R", "W", "S"
        $commands = ["SIR\r\n", "R\r\n", "W\r\n"];
        $response = '';
        
        foreach ($commands as $command) {
            $this->write($command);
            
            // Wait briefly for response
            usleep(200000); // 200ms
            
            $response = $this->read(1024);
            
            if (!empty($response)) {
                break;
            }
        }
        
        if (empty($response)) {
            // Try reading without sending command (some scales stream continuously)
            $response = $this->read(1024);
        }
        
        if (empty($response)) {
            return [
                'success' => false,
                'weight' => 0,
                'unit' => 'kg',
                'stable' => false,
                'error' => 'No se recibió respuesta de la báscula',
                'ip' => $this->scaleIP,
                'port' => $this->scalePort
            ];
        }
        
        // Parse response
        $weight = $this->parseWeightResponse($response);
        
        return $weight;
    }
    
    /**
     * Parse weight response from scale
     * Based on C# code (frm_operacion.cs line 762):
     * string str2 = str1.Substring(5, 5).Trim();
     * @param string $response Raw response from scale
     * @return array Parsed weight data
     */
    private function parseWeightResponse($response) {
        $response = trim($response);
        
        // Check for stable weight indicator (ST = Stable, US = Unstable, S = Stable, I = Unstable)
        // C# checks: if (str1[0] == 'S' || str1[0] == 'I' || str1[1] == '*' || str1[1] == ')')
        $stable = (
            strpos($response, 'ST') !== false || 
            (isset($response[0]) && $response[0] === 'S' && strpos($response, 'SIR') !== 0)
        );
        
        // Try C# parsing method: extract from position 5, length 5
        // This is specific to the terminal model being used
        if (strlen($response) >= 10) {
            $weightStr = trim(substr($response, 5, 5));
            if (is_numeric($weightStr)) {
                $weight = (int)round(floatval($weightStr));
                return [
                    'success' => true,
                    'weight' => $weight,
                    'unit' => 'kg',
                    'stable' => $stable,
                    'raw' => $response,
                    'method' => 'c_sharp_compatible'
                ];
            }
        }
        
        // Try to match different formats
        // Format: "ST,GS,    123.45kg" or "US,GS,    123.45kg"
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
                'raw' => $response,
                'method' => 'pattern_with_unit'
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
                'raw' => $response,
                'method' => 'numeric_extraction'
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
        if (!$this->stream && !$this->socket) {
            if (!$this->connect()) {
                return [
                    'connected' => false,
                    'ip' => $this->scaleIP,
                    'port' => $this->scalePort,
                    'connection_type' => null,
                    'error' => 'No conectada'
                ];
            }
        }
        
        return [
            'connected' => true,
            'ip' => $this->scaleIP,
            'port' => $this->scalePort,
            'connection_type' => $this->connectionType
        ];
    }
    
    /**
     * Tare the scale (zero the display)
     * @return bool Success status
     */
    public function tare() {
        if (!$this->stream && !$this->socket) {
            if (!$this->connect()) {
                return false;
            }
        }
        
        // Common tare commands
        $commands = ["T\r\n", "TARE\r\n", "Z\r\n"];
        
        foreach ($commands as $command) {
            if ($this->write($command)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Test connection to scale
     * @param string $ip Scale IP address
     * @param int $port Scale port
     * @return array Test result
     */
    public static function testConnection($ip = '192.168.0.35', $port = 1701) {
        $scale = new self($ip, $port);
        
        $result = [
            'success' => false,
            'message' => '',
            'ip' => $ip,
            'port' => $port,
            'connection_type' => null,
            'weight' => null
        ];
        
        // Test stream connection
        if ($scale->connectStream()) {
            $result['connection_type'] = 'stream_socket_client';
            $result['success'] = true;
            $result['message'] = 'Conexión stream exitosa';
            
            // Try to read weight
            $weight = $scale->readWeight();
            $result['weight'] = $weight;
            
            if (!$weight['success']) {
                $result['message'] = 'Conexión establecida pero no se pudo leer el peso';
            }
            
            $scale->disconnect();
            return $result;
        }
        
        // Test socket connection
        if ($scale->connectSocket()) {
            $result['connection_type'] = 'socket';
            $result['success'] = true;
            $result['message'] = 'Conexión socket exitosa';
            
            // Try to read weight
            $weight = $scale->readWeight();
            $result['weight'] = $weight;
            
            if (!$weight['success']) {
                $result['message'] = 'Conexión establecida pero no se pudo leer el peso';
            }
            
            $scale->disconnect();
            return $result;
        }
        
        $result['message'] = 'No se pudo conectar a la báscula. Verificar IP, puerto y conexión de red.';
        return $result;
    }
    
    /**
     * Test multiple ports to find the correct one
     * @param string $ip Scale IP address
     * @param array $ports Array of ports to test
     * @return array Test results for all ports
     */
    public static function testMultiplePorts($ip = '192.168.0.35', $ports = [1701, 1409, 4001, 9100]) {
        $results = [];
        
        foreach ($ports as $port) {
            $results[$port] = self::testConnection($ip, $port);
        }
        
        return $results;
    }
}
?>
