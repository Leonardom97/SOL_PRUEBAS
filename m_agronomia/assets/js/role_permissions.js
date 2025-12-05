/**
 * role_permissions.js
 * 
 * Configuración centralizada de permisos para roles del módulo de agronomía
 * 
 * ROLES:
 * 1. Aux_agronomico (Auxiliar Agronómico)
 * 2. Agronomico (Agronómico - Acceso Completo) 
 * 3. Sup_logistica1 (Supervisor Logística 1)
 * 4. Sup_logistica2 (Supervisor Logística 2)
 * 5. Asist_agronomico (Asistente Agronómico)
 */

(function() {
  'use strict';

  // Normalización de roles (igual que en sidebar.js y auth_guard.js)
  const normalize = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');

  /**
   * Configuración de permisos por rol
   */
  const ROLE_PERMISSIONS = {
    // Aux_agronomico: Puede ingresar y ver, SIN aprobar/rechazar, NO revertir, SOLO inactivar
    aux_agronomico: {
      canCreate: true,           // Puede ingresar información (CRUD en BD temporal)
      canView: true,             // Puede ver información
      canEdit: true,             // Puede editar registros en estado de edición
      canApprove: false,         // SIN acceso a botones de aprobación
      canReject: false,          // SIN acceso a botones de rechazo
      canRevert: false,          // NO puede revertir registros aprobados
      canActivate: false,        // NO puede activar error_registro
      canInactivate: true        // SOLO puede INACTIVAR error_registro
    },

    // Agronomico: Acceso completo sin restricciones
    agronomico: {
      canCreate: true,           // Puede ingresar información
      canView: true,             // Puede ver información
      canEdit: true,             // Puede editar registros
      canApprove: true,          // Puede aprobar
      canReject: true,           // Puede rechazar
      canRevert: true,           // Puede revertir registros aprobados
      canActivate: true,         // Puede ACTIVAR error_registro
      canInactivate: true        // Puede INACTIVAR error_registro
    },

    // Sup_logistica1: Puede ingresar, aprobar/rechazar, NO revertir, SOLO inactivar
    sup_logistica1: {
      canCreate: true,           // Puede ingresar información
      canView: true,             // Puede ver información
      canEdit: true,             // Puede editar registros
      canApprove: true,          // Tiene acceso a botones de aprobar
      canReject: true,           // Tiene acceso a botones de rechazar
      canRevert: false,          // NO puede revertir registros aprobados
      canActivate: false,        // NO puede activar error_registro
      canInactivate: true        // SOLO puede INACTIVAR error_registro
    },

    // Sup_logistica2: Puede ingresar, aprobar/rechazar, NO revertir, SOLO inactivar
    sup_logistica2: {
      canCreate: true,           // Puede ingresar información
      canView: true,             // Puede ver información
      canEdit: true,             // Puede editar registros
      canApprove: true,          // Tiene acceso a botones de aprobar
      canReject: true,           // Tiene acceso a botones de rechazar
      canRevert: false,          // NO puede revertir registros aprobados
      canActivate: false,        // NO puede activar error_registro
      canInactivate: true        // SOLO puede INACTIVAR error_registro
    },

    // Asist_agronomico: Puede ingresar, aprobar/rechazar, PUEDE revertir, PUEDE activar
    asist_agronomico: {
      canCreate: true,           // Puede ingresar información
      canView: true,             // Puede ver información
      canEdit: true,             // Puede editar registros
      canApprove: true,          // Tiene acceso a botones de aprobar
      canReject: true,           // Tiene acceso a botones de rechazar
      canRevert: true,           // PUEDE revertir registros aprobados
      canActivate: true,         // Puede ACTIVAR error_registro
      canInactivate: true        // Puede INACTIVAR error_registro
    },

    // Administrador: Acceso completo (siempre)
    administrador: {
      canCreate: true,
      canView: true,
      canEdit: true,
      canApprove: true,
      canReject: true,
      canRevert: true,
      canActivate: true,
      canInactivate: true
    }
  };

  /**
   * Obtiene los permisos del usuario actual basado en sus roles
   * Si el usuario tiene múltiples roles, se usa el rol con más permisos
   * 
   * @returns {Object} Objeto con los permisos del usuario
   */
  function getUserPermissions() {
    try {
      // Intentar obtener permisos desde sessionStorage (caché de auth_guard)
      const userPermissions = JSON.parse(sessionStorage.getItem('userPermissions'));
      
      if (userPermissions && userPermissions.is_admin) {
        // Administrador tiene todos los permisos
        return ROLE_PERMISSIONS.administrador;
      }

      // Obtener roles del usuario desde data-role del body (fallback)
      const bodyRole = document.body.getAttribute('data-role') || '';
      const rolesFromBody = bodyRole.split(',').map(r => normalize(r.trim()));

      // Obtener roles desde sessionStorage
      const rolesFromSession = userPermissions && userPermissions.roles 
        ? userPermissions.roles.map(r => normalize(r)) 
        : [];

      // Combinar ambas fuentes de roles
      const allRoles = [...new Set([...rolesFromBody, ...rolesFromSession])];

      // Orden de prioridad de roles (de más permisos a menos)
      const rolePriority = [
        'administrador',
        'agronomico',
        'asist_agronomico',
        'sup_logistica1',
        'sup_logistica2',
        'aux_agronomico'
      ];

      // Encontrar el rol con mayor prioridad que tenga el usuario
      for (const role of rolePriority) {
        if (allRoles.includes(role)) {
          return ROLE_PERMISSIONS[role] || getDefaultPermissions();
        }
      }

      // Si no se encuentra ningún rol conocido, devolver permisos por defecto (más restrictivos)
      return getDefaultPermissions();

    } catch (error) {
      console.error('[role_permissions] Error al obtener permisos:', error);
      return getDefaultPermissions();
    }
  }

  /**
   * Permisos por defecto (más restrictivos) para usuarios sin rol definido
   */
  function getDefaultPermissions() {
    return {
      canCreate: false,
      canView: true,
      canEdit: false,
      canApprove: false,
      canReject: false,
      canRevert: false,
      canActivate: false,
      canInactivate: false
    };
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   * 
   * @param {string} permission - Nombre del permiso (ej: 'canApprove', 'canRevert')
   * @returns {boolean} true si el usuario tiene el permiso
   */
  function hasPermission(permission) {
    const perms = getUserPermissions();
    return perms[permission] === true;
  }

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   * 
   * @param {Array<string>} roles - Array de nombres de roles
   * @returns {boolean} true si el usuario tiene alguno de los roles
   */
  function hasAnyRole(roles) {
    try {
      const userPermissions = JSON.parse(sessionStorage.getItem('userPermissions'));
      
      if (userPermissions && userPermissions.is_admin) {
        return true; // Admin tiene todos los roles implícitamente
      }

      const bodyRole = document.body.getAttribute('data-role') || '';
      const rolesFromBody = bodyRole.split(',').map(r => normalize(r.trim()));
      const rolesFromSession = userPermissions && userPermissions.roles 
        ? userPermissions.roles.map(r => normalize(r)) 
        : [];
      
      const userRoles = [...new Set([...rolesFromBody, ...rolesFromSession])];
      const normalizedTargetRoles = roles.map(r => normalize(r));

      return userRoles.some(role => normalizedTargetRoles.includes(role));
    } catch (error) {
      console.error('[role_permissions] Error al verificar roles:', error);
      return false;
    }
  }

  /**
   * Obtiene el nombre del rol principal del usuario (para logging/debugging)
   * 
   * @returns {string} Nombre del rol principal
   */
  function getPrimaryRole() {
    try {
      const userPermissions = JSON.parse(sessionStorage.getItem('userPermissions'));
      
      if (userPermissions && userPermissions.is_admin) {
        return 'administrador';
      }

      const bodyRole = document.body.getAttribute('data-role') || '';
      const rolesFromBody = bodyRole.split(',').map(r => normalize(r.trim()));
      const rolesFromSession = userPermissions && userPermissions.roles 
        ? userPermissions.roles.map(r => normalize(r)) 
        : [];
      
      const allRoles = [...new Set([...rolesFromBody, ...rolesFromSession])];

      const rolePriority = [
        'administrador',
        'agronomico',
        'asist_agronomico',
        'sup_logistica1',
        'sup_logistica2',
        'aux_agronomico'
      ];

      for (const role of rolePriority) {
        if (allRoles.includes(role)) {
          return role;
        }
      }

      return 'unknown';
    } catch (error) {
      console.error('[role_permissions] Error al obtener rol principal:', error);
      return 'unknown';
    }
  }

  // Exportar funciones al ámbito global para uso en otros scripts
  window.AgronomiaRolePermissions = {
    getUserPermissions,
    hasPermission,
    hasAnyRole,
    getPrimaryRole,
    ROLE_PERMISSIONS
  };

  console.log('[role_permissions] Sistema de permisos de agronomía cargado. Rol principal:', getPrimaryRole());

})();
