# Roles y Permisos - Módulo de Agronomía

## Descripción General

El módulo de agronomía cuenta con un sistema de control de acceso basado en roles que define qué acciones puede realizar cada usuario en el sistema.

## Roles Disponibles

### 1. Aux_agronomico (Auxiliar Agronómico)
**Permisos:**
- ✅ Puede ingresar información (CRUD en BD temporal)
- ✅ Puede ver información
- ❌ **SIN** acceso a botones de aprobación/rechazo
- ❌ **NO** puede revertir registros aprobados
- ✅ **SOLO** puede INACTIVAR error_registro (no puede activar)

**Casos de uso:**
- Ingreso de datos operativos diarios
- Consulta de información existente
- Edición de registros en estado de edición

---

### 2. Agronomico (Agronómico - Acceso Completo)
**Permisos:**
- ✅ Acceso completo a todo el módulo sin restricciones
- ✅ Puede ingresar información
- ✅ Puede aprobar registros
- ✅ Puede rechazar registros
- ✅ **PUEDE** revertir registros aprobados
- ✅ Puede **ACTIVAR** error_registro
- ✅ Puede **INACTIVAR** error_registro

**Casos de uso:**
- Gestión completa del módulo
- Supervisión y control de calidad
- Corrección de errores y reversión de aprobaciones

---

### 3. Sup_logistica1 (Supervisor Logística 1)
**Permisos:**
- ✅ Puede ingresar información
- ✅ Tiene acceso a botones de aprobar/rechazar
- ✅ Puede ver información
- ❌ **NO** puede revertir registros aprobados
- ✅ **SOLO** puede INACTIVAR error_registro (no puede activar)

**Casos de uso:**
- Supervisión de operaciones logísticas
- Aprobación y rechazo de registros operativos
- Inactivación de registros con errores

---

### 4. Sup_logistica2 (Supervisor Logística 2)
**Permisos:**
- ✅ Puede ingresar información
- ✅ Tiene acceso a botones de aprobar/rechazar
- ✅ Puede ver información
- ❌ **NO** puede revertir registros aprobados
- ✅ **SOLO** puede INACTIVAR error_registro (no puede activar)

**Casos de uso:**
- Supervisión de operaciones logísticas
- Aprobación y rechazo de registros operativos
- Inactivación de registros con errores

---

### 5. Asist_agronomico (Asistente Agronómico)
**Permisos:**
- ✅ Puede ingresar información
- ✅ Tiene acceso a botones de aprobar/rechazar
- ✅ Puede ver información
- ✅ **PUEDE** revertir registros aprobados
- ✅ Puede **ACTIVAR** error_registro
- ✅ Puede **INACTIVAR** error_registro

**Casos de uso:**
- Asistencia en gestión agronómica
- Aprobación y rechazo de registros
- Corrección de errores mediante activación/inactivación
- Reversión de aprobaciones cuando sea necesario

---

### 6. Administrador
**Permisos:**
- ✅ Acceso completo sin restricciones a todos los módulos

---

## Matriz de Permisos

| Acción | Aux_agronomico | Agronomico | Sup_logistica1 | Sup_logistica2 | Asist_agronomico | Administrador |
|--------|---------------|-----------|---------------|---------------|----------------|--------------|
| Ingresar información | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver información | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar registros | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Aprobar registros | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rechazar registros | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Revertir aprobaciones | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Activar error_registro | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Inactivar error_registro | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Implementación Técnica

### Archivos Clave

1. **`role_permissions.js`**: Configuración centralizada de permisos
   - Define los permisos para cada rol
   - Proporciona funciones de verificación de permisos
   - Se carga antes de los scripts de cada módulo

2. **Archivos JavaScript del módulo**: 
   - Todos los archivos JS del módulo (27 archivos) utilizan el sistema de permisos
   - Verifican permisos antes de mostrar o habilitar controles
   - Incluyen: labores_diarias.js, cosecha_fruta.js, mantenimientos.js, etc.

3. **`notificaciones_operaciones.js`**: 
   - Controla la visualización de botones de aprobar/rechazar
   - Solo muestra botones si el usuario tiene los permisos correspondientes

4. **HTML Pages**:
   - `tb_agronomia.html`: Página principal del módulo
   - `f_cortes.html`: Gestión de fechas de corte
   - Ambos incluyen atributo `data-role` con los roles permitidos

5. **Sidebar** (`includes/sidebar.html`):
   - Controla el acceso al menú de Agronomía
   - Solo muestra el menú a usuarios con roles apropiados

6. **PHP Backend** (`require_admin.php`):
   - Validación de roles a nivel del servidor
   - Protege las APIs contra acceso no autorizado

### Uso del Sistema de Permisos

```javascript
// Verificar si el usuario tiene un permiso específico
const perms = window.AgronomiaRolePermissions.getUserPermissions();
if (perms.canApprove) {
  // Mostrar botón de aprobar
}

// Verificar si el usuario tiene uno de varios roles
if (window.AgronomiaRolePermissions.hasAnyRole(['agronomico', 'asist_agronomico'])) {
  // Permitir acceso
}

// Obtener el rol principal del usuario
const rolePrincipal = window.AgronomiaRolePermissions.getPrimaryRole();
console.log('Rol principal:', rolePrincipal);
```

---

## Flujo de Trabajo por Rol

### Aux_agronomico
1. Ingresa datos en formularios
2. Los registros quedan en estado "pendiente"
3. Puede ver sus registros ingresados
4. Puede marcar registros como inactivos si detecta errores
5. **No puede aprobar** sus propios registros ni los de otros

### Sup_logistica1 / Sup_logistica2
1. Puede ingresar datos
2. Puede **aprobar o rechazar** registros pendientes
3. Puede marcar registros como inactivos
4. **No puede revertir** aprobaciones ya realizadas
5. **No puede activar** registros marcados como inactivos

### Asist_agronomico
1. Puede ingresar datos
2. Puede **aprobar o rechazar** registros pendientes
3. **Puede revertir** registros que fueron aprobados
4. **Puede activar** registros que estaban inactivos
5. Puede inactivar registros

### Agronomico
1. Acceso completo sin restricciones
2. Puede realizar todas las operaciones del sistema
3. Gestión completa del módulo de agronomía

---

## Configuración de Roles en la Base de Datos

Los roles se gestionan a través del sistema de administración:
1. Ir a **Administrador → Gestión de Roles**
2. Crear los roles mencionados arriba con los nombres exactos:
   - `Aux_agronomico`
   - `Agronomico`
   - `Sup_logistica1`
   - `Sup_logistica2`
   - `Asist_agronomico`
3. Asignar permisos de página al módulo de Agronomía
4. Asignar usuarios a los roles correspondientes

---

## Validación de Permisos

El sistema valida permisos en tres niveles:

1. **Frontend (JavaScript)**: 
   - Oculta o deshabilita controles según permisos
   - Proporciona feedback inmediato al usuario
   - Previene acciones no autorizadas

2. **Backend (PHP)**:
   - Valida roles en cada llamada a la API
   - Protege contra manipulación del frontend
   - Retorna errores 403 para accesos no autorizados

3. **Base de Datos**:
   - Tabla `adm_roles`: Define los roles disponibles
   - Tabla `adm_usuario_roles`: Asigna roles a usuarios
   - Tabla `adm_role_permissions`: Define permisos por rol

---

## Notas Importantes

- Los roles son **case-insensitive** en el sistema (se normalizan a minúsculas)
- El rol **Administrador** tiene acceso completo sin restricciones
- Los permisos se verifican tanto en frontend como en backend para seguridad
- Los botones y controles se ocultan/deshabilitan automáticamente según permisos
- Si un usuario tiene múltiples roles, se usa el rol con más permisos

---

## Soporte y Mantenimiento

Para agregar nuevos roles o modificar permisos:

1. Actualizar `role_permissions.js` con la nueva configuración
2. Actualizar los atributos `data-role` en los archivos HTML
3. Actualizar `material-super.js` para incluir el nuevo rol en los tabs
4. Actualizar `require_admin.php` si se requiere validación del backend
5. Crear el rol en la base de datos usando la interfaz de gestión de roles

---

## Fecha de Última Actualización

**Diciembre 2024**

---

## Contacto

Para consultas sobre el sistema de roles y permisos, contactar al equipo de TI.
