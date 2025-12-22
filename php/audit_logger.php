<?php
require_once __DIR__ . '/db_postgres.php';

/**
 * Clase para el registro de auditoría de acciones de usuario.
 * Maneja la inserción y consulta de logs en la tabla adm_aud_log.
 */
class AuditLogger
{
    private $db;

    public function __construct()
    {
        global $pg;
        if (!$pg) {
            // Si falta la conexión global, intentar reconectar o lanzar error
            throw new Exception("La conexión a la base de datos no está establecida.");
        }
        $this->db = $pg;
    }

    /**
     * Registrar una acción de usuario
     * 
     * @param int|null $userId ID del usuario que realiza la acción
     * @param string $userType Tipo de usuario ('admin' o 'colaborador')
     * @param string $action Código de la acción (ej: 'CREATE_USER')
     * @param string $description Descripción legible de la acción
     * @param mixed $details Detalles adicionales (array o JSON)
     * @return bool Verdadero si se registró correctamente
     */
    public function log($userId, $userType, $action, $description, $details = null)
    {
        try {
            $detailsJson = null;
            if ($details !== null) {
                $detailsJson = is_string($details) ? $details : json_encode($details, JSON_UNESCAPED_UNICODE);
            }

            $ip = $_SERVER['REMOTE_ADDR'] ?? 'DESCONOCIDO';
            $host = $ip;

            $query = "INSERT INTO adm_aud_log (uploaded_by, user_type, action_type, description, details, ip_address, host_name, created_at) 
                      VALUES (:user_id, :user_type, :action, :description, :details, :ip, :host, NOW())";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId, $userId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $stmt->bindParam(':user_type', $userType);
            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':details', $detailsJson, $detailsJson === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindParam(':ip', $ip);
            $stmt->bindParam(':host', $host);

            return $stmt->execute();
        } catch (Exception $e) {
            error_log("Error en AuditLogger: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtener registros de auditoría
     * 
     * @param int|null $userId Filtrar por ID de usuario
     * @param string|null $userType Filtrar por tipo de usuario
     * @param int $limit Límite de registros (por defecto 100)
     * @return array Array de registros
     */
    public function getLogs($userId = null, $userType = null, $limit = 100)
    {
        $whereClause = "";
        $params = [];

        if ($userId !== null) {
            $whereClause .= " WHERE l.uploaded_by = :user_id";
            $params[':user_id'] = $userId;

            if ($userType !== null) {
                $whereClause .= " AND l.user_type = :user_type";
                $params[':user_type'] = $userType;
            }
        }

        $query = "SELECT l.*, 
                         CASE 
                            WHEN l.user_type = 'admin' THEN COALESCE(u.nombre1 || ' ' || u.apellido1, u.id_usuario)
                            WHEN l.user_type = 'colaborador' THEN COALESCE(c.ac_nombre1 || ' ' || c.ac_apellido1, c.ac_cedula)
                            ELSE 'Sistema'
                         END as user_name,
                         CASE 
                            WHEN l.user_type = 'admin' THEN u.id_usuario
                            WHEN l.user_type = 'colaborador' THEN c.ac_cedula
                            ELSE 'SYSTEM'
                         END as user_identifier
                  FROM adm_aud_log l
                  LEFT JOIN adm_usuarios u ON l.uploaded_by = u.id AND l.user_type = 'admin'
                  LEFT JOIN adm_colaboradores c ON l.uploaded_by = c.ac_id AND l.user_type = 'colaborador'
                  $whereClause
                  ORDER BY l.created_at DESC
                  LIMIT :limit";

        $stmt = $this->db->prepare($query);

        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Limpieza automática de logs antiguos
     * Elimina registros con más de 30 días de antigüedad.
     */
    public function cleanup()
    {
        try {
            $query = "DELETE FROM adm_aud_log WHERE created_at < NOW() - INTERVAL '30 days'";
            $this->db->exec($query);
        } catch (Exception $e) {
            error_log("Error en Limpieza de AuditLogger: " . $e->getMessage());
        }
    }
}
