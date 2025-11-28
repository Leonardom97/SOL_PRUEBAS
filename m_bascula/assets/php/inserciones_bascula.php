<?php
/**
 * Inserciones (Insertions) class for weighing system
 * Replicates functionality from VscaleX.Clases.Inserciones
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

require_once __DIR__ . '/db_bascula.php';

class InsercionesBascula {
    private $db;
    
    public function __construct() {
        $this->db = new DatabaseBascula();
    }
    
    /**
     * Insert new user
     */
    public function usuario($nombres, $apellidos, $usuario, $password, $tr_codigo, $est_codigo = 1) {
        $sql = "INSERT INTO admin_usuarios (nombres, apellidos, usuario, password, tr_codigo, est_codigo) 
                VALUES (?, ?, ?, PWDENCRYPT(?), ?, ?)";
        return $this->db->executeBascula($sql, [$nombres, $apellidos, $usuario, $password, $tr_codigo, $est_codigo]);
    }
    
    /**
     * Insert new product
     */
    public function infoProductos($nombre, $descripcion, $est_codigo) {
        $sql = "INSERT INTO tipos_productos (nombre, sap_codigo, est_codigo) 
                VALUES (?, ?, ?)";
        return $this->db->executeBascula($sql, [$nombre, $descripcion, $est_codigo]);
    }
    
    /**
     * Insert new weighing (pesada)
     */
    public function pesadas($placa, $conductor, $siembra, $tt_codigo, $tpr_codigo, $tp_codigo, 
                           $do_codigo, $num_documento, $tara, $au_codigo) {
        $fecha_entrada = date('Y-m-d H:i:s');
        $fecha_salida = date('Y-m-d H:i:s');
        $est_codigo = 1; // Active state
        $peso_bruto = 0;
        $peso_neto = 0;
        
        $sql = "INSERT INTO trans_pesadas 
                (fecha_entrada, fecha_salida, placa, conductor, siembra, tt_codigo, tp_codigo, 
                tpr_codigo, do_codigo, num_documento, peso_bruto, peso_tara, peso_neto, au_codigo, est_codigo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        return $this->db->executeBascula($sql, [
            $fecha_entrada, $fecha_salida, $placa, $conductor, $siembra, $tt_codigo, $tp_codigo,
            $tpr_codigo, $do_codigo, $num_documento, $peso_bruto, $tara, $peso_neto, $au_codigo, $est_codigo
        ]);
    }
    
    /**
     * Insert new destination
     */
    public function destino($destino) {
        $sql = "INSERT INTO admin_destino (nombre) VALUES (?)";
        return $this->db->executeBascula($sql, [$destino]);
    }
    
    /**
     * Insert new origin
     */
    public function procedencia($procedencia) {
        $sql = "INSERT INTO admin_procedencia (nombre) VALUES (?)";
        return $this->db->executeBascula($sql, [$procedencia]);
    }
    
    /**
     * Update receipt information
     */
    public function recibo($nombre_empresa, $nit_empresa, $titulo_recibo) {
        $sql = "UPDATE informacion_recibo 
                SET nombre_empresa = ?, nit_empresa = ?, titulo_recibo = ?";
        return $this->db->executeBascula($sql, [$nombre_empresa, $nit_empresa, $titulo_recibo]);
    }
}
?>
