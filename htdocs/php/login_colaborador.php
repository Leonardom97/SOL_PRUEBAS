<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db_postgres.php';

// Obtener datos del formulario
$cedula = trim($_POST['Ingreso_cedula'] ?? '');
$clave = trim($_POST['Password_colaborador'] ?? '');

// Validación básica
if (empty($cedula) || empty($clave)) {
    echo json_encode(['success' => false, 'message' => 'La cédula y la contraseña son obligatorias']);
    exit;
}

try {
    // Buscar colaborador ACTIVO (situación válida) por cédula
    $stmt = $pg->prepare("
        SELECT ac_id, ac_cedula, ac_contraseña, ac_nombre1, ac_apellido1
        FROM adm_colaboradores
        WHERE ac_cedula = :cedula
        AND ac_id_situación IN ('P', 'A', 'V')
        ORDER BY ac_id DESC
        LIMIT 1
    ");
    $stmt->execute([':cedula' => $cedula]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        echo json_encode(['success' => false, 'message' => 'Colaborador no autorizado o no activo']);
        exit;
    }

    // Validar contraseña directamente (en texto plano, como lo tienes por ahora)
    if ($usuario['ac_contraseña'] !== $clave) {
        echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
        exit;
    }

    // Guardar sesión
    $_SESSION['usuario_id'] = $usuario['ac_id'];
    $_SESSION['usuario'] = $usuario['ac_cedula'];
    $_SESSION['nombre'] = $usuario['ac_nombre1'] . ' ' . $usuario['ac_apellido1'];
    $_SESSION['rol'] = 'usuario';
    $_SESSION['rol_id'] = 2;
    $_SESSION['tipo_usuario'] = 'colaborador'; // ✅ IMPORTANTE para verificar_sesion.php

    echo json_encode(['success' => true, 'redirect' => '../panel.html']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()]);
    exit;
}
