/**
 * material-super.js
 * 
 * Sistema de gestión de pestañas (tabs) con control de acceso por roles.
 * 
 * Funcionalidades principales:
 * - Renderizado dinámico de pestañas según roles del usuario
 * - Persistencia de pestañas visibles en localStorage
 * - Modal selector para mostrar/ocultar pestañas
 * - Navegación entre pestañas con flechas
 * - Control de acceso basado en roles para cada pestaña
 * 
 * Roles soportados:
 * - administrador: Acceso completo a todas las pestañas
 * - supervisor_agronomico: Acceso a pestañas de supervisión
 * - aux_agronomico: Acceso a pestañas de auxiliar agronómico
 * - sup_logistica1: Acceso a pestañas de logística nivel 1
 * - asist_agronomico: Acceso a pestañas de asistente agronómico
 */
// --- DEFINICIÓN DE TABS (con roles permitidos) ---
const TABS = [
  { key: "cosecha-fruta", label: "Recoleccion Fruta", icon: "chalkboard-teacher", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "asist_agronomico"] },
  { key: "mantenimientos", label: "Mantenimientos", icon: "users", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "asist_agronomico"] },
  { key: "oficios-varios-palma", label: "Oficios Varios Palmas", icon: "clipboard-check", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "asist_agronomico"] },
  { key: "ct-cal-labores", label: "Calidad Labores", icon: "tasks", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "asist_agronomico"] },
  { key: "fertilizacion-organica", label: "Fertilizacion Organica", icon: "warehouse", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "monitoreos-generales", label: "Monitoreos Generales", icon: "table", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "ct-cal-sanidad", label: "Calidad Sanidad", icon: "leaf", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "nivel-freatico", label: "Nivel Freático", icon: "water", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "monitoreo-trampas", label: "Monitoreo Trampas", icon: "bug", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "compactacion", label: "Compactación", icon: "compress", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "plagas", label: "Plagas", icon: "skull-crossbones", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "ct-cal-trampas", label: "Calidad Trampas", icon: "clipboard-list", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "reporte-lote-monitoreo", label: "Reporte Lote Monitoreo", icon: "file-alt", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "coberturas", label: "Coberturas", icon: "layer-group", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "ct-polinizacion-flores", label: "Calidad Polinización Flores", icon: "flower", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "aud-cosecha", label: "Auditoría Cosecha", icon: "search", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "aud-fertilizacion", label: "Auditoría Fertilización", icon: "search-plus", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "aud-mantenimiento", label: "Auditoría Mantenimiento", icon: "wrench", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "aud-perdidas", label: "Auditoría Pérdidas", icon: "exclamation-triangle", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "aud-vagones", label: "Auditoría Vagones", icon: "truck", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "labores-diarias", label: "Labores Diarias", icon: "calendar-day", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "compostaje", label: "Compostaje", icon: "recycle", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "erradicaciones", label: "Erradicaciones", icon: "trash", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "aud-maquinaria", label: "Auditoría Maquinaria", icon: "tractor", roles: ["administrador", "supervisor_agronomico", "aux_agronomico"] },
  { key: "polinizacion", label: "Polinización", icon: "seedling", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "resiembra", label: "Resiembra", icon: "redo", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "salida-vivero", label: "Salida Vivero", icon: "sign-out-alt", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] },
  { key: "siembra-nueva", label: "Siembra Nueva", icon: "plus-circle", roles: ["administrador", "supervisor_agronomico", "aux_agronomico", "asist_agronomico"] }
];
/**
 * Obtiene los roles del usuario logueado desde múltiples fuentes.
 * 
 * Fuentes consultadas:
 * - Atributo data-role del elemento body
 * - Meta tag con name="user-roles"
 * - Variables globales: window.USER_ROLES, window.ROLES, window.USER_ROLE
 * 
 * @returns {Array<string>} Array de roles normalizados (en minúsculas)
 */
function getUserRoles() {
  const set = new Set();
  const norm = s => String(s || '').toLowerCase().trim();
  // Obtener roles desde el atributo data-role del body
  const b = document.body || document.querySelector('body');
  if (b) (b.getAttribute('data-role') || '').split(',').map(norm).filter(Boolean).forEach(r => set.add(r));
  // Obtener roles desde meta tag
  const meta = document.querySelector('meta[name="user-roles"]');
  if (meta?.content) meta.content.split(',').map(norm).filter(Boolean).forEach(r => set.add(r));
  // Obtener roles desde variables globales
  const gr = (window.USER_ROLES || window.ROLES || window.USER_ROLE || '');
  (Array.isArray(gr) ? gr : String(gr).split(',')).map(norm).filter(Boolean).forEach(r => set.add(r));
  return Array.from(set);
}
// Inicializar pestañas visibles desde localStorage o mostrar todas por defecto
let visibleTabs = TABS.map(t => t.key);
if (localStorage.visibleTabs) {
  try { visibleTabs = JSON.parse(localStorage.visibleTabs); } catch (e) { }
}
/**
 * Renderiza las pestañas visibles según los permisos del usuario.
 * 
 * Solo muestra pestañas que:
 * 1. El usuario tiene permiso para ver (según su rol)
 * 2. Están marcadas como visibles en localStorage
 * 
 * Después de renderizar, activa automáticamente la primera pestaña.
 */
function renderTabs() {
  const group = document.getElementById('tabsGroup');
  group.innerHTML = '';
  const userRoles = getUserRoles();
  // Iterar sobre todas las pestañas definidas
  TABS.forEach(tab => {
    // Verificar si el usuario tiene al menos uno de los roles requeridos
    if (tab.roles.some(r => userRoles.includes(r))) {
      // Verificar si la pestaña está en la lista de visibles
      if (visibleTabs.includes(tab.key)) {
        const btn = document.createElement('button');
        btn.className = 'md-tab-btn';
        btn.dataset.tab = tab.key;
        btn.innerHTML = `<i class="fas fa-${tab.icon}"></i> ${tab.label}`;
        group.appendChild(btn);
      }
    }
  });
  // Activar la primera pestaña después de un pequeño delay
  setTimeout(() => {
    const firstTab = group.querySelector('.md-tab-btn');
    if (firstTab) firstTab.classList.add('active');
    showTabContent(firstTab ? firstTab.dataset.tab : null);
  }, 10);
}
// Renderizar pestañas al cargar el script
renderTabs();
/**
 * Muestra el contenido de una pestaña específica y oculta las demás.
 * 
 * @param {string} tabKey - Identificador único de la pestaña a mostrar
 */
function showTabContent(tabKey) {
  // Ocultar todas las tarjetas de contenido
  document.querySelectorAll('.md-table-card').forEach(sec => sec.style.display = 'none');
  // Mostrar solo la tarjeta correspondiente a la pestaña seleccionada
  if (tabKey && document.getElementById('tab-content-' + tabKey)) {
    document.getElementById('tab-content-' + tabKey).style.display = 'block';
  }
  // Remover clase 'active' de todos los botones de pestañas
  document.querySelectorAll('.md-tab-btn').forEach(btn => btn.classList.remove('active'));
  // Agregar clase 'active' al botón de la pestaña seleccionada
  const btn = document.querySelector(`.md-tab-btn[data-tab="${tabKey}"]`);
  if (btn) btn.classList.add('active');
}
// --- SELECTOR DE PESTAÑAS (MODAL) ---
/**
 * Renderiza el modal selector de pestañas con checkboxes.
 * 
 * Muestra solo las pestañas a las que el usuario tiene acceso según su rol.
 * Los checkboxes permiten al usuario mostrar u ocultar pestañas de la barra.
 */
function renderTabSelector() {
  const checks = document.getElementById('tabSelectorChecks');
  checks.innerHTML = '';
  const userRoles = getUserRoles();
  // Crear un checkbox por cada pestaña a la que el usuario tiene acceso
  TABS.forEach(tab => {
    if (tab.roles.some(r => userRoles.includes(r))) {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" data-tab="${tab.key}" ${visibleTabs.includes(tab.key) ? 'checked' : ''}> <i class="fas fa-${tab.icon}"></i> ${tab.label}`;
      checks.appendChild(label);
    }
  });
}
// Abrir modal selector de pestañas
document.getElementById('openTabSelector').onclick = () => {
  renderTabSelector();
  document.getElementById('tabSelectorModal').classList.add('show');
};
// Cerrar modal selector de pestañas
document.getElementById('closeSelector').onclick = () => {
  document.getElementById('tabSelectorModal').classList.remove('show');
};
// Manejar cambios en los checkboxes del selector
document.getElementById('tabSelectorChecks').onclick = e => {
  if (e.target.type === 'checkbox') {
    const key = e.target.dataset.tab;
    if (e.target.checked) {
      // Agregar pestaña a la lista de visibles
      if (!visibleTabs.includes(key)) visibleTabs.push(key);
    } else {
      // Remover pestaña de la lista de visibles (mantener al menos una)
      if (visibleTabs.length > 1) {
        visibleTabs = visibleTabs.filter(k => k !== key);
      } else {
        // No permitir desmarcar la última pestaña visible
        e.target.checked = true;
      }
    }
    // Guardar preferencias en localStorage
    localStorage.visibleTabs = JSON.stringify(visibleTabs);
    // Re-renderizar pestañas y selector
    renderTabs();
    renderTabSelector();
  }
};
// Manejar clics en las pestañas
document.getElementById('tabsGroup').addEventListener('click', function (e) {
  const btn = e.target.closest('.md-tab-btn');
  if (btn) {
    showTabContent(btn.dataset.tab);
  }
});
// Flecha izquierda: desplazar pestañas hacia la izquierda
document.getElementById('tabArrowLeft').onclick = function () {
  const group = document.getElementById('tabsGroup');
  group.scrollBy({ left: -150, behavior: 'smooth' });
};
// Flecha derecha: desplazar pestañas hacia la derecha
document.getElementById('tabArrowRight').onclick = function () {
  const group = document.getElementById('tabsGroup');
  group.scrollBy({ left: 150, behavior: 'smooth' });
};