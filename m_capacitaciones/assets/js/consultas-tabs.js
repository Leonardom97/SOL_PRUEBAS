// --- DEFINICIÓN DE TABS ---
const TABS = [
  { key: "capacitaciones", label: "Consultas de Capacitaciones", icon: "chalkboard-teacher" },
  { key: "por-persona", label: "Consultas por Persona", icon: "users" }
];

let visibleTabs = TABS.map(t => t.key);
if (localStorage.visibleTabsConsultas) {
  try { visibleTabs = JSON.parse(localStorage.visibleTabsConsultas); } catch (e) { }
}

function renderTabs() {
  const group = document.getElementById('tabsGroup');
  group.innerHTML = '';
  TABS.forEach(tab => {
    if (visibleTabs.includes(tab.key)) {
      const btn = document.createElement('button');
      btn.className = 'md-tab-btn';
      btn.dataset.tab = tab.key;
      btn.innerHTML = `<i class="fas fa-${tab.icon}"></i> ${tab.label}`;
      group.appendChild(btn);
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
  TABS.forEach(tab => {
    const switchDiv = document.createElement('div');
    switchDiv.className = 'form-check form-switch';
    switchDiv.innerHTML = `
      <input class="form-check-input" type="checkbox" role="switch" id="switch-${tab.key}" data-tab="${tab.key}" ${visibleTabs.includes(tab.key) ? 'checked' : ''}>
      <label class="form-check-label" for="switch-${tab.key}">
        <i class="fas fa-${tab.icon}"></i> ${tab.label}
      </label>
    `;
    checks.appendChild(switchDiv);
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
    localStorage.visibleTabsConsultas = JSON.stringify(visibleTabs);
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
