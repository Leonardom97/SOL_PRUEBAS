(function () {
  // Sistema de logging - usar Logger si está disponible
  const log = window.Logger || {
    debug: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

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

    // Si no tiene display inline, asumimos block (visible)
    const display = sidebar.style.display || getComputedStyle(sidebar).display;

    if (display === 'none') {
      showSidebar();
    } else {
      hideSidebar();
    }
  }

  function setInitialSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    if (isSM()) {
      // En móvil: ocultar por defecto
      hideSidebar();
    } else {
      // En escritorio: mostrar por defecto (comportamiento nativo)
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

  async function filtrarSidebarPorRol() {
    try {
      // Obtener permisos de la caché (auth_guard ya los debió haber cargado)
      const userPermissions = JSON.parse(sessionStorage.getItem('userPermissions'));

      if (!userPermissions) {
        // Si no hay caché, esperar evento auth_checked
        document.addEventListener('auth_checked', () => filtrarSidebarPorRol());
        return;
      }

      const isAdmin = userPermissions.is_admin;
      const userRoles = (userPermissions.roles || []).map(normalize);

      // If admin, show everything (skip filtering)
      if (isAdmin) {
        return;
      }

      // Paso 1: Filtrar por data-role (compatibilidad)
      const elementosConRol = document.querySelectorAll('[data-role]');
      for (const elemento of elementosConRol) {
        const rolesPermitidos = elemento.dataset.role
          .split(',')
          .map(r => normalize(r));
        const tieneAccesoPorRol = userRoles.some(rol => rolesPermitidos.includes(rol));

        if (!tieneAccesoPorRol) {
          elemento.remove(); // Remover es mejor que ocultar
        }
      }

      // Limpieza final: Ocultar dropdowns vacíos
      document.querySelectorAll('.nav-item.dropdown').forEach(dropdown => {
        const visibleChildren = Array.from(dropdown.querySelectorAll('.dropdown-item'))
          .filter(item => item.style.display !== 'none' && item.offsetParent !== null); // Check visibility

        // Si todos los hijos fueron removidos o están ocultos
        if (dropdown.querySelectorAll('.dropdown-item').length === 0) {
          dropdown.style.display = 'none';
        }
      });

    } catch (error) {
      console.error('Error en filtrarSidebarPorRol:', error);
    }
  }

  // Inicialización
  document.addEventListener('DOMContentLoaded', () => {
    // Intentar inicializar inmediatamente por si el contenido ya está
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      setInitialSidebar();
      filtrarSidebarPorRol();
    } else {
      // Si no está, esperar a que se inyecte (MutationObserver)
      const container = document.getElementById('sidebar') || document.body;

      const observer = new MutationObserver((mutations, obs) => {
        const sidebarAdded = document.querySelector('.sidebar');
        if (sidebarAdded) {
          setInitialSidebar();
          filtrarSidebarPorRol();
          obs.disconnect(); // Dejar de observar una vez encontrado
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true
      });
    }

    // Toggle button logic (delegado)
    document.body.addEventListener('click', function (e) {
      const btn = e.target.closest('#sidebarToggleTop');
      if (btn) {
        toggleSidebar();
        e.preventDefault();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (isSM()) {
        hideSidebar();
      } else {
        showSidebar();
      }
    });
  });
})();