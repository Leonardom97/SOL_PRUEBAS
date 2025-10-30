<?php
// Indica que la respuesta será en formato JSON
header('Content-Type: application/json');

// Obtiene el valor de 'cedula' desde la URL (GET), si no existe, devuelve error
$cedula = $_GET['cedula'] ?? '';
if (!$cedula) {
    echo json_encode(['error' => 'falta cedula']); // Mensaje de error si no se proporciona cédula
    exit;
}

try {
    // Datos de conexión al servidor SQL Server
    $serverName = "192.168.0.199";       // Dirección IP o nombre del servidor
    $database = "SVN_G4026_OSM";         // Nombre de la base de datos
    $username = "sa";                    // Usuario de la base de datos
    $password = "Sap2015";               // Contraseña del usuario

    // Conexión a SQL Server usando PDO
    $conn_sqlsrv = new PDO("sqlsrv:server=$serverName;Database=$database", $username, $password);

    // Consulta SQL para obtener el primer registro que coincida con la cédula
    $sql = "SELECT TOP 1 * FROM TEMPLEADOS WHERE SCEDULA = ?";
    $q = $conn_sqlsrv->prepare($sql);    // Prepara la consulta
    $q->execute([$cedula]);              // Ejecuta con la cédula proporcionada
    $row = $q->fetch(PDO::FETCH_ASSOC);  // Obtiene el resultado como un arreglo asociativo

    // Devuelve el resultado junto con la entrada y posibles errores SQL
    echo json_encode([
        'input' => $cedula,              // Cédula consultada
        'row' => $row,                   // Fila obtenida (o null si no se encuentra)
        'error' => $q->errorInfo()       // Información sobre errores de SQL (si hay)
    ]);
} catch (Exception $e) {
    // Devuelve mensaje de excepción si ocurre un error de conexión o ejecución
    echo json_encode(['exception' => $e->getMessage()]);
}
