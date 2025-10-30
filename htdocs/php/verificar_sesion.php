<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db_postgres.php';

// Si no hay sesión activa
if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(['success' => false, 'message' => 'Sesión no iniciada']);
    exit;
}

try {
    // Usuarios NO colaboradores (administradores u otros con roles en adm_usuario_roles)
    if (($_SESSION['tipo_usuario'] ?? '') !== 'colaborador') {
        $id_usuario = $_SESSION['usuario_id'];

        // Obtener roles desde la tabla intermedia
        $stmtRoles = $pg->prepare("
            SELECT r.id, r.nombre
            FROM adm_usuario_roles ur
            JOIN adm_roles r ON ur.rol_id = r.id
            WHERE ur.usuario_id = :id
        ");
        $stmtRoles->execute([':id' => $id_usuario]);
        $roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

        // Guardar roles en la sesión (por seguridad)
        $_SESSION['roles'] = $roles;
        $rolPrincipal = $_SESSION['rol'] ?? ($roles[0]['nombre'] ?? 'admin');

        echo json_encode([
            'success' => true,
            'usuario' => $_SESSION['usuario'],
            'nombre'  => $_SESSION['nombre'],
            'roles'   => $roles,
            'rol'     => $rolPrincipal
        ]);
    }
    // Colaborador
    else {
        // Usa el rol real que tengas en la sesión (p.ej. 'aux_agronomico' o 'auxiliar agronomico').
        // Si no existe, caerá en 'usuario'.
        $rolPrincipal = $_SESSION['rol'] ?? 'usuario';

        // Estandariza la estructura para el frontend: siempre enviar 'roles' como arreglo de objetos {id, nombre}
        $roles = [
            [
                'id'     => 0,
                'nombre' => $rolPrincipal
            ]
        ];

        // Opcional: guarda roles en sesión para consistencia
        $_SESSION['roles'] = $roles;

        echo json_encode([
            'success' => true,
            'usuario' => $_SESSION['usuario'],
            'nombre'  => $_SESSION['nombre'],
            'roles'   => $roles,
            'rol'     => $rolPrincipal
        ]);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}