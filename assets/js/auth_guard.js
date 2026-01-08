/**
 * Auth Guard - Sistema de Autenticación y Permisos OPTIMIZADO
 * 
 * Características:
 * 1. Ocultamiento inmediato del contenido (anti-flash)
 * 2. Caché de permisos en sessionStorage (anti-delay)
 * 3. Verificación local de acceso
 */

(function () {
  'use strict';

  // ==========================================
  // 1. ANTI-FLASH: Ocultar contenido inmediatamente
  // ==========================================
  // Inyectar estilo para ocultar body antes de que se renderice nada
  const style = document.createElement('style');
  style.id = 'auth-guard-style';
  style.innerHTML = 'body { visibility: hidden !important; opacity: 0 !important; transition: opacity 0.3s ease; }';
  document.head.appendChild(style);

  const DEBUG = false;
  const log = window.Logger || {
    debug: DEBUG ? console.log.bind(console) : () => { },
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  // Normaliza strings
  const normalize = (str) => String(str || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');

  // Páginas públicas
  const PUBLIC_PAGES = ['/panel.html', '/', '/index.html'];

  /**
   * Mostrar el contenido de la página
   */
  function showContent() {
    const styleEl = document.getElementById('auth-guard-style');
    if (styleEl) {
      // Usar requestAnimationFrame para asegurar que el navegador ha procesado los cambios del DOM (ej. ocultar sidebar items)
      requestAnimationFrame(() => {
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
        // Remover el estilo después de la transición para no interferir
        setTimeout(() => styleEl.remove(), 350);
      });
    } else {
      document.body.style.visibility = 'visible';
    }
  }

  /**
   * Inicializar Auth Guard
   */
  async function init() {
    try {
      // 1. Verificar Sesión Básica
      // Intentar obtener datos de sessionStorage primero para velocidad
      let userData = JSON.parse(sessionStorage.getItem('userData'));
      let userPermissions = JSON.parse(sessionStorage.getItem('userPermissions'));

      // Si no hay datos en caché, o forzamos recarga, consultar al servidor
      if (!userData || !userPermissions) {
        log.debug('[auth_guard] No cache found, fetching from server...');

        // Fetch paralelo para velocidad
        const [sessionRes, permRes] = await Promise.all([
          fetch('/php/verificar_sesion.php'),
          fetch('/php/permissions_api.php?my_permissions=1')
        ]);

        const sessionData = await sessionRes.json();

        if (!sessionData.success) {
          log.warn('[auth_guard] Session invalid, redirecting...');
          window.location.href = '/index.html';
          return;
        }

        const permData = await permRes.json();

        userData = sessionData;
        userPermissions = permData; // { is_admin: bool, permissions: [], roles: [] }

        // Guardar en caché
        sessionStorage.setItem('userData', JSON.stringify(userData));
        sessionStorage.setItem('userPermissions', JSON.stringify(userPermissions));
      }

      // Normalizar roles
      const userRoles = (userPermissions.roles || []).map(normalize);
      const isAdmin = userPermissions.is_admin;

      log.debug('[auth_guard] User loaded:', { roles: userRoles, isAdmin });

      // Notificar a otros scripts (sidebar.js)
      window.currentUserRoles = userRoles;
      window.currentUserPermissions = userPermissions;
      document.dispatchEvent(new CustomEvent('auth_checked', {
        detail: { userData, userPermissions }
      }));

      // 2. Verificar Acceso a la Página Actual
      const currentPath = window.location.pathname;

      if (!PUBLIC_PAGES.includes(currentPath)) {
        const hasAccess = checkLocalAccess(currentPath, userPermissions);

        if (!hasAccess) {
          log.warn('[auth_guard] Access denied to:', currentPath);
          // Redirección inmediata
          window.location.replace('/panel.html');
          return; // Detener ejecución, no mostrar contenido
        }
      }

      // 3. Filtrar Elementos UI (data-role)
      // Esto debe hacerse ANTES de mostrar el contenido
      filterUiElements(userRoles, isAdmin);

      // 4. Mostrar Contenido
      showContent();

    } catch (error) {
      console.error('[auth_guard] Critical error:', error);
      // En caso de error crítico, redirigir al login por seguridad
      window.location.href = '/index.html';
    }
  }

  /**
   * Verificar acceso localmente usando los permisos cacheados
   */
  function checkLocalAccess(path, permissionsData) {
    if (permissionsData.is_admin) return true;

    // Páginas de perfil siempre permitidas
    if (path === '/Usuarios.html' || path.includes('mis_evaluaciones.html') || path.includes('realizar_evaluacion.html')) return true;

    // Normalizar path actual (quitar query params)
    const cleanPath = path.split('?')[0];

    // Buscar coincidencia en permisos
    // Los permisos vienen como resource_path
    const allowedPaths = (permissionsData.permissions || []).map(p => p.resource_path);

    // 1. Coincidencia exacta
    if (allowedPaths.includes(cleanPath)) return true;

    // 2. Coincidencia por módulo (si el permiso es de tipo módulo)
    // Esto requiere que el backend devuelva resource_type, o inferirlo
    const moduleMatch = (permissionsData.permissions || []).some(p => {
      return p.resource_type === 'module' && cleanPath.startsWith(p.resource_path);
    });
    if (moduleMatch) return true;

    return false;
  }

  /**
   * Filtrar elementos del DOM basados en data-role
   */
  function filterUiElements(userRoles, isAdmin) {
    if (isAdmin) return; // Admin ve todo

    document.querySelectorAll('[data-role]').forEach(el => {
      const requiredRoles = el.getAttribute('data-role').split(',').map(normalize);
      const hasPermission = userRoles.some(role => requiredRoles.includes(role));

      if (!hasPermission) {
        el.remove(); // Remover del DOM es más seguro que ocultar
      }
    });
  }

  // Ejecutar al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exponer funciones globales
  window.hasRole = (role) => {
    const perms = JSON.parse(sessionStorage.getItem('userPermissions') || '{}');
    if (perms.is_admin) return true;
    return (perms.roles || []).map(normalize).includes(normalize(role));
  };

  window.getCurrentUser = () => {
    return JSON.parse(sessionStorage.getItem('userData') || '{}');
  };

})();
