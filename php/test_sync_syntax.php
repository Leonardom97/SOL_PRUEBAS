<?php
/**
 * Simple syntax validation test for funciones_sync.php
 * This script checks if the file can be included without syntax errors
 */

echo "Testing funciones_sync.php syntax...\n";

try {
    // Include the file to check for syntax errors
    require_once __DIR__ . '/funciones_sync.php';
    
    echo "✅ File loaded successfully - no syntax errors\n";
    
    // Check if functions exist
    $functions = ['getColaboradoresSQLServer', 'syncAllColaboradores', 'ensureSituacion', 
                  'ensureEmpresa', 'ensureCargo', 'ensureArea', 'getNomProyecto', 
                  'getNombreCargo', 'getRangoCargo', 'getRangoFromListado', 'logSyncAction'];
    
    foreach ($functions as $func) {
        if (function_exists($func)) {
            echo "✅ Function '$func' exists\n";
        } else {
            echo "❌ Function '$func' is missing\n";
        }
    }
    
    // Check if getInsertSQL was properly removed
    if (function_exists('getInsertSQL')) {
        echo "⚠️  Warning: getInsertSQL function still exists (should have been removed)\n";
    } else {
        echo "✅ getInsertSQL function was properly removed\n";
    }
    
    echo "\n✅ All syntax validations passed!\n";
    
} catch (ParseError $e) {
    echo "❌ Parse error in funciones_sync.php:\n";
    echo $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error loading funciones_sync.php:\n";
    echo $e->getMessage() . "\n";
    exit(1);
}
