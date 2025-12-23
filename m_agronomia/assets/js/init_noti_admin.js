/**
 * init_noti_admin.js
 * 
 * Inicialización de la campana de notificaciones para administradores.
 * 
 * Propósito:
 * - Muestra la campana de notificaciones solo si el usuario es administrador o auxiliar.
 * - Carga dinámicamente el script de notificaciones_operaciones.js.
 * - El modo solo-lectura para auxiliares se maneja dentro de notificaciones_operaciones.js.
 * 
 * Roles con acceso:
 * - Administrador
 * - Roles auxiliares (cualquier rol que contenga 'aux')
 */
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Obtiene todos los roles del usuario desde múltiples fuentes.
   * 
   * Fuentes de roles:
   * - Atributo data-role del body
   * - Meta tag con name="user-roles"
   * - Variables globales: window.USER_ROLES, window.ROLES, window.USER_ROLE
   * 
   * @returns {Array<string>} Array de roles en minúsculas
   */
  function getRoles() {
    const all = new Set();
    // Obtener roles desde el atributo data-role del body
    const br = (document.body.getAttribute('data-role') || '')
      .toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    br.forEach(r => all.add(r));
    // Obtener roles desde meta tag
    const meta = document.querySelector('meta[name="user-roles"]');
    if (meta?.content) {
      meta.content.toLowerCase().split(',').map(s => s.trim()).filter(Boolean).forEach(r => all.add(r));
    }
    // Obtener roles desde variables globales
    const gr = (window.USER_ROLES || window.ROLES || window.USER_ROLE || '');
    (Array.isArray(gr) ? gr : String(gr).split(','))
      .map(String).map(s => s.toLowerCase().trim()).filter(Boolean).forEach(r => all.add(r));
    return Array.from(all);
  }

  // --- Lógica Principal: Esperar a que el Navbar esté cargado estáticamente ---

  function startSystem() {
    // Configurar un observer por si acaso el evento ya pasó o el navbar cambia
    initBellSystem();
  }

  // 1. Escuchar el evento personalizado de agronomia.js
  document.addEventListener('components_loaded', () => {
    console.log('[InitNotiAdmin] Evento components_loaded detectado. Iniciando...');
    setTimeout(startSystem, 200); // Pequeño delay para asegurar DOM rendering
  });

  // 2. Fallback: Si el evento ya ocurrió o no se disparó (por caché), comprobar periódicamente
  if (document.querySelector('.navbar-nav')) {
    // Ya existe el navbar
    startSystem();
  } else {
    // Polling de respaldo
    const checkInt = setInterval(() => {
      if (document.querySelector('.navbar-nav')) {
        clearInterval(checkInt);
        startSystem();
      }
    }, 500);
  }

  let attempts = 0;
  const maxAttempts = 20; // 10 segundos aprox

  function initBellSystem() {
    // Evitar duplicados si se llama múltiples veces
    if (document.getElementById('noti-admin')) {
      // Ya existe, solo verificar permisos
      checkPermissions(document.getElementById('noti-admin'));
      return;
    }

    // 1. Buscar el lugar donde insertar
    const navbarRights = document.querySelector('.navbar-nav.ms-auto') || document.querySelector('.navbar-nav');

    if (navbarRights) {
      console.log('[InitNotiAdmin] Recreando botón (navbar encontrado)...');
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `
           <button class="md-notify-btn" id="noti-admin" title="Pendientes de aprobación" style="display:none">
             <i class="fas fa-bell"></i>
             <span id="noti-badge" class="md-badge">0</span>
           </button>`;

      const userItem = navbarRights.querySelector('.nav-item.dropdown');
      if (userItem) {
        navbarRights.insertBefore(li, userItem);
      } else {
        navbarRights.appendChild(li);
      }

      const btn = document.getElementById('noti-admin');
      if (btn) checkPermissions(btn);
      return;
    }

    // Si no encontramos el navbar, reintentamos (aunque el listener debería prevenir esto)
    attempts++;
    if (attempts < maxAttempts) {
      console.log('[InitNotiAdmin] Navbar no listo. Reintentando...', attempts);
      setTimeout(initBellSystem, 500);
    }
  }

  function checkPermissions(btn) {
    // (Misma lógica de permisos...)
    fetch('assets/php/manage_tab_permissions.php?t=' + Date.now())
      .then(r => r.json())
      .then(config => {
        const myRoles = getRoles();
        console.log('[InitNotiAdmin] Roles:', myRoles);

        const bellConfig = config.find(c => c.key === 'notification_bell');
        let allowed = false;

        if (myRoles.includes('administrador')) {
          allowed = true;
        } else if (bellConfig && Array.isArray(bellConfig.roles)) {
          const permittedRoles = bellConfig.roles.map(r => r.toLowerCase().trim());
          allowed = myRoles.some(myRole => permittedRoles.includes(myRole));
        }

        if (allowed) {
          console.log('[InitNotiAdmin] PERMISO CONCEDIDO. Mostrando campana.');
          btn.classList.remove('initially-hidden');
          btn.style.display = '';

          // IMPORTANTE: Eliminar script previo para forzar recarga si es necesario
          const oldScript = document.getElementById('script-noti-ops');
          if (oldScript) oldScript.remove();

          const s = document.createElement('script');
          s.id = 'script-noti-ops';
          s.src = `assets/js/notificaciones_operaciones.js?v=${Date.now()}`;
          document.body.appendChild(s);
        } else {
          console.log('[InitNotiAdmin] Permiso denegado.');
          btn.style.display = 'none';
        }
      })
      .catch(err => {
        console.error('[InitNotiAdmin] Error de red:', err);
        // Fallback para admin
        if (getRoles().includes('administrador')) {
          btn.classList.remove('initially-hidden');
          btn.style.display = '';

          const oldScript = document.getElementById('script-noti-ops');
          if (oldScript) oldScript.remove();

          const s = document.createElement('script');
          s.id = 'script-noti-ops';
          s.src = `assets/js/notificaciones_operaciones.js?v=${Date.now()}`;
          document.body.appendChild(s);
        }
      });
  }

});