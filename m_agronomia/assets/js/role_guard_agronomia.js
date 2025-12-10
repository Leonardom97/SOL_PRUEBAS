/**
 * role_guard_agronomia.js
 * 
 * Guardián de roles para el módulo de agronomía.
 * Restringe el acceso al módulo solo a usuarios con roles de administrador o auxiliar.
 * 
 * Funcionalidad:
 * - Recopila roles del usuario desde múltiples fuentes (body, meta tags, variables globales)
 * - Verifica si el usuario tiene permisos (administrador o auxiliar)
 * - Si no tiene permisos, oculta elementos de la interfaz relacionados con el módulo
 * 
 * Ejecución:
 * - Se ejecuta automáticamente cuando el DOM está completamente cargado
 */

document.addEventListener('DOMContentLoaded',()=>{
  /**
   * Recopila todos los roles del usuario desde diferentes fuentes.
   * 
   * Fuentes de roles:
   * - Atributo data-role del elemento body
   * - Meta tag con name="user-roles"
   * - Variables globales: window.USER_ROLES, window.ROLES, window.USER_ROLE
   * 
   * @returns {Array<string>} Array de roles normalizados (minúsculas, sin espacios)
   */
  function roles(){
    const set=new Set();
    const norm=s=>String(s||'').toLowerCase().trim();
    
    // Obtener roles desde el atributo data-role del body
    const b=document.body||document.querySelector('body');
    if(b)(b.getAttribute('data-role')||'').split(',').map(norm).filter(Boolean).forEach(r=>set.add(r));
    
    // Obtener roles desde meta tag
    const meta=document.querySelector('meta[name="user-roles"]');
    if(meta?.content) meta.content.split(',').map(norm).filter(Boolean).forEach(r=>set.add(r));
    
    // Obtener roles desde variables globales
    const gr=(window.USER_ROLES||window.ROLES||window.USER_ROLE||'');
    (Array.isArray(gr)?gr:String(gr).split(',')).map(norm).filter(Boolean).forEach(r=>set.add(r));
    
    return Array.from(set);
  }
  
  // Obtener roles del usuario
  const r=roles();
  
  // Verificar si el usuario es administrador
  const isAdmin=r.includes('administrador');
  
  // Verificar si el usuario tiene algún rol auxiliar (contiene 'aux')
  const isAux=r.some(x=>x.includes('aux'));
  
  // Si el usuario tiene permisos, no hacer nada (permitir acceso)
  if(isAdmin||isAux) return;
  
  // Usuario sin permisos: ocultar elementos del módulo
  
  // Ocultar campana de notificaciones
  const bell=document.getElementById('noti-admin'); 
  if(bell) bell.remove();
  
  // Ocultar badge de notificaciones
  const badge=document.getElementById('noti-badge'); 
  if(badge) badge.remove();
  
  // Lista de secciones a ocultar para usuarios sin permisos
  const sections=[
    'tab-content-capacitaciones',
    'tab-content-reuniones',
    'tab-content-asistencias',
    'tab-content-inventarios',
    'tab-content-monitoreos-generales'
  ];
  
  // Remover cada sección del DOM
  sections.forEach(id=>{
    const el=document.getElementById(id); 
    if(el) el.remove();
  });
});