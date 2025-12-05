// --- DEFINICIÓN DE TABS (con roles permitidos) ---
const TABS = [
  { key: "capacitaciones", label: "Recoleccion Fruta", icon: "chalkboard-teacher", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "reuniones", label: "Mantenimientos", icon: "users", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "asistencias", label: "Oficios Varios Palmas", icon: "clipboard-check", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "ct-cal-labores", label: "Calidad Labores", icon: "tasks", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  // Los demás tabs con todos los roles agronomia 
  { key: "inventarios", label: "Fertilizacion Organica", icon: "warehouse", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "monitoreos-generales", label: "Monitoreos Generales", icon: "table", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "ct-cal-sanidad", label: "Calidad Sanidad", icon: "leaf", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "nivel-freatico", label: "Nivel Freático", icon: "water", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "monitoreo-trampas", label: "Monitoreo Trampas", icon: "bug", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "compactacion", label: "Compactación", icon: "compress", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "plagas", label: "Plagas", icon: "skull-crossbones", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "ct-cal-trampas", label: "Calidad Trampas", icon: "clipboard-list", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "reporte-lote-monitoreo", label: "Reporte Lote Monitoreo", icon: "file-alt", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "coberturas", label: "Coberturas", icon: "layer-group", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "ct-polinizacion-flores", label: "Calidad Polinización Flores", icon: "flower", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "aud-cosecha", label: "Auditoría Cosecha", icon: "search", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "aud-fertilizacion", label: "Auditoría Fertilización", icon: "search-plus", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "aud-mantenimiento", label: "Auditoría Mantenimiento", icon: "wrench", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "aud-perdidas", label: "Auditoría Pérdidas", icon: "exclamation-triangle", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "aud-vagones", label: "Auditoría Vagones", icon: "truck", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "labores-diarias", label: "Labores Diarias", icon: "calendar-day", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "polinizacion", label: "Polinización", icon: "seedling", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "resiembra", label: "Resiembra", icon: "redo", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "salida-vivero", label: "Salida Vivero", icon: "sign-out-alt", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] },
  { key: "siembra-nueva", label: "Siembra Nueva", icon: "plus-circle", roles: ["administrador", "agronomico", "supervisor_agronomico", "aux_agronomico", "sup_logistica1", "sup_logistica2", "asist_agronomico"] }
];

// --- Obtiene los roles del usuario logueado ---
function getUserRoles() {
  const set = new Set();
  const norm = s => String(s || '').toLowerCase().trim();
  const b = document.body || document.querySelector('body');
  if (b) (b.getAttribute('data-role') || '').split(',').map(norm).filter(Boolean).forEach(r => set.add(r));
  const meta = document.querySelector('meta[name="user-roles"]');
  if (meta?.content) meta.content.split(',').map(norm).filter(Boolean).forEach(r => set.add(r));
  const gr = (window.USER_ROLES || window.ROLES || window.USER_ROLE || '');
  (Array.isArray(gr) ? gr : String(gr).split(',')).map(norm).filter(Boolean).forEach(r => set.add(r));
  return Array.from(set);
}

let visibleTabs = TABS.map(t => t.key);
if (localStorage.visibleTabs) {
  try { visibleTabs = JSON.parse(localStorage.visibleTabs); } catch (e) { }
}

function renderTabs() {
  const group = document.getElementById('tabsGroup');
  group.innerHTML = '';
  const userRoles = getUserRoles();
  TABS.forEach(tab => {
    if (tab.roles.some(r => userRoles.includes(r))) {
      if (visibleTabs.includes(tab.key)) {
        const btn = document.createElement('button');
        btn.className = 'md-tab-btn';
        btn.dataset.tab = tab.key;
        btn.innerHTML = `<i class="fas fa-${tab.icon}"></i> ${tab.label}`;
        group.appendChild(btn);
      }
    }
  });
  setTimeout(() => {
    const firstTab = group.querySelector('.md-tab-btn');
    if (firstTab) firstTab.classList.add('active');
    showTabContent(firstTab ? firstTab.dataset.tab : null);
  }, 10);
}
renderTabs();

function showTabContent(tabKey) {
  document.querySelectorAll('.md-table-card').forEach(sec => sec.style.display = 'none');
  if (tabKey && document.getElementById('tab-content-' + tabKey)) {
    document.getElementById('tab-content-' + tabKey).style.display = 'block';
  }
  document.querySelectorAll('.md-tab-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.querySelector(`.md-tab-btn[data-tab="${tabKey}"]`);
  if (btn) btn.classList.add('active');
}

// --- SELECTOR DE TABS (MODAL) ---
function renderTabSelector() {
  const checks = document.getElementById('tabSelectorChecks');
  checks.innerHTML = '';
  const userRoles = getUserRoles();
  TABS.forEach(tab => {
    if (tab.roles.some(r => userRoles.includes(r))) {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" data-tab="${tab.key}" ${visibleTabs.includes(tab.key) ? 'checked' : ''}> <i class="fas fa-${tab.icon}"></i> ${tab.label}`;
      checks.appendChild(label);
    }
  });
}
document.getElementById('openTabSelector').onclick = () => {
  renderTabSelector();
  document.getElementById('tabSelectorModal').classList.add('show');
};
document.getElementById('closeSelector').onclick = () => {
  document.getElementById('tabSelectorModal').classList.remove('show');
};
document.getElementById('tabSelectorChecks').onclick = e => {
  if (e.target.type === 'checkbox') {
    const key = e.target.dataset.tab;
    if (e.target.checked) {
      if (!visibleTabs.includes(key)) visibleTabs.push(key);
    } else {
      if (visibleTabs.length > 1) visibleTabs = visibleTabs.filter(k => k !== key);
      else e.target.checked = true;
    }
    localStorage.visibleTabs = JSON.stringify(visibleTabs);
    renderTabs();
    renderTabSelector();
  }
};

document.getElementById('tabsGroup').addEventListener('click', function (e) {
  const btn = e.target.closest('.md-tab-btn');
  if (btn) {
    showTabContent(btn.dataset.tab);
  }
});

document.getElementById('tabArrowLeft').onclick = function () {
  const group = document.getElementById('tabsGroup');
  group.scrollBy({ left: -150, behavior: 'smooth' });
};
document.getElementById('tabArrowRight').onclick = function () {
  const group = document.getElementById('tabsGroup');
  group.scrollBy({ left: 150, behavior: 'smooth' });
};