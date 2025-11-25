<?php
/**
 * Web Main File Upload Handler
 * Handles file uploads for favicon and login images
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
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
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
    
    if (!isset($_FILES['file'])) {
        throw new Exception('No se encontró el archivo');
    }
    
    $file = $_FILES['file'];
    $uploadType = $_POST['upload_type'] ?? 'favicon'; // favicon or login_image
    
    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir el archivo');
    }
    
    // Check file size
    if ($file['size'] > $maxFileSize) {
        $maxMB = round($maxFileSize / 1024 / 1024, 1);
        throw new Exception("El archivo es demasiado grande (máximo {$maxMB}MB)");
    }
    
    // Validate file extension first
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Extensión de archivo no permitida. Solo se permiten: ' . implode(', ', $allowedExtensions));
    }
    
    // Check MIME type using finfo (more reliable than $_FILES['type'])
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WEBP)');
    }
    
    // Additional validation: check if it's really an image
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        throw new Exception('El archivo no es una imagen válida');
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
