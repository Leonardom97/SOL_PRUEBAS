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

/**
 * Inicialización
 */
document.addEventListener('DOMContentLoaded', function() {
    loadRoles();
    
    // Event listeners
    document.getElementById('refreshRolesBtnAdd').addEventListener('click', addNewRole);
    document.getElementById('formEditRolPermisos').addEventListener('submit', saveRoleAndPermissions);
    
    // Enter key en el input de nuevo rol
    document.getElementById('newRoleInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewRole();
        }
    });
    
    // Botón para actualizar catálogo de recursos (se agrega dinámicamente cuando se abre el modal)
    document.addEventListener('click', async function(e) {
        if (e.target && (e.target.id === 'btnRefreshCatalog' || e.target.closest('#btnRefreshCatalog'))) {
            e.preventDefault();
            await refreshResourcesCatalog();
        }
        
        // Manejar botones de seleccionar/deseleccionar todas las páginas de un módulo
        const selectAllBtn = e.target.closest('.module-select-all');
        if (selectAllBtn) {
            e.preventDefault();
            toggleModulePermissions(selectAllBtn);
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
    
    // Mostrar indicador de carga en la tabla de permisos
    const tbody = document.querySelector('#pestanasPermisosTable tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="2" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 mb-0 text-muted">Cargando páginas disponibles...</p>
            </td>
        </tr>
    `;
    
    try {
        // Cargar recursos disponibles
        await loadAvailableResources();
        
        // Cargar permisos del rol
        await loadRolePermissions(roleId);
    } catch (error) {
        console.error('Error al cargar datos del rol:', error);
        showToast('Error al cargar datos del rol. Por favor intente nuevamente.', 'error');
        // Mostrar mensaje de error en la tabla
        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p class="mb-0">Error al cargar las páginas disponibles.</p>
                    <small>Por favor cierre este diálogo e intente nuevamente.</small>
                </td>
            </tr>
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
            renderPermissionsTable(data.modules || {});
            
            // Log información para debugging
            console.log('[roles] Recursos cargados:', Object.keys(availableResources).length, 'módulos');
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
            console.log('[roles] Catálogo actualizado:', data);
            
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
function toggleModulePermissions(button) {
    const moduleName = button.getAttribute('data-module');
    if (!moduleName) return;
    
    // Encontrar todas las filas del módulo
    const moduleRows = document.querySelectorAll('.modulo-row');
    const moduleCheckboxes = [];
    
    // Filtrar checkboxes que pertenecen a este módulo
    // (están después de la fila del módulo hasta la siguiente fila de módulo)
    let inTargetModule = false;
    document.querySelectorAll('#pestanasPermisosTable tbody tr').forEach(tr => {
        if (tr.classList.contains('modulo-titulo')) {
            // Verificar si es el módulo objetivo
            const titleText = (tr.querySelector('strong')?.textContent || '').trim();
            inTargetModule = titleText === moduleName.trim();
        } else if (inTargetModule && tr.classList.contains('modulo-row')) {
            const checkbox = tr.querySelector('.permission-check');
            if (checkbox) {
                moduleCheckboxes.push(checkbox);
            }
        }
    });
    
    if (moduleCheckboxes.length === 0) return;
    
    // Determinar si marcar o desmarcar (si todos están marcados, desmarcar; si no, marcar)
    const allChecked = moduleCheckboxes.every(cb => cb.checked);
    const newState = !allChecked;
    
    // Aplicar el nuevo estado
    moduleCheckboxes.forEach(cb => {
        cb.checked = newState;
    });
    
    // Actualizar icono del botón
    const icon = button.querySelector('i');
    if (icon) {
        icon.className = newState ? 'fas fa-check-double' : 'fas fa-square';
    }
    
    console.log(`[roles] ${newState ? 'Marcadas' : 'Desmarcadas'} ${moduleCheckboxes.length} páginas del módulo "${moduleName}"`);
}

/**
 * Renderizar tabla de permisos (páginas agrupadas por módulo)
 */
function renderPermissionsTable(modules) {
    const tbody = document.querySelector('#pestanasPermisosTable tbody');
    tbody.innerHTML = '';
    
    // Si no hay módulos, mostrar mensaje informativo
    if (!modules || Object.keys(modules).length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="2" class="text-center text-muted py-4">
                <i class="fas fa-info-circle fa-2x mb-2"></i>
                <p class="mb-2"><strong>No se encontraron páginas disponibles.</strong></p>
                <small>El catálogo de recursos puede estar vacío. El sistema escaneará automáticamente las páginas HTML cuando se guarden cambios.</small>
                <br>
                <small class="text-info">
                    <i class="fas fa-lightbulb me-1"></i>
                    Si es la primera vez usando el sistema, es normal que este mensaje aparezca.
                </small>
            </td>
        `;
        tbody.appendChild(tr);
        console.warn('[roles] No hay módulos disponibles para mostrar. El catálogo puede estar vacío.');
        return;
    }
    
    // Contador de páginas renderizadas
    let totalPages = 0;
    
    // Renderizar cada módulo con sus páginas
    for (const [moduleName, pages] of Object.entries(modules)) {
        if (!pages || pages.length === 0) continue;
        
        // Fila del módulo (encabezado)
        const trModule = document.createElement('tr');
        trModule.className = 'modulo-titulo';
        trModule.innerHTML = `
            <td>
                <i class="fas fa-folder me-2"></i>
                <strong>${escapeHtml(moduleName)}</strong>
                <small class="text-muted ms-2">(${pages.length} página${pages.length !== 1 ? 's' : ''})</small>
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-secondary module-select-all" 
                        data-module="${escapeHtml(moduleName)}"
                        title="Marcar/Desmarcar todas las páginas de este módulo">
                    <i class="fas fa-check-double"></i>
                </button>
            </td>
        `;
        tbody.appendChild(trModule);
        
        // Filas de páginas
        pages.forEach((page, index) => {
            const tr = document.createElement('tr');
            tr.className = 'modulo-row';
            
            const pagePath = page.path;
            const pageName = page.name;
            // Use a combination of module, index, and hash of path for uniqueness
            const uniqueId = 'perm_' + escapeHtml(moduleName).replace(/[^a-zA-Z0-9]/g, '_') + '_' + index + '_' + hashCode(pagePath);
            
            tr.innerHTML = `
                <td class="ps-4">
                    <div>
                        <strong>${escapeHtml(pageName)}</strong>
                        <br>
                        <small class="text-muted">${escapeHtml(pagePath)}</small>
                    </div>
                </td>
                <td class="text-center">
                    <div class="form-check form-switch d-inline-block">
                        <input class="form-check-input permission-check" 
                               type="checkbox" 
                               role="switch"
                               value="${escapeHtml(pagePath)}" 
                               id="${uniqueId}"
                               aria-label="Permitir acceso a ${escapeHtml(pageName)}">
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
            totalPages++;
        });
    }
    
    console.log(`[roles] Renderizadas ${totalPages} páginas en ${Object.keys(modules).length} módulos`);
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
            
            console.log(`[roles] Loaded ${permissions.length} permissions for role ID ${roleId}:`, permissions);
            
            // Marcar checkboxes según permisos del rol
            const checkboxes = document.querySelectorAll('.permission-check');
            console.log(`[roles] Aplicando ${permissions.length} permisos a ${checkboxes.length} checkboxes`);
            
            if (checkboxes.length === 0) {
                console.warn('[roles] No se encontraron checkboxes para marcar. La tabla de permisos puede estar vacía.');
            }
            
            let matched = 0;
            checkboxes.forEach(checkbox => {
                const isChecked = permissions.includes(checkbox.value);
                checkbox.checked = isChecked;
                if (isChecked) matched++;
            });
            
            console.log(`[roles] Permisos aplicados correctamente para rol ID ${roleId}. Matched: ${matched}/${permissions.length}`);
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
    
    console.log(`[roles] Selected permissions:`, permissions);
    
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
    
    console.log(`[roles] Guardando rol ID ${roleId} con ${permissions.length} permisos:`, permissions);
    
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
