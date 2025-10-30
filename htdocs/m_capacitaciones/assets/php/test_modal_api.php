<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../php/db_postgres.php';

$id = intval($_GET['id'] ?? 0);

$result = [
    'conexion' => false,
    'id_recibido' => $id,
    'formulario' => null,
    'temas' => [],
    'procesos' => [],
    'lugares' => [],
    'actividades' => [],
    'responsable' => null,
    'asistentes' => [],
    'errores' => []
];

try {
    $pg->query('SELECT 1');
    $result['conexion'] = true;
} catch (Exception $e) {
    $result['errores'][] = 'Conexión fallida: ' . $e->getMessage();
    echo json_encode($result); exit;
}

if ($id > 0) {
    // Formulario principal
    try {
        $st = $pg->prepare("SELECT * FROM cap_formulario WHERE id = ?");
        $st->execute([$id]);
        $result['formulario'] = $st->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $result['errores'][] = 'Error consulta formulario: ' . $e->getMessage();
    }

    // Temas
    try {
        $temas = $pg->query("SELECT id, nombre FROM cap_tema ORDER BY nombre")->fetchAll(PDO::FETCH_ASSOC);
        $result['temas'] = $temas;
    } catch (Exception $e) {
        $result['errores'][] = 'Error consulta temas: ' . $e->getMessage();
    }

    // Procesos
    try {
        $procesos = $pg->query("SELECT id, proceso AS nombre FROM cap_proceso ORDER BY proceso")->fetchAll(PDO::FETCH_ASSOC);
        $result['procesos'] = $procesos;
    } catch (Exception $e) {
        $result['errores'][] = 'Error consulta procesos: ' . $e->getMessage();
    }

    // Lugares
    try {
        $lugares = $pg->query("SELECT id, lugar AS nombre FROM cap_lugar ORDER BY lugar")->fetchAll(PDO::FETCH_ASSOC);
        $result['lugares'] = $lugares;
    } catch (Exception $e) {
        $result['errores'][] = 'Error consulta lugares: ' . $e->getMessage();
    }

    // Actividades (corregido: columna nombre)
    try {
        $actividades = $pg->query("SELECT id, nombre FROM cap_tipo_actividad ORDER BY nombre")->fetchAll(PDO::FETCH_ASSOC);
        $result['actividades'] = $actividades;
    } catch (Exception $e) {
        $result['errores'][] = 'Error consulta actividades: ' . $e->getMessage();
    }

    // Responsable
    try {
        if ($result['formulario'] && isset($result['formulario']['id_usuario'])) {
            $st = $pg->prepare("SELECT * FROM adm_usuarios WHERE id = ?");
            $st->execute([$result['formulario']['id_usuario']]);
            $result['responsable'] = $st->fetch(PDO::FETCH_ASSOC);
        }
    } catch (Exception $e) {
        $result['errores'][] = 'Error consulta responsable: ' . $e->getMessage();
    }

    // Asistentes
    try {
        $asisSt = $pg->prepare("SELECT * FROM cap_formulario_asistente WHERE id_formulario = ?");
        $asisSt->execute([$id]);
        $result['asistentes'] = $asisSt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $result['errores'][] = 'Error consulta asistentes: ' . $e->getMessage();
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);