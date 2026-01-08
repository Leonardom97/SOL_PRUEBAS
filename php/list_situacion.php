<?php
require_once 'db_postgres.php';
try {
    $stmt = $pg->query("SELECT * FROM adm_situación");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
