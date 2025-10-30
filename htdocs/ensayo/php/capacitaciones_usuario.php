<?php
// Iniciar sesión para acceder a variables de sesión
session_start();

// Incluir archivo de conexión a la base de datos
require 'db.php';

// Obtener el ID de usuario desde la sesión o cookie
$id_usuario = $_SESSION['id_usuario'] ?? $_COOKIE['id_usuario'] ?? null;

// Si no hay usuario autenticado, responder con error 401 (No autorizado)
if (!$id_usuario) {
    http_response_code(401);
    exit;
}

// Obtener el ID interno del usuario desde la tabla 'usuarios' usando el 'id_usuario' (externo)
$stmt0 = $pdo->prepare("SELECT id FROM usuarios WHERE id_usuario = :id_usuario");
$stmt0->execute([':id_usuario' => $id_usuario]);
$id_interno = $stmt0->fetchColumn();

// Contar la cantidad de capacitaciones realizadas por el usuario (en tabla 'formulario')
$stmt1 = $pdo->prepare("SELECT COUNT(*) FROM formulario WHERE id_usuario = :id_interno");
$stmt1->execute([':id_interno' => $id_interno]);
$realizadas = $stmt1->fetchColumn();

// Obtener el total de formularios en el sistema (todas las capacitaciones)
$stmt2 = $pdo->query("SELECT COUNT(*) FROM formulario");
$total = $stmt2->fetchColumn();

// Devolver la información como JSON: cantidad de capacitaciones del usuario y total
echo json_encode([
    'realizadas' => (int)$realizadas,
    'total' => (int)$total
]);
