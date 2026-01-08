<?php
/**
 * Database connection class for Vansolix weighing system
 * Connects to vscalex_oleaginosas and SAP_OLEAGINOSAS databases
 * Server: 192.168.0.199
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

require_once __DIR__ . '/../../../php/db_sqlserver.php';

class DatabaseBascula {
    private $connBascula; // vscalex_oleaginosas connection
    private $connSAP;     // SAP_OLEAGINOSAS connection
    
    public function __construct() {
        global $sqlsrvBascula, $sqlsrvSAP;
        $this->connBascula = $sqlsrvBascula;
        $this->connSAP = $sqlsrvSAP;
    }
    
    /**
     * Get vscalex_oleaginosas database connection
     */
    public function getBasculaConnection() {
        return $this->connBascula;
    }
    
    /**
     * Get SAP_OLEAGINOSAS database connection
     */
    public function getSAPConnection() {
        return $this->connSAP;
    }
    
    /**
     * Execute query on vscalex_oleaginosas database
     */
    public function queryBascula($sql, $params = []) {
        try {
            $stmt = $this->connBascula->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Query error (Bascula): " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Execute query on SAP_OLEAGINOSAS database
     */
    public function querySAP($sql, $params = []) {
        try {
            $stmt = $this->connSAP->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Query error (SAP): " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Execute insert/update/delete on vscalex_oleaginosas database
     */
    public function executeBascula($sql, $params = []) {
        try {
            $stmt = $this->connBascula->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount();
        } catch (PDOException $e) {
            error_log("Execute error (Bascula): " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get last inserted ID
     */
    public function getLastInsertId() {
        return $this->connBascula->lastInsertId();
    }
}
?>
