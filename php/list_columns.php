<?php
require_once 'db_postgres.php';
try {
    $stmt = $pg->prepare("SELECT column_name FROM information_schema.columns WHERE table_name = :table");
    $stmt->execute([':table' => 'adm_colaboradores']);
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    print_r($columns);
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
