/**
 * Gestión de Roles - VERSIÓN MEJORADA
 * Manejo de CRUD de roles y permisos basados en páginas/módulos
 */

// Estado global
let allRoles = [];
let availableResources = {};
let currentEditingRole = null;

// Constantes
const API_ROLES = '/php/roles_api.php';
const API_PERMISSIONS = '/php/permissions_api.php';

// Sistema de logging - usar Logger si está disponible, sino usar console
const log = window.Logger || {
    debug: () => { },  // No-op en producción si Logger no está cargado
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
};

/**
 * Inicialización
 */
document.addEventListener('DOMContentLoaded', function () {
    loadRoles();

    // Event listeners
    document.getElementById('refreshRolesBtnAdd').addEventListener('click', addNewRole);
    document.getElementById('formEditRolPermisos').addEventListener('submit', saveRoleAndPermissions);

    // Enter key en el input de nuevo rol
    document.getElementById('newRoleInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewRole();
        }
    });

    // Botón para actualizar catálogo de recursos (se agrega dinámicamente cuando se abre el modal)
    document.addEventListener('click', async function (e) {
        if (e.target && (e.target.id === 'btnRefreshCatalog' || e.target.closest('#btnRefreshCatalog'))) {
            e.preventDefault();
            await refreshResourcesCatalog();
        }

        // Manejar botones de seleccionar/deseleccionar todas las páginas de un módulo
        // Checkbox change event delegation
    });

    document.addEventListener('change', function (e) {
        if (e.target && e.target.classList.contains('module-select-all-check')) {
            toggleModulePermissions(e.target);
        }
    });
});

/**
 * Cargar lista de roles
 */
async function loadRoles() {
    try {
        const response = await fetch(API_ROLES);
        const data = await response.json();

        if (data.success) {
            allRoles = data.roles;
            renderRolesTable();
        } else {
            showToast('Error al cargar roles: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error al cargar roles:', error);
        showToast('Error al cargar roles', 'error');
    }
}

/**
 * Renderizar tabla de roles
 */
function renderRolesTable() {
    const tbody = document.querySelector('#rolesTable tbody');
    const countSpan = document.getElementById('rolesCount');

    tbody.innerHTML = '';

    // Filter out Administrator role (ID=1) as it should not be managed here
    const manageableRoles = allRoles.filter(role => role.id !== 1);
    countSpan.textContent = manageableRoles.length;

    manageableRoles.forEach(role => {
        const tr = document.createElement('tr');

        const estadoClass = role.estado === 0 ? 'success' : 'danger';
        const estadoText = role.estado === 0 ? 'Activo' : 'Inactivo';
        const isActive = role.estado === 0;

        tr.innerHTML = `
            <td class="text-center">${role.id}</td>
            <td>${escapeHtml(role.nombre)}</td>
            <td>
                <div class="form-check form-switch d-inline-block">
                    <input class="form-check-input role-status-switch" 
                           type="checkbox" 
                           role="switch"
                           id="roleSwitch${role.id}"
                           data-role-id="${role.id}"
                           ${isActive ? 'checked' : ''}
                           title="${isActive ? 'Desactivar' : 'Activar'} rol"
                           aria-label="${isActive ? 'Desactivar' : 'Activar'} rol ${escapeHtml(role.nombre)}">
                    <label class="form-check-label small" for="roleSwitch${role.id}">
                        <span class="badge bg-${estadoClass}">${estadoText}</span>
                    </label>
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary btn-edit-role" 
                        data-role-id="${role.id}"
                        title="Editar rol y permisos"
                        aria-label="Editar rol ${escapeHtml(role.nombre)}">
                    <i class="fa-solid fa-pen-to-square fa-lg"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-delete-role ms-1" 
                        data-role-id="${role.id}"
                        data-role-name="${escapeHtml(role.nombre)}"
                        title="Eliminar rol"
                        aria-label="Eliminar rol ${escapeHtml(role.nombre)}">
                    <i class="fa-solid fa-trash fa-lg"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);

        // Add event listeners to the buttons and switch
        const editBtn = tr.querySelector('.btn-edit-role');
        const statusSwitch = tr.querySelector('.role-status-switch');
        const deleteBtn = tr.querySelector('.btn-delete-role');

        editBtn.addEventListener('click', () => editRole(role.id));
        statusSwitch.addEventListener('change', (e) => {
            // Fetch the current role state from allRoles array (source of truth)
            const currentRole = allRoles.find(r => r.id === role.id);
            if (currentRole) {
                toggleRoleStatus(role.id, currentRole.estado, e.target);
            }
        });
        deleteBtn.addEventListener('click', () => deleteRole(role.id, role.nombre));
    });
}

/**
 * Agregar nuevo rol
 */
async function addNewRole() {
    const input = document.getElementById('newRoleInput');
    const nombre = input.value.trim();

    if (!nombre) {
        showToast('Por favor ingrese un nombre para el rol', 'warning');
        input.focus();
        return;
    }

    // Validar longitud mínima
    if (nombre.length < 3) {
        showToast('El nombre del rol debe tener al menos 3 caracteres', 'warning');
        input.focus();
        return;
    }

    // Validar longitud máxima
    if (nombre.length > 50) {
        showToast('El nombre del rol no puede exceder 50 caracteres', 'warning');
        input.focus();
        return;
    }

    // Validar caracteres permitidos
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s_-]+$/.test(nombre)) {
        showToast('El nombre contiene caracteres no permitidos. Use solo letras, números, espacios y guiones', 'warning');
        input.focus();
        return;
    }

    // Deshabilitar input mientras se procesa
    const addBtn = document.getElementById('refreshRolesBtnAdd');
    input.disabled = true;
    addBtn.disabled = true;
    addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Creando...';

    try {
        const response = await fetch(API_ROLES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Rol creado exitosamente', 'success');
            input.value = '';
            await loadRoles();
        } else {
            showToast(data.message || 'Error al crear rol', 'error');
        }
    } catch (error) {
        console.error('Error al crear rol:', error);
        showToast('Error de conexión al crear rol', 'error');
    } finally {
        // Rehabilitar input
        input.disabled = false;
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fa-solid fa-plus me-1"></i> Agregar rol';
        input.focus();
    }
}

/**
 * Editar rol y sus permisos
 */
async function editRole(roleId) {
    const role = allRoles.find(r => r.id === roleId);
    if (!role) {
        showToast('Rol no encontrado', 'error');
        return;
    }

    currentEditingRole = role;

    // Mostrar modal primero con indicador de carga
    const modal = new bootstrap.Modal(document.getElementById('modalEditRolPermisos'));
    modal.show();

    // Llenar información básica del rol
    document.getElementById('modalRolId').value = role.id;
    document.getElementById('modalRolNombreInput').value = role.nombre;

    // Mostrar indicador de carga en el contenedor de permisos
    const container = document.getElementById('permissionsContainer');
    container.innerHTML = `
        <div class="text-center py-5 w-100">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2 text-muted">Cargando módulos y permisos...</p>
        </div>
    `;

    try {
        // Cargar recursos disponibles
        await loadAvailableResources();

        // Cargar permisos del rol
        await loadRolePermissions(roleId);
    } catch (error) {
        console.error('Error al cargar datos del rol:', error);
        showToast('Error al cargar datos del rol. Por favor intente nuevamente.', 'error');
        // Mostrar mensaje de error en el contenedor
        container.innerHTML = `
            <div class="text-center text-danger py-5 w-100">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <p class="mb-0 fw-bold">Error al cargar las páginas disponibles.</p>
                <small>Por favor cierre este diálogo e intente nuevamente.</small>
            </div>
        `;
    }
}

/**
 * Cargar recursos disponibles (páginas/módulos)
 */
async function loadAvailableResources() {
    try {
        const response = await fetch(API_PERMISSIONS + '?available=1');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            availableResources = data.modules || {};
            renderPermissionsGrid(data.modules || {});

            // Log información para debugging
            log.debug('[roles]', 'Recursos cargados:', Object.keys(availableResources).length, 'módulos');
        } else {
            const errorMsg = data.message || 'Error desconocido al cargar recursos disponibles';
            showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error al cargar recursos:', error);
        const userMsg = error.message.includes('HTTP error')
            ? 'Error de conexión al cargar recursos. Verifique su sesión.'
            : 'Error al cargar recursos disponibles.';
        showToast(userMsg, 'error');
        throw error; // Re-throw para que editRole pueda manejarlo
    }
}

/**
 * Actualizar el catálogo de recursos escaneando el sistema de archivos
 */
async function refreshResourcesCatalog() {
    const btn = document.getElementById('btnRefreshCatalog');
    if (!btn) return;

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Actualizando...';

    try {
        const response = await fetch(API_PERMISSIONS + '?update_catalog=1');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            const resourceCount = data.updated_count || 0;
            showToast(`Catálogo actualizado: ${resourceCount} recursos escaneados`, 'success');
            log.info('[roles]', 'Catálogo actualizado:', data);

            // Recargar recursos disponibles si estamos en un modal de edición
            if (currentEditingRole) {
                await loadAvailableResources();
                await loadRolePermissions(currentEditingRole.id);
            }
        } else {
            const errorMsg = data.message || 'Error al actualizar el catálogo';
            showToast(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error al actualizar catálogo:', error);
        const userMsg = error.message.includes('HTTP error')
            ? 'Error de conexión. Verifique su sesión y que sea administrador.'
            : 'Error al actualizar el catálogo de recursos.';
        showToast(userMsg, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Marcar/Desmarcar todas las páginas de un módulo
 */
/**
 * Marcar/Desmarcar todas las páginas de un módulo
 */
function toggleModulePermissions(checkbox) {
    const moduleName = checkbox.getAttribute('data-module');
    if (!moduleName) return;

    // Encontrar la tarjeta del módulo
    const moduleCard = checkbox.closest('.module-card');
    if (!moduleCard) return;

    const checkboxes = moduleCard.querySelectorAll('.permission-check');
    if (checkboxes.length === 0) return;

    // Estado deseado basado en el checkbox "Select All"
    const newState = checkbox.checked;

    // Aplicar el nuevo estado
    checkboxes.forEach(cb => {
        cb.checked = newState;
    });

    // Actualizar tooltip
    checkbox.title = newState ? 'Deseleccionar todo' : 'Seleccionar todo';

    log.debug('[roles]', `${newState ? 'Marcadas' : 'Desmarcadas'} ${checkboxes.length} páginas del módulo "${moduleName}"`);
}

/**
 * Renderizar GRID de permisos (Cards)
 */
function renderPermissionsGrid(modules) {
    const container = document.getElementById('permissionsContainer');
    container.innerHTML = '';

    // Si no hay módulos, mostrar mensaje informativo
    if (!modules || Object.keys(modules).length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5 w-100">
                <i class="fas fa-info-circle fa-3x mb-3 text-secondary"></i>
                <h5 class="fw-bold">No se encontraron módulos</h5>
                <p class="mb-2">El catálogo de recursos parece estar vacío.</p>
                <button class="btn btn-outline-primary mt-2" id="btnRefreshCatalogEmpty">
                    <i class="fas fa-sync-alt me-1"></i> Actualizar Catálogo
                </button>
            </div>
        `;

        // Bind refresh button in empty state
        document.getElementById('btnRefreshCatalogEmpty')?.addEventListener('click', refreshResourcesCatalog);
        return;
    }

    // Renderizar cada módulo como una tarjeta
    for (const [moduleName, pages] of Object.entries(modules)) {
        if (!pages || pages.length === 0) continue;

        // Icono por defecto o mapeado (se podría mejorar con un mapa de iconos)
        const moduleIcon = getModuleIcon(moduleName);

        const cardCol = document.createElement('div');
        // cardCol.className = 'col-12 col-md-6 col-lg-4'; // Grid classes handled by CSS grid container

        const pagesHtml = pages.map((page, index) => {
            const uniqueId = 'perm_' + escapeHtml(moduleName).replace(/[^a-zA-Z0-9]/g, '_') + '_' + index + '_' + hashCode(page.path);
            return `
                <div class="permission-item">
                    <div class="permission-info">
                        <label class="permission-label fw-bold mb-0 cursor-pointer" for="${uniqueId}">
                            ${escapeHtml(page.name)}
                        </label>
                        <span class="permission-path text-truncate" title="${escapeHtml(page.path)}">
                            ${escapeHtml(page.path)}
                        </span>
                    </div>
                    <div class="form-check form-switch ms-2">
                        <input class="form-check-input permission-check" 
                               type="checkbox" 
                               role="switch"
                               value="${escapeHtml(page.path)}" 
                               id="${uniqueId}">
                    </div>
                </div>
            `;
        }).join('');

        cardCol.innerHTML = `
            <div class="module-card h-100">
                <div class="module-header">
                    <div class="module-title">
                        <div class="module-icon">
                            <i class="${moduleIcon}"></i>
                        </div>
                        ${escapeHtml(moduleName)}
                        <span class="badge bg-light text-secondary ms-2 border">${pages.length}</span>
                    </div>
                    <div class="form-check m-0">
                        <input class="form-check-input module-select-all-check" 
                               type="checkbox" 
                               data-module="${escapeHtml(moduleName)}" 
                               title="Seleccionar todo"
                               style="width: 1.3em; height: 1.3em; cursor: pointer;">
                    </div>
                </div>
                <div class="module-body">
                    ${pagesHtml}
                </div>
            </div>
        `;

        container.appendChild(cardCol);
    }

    // Implementar búsqueda
    setupSearchFilter();
}

function getModuleIcon(moduleName) {
    const icons = {
        'Administrador': 'fas fa-cogs',
        'Usuarios': 'fas fa-users',
        'Seguridad': 'fas fa-shield-alt',
        'Configuración': 'fas fa-sliders-h',
        'Capacitaciones': 'fas fa-chalkboard-teacher',
        'Agronomía': 'fas fa-leaf',
        'Báscula': 'fas fa-weight-hanging',
        'Almacén': 'fas fa-boxes',
        'Laboratorio': 'fas fa-flask',
        'Producción': 'fas fa-industry',
        'Logística': 'fas fa-truck',
        'Mantenimiento': 'fas fa-tools',
        'HSE': 'fas fa-hard-hat',
        'Gestión Humana': 'fas fa-user-tie',
        'Compras': 'fas fa-shopping-cart',
        'Ventas': 'fas fa-chart-line',
        'Finanzas': 'fas fa-coins',
        'Proyectos': 'fas fa-project-diagram',
        'Calidad': 'fas fa-check-circle',
        'Ambiental': 'fas fa-recycle',
        'TIC': 'fas fa-laptop-code',
        'Legal': 'fas fa-balance-scale'
    };
    return icons[moduleName] || 'fas fa-folder';
}

function setupSearchFilter() {
    const searchInput = document.getElementById('searchPermissions');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.module-card');

        cards.forEach(card => {
            const moduleName = card.querySelector('.module-title').textContent.toLowerCase();
            const items = card.querySelectorAll('.permission-item');
            let hasVisibleItems = false;

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(term) || moduleName.includes(term)) {
                    item.style.display = 'flex';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show/Hide card based on items visibility
            if (hasVisibleItems) {
                card.parentElement.style.display = 'block';
            } else {
                card.parentElement.style.display = 'none';
            }
        });
    });
}

/**
 * Cargar permisos de un rol específico
 */
async function loadRolePermissions(roleId) {
    try {
        const response = await fetch(API_PERMISSIONS + '?rol_id=' + roleId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            const permissions = data.permissions || [];

            log.debug('[roles]', `Loaded ${permissions.length} permissions for role ID ${roleId}:`, permissions);

            // Marcar checkboxes según permisos del rol
            const checkboxes = document.querySelectorAll('.permission-check');
            log.debug('[roles]', `Aplicando ${permissions.length} permisos a ${checkboxes.length} checkboxes`);

            if (checkboxes.length === 0) {
                log.warn('[roles]', 'No se encontraron checkboxes para marcar. La tabla de permisos puede estar vacía.');
            }

            let matched = 0;
            checkboxes.forEach(checkbox => {
                const isChecked = permissions.includes(checkbox.value);
                checkbox.checked = isChecked;
                if (isChecked) matched++;
            });

            log.debug('[roles]', `Permisos aplicados correctamente para rol ID ${roleId}. Matched: ${matched}/${permissions.length}`);
        } else {
            const errorMsg = data.message || 'Error desconocido al cargar permisos del rol';
            showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error al cargar permisos del rol:', error);
        const userMsg = error.message.includes('HTTP error')
            ? 'Error de conexión al cargar permisos. Verifique su sesión.'
            : 'Error al cargar permisos del rol.';
        showToast(userMsg, 'error');
        throw error; // Re-throw para que editRole pueda manejarlo
    }
}

/**
 * Guardar rol y permisos
 */
async function saveRoleAndPermissions(e) {
    e.preventDefault();

    const roleId = parseInt(document.getElementById('modalRolId').value);
    const roleName = document.getElementById('modalRolNombreInput').value.trim();

    if (!roleName) {
        showToast('El nombre del rol es obligatorio', 'warning');
        document.getElementById('modalRolNombreInput').focus();
        return;
    }

    // Validar longitud y caracteres (como en addNewRole)
    if (roleName.length < 3) {
        showToast('El nombre del rol debe tener al menos 3 caracteres', 'warning');
        document.getElementById('modalRolNombreInput').focus();
        return;
    }

    if (roleName.length > 50) {
        showToast('El nombre del rol no puede exceder 50 caracteres', 'warning');
        document.getElementById('modalRolNombreInput').focus();
        return;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s_-]+$/.test(roleName)) {
        showToast('El nombre contiene caracteres no permitidos', 'warning');
        document.getElementById('modalRolNombreInput').focus();
        return;
    }

    // Obtener permisos seleccionados (resource_paths)
    const permissions = [];
    document.querySelectorAll('.permission-check:checked').forEach(checkbox => {
        permissions.push(checkbox.value);
    });

    log.debug('[roles]', 'Selected permissions:', permissions);

    // Validar que al menos se seleccionó un permiso
    if (permissions.length === 0) {
        const confirmNoPerms = confirm(
            '⚠️ No ha seleccionado ninguna página.\n\n' +
            'Un rol sin permisos no podrá acceder a ninguna parte del sistema.\n\n' +
            '¿Está seguro de continuar sin asignar permisos?'
        );
        if (!confirmNoPerms) {
            return;
        }
    }

    log.debug('[roles]', `Guardando rol ID ${roleId} con ${permissions.length} permisos:`, permissions);

    // Deshabilitar botón de guardar mientras se procesa
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Guardando...';

    try {
        // Actualizar nombre del rol
        const responseRole = await fetch(API_ROLES, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: roleId, nombre: roleName })
        });

        const dataRole = await responseRole.json();

        if (!dataRole.success) {
            showToast(dataRole.message || 'Error al actualizar rol', 'error');
            return;
        }

        // Actualizar permisos
        const responsePerms = await fetch(API_PERMISSIONS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rol_id: roleId, permissions })
        });

        const dataPerms = await responsePerms.json();

        if (dataPerms.success) {
            const count = dataPerms.count || permissions.length;
            showToast(`Rol actualizado: ${count} página(s) asignada(s)`, 'success');

            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditRolPermisos'));
            modal.hide();

            // Recargar roles
            await loadRoles();
        } else {
            showToast(dataPerms.message || 'Error al actualizar permisos', 'error');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        showToast('Error de conexión al guardar cambios', 'error');
    } finally {
        // Rehabilitar botón
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

/**
 * Toggle estado del rol (activo/inactivo)
 */
async function toggleRoleStatus(roleId, currentEstado, switchElement) {
    const estadoText = currentEstado === 0 ? 'desactivar' : 'activar';
    const roleName = allRoles.find(r => r.id === roleId)?.nombre || 'este rol';

    // Solicitar confirmación al usuario
    if (!confirm(`¿Está seguro de ${estadoText} el rol "${roleName}"?`)) {
        // User cancelled - revert the switch back to its original state
        if (switchElement) {
            switchElement.checked = currentEstado === 0; // Revert to original state
        }
        return;
    }

    const newEstado = currentEstado === 0 ? 1 : 0;

    try {
        const response = await fetch(API_ROLES, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: roleId, estado: newEstado })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Estado del rol actualizado', 'success');
            await loadRoles();
        } else {
            showToast(data.message || 'Error al actualizar estado', 'error');
            // Revert the switch on error
            if (switchElement) {
                switchElement.checked = currentEstado === 0;
            }
        }
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        showToast('Error de conexión al actualizar estado', 'error');
        // Revert the switch on error
        if (switchElement) {
            switchElement.checked = currentEstado === 0;
        }
    }
}

/**
 * Eliminar rol
 */
async function deleteRole(roleId, roleName) {
    if (!confirm(`¿Está seguro de eliminar el rol "${roleName}"?\n\nEsta acción no se puede deshacer y eliminará todos los permisos asociados.`)) {
        return;
    }

    try {
        const response = await fetch(API_ROLES, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: roleId })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Rol eliminado exitosamente', 'success');
            await loadRoles();
        } else {
            showToast(data.message || 'Error al eliminar rol', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar rol:', error);
        showToast('Error de conexión al eliminar rol', 'error');
    }
}

/**
 * Mostrar notificación toast
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastBody = document.getElementById('notificationToastBody');

    toastBody.textContent = message;

    // Cambiar color según tipo
    toast.className = 'toast align-items-center border-0';
    switch (type) {
        case 'success':
            toast.classList.add('text-bg-success');
            break;
        case 'error':
            toast.classList.add('text-bg-danger');
            break;
        case 'warning':
            toast.classList.add('text-bg-warning');
            break;
        default:
            toast.classList.add('text-bg-dark');
    }

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Generar un hash simple de un string para IDs únicos
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}
