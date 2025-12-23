/**
 * gestion.js
 * Lógica para la gestión de permisos en gestion_permisos_agronomia.html
 */

// Lista de roles disponibles (normalizados)
const AVAILABLE_ROLES = [
    "administrador",
    "agronomico",
    "asist_agronomico",
    "supervisor_agronomico",
    "aux_agronomico",
    "sup_logistica1",
    "sup_logistica2",
    "editor_logistica1",
    "editor_logistica2",
    "sup_produccion",
    "editor_produccion",
    "sup_logi_y_transporte", // Normalizado desde "Sup_logi y transporte"
    "sup_topografo"
];

// Nombres legibles para los roles
const ROLE_LABELS = {
    "administrador": "Administrador",
    "agronomico": "Agronómico",
    "supervisor_agronomico": "Sup. Agronómico",
    "asist_agronomico": "Asist. Agronómico",
    "aux_agronomico": "Aux. Agronómico",
    "sup_logistica1": "Sup. Logística 1",
    "sup_logistica2": "Sup. Logística 2",
    "editor_logistica1": "Editor Logística 1",
    "editor_logistica2": "Editor Logística 2",
    "sup_produccion": "Sup. Producción",
    "editor_produccion": "Editor Producción",
    "sup_logi_y_transporte": "Sup. Logi y Transporte",
    "sup_topografo": "Sup. Topógrafo"
};

// Definiciones de pestañas (para obtener nombres e iconos si no están en config)
const TAB_INFO = {
    "cosecha-fruta": { label: "Recoleccion Fruta", icon: "chalkboard-teacher" },
    "mantenimientos": { label: "Mantenimientos", icon: "users" },
    "oficios-varios-palma": { label: "Oficios Varios Palmas", icon: "clipboard-check" },
    "ct-cal-labores": { label: "Calidad Labores", icon: "tasks" },
    "fertilizacion-organica": { label: "Fertilizacion Organica", icon: "warehouse" },
    "monitoreos-generales": { label: "Monitoreos Generales", icon: "table" },
    "ct-cal-sanidad": { label: "Calidad Sanidad", icon: "leaf" },
    "nivel-freatico": { label: "Nivel Freático", icon: "water" },
    "monitoreo-trampas": { label: "Monitoreo Trampas", icon: "bug" },
    "compactacion": { label: "Compactación", icon: "compress" },
    "plagas": { label: "Plagas", icon: "skull-crossbones" },
    "ct-cal-trampas": { label: "Calidad Trampas", icon: "clipboard-list" },
    "reporte-lote-monitoreo": { label: "Reporte Lote Monitoreo", icon: "file-alt" },
    "coberturas": { label: "Coberturas", icon: "layer-group" },
    "ct-polinizacion-flores": { label: "Calidad Polinización Flores", icon: "spa" },
    "aud-cosecha": { label: "Auditoría Cosecha", icon: "search" },
    "aud-fertilizacion": { label: "Auditoría Fertilización", icon: "search-plus" },
    "aud-mantenimiento": { label: "Auditoría Mantenimiento", icon: "wrench" },
    "aud-perdidas": { label: "Auditoría Pérdidas", icon: "exclamation-triangle" },
    "aud-vagones": { label: "Auditoría Vagones", icon: "truck" },
    "labores-diarias": { label: "Labores Diarias", icon: "calendar-day" },
    "polinizacion": { label: "Polinización", icon: "seedling" },
    "resiembra": { label: "Resiembra", icon: "redo" },
    "salida-vivero": { label: "Salida Vivero", icon: "sign-out-alt" },
    "siembra-nueva": { label: "Siembra Nueva", icon: "plus-circle" },
    "aud-maquinaria": { label: "Auditoría Maquinaria", icon: "tractor" },
    "compostaje": { label: "Compostaje", icon: "recycle" },
    "erradicaciones": { label: "Erradicaciones", icon: "trash" }
};

// Definiciones de Notificaciones (para la segunda tabla)
const NOTIFICATION_ITEMS = {
    "notification_bell": { label: "Campana de Aprobaciones", icon: "bell" }
};

let currentConfig = [];

async function loadPermissions() {
    try {
        const response = await fetch('assets/php/manage_tab_permissions.php?t=' + Date.now());

        if (!response.ok) {
            // Si el servidor devuelve error (500, 404, etc), intentamos leer el mensaje
            const text = await response.text();
            let errorMsg = `Error del Servidor (${response.status})`;
            try {
                // Si es JSON de error, lo mostramos bonito
                const json = JSON.parse(text);
                if (json.message || json.error) errorMsg += ': ' + (json.message || json.error);
            } catch (e) {
                // Si es HTML o texto plano (ej: Fatal Error)
                console.error("Respuesta cruda del servidor:", text);
                errorMsg += '. Ver consola para detalles.';
            }
            throw new Error(errorMsg);
        }

        const text = await response.text();
        // Intentar parsear JSON
        try {
            currentConfig = JSON.parse(text);
        } catch (e) {
            // Si falla el parseo, mostrar qué devolvió el servidor (probablemente HTML de error o blanco)
            console.error("JSON Inválido. Respuesta recibida:", text);
            throw new Error(`Respuesta inválida del servidor (No es JSON). Ver consola.`);
        }

        // Verificar si el JSON tiene un campo de error explícito (aunque sea 200 OK)
        if (currentConfig.error || currentConfig.success === false) {
            throw new Error(currentConfig.message || currentConfig.error || "Error desconocido");
        }

        renderTable();
    } catch (error) {
        console.error('Error loading permissions:', error);
        alert(error.message);
    }
}

function renderTable() {
    const tbodyTabs = document.getElementById('permissionsTableBody');
    const tbodyNotis = document.getElementById('notificationsTableBody');

    tbodyTabs.innerHTML = '';
    if (tbodyNotis) tbodyNotis.innerHTML = '';

    // Convertir array de config a mapa para búsqueda fácil
    // currentConfig viene de BD: [{key: 'tab-key', roles: ['admin', ...]}, ...]
    const configMap = {};
    if (Array.isArray(currentConfig)) {
        currentConfig.forEach(item => {
            configMap[item.key] = item.roles;
        });
    }

    // Helper para renderizar filas
    const renderRows = (ITEMS, targetTbody) => {
        Object.keys(ITEMS).forEach((key) => {
            const info = ITEMS[key];
            const activeRoles = configMap[key] || [];

            // Si no está en BD pero existe en ITEMS, ensure slot
            if (!configMap[key]) {
                const existingIdx = currentConfig.findIndex(c => c.key === key);
                if (existingIdx === -1) {
                    currentConfig.push({ key: key, roles: [] });
                }
            }

            const realIndex = currentConfig.findIndex(c => c.key === key);
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td><div class="tab-icon"><i class="fas fa-${info.icon}"></i></div></td>
                <td><strong>${info.label}</strong><br><small class="text-muted">${key}</small></td>
                <td><div class="role-check-container" id="roles-container-${key}"></div></td>
            `;

            targetTbody.appendChild(tr);

            const container = tr.querySelector(`#roles-container-${key}`);

            AVAILABLE_ROLES.forEach(role => {
                const isChecked = activeRoles.includes(role);
                const roleEl = document.createElement('label');
                roleEl.className = `role-option ${isChecked ? 'selected' : ''}`;
                roleEl.innerHTML = `
                    <input type="checkbox" value="${role}" ${isChecked ? 'checked' : ''} onchange="toggleRole(${realIndex}, '${role}', this)">
                    ${ROLE_LABELS[role] || role}
                `;
                container.appendChild(roleEl);
            });
        });
    };

    // Renderizar Pestañas Principales
    renderRows(TAB_INFO, tbodyTabs);

    // Renderizar Notificaciones (si la tabla existe)
    if (tbodyNotis && typeof NOTIFICATION_ITEMS !== 'undefined') {
        renderRows(NOTIFICATION_ITEMS, tbodyNotis);
    }
}

function toggleRole(tabIndex, role, checkbox) {
    // Encontrar lista existente
    let roles = currentConfig[tabIndex].roles;

    if (checkbox.checked) {
        if (!roles.includes(role)) roles.push(role);
        checkbox.closest('.role-option').classList.add('selected');
    } else {
        currentConfig[tabIndex].roles = roles.filter(r => r !== role);
        checkbox.closest('.role-option').classList.remove('selected');
    }
}

async function savePermissions() {
    try {
        const response = await fetch('assets/php/manage_tab_permissions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentConfig)
        });

        const result = await response.json();
        if (result.success) {
            alert('Permisos guardados correctamente.');
        } else {
            alert('Error al guardar: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving:', error);
        alert('Error de red al guardar.');
    }
}

// Carga Inicial
document.addEventListener('DOMContentLoaded', loadPermissions);
