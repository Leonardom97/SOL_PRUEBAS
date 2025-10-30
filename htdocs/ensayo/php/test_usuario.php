<?php
require 'db.php';

$usuario = 'admin_p';

$sql = "SELECT * FROM usuarios WHERE id_usuario = :usuario";
$stmt = $pdo->prepare($sql);
$stmt->execute(['usuario' => $usuario]);
$user = $stmt->fetch();

if ($user) {
    echo "✅ Usuario encontrado:<br>";
    echo "<pre>";
    print_r($user);
    echo "</pre>";
} else {
    echo "❌ Usuario NO encontrado";
}
