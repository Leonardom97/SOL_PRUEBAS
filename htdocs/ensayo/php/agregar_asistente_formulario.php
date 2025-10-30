<?php
header('Content-Type: application/json');
require_once 'db.php';
$id_formulario = $_POST['id_formulario'] ?? 0;
$id_asistente = $_POST['id_asistente'] ?? 0;
$estado = $_POST['estado'] ?? 'Activo';
if (!$id_formulario || !$id_asistente) {
    echo json_encode(['ok' => false, 'msg' => 'Datos incompletos']);
    exit;
}
$stmt = $pdo->prepare("SELECT 1 FROM formulario_asistente WHERE id_formulario=? AND id_asistente=?");
$stmt->execute([$id_formulario, $id_asistente]);
if ($stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Ya está agregado']);
    exit;
}
$stmt = $pdo->prepare("INSERT INTO formulario_asistente (id_formulario, id_asistente, estado) VALUES (?, ?, ?)");  // inserta un nuevo registro si no esta ingresado anteriormente 
$ok = $stmt->execute([$id_formulario, $id_asistente, $estado]);
echo json_encode(['ok' => $ok]);  //devuelve un JSON con la clave ok que indica si la operación fue exitosa
?> 