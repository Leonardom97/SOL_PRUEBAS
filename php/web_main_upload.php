<?php

/**
 * Web Main File Upload Handler
 * Handles file uploads for favicon, login images, and effect icons
 * Access: Administrator role only
 */

// Apply security headers
require_once __DIR__ . '/security_headers.php';

session_start();
header('Content-Type: application/json');

// Check if user is logged in and has administrator role
if (!isset($_SESSION['usuario_id']) || !isset($_SESSION['rol_nombre'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

// Only allow administrators to access this API
if ($_SESSION['rol_nombre'] !== 'Administrador' && $_SESSION['rol_nombre'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. Solo administradores pueden subir archivos.']);
    exit;
}

// Load configuration
require_once __DIR__ . '/config.php';

// Upload configuration
$uploadDir = __DIR__ . '/../assets/img/uploads/';
// Also support specific directory for effects if needed, but keeping it simple in uploads/ is fine.
// The user might want them in 'assets/img/efectos/' based on previous context, but 'uploads/' is safer for permissions.
// Let's stick to 'uploads/' for user-uploaded content to avoid messing with core assets.

$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
$maxFileSize = UPLOAD_MAX_SIZE; // From config

// Create upload directory if it doesn't exist
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Ensure .htaccess exists to prevent script execution
$htaccessPath = $uploadDir . '.htaccess';
if (!file_exists($htaccessPath)) {
    $htaccessContent = "# Prevent script execution\n" .
        "<FilesMatch \"\\.(php|php3|php4|php5|phtml|pl|py|jsp|asp|htm|shtml|sh|cgi)$\">\n" .
        "    Order Allow,Deny\n" .
        "    Deny from all\n" .
        "</FilesMatch>\n";
    file_put_contents($htaccessPath, $htaccessContent);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No se recibió ningún archivo o hubo un error en la subida');
    }

    if (!isset($_POST['upload_type'])) {
        throw new Exception('Tipo de subida no especificado');
    }

    $file = $_FILES['file'];
    $uploadType = $_POST['upload_type'];

    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    // Validate extension
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Extensión de archivo no permitida');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    // Validate mime type
    if ($fileExtension === 'svg' && ($mimeType === 'image/svg+xml' || $mimeType === 'text/xml' || $mimeType === 'text/plain')) {
        // SVG is fine (some servers detect as text/xml or text/plain)
    } elseif (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WEBP, SVG)');
    }

    // Additional validation: check if it's really an image (skip for SVG as getimagesize might fail or be unsafe)
    if ($fileExtension !== 'svg') {
        $imageInfo = @getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            throw new Exception('El archivo no es una imagen válida');
        }
    }

    // Sanitize upload type
    $uploadType = preg_replace('/[^a-z0-9_-]/i', '', $uploadType);

    // Generate unique filename with timestamp
    $timestamp = time();
    $randomString = bin2hex(random_bytes(8));
    $filename = $uploadType . '_' . $timestamp . '_' . $randomString . '.' . $fileExtension;
    $targetPath = $uploadDir . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Error al guardar el archivo');
    }

    // Set restrictive permissions
    chmod($targetPath, 0644);

    // Return relative path for database
    $relativePath = 'assets/img/uploads/' . $filename;

    // Log successful upload
    error_log("File uploaded successfully by user {$_SESSION['usuario_id']}: $filename");

    echo json_encode([
        'success' => true,
        'message' => 'Archivo subido exitosamente',
        'path' => $relativePath,
        'filename' => $filename
    ]);
} catch (Exception $e) {
    // Log error without exposing details to client
    error_log("File upload error: " . $e->getMessage());

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
