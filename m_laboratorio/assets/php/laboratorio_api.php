<?php
/**
 * Laboratory Module API
 * Handles CRUD operations for tanks, varieties, sampling locations, and measurements
 */

// Apply security headers
require_once __DIR__ . '/../../../php/security_headers.php';

session_start();
require '../../../php/db_postgres.php';

// Validate active session
if (!isset($_SESSION['usuario_id'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no iniciada. Por favor inicie sesión.']);
    exit;
}

// Get action from GET or POST
$action = $_GET['action'] ?? $_POST['action'] ?? '';

/**
 * Utility function to respond with JSON
 * 
 * @param mixed $data Data to encode and return as JSON response
 * @return void
 */
function jsonResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

/**
 * Global error handler for database operations
 * Wraps operations in try-catch and returns proper JSON errors
 * 
 * @param callable $callback The database operation to execute
 * @return mixed The result of the callback function
 */
function executeWithErrorHandling($callback) {
    try {
        return $callback();
    } catch (PDOException $e) {
        error_log("Laboratory API PDO Error: " . $e->getMessage());
        http_response_code(500);
        
        // Check for PostgreSQL "relation does not exist" error code (42P01)
        // Also check message for compatibility and localization
        $isTableNotFound = $e->getCode() === '42P01' ||
                          strpos($e->getMessage(), 'does not exist') !== false || 
                          strpos($e->getMessage(), 'no existe') !== false;
        
        if ($isTableNotFound) {
            jsonResponse([
                'success' => false, 
                'error' => 'Las tablas del módulo de laboratorio no existen. Ejecute las migraciones lab_migration.sql y lab_migration_v2.sql'
            ]);
        }
        jsonResponse(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
    } catch (Exception $e) {
        error_log("Laboratory API Error: " . $e->getMessage());
        http_response_code(500);
        jsonResponse(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()]);
    }
}

/**
 * Validate required fields
 */
function validateRequired($data, $fields) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            return "Falta campo obligatorio: $field";
        }
    }
    return null;
}

// ============================================
// TANK OPERATIONS
// ============================================

// Get all tanks
if ($action === 'get_tanques') {
    executeWithErrorHandling(function() use ($pg) {
        $stmt = $pg->prepare("
            SELECT t.*, v.codigo as variedad_codigo, v.nombre as variedad_nombre, v.subtipo as variedad_subtipo
            FROM lab_tanques t
            LEFT JOIN lab_variedad v ON t.id_variedad = v.id
            WHERE t.estado = 1
            ORDER BY t.numero_tanque ASC
        ");
        $stmt->execute();
        $tanques = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($tanques);
    });
}

// Get single tank
if ($action === 'get_tanque') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        jsonResponse(['error' => 'ID de tanque inválido']);
    }
    
    $stmt = $pg->prepare("
        SELECT t.*, v.codigo as variedad_codigo, v.nombre as variedad_nombre, v.subtipo as variedad_subtipo
        FROM lab_tanques t
        LEFT JOIN lab_variedad v ON t.id_variedad = v.id
        WHERE t.id = ? AND t.estado = 1
    ");
    $stmt->execute([$id]);
    $tanque = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse($tanque ?: []);
}

// Save tank
if ($action === 'save_tanque') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $error = validateRequired($data, ['numero_tanque', 'capacidad_toneladas']);
    if ($error) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => $error]);
    }
    
    $id = intval($data['id'] ?? 0);
    
    if ($id > 0) {
        // Update existing
        $stmt = $pg->prepare("
            UPDATE lab_tanques 
            SET numero_tanque = ?, id_variedad = ?, capacidad_toneladas = ?, calidad = ?, fecha_actualizacion = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $data['numero_tanque'],
            $data['id_variedad'] ?: null,
            $data['capacidad_toneladas'],
            $data['calidad'] ?? null,
            $id
        ]);
        jsonResponse(['success' => true, 'id' => $id, 'message' => 'Tanque actualizado']);
    } else {
        // Insert new
        $stmt = $pg->prepare("
            INSERT INTO lab_tanques (numero_tanque, id_variedad, capacidad_toneladas, calidad)
            VALUES (?, ?, ?, ?)
            RETURNING id
        ");
        $stmt->execute([
            $data['numero_tanque'],
            $data['id_variedad'] ?: null,
            $data['capacidad_toneladas'],
            $data['calidad'] ?? null
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        jsonResponse(['success' => true, 'id' => $row['id'], 'message' => 'Tanque creado']);
    }
}

// Delete tank (soft delete)
if ($action === 'delete_tanque') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => 'ID de tanque inválido']);
    }
    
    $stmt = $pg->prepare("UPDATE lab_tanques SET estado = 0 WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Tanque eliminado']);
}

// ============================================
// VARIETY OPERATIONS
// ============================================

// Get all varieties
if ($action === 'get_variedades') {
    executeWithErrorHandling(function() use ($pg) {
        $stmt = $pg->prepare("SELECT * FROM lab_variedad WHERE estado = 1 ORDER BY codigo, nombre ASC");
        $stmt->execute();
        $variedades = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($variedades);
    });
}

// Get varieties by code (MB or IP)
if ($action === 'get_variedades_by_codigo') {
    $codigo = $_GET['codigo'] ?? '';
    if (!in_array($codigo, ['MB', 'IP'])) {
        http_response_code(400);
        jsonResponse(['error' => 'Código de variedad inválido']);
    }
    
    executeWithErrorHandling(function() use ($pg, $codigo) {
        $stmt = $pg->prepare("SELECT * FROM lab_variedad WHERE codigo = ? AND estado = 1 ORDER BY nombre ASC");
        $stmt->execute([$codigo]);
        $variedades = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($variedades);
    });
}

// ============================================
// SAMPLING LOCATION OPERATIONS
// ============================================

// Get all sampling locations
if ($action === 'get_lugares_muestreo') {
    executeWithErrorHandling(function() use ($pg) {
        $stmt = $pg->prepare("SELECT * FROM lab_lugar_muestreo WHERE estado = 1 ORDER BY nombre ASC");
        $stmt->execute();
        $lugares = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($lugares);
    });
}

// ============================================
// DAILY RECORD OPERATIONS
// ============================================

// Get daily records for a tank
if ($action === 'get_registros_diarios') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    $fecha_desde = $_GET['fecha_desde'] ?? date('Y-m-01');
    $fecha_hasta = $_GET['fecha_hasta'] ?? date('Y-m-d');
    
    $stmt = $pg->prepare("
        SELECT rd.*, t.numero_tanque, 
               c.ac_nombre1, c.ac_apellido1
        FROM lab_registro_diario rd
        JOIN lab_tanques t ON rd.id_tanque = t.id
        LEFT JOIN adm_colaboradores c ON rd.id_colaborador_cierre = c.ac_id
        WHERE (? = 0 OR rd.id_tanque = ?)
          AND rd.fecha BETWEEN ? AND ?
        ORDER BY rd.fecha DESC, t.numero_tanque ASC
    ");
    $stmt->execute([$id_tanque, $id_tanque, $fecha_desde, $fecha_hasta]);
    $registros = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($registros);
}

// Get today's records (7 rows for editing)
if ($action === 'get_registros_hoy') {
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    
    $stmt = $pg->prepare("
        SELECT rd.*, t.numero_tanque, t.capacidad_toneladas,
               v.nombre as variedad_nombre, t.calidad,
               (SELECT inventario_final FROM lab_registro_diario 
                WHERE id_tanque = rd.id_tanque AND fecha = (rd.fecha - INTERVAL '1 day')::date AND cerrado = true
                LIMIT 1) as inv_inicial_anterior
        FROM lab_registro_diario rd
        JOIN lab_tanques t ON rd.id_tanque = t.id
        LEFT JOIN lab_variedad v ON t.id_variedad = v.id
        WHERE rd.fecha = ?
        ORDER BY t.numero_tanque ASC
        LIMIT 10
    ");
    $stmt->execute([$fecha]);
    $registros = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get quality data for each tank for today
    foreach ($registros as &$registro) {
        $tanqueId = $registro['id_tanque'];
        
        // Get latest measurements for the day
        $stmtCalidad = $pg->prepare("
            SELECT 
                (SELECT porcentaje_humedad FROM lab_medicion_humedad 
                 WHERE id_tanque = ? AND DATE(fecha_hora) = ? 
                 ORDER BY fecha_hora DESC LIMIT 1) as calidad_humedad,
                (SELECT porcentaje_agl FROM lab_medicion_acidez 
                 WHERE id_tanque = ? AND DATE(fecha_hora) = ? 
                 ORDER BY fecha_hora DESC LIMIT 1) as calidad_acidez,
                (SELECT indice_yodo FROM lab_medicion_yodo 
                 WHERE id_tanque = ? AND DATE(fecha_hora) = ? 
                 ORDER BY fecha_hora DESC LIMIT 1) as calidad_yodo
        ");
        $stmtCalidad->execute([$tanqueId, $fecha, $tanqueId, $fecha, $tanqueId, $fecha]);
        $calidad = $stmtCalidad->fetch(PDO::FETCH_ASSOC);
        
        $registro['calidad_humedad'] = $calidad['calidad_humedad'];
        $registro['calidad_acidez'] = $calidad['calidad_acidez'];
        $registro['calidad_yodo'] = $calidad['calidad_yodo'];
    }
    
    jsonResponse($registros);
}

// Get previous day's closing inventory for a tank
if ($action === 'get_inventario_anterior') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    
    if ($id_tanque <= 0) {
        jsonResponse(['inventario_final' => 0]);
    }
    
    $stmt = $pg->prepare("
        SELECT inventario_final 
        FROM lab_registro_diario 
        WHERE id_tanque = ? AND fecha < ? AND cerrado = true
        ORDER BY fecha DESC
        LIMIT 1
    ");
    $stmt->execute([$id_tanque, $fecha]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse(['inventario_final' => $row['inventario_final'] ?? 0]);
}

// Save daily record
if ($action === 'save_registro_diario') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $error = validateRequired($data, ['id_tanque', 'fecha']);
    if ($error) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => $error]);
    }
    
    $id = intval($data['id'] ?? 0);
    
    // Get previous day's closing inventory as initial
    $stmt = $pg->prepare("
        SELECT inventario_final 
        FROM lab_registro_diario 
        WHERE id_tanque = ? AND fecha < ? AND cerrado = true
        ORDER BY fecha DESC
        LIMIT 1
    ");
    $stmt->execute([$data['id_tanque'], $data['fecha']]);
    $prev = $stmt->fetch(PDO::FETCH_ASSOC);
    $inventario_inicial = $prev['inventario_final'] ?? 0;
    
    if ($id > 0) {
        // Update existing
        $stmt = $pg->prepare("
            UPDATE lab_registro_diario 
            SET inventario_inicial = ?, despacho_neto = ?, inventario_final = ?, 
                temperatura_inicial = ?, temperatura_final = ?, observaciones = ?,
                fecha_actualizacion = NOW()
            WHERE id = ? AND cerrado = false
        ");
        $stmt->execute([
            $inventario_inicial,
            $data['despacho_neto'] ?? 0,
            $data['inventario_final'] ?? null,
            $data['temperatura_inicial'] ?? null,
            $data['temperatura_final'] ?? null,
            $data['observaciones'] ?? '',
            $id
        ]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(400);
            jsonResponse(['success' => false, 'error' => 'Registro ya cerrado o no encontrado']);
        }
        
        jsonResponse(['success' => true, 'id' => $id, 'message' => 'Registro actualizado']);
    } else {
        // Check if record already exists for this tank/date
        $check = $pg->prepare("SELECT id FROM lab_registro_diario WHERE id_tanque = ? AND fecha = ?");
        $check->execute([$data['id_tanque'], $data['fecha']]);
        if ($check->fetch()) {
            http_response_code(400);
            jsonResponse(['success' => false, 'error' => 'Ya existe un registro para este tanque en esta fecha']);
        }
        
        // Insert new
        $stmt = $pg->prepare("
            INSERT INTO lab_registro_diario 
            (id_tanque, fecha, inventario_inicial, despacho_neto, inventario_final, 
             temperatura_inicial, temperatura_final, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        ");
        $stmt->execute([
            $data['id_tanque'],
            $data['fecha'],
            $inventario_inicial,
            $data['despacho_neto'] ?? 0,
            $data['inventario_final'] ?? null,
            $data['temperatura_inicial'] ?? null,
            $data['temperatura_final'] ?? null,
            $data['observaciones'] ?? ''
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        jsonResponse(['success' => true, 'id' => $row['id'], 'message' => 'Registro creado']);
    }
}

// Close daily record
if ($action === 'cerrar_registro_diario') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id = intval($data['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => 'ID de registro inválido']);
    }
    
    if (!isset($data['inventario_final']) || $data['inventario_final'] === '') {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => 'Inventario final es requerido para cerrar']);
    }
    
    $stmt = $pg->prepare("
        UPDATE lab_registro_diario 
        SET inventario_final = ?, cerrado = true, 
            id_colaborador_cierre = ?, fecha_cierre = NOW(),
            fecha_actualizacion = NOW()
        WHERE id = ? AND cerrado = false
    ");
    $stmt->execute([
        $data['inventario_final'],
        $_SESSION['usuario_id'],
        $id
    ]);
    
    if ($stmt->rowCount() === 0) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => 'Registro ya cerrado o no encontrado']);
    }
    
    jsonResponse(['success' => true, 'message' => 'Registro cerrado exitosamente']);
}

// ============================================
// COLLABORATOR LOOKUP
// ============================================

// Get collaborator by cedula
if ($action === 'get_colaborador') {
    $cedula = $_GET['cedula'] ?? '';
    if (empty($cedula)) {
        jsonResponse([]);
    }
    
    $stmt = $pg->prepare("
        SELECT ac_id, ac_cedula, ac_nombre1, ac_nombre2, ac_apellido1, ac_apellido2
        FROM adm_colaboradores 
        WHERE ac_cedula = ? AND ac_id_situación IN ('A', 'V', 'P') 
        LIMIT 1
    ");
    $stmt->execute([$cedula]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse($row ?: []);
}

// ============================================
// MEASUREMENT OPERATIONS - ACIDITY
// ============================================

// Get acidity measurements for a tank
if ($action === 'get_mediciones_acidez') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    $limit = intval($_GET['limit'] ?? 50);
    
    $stmt = $pg->prepare("
        SELECT ma.*, t.numero_tanque, lm.nombre as lugar_muestreo
        FROM lab_medicion_acidez ma
        JOIN lab_tanques t ON ma.id_tanque = t.id
        LEFT JOIN lab_lugar_muestreo lm ON ma.id_lugar_muestreo = lm.id
        WHERE (? = 0 OR ma.id_tanque = ?)
        ORDER BY ma.fecha_hora DESC
        LIMIT ?
    ");
    $stmt->execute([$id_tanque, $id_tanque, $limit]);
    $mediciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($mediciones);
}

// Save acidity measurement
if ($action === 'save_medicion_acidez') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $error = validateRequired($data, ['id_tanque', 'tipo_medida']);
    if ($error) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => $error]);
    }
    
    executeWithErrorHandling(function() use ($pg, $data) {
        // Calculate %AGL if manual measurement with formula
        $porcentaje_agl = null;
        if ($data['tipo_medida'] === 'Manual' && isset($data['peso_muestra_w']) && isset($data['volumen_naoh_v'])) {
            $W = floatval($data['peso_muestra_w']);
            $V = floatval($data['volumen_naoh_v']);
            $N = floatval($data['normalidad_n'] ?? 0.1);
            if ($W > 0) {
                $porcentaje_agl = (25.6 * $V * $N) / $W;
            }
        } elseif ($data['tipo_medida'] === 'NIR' && isset($data['valor_manual'])) {
            $porcentaje_agl = floatval($data['valor_manual']);
        }
        
        $stmt = $pg->prepare("
            INSERT INTO lab_medicion_acidez 
            (id_tanque, tipo_medida, cantidad_muestra_gramos, peso_muestra_w, normalidad_n, volumen_naoh_v, 
             porcentaje_agl, valor_manual, id_lugar_muestreo, id_colaborador, cedula_colaborador, 
             nombre_colaborador, observaciones, tipo_origen, id_registro_origen, fecha_hora)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING id
        ");
        $stmt->execute([
            $data['id_tanque'],
            $data['tipo_medida'],
            $data['cantidad_muestra_gramos'] ?? null,
            $data['peso_muestra_w'] ?? null,
            $data['normalidad_n'] ?? 0.1,
            $data['volumen_naoh_v'] ?? null,
            $porcentaje_agl,
            $data['valor_manual'] ?? null,
            $data['id_lugar_muestreo'] ?? null,
            $data['id_colaborador'] ?? null,
            $data['cedula_colaborador'] ?? null,
            $data['nombre_colaborador'] ?? null,
            $data['observaciones'] ?? '',
            $data['tipo_origen'] ?? 'tanque',
            $data['id_registro_origen'] ?? null
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        jsonResponse(['success' => true, 'id' => $row['id'], 'porcentaje_agl' => $porcentaje_agl]);
    });
}

// ============================================
// MEASUREMENT OPERATIONS - HUMIDITY
// ============================================

// Get humidity measurements for a tank
if ($action === 'get_mediciones_humedad') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    $limit = intval($_GET['limit'] ?? 50);
    
    $stmt = $pg->prepare("
        SELECT mh.*, t.numero_tanque, lm.nombre as lugar_muestreo
        FROM lab_medicion_humedad mh
        JOIN lab_tanques t ON mh.id_tanque = t.id
        LEFT JOIN lab_lugar_muestreo lm ON mh.id_lugar_muestreo = lm.id
        WHERE (? = 0 OR mh.id_tanque = ?)
        ORDER BY mh.fecha_hora DESC
        LIMIT ?
    ");
    $stmt->execute([$id_tanque, $id_tanque, $limit]);
    $mediciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($mediciones);
}

// Save humidity measurement
if ($action === 'save_medicion_humedad') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $error = validateRequired($data, ['id_tanque', 'tipo_medida']);
    if ($error) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => $error]);
    }
    
    executeWithErrorHandling(function() use ($pg, $data) {
        // Calculate humidity if manual measurement with formula
        $peso_muestra_seca_d = null;
        $peso_agua_e = null;
        $porcentaje_humedad = null;
        
        if ($data['tipo_medida'] === 'Manual' && isset($data['peso_recipiente_a']) && isset($data['peso_muestra_humedad_b']) && isset($data['peso_muestra_seca_recipiente_c'])) {
            $A = floatval($data['peso_recipiente_a']);
            $B = floatval($data['peso_muestra_humedad_b']);
            $C = floatval($data['peso_muestra_seca_recipiente_c']);
            
            $peso_muestra_seca_d = $C - $A;
            $peso_agua_e = $B - $C;
            
            if ($B > 0) {
                $porcentaje_humedad = ($peso_agua_e / $B) * 100;
            }
        } elseif ($data['tipo_medida'] === 'NIR' && isset($data['valor_manual'])) {
            $porcentaje_humedad = floatval($data['valor_manual']);
        }
        
        $stmt = $pg->prepare("
            INSERT INTO lab_medicion_humedad 
            (id_tanque, tipo_medida, peso_recipiente_a, peso_muestra_humedad_b, peso_muestra_seca_recipiente_c,
             peso_muestra_seca_d, peso_agua_e, porcentaje_humedad, valor_manual, id_lugar_muestreo, 
             id_colaborador, cedula_colaborador, nombre_colaborador, observaciones, tipo_origen, id_registro_origen, fecha_hora)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING id
        ");
        $stmt->execute([
            $data['id_tanque'],
            $data['tipo_medida'],
            $data['peso_recipiente_a'] ?? null,
            $data['peso_muestra_humedad_b'] ?? null,
            $data['peso_muestra_seca_recipiente_c'] ?? null,
            $peso_muestra_seca_d,
            $peso_agua_e,
            $porcentaje_humedad,
            $data['valor_manual'] ?? null,
            $data['id_lugar_muestreo'] ?? null,
            $data['id_colaborador'] ?? null,
            $data['cedula_colaborador'] ?? null,
            $data['nombre_colaborador'] ?? null,
            $data['observaciones'] ?? '',
            $data['tipo_origen'] ?? 'tanque',
            $data['id_registro_origen'] ?? null
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        jsonResponse([
            'success' => true, 
            'id' => $row['id'], 
            'peso_muestra_seca_d' => $peso_muestra_seca_d,
            'peso_agua_e' => $peso_agua_e,
            'porcentaje_humedad' => $porcentaje_humedad
        ]);
    });
}

// ============================================
// MEASUREMENT OPERATIONS - IODINE
// ============================================

// Get iodine measurements for a tank
if ($action === 'get_mediciones_yodo') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    $limit = intval($_GET['limit'] ?? 50);
    
    $stmt = $pg->prepare("
        SELECT my.*, t.numero_tanque, lm.nombre as lugar_muestreo
        FROM lab_medicion_yodo my
        JOIN lab_tanques t ON my.id_tanque = t.id
        LEFT JOIN lab_lugar_muestreo lm ON my.id_lugar_muestreo = lm.id
        WHERE (? = 0 OR my.id_tanque = ?)
        ORDER BY my.fecha_hora DESC
        LIMIT ?
    ");
    $stmt->execute([$id_tanque, $id_tanque, $limit]);
    $mediciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($mediciones);
}

// Save iodine measurement
if ($action === 'save_medicion_yodo') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $error = validateRequired($data, ['id_tanque', 'tipo_medida']);
    if ($error) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => $error]);
    }
    
    executeWithErrorHandling(function() use ($pg, $data) {
        // Calculate iodine index if manual measurement with formula: % = (12.69*0.1*(VB-VA))/W
        $indice_yodo = null;
        
        if ($data['tipo_medida'] === 'Manual' && isset($data['peso_aceite_w']) && isset($data['volumen_blanco_vb']) && isset($data['volumen_aceite_va'])) {
            $W = floatval($data['peso_aceite_w']);
            $VB = floatval($data['volumen_blanco_vb']);
            $VA = floatval($data['volumen_aceite_va']);
            
            if ($W > 0) {
                $indice_yodo = (12.69 * 0.1 * ($VB - $VA)) / $W;
            }
        } elseif ($data['tipo_medida'] === 'NIR' && isset($data['valor_manual'])) {
            $indice_yodo = floatval($data['valor_manual']);
        }
        
        $stmt = $pg->prepare("
            INSERT INTO lab_medicion_yodo 
            (id_tanque, tipo_medida, peso_aceite_w, volumen_blanco_vb, volumen_aceite_va,
             indice_yodo, valor_manual, id_lugar_muestreo, id_colaborador, cedula_colaborador, 
             nombre_colaborador, observaciones, tipo_origen, id_registro_origen, fecha_hora)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING id
        ");
        $stmt->execute([
            $data['id_tanque'],
            $data['tipo_medida'],
            $data['peso_aceite_w'] ?? null,
            $data['volumen_blanco_vb'] ?? null,
            $data['volumen_aceite_va'] ?? null,
            $indice_yodo,
            $data['valor_manual'] ?? null,
            $data['id_lugar_muestreo'] ?? null,
            $data['id_colaborador'] ?? null,
            $data['cedula_colaborador'] ?? null,
            $data['nombre_colaborador'] ?? null,
            $data['observaciones'] ?? '',
            $data['tipo_origen'] ?? 'tanque',
            $data['id_registro_origen'] ?? null
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        jsonResponse(['success' => true, 'id' => $row['id'], 'indice_yodo' => $indice_yodo]);
    });
}

// ============================================
// GET LAST QUALITY FOR TANK
// ============================================

// Get the last quality measurement for a tank (from humidity measurements)
if ($action === 'get_ultima_calidad') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    
    if ($id_tanque <= 0) {
        jsonResponse(['calidad' => null]);
    }
    
    // Get the latest humidity measurement for the tank
    $stmt = $pg->prepare("
        SELECT porcentaje_humedad, fecha_hora
        FROM lab_medicion_humedad 
        WHERE id_tanque = ?
        ORDER BY fecha_hora DESC
        LIMIT 1
    ");
    $stmt->execute([$id_tanque]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'porcentaje_humedad' => $row['porcentaje_humedad'] ?? null,
        'fecha_hora' => $row['fecha_hora'] ?? null
    ]);
}

// ============================================
// COMBINED MEASUREMENTS FOR A TANK
// ============================================

if ($action === 'get_mediciones_tanque') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    
    if ($id_tanque <= 0) {
        http_response_code(400);
        jsonResponse(['error' => 'ID de tanque inválido']);
    }
    
    // Get acidity measurements
    $stmt = $pg->prepare("
        SELECT 'acidez' as tipo, porcentaje_agl as valor, fecha_hora, observaciones
        FROM lab_medicion_acidez WHERE id_tanque = ?
        ORDER BY fecha_hora DESC LIMIT 10
    ");
    $stmt->execute([$id_tanque]);
    $acidez = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get humidity measurements
    $stmt = $pg->prepare("
        SELECT 'humedad' as tipo, porcentaje_humedad as valor, fecha_hora, observaciones
        FROM lab_medicion_humedad WHERE id_tanque = ?
        ORDER BY fecha_hora DESC LIMIT 10
    ");
    $stmt->execute([$id_tanque]);
    $humedad = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get iodine measurements
    $stmt = $pg->prepare("
        SELECT 'yodo' as tipo, indice_yodo as valor, fecha_hora, observaciones
        FROM lab_medicion_yodo WHERE id_tanque = ?
        ORDER BY fecha_hora DESC LIMIT 10
    ");
    $stmt->execute([$id_tanque]);
    $yodo = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'acidez' => $acidez,
        'humedad' => $humedad,
        'yodo' => $yodo
    ]);
}

// ============================================
// SECADORES (DRYERS) OPERATIONS
// ============================================

// Get all secadores/dryers
if ($action === 'get_secadores') {
    executeWithErrorHandling(function() use ($pg) {
        $stmt = $pg->prepare("SELECT * FROM lab_secadores WHERE estado = 1 ORDER BY nombre ASC");
        $stmt->execute();
        $secadores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($secadores);
    });
}

// Get single secador
if ($action === 'get_secador') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        jsonResponse(['error' => 'ID de secador inválido']);
    }
    
    executeWithErrorHandling(function() use ($pg, $id) {
        $stmt = $pg->prepare("SELECT * FROM lab_secadores WHERE id = ? AND estado = 1");
        $stmt->execute([$id]);
        $secador = $stmt->fetch(PDO::FETCH_ASSOC);
        jsonResponse($secador ?: []);
    });
}

// ============================================
// BOMBEO (PUMPING) OPERATIONS
// ============================================

// Save bombeo/pumping measurement
if ($action === 'save_medicion_bombeo') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $error = validateRequired($data, ['id_secador', 'id_tanque_destino', 'toneladas']);
    if ($error) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => $error]);
    }
    
    executeWithErrorHandling(function() use ($pg, $data) {
        $stmt = $pg->prepare("
            INSERT INTO lab_medicion_bombeo 
            (id_secador, id_tanque_destino, toneladas, porcentaje_humedad, porcentaje_acidez, indice_yodo,
             id_colaborador, cedula_colaborador, nombre_colaborador, observaciones, fecha_hora)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING id
        ");
        $stmt->execute([
            $data['id_secador'],
            $data['id_tanque_destino'],
            $data['toneladas'],
            $data['porcentaje_humedad'] ?? null,
            $data['porcentaje_acidez'] ?? null,
            $data['indice_yodo'] ?? null,
            $data['id_colaborador'] ?? null,
            $data['cedula_colaborador'] ?? null,
            $data['nombre_colaborador'] ?? null,
            $data['observaciones'] ?? ''
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update daily record with secador totals
        updateDailySecadorTotals($data['id_tanque_destino']);
        
        jsonResponse(['success' => true, 'id' => $row['id']]);
    });
}

// Get bombeo measurements for today
if ($action === 'get_bombeos_hoy') {
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    
    executeWithErrorHandling(function() use ($pg, $fecha, $id_tanque) {
        $stmt = $pg->prepare("
            SELECT mb.*, s.nombre as secador_nombre, s.codigo as secador_codigo,
                   t.numero_tanque as tanque_destino_numero
            FROM lab_medicion_bombeo mb
            JOIN lab_secadores s ON mb.id_secador = s.id
            JOIN lab_tanques t ON mb.id_tanque_destino = t.id
            WHERE DATE(mb.fecha_hora) = ?
            AND (? = 0 OR mb.id_tanque_destino = ?)
            ORDER BY mb.fecha_hora DESC
        ");
        $stmt->execute([$fecha, $id_tanque, $id_tanque]);
        $bombeos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($bombeos);
    });
}

// ============================================
// DESPACHO (DISPATCH) OPERATIONS
// ============================================

// Save despacho/dispatch measurement
if ($action === 'save_medicion_despacho') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $error = validateRequired($data, ['id_tanque', 'placa_vehiculo', 'responsable_vehiculo', 'toneladas']);
    if ($error) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => $error]);
    }
    
    executeWithErrorHandling(function() use ($pg, $data) {
        $stmt = $pg->prepare("
            INSERT INTO lab_medicion_despacho 
            (id_tanque, placa_vehiculo, responsable_vehiculo, toneladas, 
             porcentaje_humedad, porcentaje_acidez, indice_yodo,
             id_colaborador, cedula_colaborador, nombre_colaborador, observaciones, fecha_hora)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING id
        ");
        $stmt->execute([
            $data['id_tanque'],
            $data['placa_vehiculo'],
            $data['responsable_vehiculo'],
            $data['toneladas'],
            $data['porcentaje_humedad'] ?? null,
            $data['porcentaje_acidez'] ?? null,
            $data['indice_yodo'] ?? null,
            $data['id_colaborador'] ?? null,
            $data['cedula_colaborador'] ?? null,
            $data['nombre_colaborador'] ?? null,
            $data['observaciones'] ?? ''
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update daily record despacho total
        updateDailyDespachoTotals($data['id_tanque']);
        
        jsonResponse(['success' => true, 'id' => $row['id']]);
    });
}

// Get despacho measurements for today
if ($action === 'get_despachos_hoy') {
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    
    executeWithErrorHandling(function() use ($pg, $fecha, $id_tanque) {
        $stmt = $pg->prepare("
            SELECT md.*, t.numero_tanque
            FROM lab_medicion_despacho md
            JOIN lab_tanques t ON md.id_tanque = t.id
            WHERE DATE(md.fecha_hora) = ?
            AND (? = 0 OR md.id_tanque = ?)
            ORDER BY md.fecha_hora DESC
        ");
        $stmt->execute([$fecha, $id_tanque, $id_tanque]);
        $despachos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($despachos);
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update daily record with secador totals
 */
function updateDailySecadorTotals($id_tanque) {
    global $pg;
    $fecha = date('Y-m-d');
    
    // Get sum of bombeos for today
    $stmt = $pg->prepare("
        SELECT COUNT(*) as total_secadores, COALESCE(SUM(toneladas), 0) as total_ton_secadores
        FROM lab_medicion_bombeo 
        WHERE id_tanque_destino = ? AND DATE(fecha_hora) = ?
    ");
    $stmt->execute([$id_tanque, $fecha]);
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Update or create daily record
    $stmt = $pg->prepare("
        UPDATE lab_registro_diario 
        SET total_secadores = ?, total_ton_secadores = ?, fecha_actualizacion = NOW()
        WHERE id_tanque = ? AND fecha = ?
    ");
    $stmt->execute([
        $totals['total_secadores'],
        $totals['total_ton_secadores'],
        $id_tanque,
        $fecha
    ]);
}

/**
 * Update daily record with despacho totals
 */
function updateDailyDespachoTotals($id_tanque) {
    global $pg;
    $fecha = date('Y-m-d');
    
    // Get sum of despachos for today
    $stmt = $pg->prepare("
        SELECT COALESCE(SUM(toneladas), 0) as total_despacho
        FROM lab_medicion_despacho 
        WHERE id_tanque = ? AND DATE(fecha_hora) = ?
    ");
    $stmt->execute([$id_tanque, $fecha]);
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Update daily record despacho_neto
    $stmt = $pg->prepare("
        UPDATE lab_registro_diario 
        SET despacho_neto = ?, fecha_actualizacion = NOW()
        WHERE id_tanque = ? AND fecha = ?
    ");
    $stmt->execute([
        $totals['total_despacho'],
        $id_tanque,
        $fecha
    ]);
}

// ============================================
// GET ALL MEASUREMENTS (with filters)
// ============================================

if ($action === 'get_all_mediciones') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    $fecha_desde = $_GET['fecha_desde'] ?? '';
    $fecha_hasta = $_GET['fecha_hasta'] ?? '';
    $tipo = $_GET['tipo'] ?? '';
    
    executeWithErrorHandling(function() use ($pg, $id_tanque, $fecha_desde, $fecha_hasta, $tipo) {
        $acidez = [];
        $humedad = [];
        $yodo = [];
        
        // Build date condition
        $dateCondition = "";
        $dateParams = [];
        if ($fecha_desde && $fecha_hasta) {
            $dateCondition = " AND DATE(fecha_hora) BETWEEN ? AND ?";
            $dateParams = [$fecha_desde, $fecha_hasta];
        }
        
        // Get acidez if no type filter or type is acidez
        if (!$tipo || $tipo === 'acidez') {
            $sql = "
                SELECT ma.*, t.numero_tanque, lm.nombre as lugar_nombre,
                       mb.toneladas as bombeo_toneladas, s.nombre as secador_nombre, s.codigo as secador_codigo,
                       md.toneladas as despacho_toneladas, md.placa_vehiculo, md.responsable_vehiculo
                FROM lab_medicion_acidez ma
                JOIN lab_tanques t ON ma.id_tanque = t.id
                LEFT JOIN lab_lugar_muestreo lm ON ma.id_lugar_muestreo = lm.id
                LEFT JOIN lab_medicion_bombeo mb ON ma.id_registro_origen = mb.id AND ma.tipo_origen = 'bombeo'
                LEFT JOIN lab_secadores s ON mb.id_secador = s.id
                LEFT JOIN lab_medicion_despacho md ON ma.id_registro_origen = md.id AND ma.tipo_origen = 'despacho'
                WHERE (? = 0 OR ma.id_tanque = ?)" . $dateCondition . "
                ORDER BY ma.fecha_hora DESC LIMIT 100
            ";
            $stmt = $pg->prepare($sql);
            $params = array_merge([$id_tanque, $id_tanque], $dateParams);
            $stmt->execute($params);
            $acidez = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Get humedad if no type filter or type is humedad
        if (!$tipo || $tipo === 'humedad') {
            $sql = "
                SELECT mh.*, t.numero_tanque, lm.nombre as lugar_nombre,
                       mb.toneladas as bombeo_toneladas, s.nombre as secador_nombre, s.codigo as secador_codigo,
                       md.toneladas as despacho_toneladas, md.placa_vehiculo, md.responsable_vehiculo
                FROM lab_medicion_humedad mh
                JOIN lab_tanques t ON mh.id_tanque = t.id
                LEFT JOIN lab_lugar_muestreo lm ON mh.id_lugar_muestreo = lm.id
                LEFT JOIN lab_medicion_bombeo mb ON mh.id_registro_origen = mb.id AND mh.tipo_origen = 'bombeo'
                LEFT JOIN lab_secadores s ON mb.id_secador = s.id
                LEFT JOIN lab_medicion_despacho md ON mh.id_registro_origen = md.id AND mh.tipo_origen = 'despacho'
                WHERE (? = 0 OR mh.id_tanque = ?)" . $dateCondition . "
                ORDER BY mh.fecha_hora DESC LIMIT 100
            ";
            $stmt = $pg->prepare($sql);
            $params = array_merge([$id_tanque, $id_tanque], $dateParams);
            $stmt->execute($params);
            $humedad = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Get yodo if no type filter or type is yodo
        if (!$tipo || $tipo === 'yodo') {
            $sql = "
                SELECT my.*, t.numero_tanque, lm.nombre as lugar_nombre,
                       mb.toneladas as bombeo_toneladas, s.nombre as secador_nombre, s.codigo as secador_codigo,
                       md.toneladas as despacho_toneladas, md.placa_vehiculo, md.responsable_vehiculo
                FROM lab_medicion_yodo my
                JOIN lab_tanques t ON my.id_tanque = t.id
                LEFT JOIN lab_lugar_muestreo lm ON my.id_lugar_muestreo = lm.id
                LEFT JOIN lab_medicion_bombeo mb ON my.id_registro_origen = mb.id AND my.tipo_origen = 'bombeo'
                LEFT JOIN lab_secadores s ON mb.id_secador = s.id
                LEFT JOIN lab_medicion_despacho md ON my.id_registro_origen = md.id AND my.tipo_origen = 'despacho'
                WHERE (? = 0 OR my.id_tanque = ?)" . $dateCondition . "
                ORDER BY my.fecha_hora DESC LIMIT 100
            ";
            $stmt = $pg->prepare($sql);
            $params = array_merge([$id_tanque, $id_tanque], $dateParams);
            $stmt->execute($params);
            $yodo = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        jsonResponse([
            'acidez' => $acidez,
            'humedad' => $humedad,
            'yodo' => $yodo
        ]);
    });
}

// Get measurement detail
if ($action === 'get_medicion_detalle') {
    $tipo = $_GET['tipo'] ?? '';
    $id = intval($_GET['id'] ?? 0);
    
    if (!$tipo || $id <= 0) {
        http_response_code(400);
        jsonResponse(['error' => 'Parámetros inválidos']);
    }
    
    $table = '';
    switch ($tipo) {
        case 'acidez':
            $table = 'lab_medicion_acidez';
            break;
        case 'humedad':
            $table = 'lab_medicion_humedad';
            break;
        case 'yodo':
            $table = 'lab_medicion_yodo';
            break;
        default:
            http_response_code(400);
            jsonResponse(['error' => 'Tipo de medición inválido']);
    }
    
    // Whitelist validation - table name is already validated by switch above
    $allowedTables = ['lab_medicion_acidez', 'lab_medicion_humedad', 'lab_medicion_yodo'];
    if (!in_array($table, $allowedTables)) {
        http_response_code(400);
        jsonResponse(['error' => 'Tabla no permitida']);
    }
    
    // Use separate queries for each table type instead of interpolation
    // Include bombeo and despacho related data for proper modal display
    if ($tipo === 'acidez') {
        $stmt = $pg->prepare("
            SELECT m.*, t.numero_tanque, lm.nombre as lugar_nombre,
                   mb.toneladas as bombeo_toneladas, s.nombre as secador_nombre, s.codigo as secador_codigo,
                   md.toneladas as despacho_toneladas, md.placa_vehiculo, md.responsable_vehiculo
            FROM lab_medicion_acidez m
            JOIN lab_tanques t ON m.id_tanque = t.id
            LEFT JOIN lab_lugar_muestreo lm ON m.id_lugar_muestreo = lm.id
            LEFT JOIN lab_medicion_bombeo mb ON m.id_registro_origen = mb.id AND m.tipo_origen = 'bombeo'
            LEFT JOIN lab_secadores s ON mb.id_secador = s.id
            LEFT JOIN lab_medicion_despacho md ON m.id_registro_origen = md.id AND m.tipo_origen = 'despacho'
            WHERE m.id = ?
        ");
    } elseif ($tipo === 'humedad') {
        $stmt = $pg->prepare("
            SELECT m.*, t.numero_tanque, lm.nombre as lugar_nombre,
                   mb.toneladas as bombeo_toneladas, s.nombre as secador_nombre, s.codigo as secador_codigo,
                   md.toneladas as despacho_toneladas, md.placa_vehiculo, md.responsable_vehiculo
            FROM lab_medicion_humedad m
            JOIN lab_tanques t ON m.id_tanque = t.id
            LEFT JOIN lab_lugar_muestreo lm ON m.id_lugar_muestreo = lm.id
            LEFT JOIN lab_medicion_bombeo mb ON m.id_registro_origen = mb.id AND m.tipo_origen = 'bombeo'
            LEFT JOIN lab_secadores s ON mb.id_secador = s.id
            LEFT JOIN lab_medicion_despacho md ON m.id_registro_origen = md.id AND m.tipo_origen = 'despacho'
            WHERE m.id = ?
        ");
    } else {
        $stmt = $pg->prepare("
            SELECT m.*, t.numero_tanque, lm.nombre as lugar_nombre,
                   mb.toneladas as bombeo_toneladas, s.nombre as secador_nombre, s.codigo as secador_codigo,
                   md.toneladas as despacho_toneladas, md.placa_vehiculo, md.responsable_vehiculo
            FROM lab_medicion_yodo m
            JOIN lab_tanques t ON m.id_tanque = t.id
            LEFT JOIN lab_lugar_muestreo lm ON m.id_lugar_muestreo = lm.id
            LEFT JOIN lab_medicion_bombeo mb ON m.id_registro_origen = mb.id AND m.tipo_origen = 'bombeo'
            LEFT JOIN lab_secadores s ON mb.id_secador = s.id
            LEFT JOIN lab_medicion_despacho md ON m.id_registro_origen = md.id AND m.tipo_origen = 'despacho'
            WHERE m.id = ?
        ");
    }
    $stmt->execute([$id]);
    $detalle = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse($detalle ?: []);
}

// ============================================
// SAVE MEASUREMENT WITH REFERENCE/TEMPERATURE DATA
// ============================================

if ($action === 'save_medicion_calculo') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id = intval($data['id'] ?? 0);
    $tipo = $data['tipo'] ?? ''; // 'inicial' or 'final'
    
    if ($id <= 0 || !in_array($tipo, ['inicial', 'final'])) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => 'Parámetros inválidos']);
    }
    
    if ($tipo === 'inicial') {
        $stmt = $pg->prepare("
            UPDATE lab_registro_diario 
            SET medicion_inicial = ?, p_ref_ini = ?, p_ref_fin = ?, fecha_actualizacion = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $data['medicion_resultado'] ?? null,
            $data['p_ref_ini'] ?? null,
            $data['p_ref_fin'] ?? null,
            $id
        ]);
    } else {
        $stmt = $pg->prepare("
            UPDATE lab_registro_diario 
            SET medicion_final = ?, p_ref_ini_final = ?, p_ref_fin_final = ?, fecha_actualizacion = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $data['medicion_resultado'] ?? null,
            $data['p_ref_ini'] ?? null,
            $data['p_ref_fin'] ?? null,
            $id
        ]);
    }
    
    jsonResponse(['success' => true, 'message' => 'Medición guardada']);
}

// Save temperature
if ($action === 'save_temperatura') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id = intval($data['id'] ?? 0);
    $tipo = $data['tipo'] ?? ''; // 'inicial' or 'final'
    
    if ($id <= 0 || !in_array($tipo, ['inicial', 'final'])) {
        http_response_code(400);
        jsonResponse(['success' => false, 'error' => 'Parámetros inválidos']);
    }
    
    // Use separate queries instead of variable interpolation for security
    if ($tipo === 'inicial') {
        $stmt = $pg->prepare("
            UPDATE lab_registro_diario 
            SET temperatura_inicial = ?, fecha_actualizacion = NOW()
            WHERE id = ?
        ");
    } else {
        $stmt = $pg->prepare("
            UPDATE lab_registro_diario 
            SET temperatura_final = ?, fecha_actualizacion = NOW()
            WHERE id = ?
        ");
    }
    $stmt->execute([
        $data['temperatura'] ?? null,
        $id
    ]);
    
    jsonResponse(['success' => true, 'message' => 'Temperatura guardada']);
}

// Get daily quality from measurements
if ($action === 'get_calidad_dia') {
    $id_tanque = intval($_GET['id_tanque'] ?? 0);
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    
    if ($id_tanque <= 0) {
        jsonResponse(['calidad_humedad' => null, 'calidad_acidez' => null, 'calidad_yodo' => null]);
    }
    
    // Get latest measurements for the day
    $stmt = $pg->prepare("
        SELECT 
            (SELECT porcentaje_humedad FROM lab_medicion_humedad 
             WHERE id_tanque = ? AND DATE(fecha_hora) = ? 
             ORDER BY fecha_hora DESC LIMIT 1) as calidad_humedad,
            (SELECT porcentaje_agl FROM lab_medicion_acidez 
             WHERE id_tanque = ? AND DATE(fecha_hora) = ? 
             ORDER BY fecha_hora DESC LIMIT 1) as calidad_acidez,
            (SELECT indice_yodo FROM lab_medicion_yodo 
             WHERE id_tanque = ? AND DATE(fecha_hora) = ? 
             ORDER BY fecha_hora DESC LIMIT 1) as calidad_yodo
    ");
    $stmt->execute([$id_tanque, $fecha, $id_tanque, $fecha, $id_tanque, $fecha]);
    $calidad = $stmt->fetch(PDO::FETCH_ASSOC);
    
    jsonResponse($calidad ?: ['calidad_humedad' => null, 'calidad_acidez' => null, 'calidad_yodo' => null]);
}

// If action not recognized
jsonResponse(['success' => false, 'error' => 'Acción no reconocida']);
