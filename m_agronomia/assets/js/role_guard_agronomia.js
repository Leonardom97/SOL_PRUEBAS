// role_guard_agronomia.js - Role-based access control for agronomia module
document.addEventListener('DOMContentLoaded',()=>{
  // Get all user roles
  function roles(){
    const set=new Set();
    const norm=s=>String(s||'').toLowerCase().trim();
    const b=document.body||document.querySelector('body');
    if(b)(b.getAttribute('data-role')||'').split(',').map(norm).filter(Boolean).forEach(r=>set.add(r));
    const meta=document.querySelector('meta[name="user-roles"]');
    if(meta?.content) meta.content.split(',').map(norm).filter(Boolean).forEach(r=>set.add(r));
    const gr=(window.USER_ROLES||window.ROLES||window.USER_ROLE||'');
    (Array.isArray(gr)?gr:String(gr).split(',')).map(norm).filter(Boolean).forEach(r=>set.add(r));
    return Array.from(set);
  }
  
  const userRoles = roles();
  console.log('[role_guard_agronomia] User roles:', userRoles);
  
  // Check if user has any agronomia role
  const hasAgronomiaRole = userRoles.some(r => 
    r.includes('administrador') || 
    r.includes('agronomico') || 
    r.includes('aux_agronomico') || 
    r.includes('sup_logistica') ||
    r.includes('asist_agronomico')
  );
  
  // If no agronomia role, hide the module
  if(!hasAgronomiaRole) {
    console.warn('[role_guard_agronomia] No agronomia role found, hiding module');
    const bell=document.getElementById('noti-admin'); if(bell) bell.remove();
    const badge=document.getElementById('noti-badge'); if(badge) badge.remove();
    const sections=[
      'tab-content-capacitaciones','tab-content-reuniones','tab-content-asistencias',
      'tab-content-inventarios','tab-content-monitoreos-generales'
    ];
    sections.forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    return;
  }
  
  // Store role permissions globally for other scripts to use
  window.AGRONOMIA_USER_ROLES = userRoles;
  window.AGRONOMIA_PERMISSIONS = {
    canApproveReject: !userRoles.includes('aux_agronomico'), // aux_agronomico CANNOT
    canRevert: userRoles.some(r => r.includes('administrador') || r === 'agronomico' || r === 'asist_agronomico'),
    canActivateError: userRoles.some(r => r.includes('administrador') || r === 'agronomico' || r === 'asist_agronomico'),
    canInactivateError: true // All can inactivate
  };
  
  console.log('[role_guard_agronomia] Permissions:', window.AGRONOMIA_PERMISSIONS);
});