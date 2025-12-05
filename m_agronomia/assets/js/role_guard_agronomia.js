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
    r === 'agronomico' || 
    r === 'aux_agronomico' || 
    r === 'sup_logistica1' ||
    r === 'sup_logistica2' ||
    r === 'asist_agronomico'
  );
  
  // If no agronomia role, hide the module
  if(!hasAgronomiaRole) {
    console.warn('[role_guard_agronomia] No agronomia role found, hiding module');
    const bell=document.getElementById('noti-admin'); if(bell) bell.remove();
    const badge=document.getElementById('noti-badge'); if(badge) badge.remove();
    return;
  }
  
  // Store role permissions globally for other scripts to use
  window.AGRONOMIA_USER_ROLES = userRoles;
  
  // Define permissions based on roles
  // aux_agronomico: NO approve/reject, NO revert, NO activate (only inactivate)
  // agronomico: Full access (all permissions)
  // sup_logistica1 & sup_logistica2: approve/reject YES, revert NO, activate NO (only inactivate)
  // asist_agronomico: approve/reject YES, revert YES, activate YES
  
  const isAdmin = userRoles.some(r => r.includes('administrador'));
  const isAgronomico = userRoles.includes('agronomico');
  const isAuxAgronomico = userRoles.includes('aux_agronomico');
  const isSupLogistica1 = userRoles.includes('sup_logistica1');
  const isSupLogistica2 = userRoles.includes('sup_logistica2');
  const isAsistAgronomico = userRoles.includes('asist_agronomico');
  
  window.AGRONOMIA_PERMISSIONS = {
    // aux_agronomico CANNOT approve/reject
    canApproveReject: isAdmin || isAgronomico || isSupLogistica1 || isSupLogistica2 || isAsistAgronomico,
    
    // Only agronomico and asist_agronomico can revert
    canRevert: isAdmin || isAgronomico || isAsistAgronomico,
    
    // Only agronomico and asist_agronomico can activate error_registro
    canActivateError: isAdmin || isAgronomico || isAsistAgronomico,
    
    // All agronomia roles can inactivate error_registro
    canInactivateError: true,
    
    // All agronomia roles can enter/edit data
    canEnterData: true
  };
  
  console.log('[role_guard_agronomia] Permissions:', window.AGRONOMIA_PERMISSIONS);
});