/**
 * Enforcement de Permisos - Complementario a auth_guard.js
 * Este script proporciona funciones auxiliares para verificar permisos en runtime
 * 
 * NOTA: La verificación principal de permisos es manejada por auth_guard.js
 * Este archivo solo provee funciones de utilidad para consultas dinámicas
 */

(function() {
    'use strict';
    
    /**
     * Verificar si el usuario tiene un permiso específico
     * Esta función consulta verificar_sesion.php para obtener los roles del usuario
     * y verifica si alguno de ellos coincide con el permiso solicitado
     * 
     * @param {string} permissionKey - El nombre del permiso a verificar
     * @returns {Promise<boolean>} - True si el usuario tiene el permiso, false en caso contrario
     */
    window.hasPermission = async function(permissionKey) {
        try {
            const response = await fetch('/php/verificar_sesion.php');
            const data = await response.json();
            
            if (!data.success) {
                return false;
            }
            
            // Normalizar función (igual que en auth_guard.js)
            const normalize = (str) =>
                String(str || '')
                    .trim()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '_');
            
            // Construir array de roles del usuario
            const roleArray = Array.isArray(data.roles) && data.roles.length > 0
                ? data.roles.map(r => r.nombre)
                : [data.rol || 'usuario'];
            
            const userRoles = roleArray.map(normalize);
            const normalizedKey = normalize(permissionKey);
            
            return userRoles.includes(normalizedKey);
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    };
    
    /**
     * Verificar múltiples permisos (OR logic)
     * @param {Array<string>} permissionKeys - Array de permisos a verificar
     * @returns {Promise<boolean>} - True si el usuario tiene al menos uno de los permisos
     */
    window.hasAnyPermission = async function(permissionKeys) {
        if (!Array.isArray(permissionKeys)) {
            permissionKeys = [permissionKeys];
        }
        
        const results = await Promise.all(
            permissionKeys.map(key => window.hasPermission(key))
        );
        
        return results.some(result => result === true);
    };
    
    /**
     * Verificar múltiples permisos (AND logic)
     * @param {Array<string>} permissionKeys - Array de permisos a verificar
     * @returns {Promise<boolean>} - True si el usuario tiene todos los permisos
     */
    window.hasAllPermissions = async function(permissionKeys) {
        if (!Array.isArray(permissionKeys)) {
            permissionKeys = [permissionKeys];
        }
        
        const results = await Promise.all(
            permissionKeys.map(key => window.hasPermission(key))
        );
        
        return results.every(result => result === true);
    };
    
    console.log('[enforce_permissions] Funciones de permisos disponibles: hasPermission (async), hasAnyPermission (async), hasAllPermissions (async)');
})();
