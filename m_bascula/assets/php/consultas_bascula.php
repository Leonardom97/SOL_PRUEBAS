<?php
/**
 * Consultas (Queries) class for weighing system
 * Replicates functionality from VscaleX.Clases.Consultas
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

require_once __DIR__ . '/db_bascula.php';

class ConsultasBascula {
    private $db;
    
    public function __construct() {
        $this->db = new DatabaseBascula();
    }
    
    /**
     * User login validation
     */
    public function login($user, $pass) {
        $sql = "SELECT codigo, tr_codigo as Rol, nombres, apellidos 
                FROM admin_usuarios 
                WHERE usuario = ? AND PWDCOMPARE(?, password) = 1 AND est_codigo = 1";
        return $this->db->queryBascula($sql, [$user, $pass]);
    }
    
    /**
     * Get all users
     */
    public function usuarios() {
        $sql = "SELECT codigo as Codigo, au.nombres as Nombres, au.apellidos as Apellidos, 
                au.tr_codigo, 
                (SELECT tr.nombre FROM tipos_roles tr WHERE tr.codigo = au.tr_codigo) as Rol, 
                au.Usuario, au.password, au.est_codigo, 
                (SELECT te.nombre FROM tipos_estados te WHERE te.codigo = au.est_codigo) as Estado 
                FROM admin_usuarios au";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get all products
     */
    public function productos() {
        $sql = "SELECT codigo, nombre as Nombre, sap_codigo as Cod_SAP, est_codigo,  
                (SELECT te.nombre FROM tipos_estados te WHERE te.codigo = tp.est_codigo) as Estado  
                FROM tipos_productos tp";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get terminal configuration
     */
    public function terminal() {
        $sql = "SELECT codigo, nombre, com, velocidadTransmision, paridad, bitsdatos, 
                bitsparada, ip, puerto, observaciones, conx_predeterminada, est_codigo  
                FROM admin_terminales";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get vehicle by plate number
     */
    public function placa($placa) {
        $sql = "SELECT codigo, CONVERT(nvarchar(17), fecha_entrada, 113) as fecha_entrada, 
                conductor, tt_codigo, tp_codigo, tp_codigo, peso_bruto, peso_tara, est_codigo 
                FROM trans_pesadas tp  
                WHERE placa = ? AND est_codigo = 1";
        return $this->db->queryBascula($sql, [trim($placa)]);
    }
    
    /**
     * Get today's weighings
     */
    public function pesadasDia() {
        $sql = "SELECT tp.codigo, tp.fecha_entrada, tp.fecha_salida, tp.placa, tp.conductor, tp.siembra, 
                (SELECT nombre FROM tipos_transaccion WHERE codigo = tp.tt_codigo) as transaccion, 
                tp.tp_codigo as producto, tpr_codigo as tipo_procedencia, 
                (SELECT nombre FROM doc_origen WHERE codigo = tp.do_codigo) as Doc_Origen, 
                tp.num_documento, tp.peso_bruto, tp.peso_tara, tp.peso_neto, 
                (SELECT nombres FROM admin_usuarios WHERE codigo = tp.au_codigo) as Usuario, 
                (SELECT nombre FROM tipos_estados WHERE codigo = tp.est_codigo) as Estado 
                FROM trans_pesadas tp";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get detailed weighings report
     */
    public function pesadasDetallado($fecha_inicio, $fecha_fin) {
        $sql = "SELECT tp.codigo as Codigo, tp.fecha_entrada as Fecha_entrada, 
                tp.fecha_salida as Fecha_salida, tp.placa as Placa, tp.conductor as Conductor, 
                tp.tpr_codigo as Procedencia, p.sap_codigo as SAP_Producto, p.nombre as Producto, 
                tp.peso_bruto as Peso_bruto, tp.peso_tara as Peso_tara, tp.peso_neto as Peso_neto, 
                au.usuario as Usuario, tp.do_codigo as D_origen, tp.num_documento as Num_documento, 
                te.nombre as Estado   
                FROM trans_pesadas tp, tipos_estados te, admin_usuarios au, tipos_productos p  
                WHERE te.codigo = tp.est_codigo AND au.codigo = tp.au_codigo 
                AND p.sap_codigo = tp.tp_codigo 
                AND tp.fecha_salida BETWEEN ? AND ?";
        return $this->db->queryBascula($sql, [$fecha_inicio, $fecha_fin]);
    }
    
    /**
     * Get receipt information
     */
    public function recibo() {
        $sql = "SELECT TOP 1 nombre_empresa, nit_empresa, titulo_recibo FROM informacion_recibo";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get weighings per day statistics
     */
    public function pesadasPorDia($fecha_inicio, $fecha_fin) {
        $sql = "SELECT DATENAME(WEEKDAY, fecha_entrada) as semana, COUNT(peso_neto) as Conteo  
                FROM trans_pesadas  
                WHERE fecha_entrada BETWEEN ? AND ?  
                GROUP BY DATENAME(WEEKDAY, fecha_entrada)";
        $inicio = $fecha_inicio . ' 00:00:00';
        $fin = $fecha_fin . ' 23:59:59';
        return $this->db->queryBascula($sql, [$inicio, $fin]);
    }
    
    /**
     * Get active roles
     */
    public function roles() {
        $sql = "SELECT codigo, nombre FROM tipos_roles WHERE est_codigo = 1 
                UNION SELECT 0, '-Seleccione-'";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get active states
     */
    public function estados() {
        $sql = "SELECT codigo, nombre FROM tipos_estados WHERE est_codigo = 1 
                UNION SELECT 0, '-Seleccione-'";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get active scales
     */
    public function selectBasculas() {
        $sql = "SELECT codigo, nombre FROM admin_terminales WHERE est_codigo = 1 
                UNION SELECT '0', '-Seleccione-' ORDER BY codigo ASC";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get active products for dropdown
     */
    public function productosSelect() {
        $sql = "SELECT sap_codigo as codigo, nombre FROM tipos_productos WHERE est_codigo = 1 
                UNION SELECT '0', '-Seleccione-' ORDER BY codigo ASC";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get destinations
     */
    public function destino() {
        $sql = "SELECT codigo, nombre FROM admin_destino";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get vehicle plates from SAP by location
     */
    public function placasVehiculos($condicion) {
        // Convert condition code to location name
        switch ($condicion) {
            case '1':
                $condicion = 'SEMAG';
                break;
            case '2':
                $condicion = 'SAN MARCOS';
                break;
        }
        
        $sql = "SELECT [DocEntry] as codigo, [U_Vehiculo] as placa  
                FROM [SAP_OLEAGINOSAS].[dbo].[@VEHICULOS]  
                WHERE [U_Procedencia] = ?   
                UNION SELECT '0', '-Seleccione-'";
        return $this->db->querySAP($sql, [$condicion]);
    }
    
    /**
     * Get vehicle tare weight from SAP
     */
    public function taraVehiculos($placa) {
        $sql = "SELECT [U_Tara] as tara 
                FROM [SAP_OLEAGINOSAS].[dbo].[@VEHICULOS] 
                WHERE [U_Vehiculo] = ?";
        $result = $this->db->querySAP($sql, [$placa]);
        return !empty($result) ? $result[0]['tara'] : '';
    }
    
    /**
     * Get vehicle driver from SAP
     */
    public function conductorVehiculos($placa) {
        $sql = "SELECT [U_Conductor] as conductor  
                FROM [SAP_OLEAGINOSAS].[dbo].[@VEHICULOS]  
                WHERE [U_Vehiculo] = ?";
        $result = $this->db->querySAP($sql, [$placa]);
        return !empty($result) ? trim($result[0]['conductor']) : '';
    }
    
    /**
     * Get driver names by plate from local database
     */
    public function nombresConductores($placa) {
        $sql = "SELECT codigo, conductor FROM admin_vehiculos WHERE placa = ? 
                UNION SELECT '0', '-Seleccione-'";
        return $this->db->queryBascula($sql, [$placa]);
    }
    
    /**
     * Get transaction types
     */
    public function transaccion() {
        $sql = "SELECT codigo, nombre FROM tipos_transaccion 
                UNION SELECT 0, '-Seleccione-'";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get origin/destination based on type from SAP
     */
    public function procedencia($condicion) {
        $sql = "";
        switch ($condicion) {
            case '3': // Clients
                $sql = "SELECT [CardCode] as codigo, [CardName] as nombre 
                        FROM [SAP_OLEAGINOSAS].[dbo].[OCRD] 
                        WHERE [CardType] = 'C'  
                        UNION SELECT '0', '-Seleccione-'";
                break;
            case '1': // Cost centers
                $sql = "SELECT [PrcCode] as codigo, [PrcName] as nombre 
                        FROM [SAP_OLEAGINOSAS].[dbo].[OPRC] 
                        WHERE [DimCode] = '1' AND [Active] = 'Y'  
                        UNION SELECT '0', '-Seleccione-'";
                break;
            case '2': // Suppliers
                $sql = "SELECT [CardCode] as codigo, [CardName] as nombre 
                        FROM [SAP_OLEAGINOSAS].[dbo].[OCRD] 
                        WHERE [CardType] = 'S'  
                        UNION SELECT '0', '-Seleccione-'";
                break;
        }
        return $this->db->querySAP($sql);
    }
    
    /**
     * Get document origin types
     */
    public function docOrigen() {
        $sql = "SELECT codigo, nombre FROM doc_origen 
                UNION SELECT 0, '-Seleccione-'";
        return $this->db->queryBascula($sql);
    }
    
    /**
     * Get planting/cultivation codes from SAP
     */
    public function siembras() {
        $sql = "SELECT [PrcCode] as codigo, [PrcCode] as nombre 
                FROM [SAP_OLEAGINOSAS].[dbo].[OPRC] 
                WHERE [DimCode] = '2' AND [Active] = 'Y'";
        return $this->db->querySAP($sql);
    }
    
    /**
     * Get document number based on transaction type
     */
    public function numDocumento($procedencia, $siembra, $transaccion) {
        $sql = "SELECT GETDATE() as docnum";
        
        if (!empty($siembra)) {
            $sql = "SELECT [DocNum] as docnum 
                    FROM [SAP_OLEAGINOSAS].[dbo].[OWOR]  
                    WHERE [Status] = 'R' AND [OcrCode] = ? AND [OcrCode2] = ?";
            $params = [$procedencia, $siembra];
        } elseif ($transaccion == '3') {
            $sql = "SELECT [DocNum] as docnum 
                    FROM [SAP_OLEAGINOSAS].[dbo].[ORDR] 
                    WHERE [DocStatus] = 'O' AND [CardCode] = ?";
            $params = [$procedencia];
        } elseif ($transaccion == '1') {
            $sql = "SELECT [DocNum] as docnum 
                    FROM [SAP_OLEAGINOSAS].[dbo].[OPOR] 
                    WHERE [DocStatus] = 'O' AND [CardCode] = ?";
            $params = [$procedencia];
        } else {
            $params = [];
        }
        
        $result = $this->db->querySAP($sql, $params);
        return !empty($result) ? $result[0]['docnum'] : '';
    }
}
?>
