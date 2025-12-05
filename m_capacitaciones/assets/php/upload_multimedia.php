<?php
// upload_multimedia.php
// Sube archivos multimedia para las evaluaciones

require_once __DIR__ . '/../../../php/security_headers.php';
session_start();

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión no iniciada']);
    exit;
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'Error en la subida del archivo']);
    exit;
}

// Límite de 300MB
$maxSize = 300 * 1024 * 1024;
if ($_FILES['file']['size'] > $maxSize) {
    echo json_encode(['success' => false, 'error' => 'El archivo excede el límite de 300MB']);
    exit;
}

$file = $_FILES['file'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = ['mp4', 'webm', 'pdf', 'jpg', 'png', 'jpeg'];

if (!in_array($ext, $allowed)) {
    echo json_encode(['success' => false, 'error' => 'Tipo de archivo no permitido']);
    exit;
}

// Directorio de destino
$uploadDir = __DIR__ . '/../uploads/multimedia/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Nombre único
$filename = uniqid('eval_') . '.' . $ext;
$destination = $uploadDir . $filename;

// Eliminar archivo anterior si existe
if (isset($_POST['previous_file']) && !empty($_POST['previous_file'])) {
    $prevPath = $_POST['previous_file'];
    // Validar que el archivo esté dentro del directorio de uploads para seguridad
    // Asumimos que prevPath viene como 'assets/uploads/multimedia/archivo.ext'

    // Convertir a ruta absoluta del sistema de archivos
    // __DIR__ es .../m_capacitaciones/assets/php
    // uploadDir es .../m_capacitaciones/assets/uploads/multimedia/

    // Extraer solo el nombre del archivo para evitar traversal
    $prevName = basename($prevPath);
    $prevAbsPath = $uploadDir . $prevName;

    if (file_exists($prevAbsPath) && is_file($prevAbsPath)) {
        unlink($prevAbsPath);
    }
}

if (move_uploaded_file($file['tmp_name'], $destination)) {
    // Retornar ruta relativa para guardar en BD
    $relativePath = 'assets/uploads/multimedia/' . $filename;

    $type = 'imagen';
    if ($ext == 'mp4' || $ext == 'webm') $type = 'video';
    else if ($ext == 'pdf') $type = 'pdf';

    echo json_encode([
        'success' => true,
        'path' => $relativePath,
        'type' => $type
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Error al mover el archivo']);
}
