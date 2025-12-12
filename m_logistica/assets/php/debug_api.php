<?php
// Simulate GET request
$_GET['action'] = 'get_master_data';
$_SERVER['REQUEST_METHOD'] = 'GET';

// Include the API file
require_once 'programacion_api.php';
