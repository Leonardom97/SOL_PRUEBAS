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
      meta.content.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean).forEach(r => all.add(r));
    }

    // Obtener roles desde variables globales
    const gr = (window.USER_ROLES || window.ROLES || window.USER_ROLE || '');
    (Array.isArray(gr) ? gr : String(gr).split(','))
      .map(String).map(s=>s.toLowerCase().trim()).filter(Boolean).forEach(r => all.add(r));

    return Array.from(all);
  }

  /**
   * Verifica si el usuario puede ver la campana de notificaciones.
   * 
   * @returns {boolean} true si el usuario es administrador o tiene rol auxiliar
   */
  function canSeeBell() {
    const roles = getRoles();
    const isAdmin = roles.includes('administrador');
    const isAux = roles.some(r => r.includes('aux'));
    return isAdmin || isAux;
  }

  // Obtener el botón de la campana
  const btn = document.getElementById('noti-admin');
  if (!btn) return;

  // Mostrar u ocultar la campana según el rol del usuario
  if (canSeeBell()) {
    // Usuario autorizado: mostrar campana y cargar script de notificaciones
    btn.style.display = '';
    const s = document.createElement('script');
    s.src = `assets/js/notificaciones_operaciones.js?v=${Date.now()}`;
    document.body.appendChild(s);
    try { console.log('[InitNotiAdmin] Campana visible.'); } catch {}
  } else {
    // Usuario no autorizado: ocultar campana
    btn.style.display = 'none';
    try { console.log('[InitNotiAdmin] Campana oculta (rol sin acceso).'); } catch {}
  }
});