/**
 * Auth Guard - Sistema de Autenticación y Permisos MEJORADO
 * 
 * Este script maneja:
 * 1. Verificación de sesión del usuario
 * 2. Permisos basados en data-role (compatibilidad hacia atrás)
 * 3. Permisos basados en páginas/recursos (nuevo sistema)
 * 4. Redirección automática si no tiene acceso
 */

(function () {
  'use strict';
  
  const DEBUG = false; // Set to true only for debugging permission issues
  
  // Normaliza roles: minúsculas, quita acentos, espacios -> guion_bajo
  const normalize = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  
  document.addEventListener('DOMContentLoaded', async () => {

    try {
      // Verificar sesión
      const response = await fetch('/php/verificar_sesion.php');
      const data = await response.json();
      
      if (DEBUG) console.log('[auth_guard] verificar_sesion:', data);

      if (!data.success) {
        if (DEBUG) console.warn('[auth_guard] sin sesión => /index.html');
        window.location.href = '/index.html';
        return;
      }

      // Construir array de roles del usuario
      const roleArray = Array.isArray(data.roles) && data.roles.length > 0
        ? data.roles.map(r => r.nombre)
        : [data.rol || 'usuario'];

      const userRoles = roleArray.map(normalize);
      if (DEBUG) console.log('[auth_guard] userRoles:', userRoles);

      // Guardar roles en sessionStorage para uso posterior
      sessionStorage.setItem('userRoles', JSON.stringify(userRoles));
      sessionStorage.setItem('userData', JSON.stringify(data));

      // ===================================
      // 1. CONTROL DE ACCESO A LA PÁGINA
      // ===================================
      const currentPath = window.location.pathname;
      if (DEBUG) console.log('[auth_guard] Current page path:', currentPath);
      
      // Verificar si el usuario es administrador
      const isAdmin = userRoles.includes('administrador');
      
      // Verificar permiso a nivel de página usando el nuevo sistema
      const hasPageAccess = await checkPageAccess(currentPath, userRoles, isAdmin);
      
      if (!hasPageAccess) {
        if (DEBUG) console.warn('[auth_guard] acceso denegado a página:', currentPath, '=> checking data-role fallback');
        
        // Si no tiene acceso, verificar si es por data-role en body (compatibilidad)
        const pageRolesAttr = document.body.getAttribute('data-role');
        if (DEBUG) console.log('[auth_guard] data-role attribute:', pageRolesAttr);
        
        if (pageRolesAttr) {
          const allowed = pageRolesAttr.split(',').map(r => normalize(r));
          const accessGrantedByDataRole = userRoles.some(role => allowed.includes(role));
          
          if (DEBUG) console.log('[auth_guard] data-role check result:', accessGrantedByDataRole);
          
          if (!accessGrantedByDataRole) {
            if (DEBUG) console.warn('[auth_guard] Access denied by both systems, redirecting to /panel.html');
            window.location.href = '/panel.html';
            return;
          } else {
            if (DEBUG) console.log('[auth_guard] Access granted by data-role fallback');
          }
        } else {
          // No tiene data-role en body, usar nuevo sistema
          if (DEBUG) console.warn('[auth_guard] No data-role found and database denied, redirecting to /panel.html');
          window.location.href = '/panel.html';
          return;
        }
      } else {
        if (DEBUG) console.log('[auth_guard] Access granted by database permissions');
      }

      // ===================================
      // 2. CONTROL DE ELEMENTOS VISIBLES
      // ===================================
      // Ocultar elementos basados en data-role (compatibilidad hacia atrás)
      document.querySelectorAll('[data-role]').forEach(el => {
        const requiredRoles = el.getAttribute('data-role')
          .split(',')
          .map(r => normalize(r));
        const hasPermission = userRoles.some(role => requiredRoles.includes(role));
        if (!hasPermission) {
          el.style.display = 'none';
        }
      });

      // ===================================
      // 3. MOSTRAR PÁGINA
      // ===================================
      document.body.style.visibility = 'visible';
      
    } catch (error) {
      console.error('[auth_guard] error verificar_sesion:', error);
      window.location.href = '/index.html';
    }
  });

  /**
   * Verificar si el usuario tiene acceso a una página específica
   * @param {string} pagePath - Ruta de la página actual
   * @param {Array} userRoles - Roles del usuario
   * @param {boolean} isAdmin - Si el usuario es administrador
   * @returns {Promise<boolean>}
   */
  async function checkPageAccess(pagePath, userRoles, isAdmin) {
    if (DEBUG) console.log('[auth_guard] Checking access for page:', pagePath, 'Roles:', userRoles, 'IsAdmin:', isAdmin);
    
    // Páginas de perfil siempre accesibles para usuarios autenticados
    const userProfilePages = ['/Usuarios.html'];
    if (userProfilePages.includes(pagePath)) {
      if (DEBUG) console.log('[auth_guard] Access granted (user profile page)');
      return true;
    }
    
    // Administradores tienen acceso especial a páginas administrativas
    if (isAdmin) {
      // NOTA: Esta lista también existe en php/permissions_api.php
      // Mantener ambas listas sincronizadas al agregar/remover páginas administrativas
      const adminPaths = [
        '/includes/roles.html',      // Gestión de roles
        '/includes/web_main.html',   // Configuración web
        '/sesiones.html',             // Gestión de sesiones
        '/m_admin/',                  // Módulo administrativo
        '/Usuarios.html'              // Gestión de usuarios (también accesible por check anterior)
      ];
      
      // Si la ruta coincide con alguna página administrativa, permitir acceso
      for (const adminPath of adminPaths) {
        if (pagePath === adminPath || pagePath.startsWith(adminPath)) {
          if (DEBUG) console.log('[auth_guard] Acceso de administrador permitido a:', pagePath);
          return true;
        }
      }
    }
    
    try {
      // Verificar si el usuario tiene permiso usando el sistema de base de datos
      const url = `/php/permissions_api.php?check_access=1&page=${encodeURIComponent(pagePath)}`;
      if (DEBUG) console.log('[auth_guard] Fetching permissions from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // En caso de error HTTP, denegar acceso (fail-secure)
        console.warn('[auth_guard] HTTP error checking access:', response.status);
        return false;
      }
      
      const data = await response.json();
      if (DEBUG) console.log('[auth_guard] Permission check response:', data);
      
      if (data.success) {
        if (DEBUG) console.log('[auth_guard] Access result:', data.has_access ? 'GRANTED' : 'DENIED');
        return data.has_access;
      }
      
      // Si hay error en la respuesta, denegar acceso (fail-secure)
      console.warn('[auth_guard] Error in response:', data.message);
      return false;
      
    } catch (error) {
      console.error('[auth_guard] exception checking page access:', error);
      // En caso de excepción, denegar acceso (fail-secure)
      return false;
    }
  }

  /**
   * Función global para verificar permisos en runtime
   * Útil para verificaciones dinámicas desde otros scripts
   */
  window.hasPagePermission = async function(pagePath) {
    const userRoles = JSON.parse(sessionStorage.getItem('userRoles') || '[]');
    const isAdmin = userRoles.includes(normalize('administrador'));
    return await checkPageAccess(pagePath, userRoles, isAdmin);
  };

  /**
   * Función global para obtener datos del usuario actual
   */
  window.getCurrentUser = function() {
    return JSON.parse(sessionStorage.getItem('userData') || '{}');
  };

  /**
   * Función global para verificar si tiene un rol específico
   */
  window.hasRole = function(roleName) {
    const userRoles = JSON.parse(sessionStorage.getItem('userRoles') || '[]');
    return userRoles.includes(normalize(roleName));
  };

})();
