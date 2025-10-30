// Muestra la campana si el usuario tiene rol "administrador" (aunque tenga otros roles)
// y carga el script de notificaciones unificadas con un cache-buster.
document.addEventListener('DOMContentLoaded', () => {
  function getRoles() {
    return (document.body.getAttribute('data-role') || '')
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  function hasAdmin() {
    return getRoles().includes('administrador');
  }

  const btn = document.getElementById('noti-admin');
  if (!btn) return;

  if (hasAdmin()) {
    btn.style.display = '';
    const s = document.createElement('script');
    s.src = `assets/js/notificaciones_operaciones.js?v=${Date.now()}`;
    document.body.appendChild(s);
    try { console.log('[InitNotiAdmin] Campana visible. Roles:', getRoles()); } catch {}
  } else {
    btn.style.display = 'none';
    try { console.log('[InitNotiAdmin] Campana oculta. Roles:', getRoles()); } catch {}
  }
});