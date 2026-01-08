<?php
require_once 'db_postgres.php';
try {
    $stmt = $pg->query("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'");
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($tables);
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
