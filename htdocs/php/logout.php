<?php
session_start();
session_unset();
session_destroy();

if (isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    echo json_encode(['success' => true]);
    exit;
} else {
    header("Location: ../index.html");
    exit;
}
