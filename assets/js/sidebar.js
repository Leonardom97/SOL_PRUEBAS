(function () {
  function isSM() { return window.innerWidth < 992; }

  function showSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'block';
  }

  function hideSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'none';
  }

  function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (getComputedStyle(sidebar).display === 'none') {
      showSidebar();
    } else {
      hideSidebar();
    }
  }

  function setInitialSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (isSM()) {
      hideSidebar();
    } else {
      sidebar.style.display = 'block';
    }
  }

  // Normaliza roles: minúsculas, quita acentos, espacios -> guion_bajo
  const normalize = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');

  // Pages that are always accessible (public)
  const PUBLIC_PAGES = ['/panel.html', '/', '/index.html'];

  /**
   * Verifica si el usuario tiene permiso para acceder a una página usando el sistema de base de datos
   * @param {string} pagePath - Ruta de la página a verificar
   * @returns {Promise<boolean>}
   */
  async function checkPagePermission(pagePath) {
    try {
      const url = `/php/permissions_api.php?check_access=1&page=${encodeURIComponent(pagePath)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[sidebar] HTTP error checking permission for ${pagePath}: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      return data.success && data.has_access;
    } catch (error) {
      console.error(`[sidebar] Error checking page permission for ${pagePath}:`, error);
      return false;
    }
  }

  /**
   * Verifica y muestra solo los menús del sidebar permitidos por rol
   * MEJORADO: Ahora usa el sistema de permisos de base de datos además de data-role
   */
  async function filtrarSidebarPorRol() {
    try {
      const res = await fetch('/php/verificar_sesion.php');
      const data = await res.json();
      if (!data.success) return;

      const rolesUsuario = Array.isArray(data.roles) && data.roles.length > 0
        ? data.roles.map(r => normalize(r.nombre))
        : [normalize(data.rol || 'usuario')];

      // Verificar si el usuario es administrador
      const isAdmin = rolesUsuario.includes('administrador');

      // Obtener todos los elementos con data-role o enlaces en el sidebar
      const elementosConRol = document.querySelectorAll('[data-role]');
      const enlacesSidebar = document.querySelectorAll('#accordionSidebar a[href]');

      // Paso 1: Filtrar por data-role (compatibilidad hacia atrás)
      for (const elemento of elementosConRol) {
        // Verificar que el atributo data-role existe
        if (!elemento.dataset.role) {
          continue;
        }
        
        const rolesPermitidos = elemento.dataset.role
          .split(',')
          .map(r => normalize(r));
        const tieneAccesoPorRol = rolesUsuario.some(rol => rolesPermitidos.includes(rol));
        
        if (!tieneAccesoPorRol) {
          elemento.remove();
        }
      }

      // Paso 2: Verificar permisos de base de datos para los enlaces individuales
      for (const enlace of enlacesSidebar) {
        // Saltar enlaces sin href válido o que ya fueron eliminados
        if (!enlace.href || enlace.href === '#' || !enlace.parentNode) {
          continue;
        }

        try {
          // Extraer la ruta del enlace
          const url = new URL(enlace.href);
          const pagePath = url.pathname;

          // No verificar páginas públicas (siempre accesibles)
          if (PUBLIC_PAGES.includes(pagePath)) {
            continue;
          }

          // Los administradores pueden ver todos los enlaces
          if (isAdmin) {
            continue;
          }

          // Verificar permiso en la base de datos
          const tienePermiso = await checkPagePermission(pagePath);
          
          if (!tienePermiso) {
            // Remover el enlace si no tiene permiso
            enlace.remove();
            
            // Si es un item de dropdown, verificar si el dropdown padre quedó vacío
            const dropdownMenu = enlace.closest('.dropdown-menu');
            if (dropdownMenu) {
              // Verificar enlaces que están realmente en el DOM
              const enlacesRestantes = Array.from(dropdownMenu.querySelectorAll('a[href]'))
                .filter(link => link.parentNode !== null);
              // Si no quedan enlaces en el dropdown, remover el dropdown completo
              if (enlacesRestantes.length === 0) {
                const dropdownParent = dropdownMenu.closest('.nav-item.dropdown');
                if (dropdownParent) {
                  dropdownParent.remove();
                }
              }
            }
          }
        } catch (error) {
          // En caso de error de red/API, mantener el enlace (fail-open para evitar bloquear accesos válidos)
          // pero registrar el error para auditoría de seguridad
          console.error('[sidebar] Error verifying link:', enlace.href, error);
          console.warn('[sidebar] SECURITY: Permission check failed, allowing access by default. Manual review recommended.');
        }
      }
    } catch (error) {
      console.error('[sidebar] Error verifying roles for sidebar:', error);
    }
  }

  window.addEventListener('resize', setInitialSidebar);

  document.addEventListener('DOMContentLoaded', function () {
    setInitialSidebar();

    document.body.addEventListener('click', function (e) {
      const btn = e.target.closest('#sidebarToggleTop');
      if (btn && isSM()) {
        toggleSidebar();
        e.preventDefault();
      }
    });

    filtrarSidebarPorRol();
  });
})();