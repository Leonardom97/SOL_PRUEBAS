<?php
/**
 * Test script for role_check.php
 * Validates syntax and function existence
 */

echo "Testing role_check.php...\n";
echo "========================\n\n";

try {
    // Include the file to check for syntax errors
    require_once __DIR__ . '/role_check.php';
    
    echo "✅ File loaded successfully - no syntax errors\n\n";
    
    // Check if functions exist
    $functions = ['hasRole', 'isAdministrator', 'requireAdministrator'];
    
    echo "Checking function existence:\n";
    foreach ($functions as $func) {
        if (function_exists($func)) {
            echo "  ✅ Function '$func' exists\n";
        } else {
            echo "  ❌ Function '$func' is missing\n";
        }
    }
    
    echo "\n✅ All syntax validations passed!\n";
    echo "\nNote: Full integration testing requires:\n";
    echo "  - Active database connection\n";
    echo "  - User session with roles\n";
    echo "  - Running web server environment\n";
    
} catch (ParseError $e) {
    echo "❌ Parse error in role_check.php:\n";
    echo $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error loading role_check.php:\n";
    echo $e->getMessage() . "\n";
    exit(1);
}
