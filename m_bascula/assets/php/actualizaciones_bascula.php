<?php
/**
 * Actualizaciones (Updates) class for weighing system
 * Replicates functionality from VscaleX.Clases.Actualizaciones
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

require_once __DIR__ . '/db_bascula.php';

class ActualizacionesBascula {
    private $db;
    
    public function __construct() {
        $this->db = new DatabaseBascula();
    }
    
    /**
     * Update user information
     */
    public function usuario($codigo, $nombres, $apellidos, $usuario, $password, $tr_codigo, $est_codigo) {
        $sql = "UPDATE admin_usuarios 
                SET nombres = ?, apellidos = ?, usuario = ?, password = PWDENCRYPT(?), 
                    tr_codigo = ?, est_codigo = ? 
                WHERE codigo = ?";
        return $this->db->executeBascula($sql, [
            $nombres, $apellidos, $usuario, $password, $tr_codigo, $est_codigo, $codigo
        ]);
    }
    
    /**
     * Update product information
     */
    public function infoProductos($codigo, $nombre, $descripcion, $est_codigo) {
        $sql = "UPDATE tipos_productos 
                SET nombre = ?, sap_codigo = ?, est_codigo = ? 
                WHERE codigo = ?";
        return $this->db->executeBascula($sql, [$nombre, $descripcion, $est_codigo, $codigo]);
    }
    
    /**
     * Update terminal/scale configuration
     */
    public function terminal($com, $velocidad_transmision, $paridad, $bitsdatos, $bitsparada, 
                            $ip, $puerto, $conexion) {
        $sql = "UPDATE admin_terminales 
                SET com = ?, velocidadTransmision = ?, paridad = ?, bitsdatos = ?, 
                    bitsparada = ?, ip = ?, puerto = ?, conx_predeterminada = ?";
        return $this->db->executeBascula($sql, [
            $com, $velocidad_transmision, $paridad, $bitsdatos, $bitsparada, $ip, $puerto, $conexion
        ]);
    }
    
    /**
     * Update vehicle exit (complete weighing)
     */
    public function salidaVehiculo($codigo, $tp_codigo, $neto, $bruto) {
        $fecha_salida = date('Y-m-d H:i:s');
        $est_codigo = 2; // Completed state
        
        $sql = "UPDATE trans_pesadas 
                SET fecha_salida = ?, tp_codigo = ?, peso_bruto = ?, peso_neto = ?, est_codigo = ? 
                WHERE codigo = ?";
        return $this->db->executeBascula($sql, [
            $fecha_salida, $tp_codigo, $bruto, $neto, $est_codigo, $codigo
        ]);
    }
    
    /**
     * Update destination
     */
    public function destino($destino, $nueva_destino) {
        $sql = "UPDATE admin_destino SET nombre = ? WHERE nombre = ?";
        return $this->db->executeBascula($sql, [$nueva_destino, $destino]);
    }
    
    /**
     * Update origin
     */
    public function procedencia($procedencia, $nueva_procedencia) {
        $sql = "UPDATE admin_procedencia SET nombre = ? WHERE nombre = ?";
        return $this->db->executeBascula($sql, [$nueva_procedencia, $procedencia]);
    }
}
?>
