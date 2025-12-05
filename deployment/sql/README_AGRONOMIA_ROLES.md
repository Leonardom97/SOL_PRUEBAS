# Roles y Permisos del Módulo de Agronomía

## Descripción General

Este documento describe los 5 roles implementados para el módulo de agronomía y sus permisos específicos.

## Roles Disponibles

### 1. Aux_agronomico (Auxiliar Agronómico)
**Permisos:**
- ✅ Puede ingresar información (CRUD en BD temporal)
- ✅ Puede ver información
- ❌ **SIN** acceso a botones de aprobación/rechazo
- ❌ **NO** puede revertir registros aprobados
- ⚠️ **SOLO** puede INACTIVAR error_registro (NO puede activar)

**Código en Backend:** `aux_agronomico`

**Uso típico:** Personal de campo que ingresa datos pero no tiene autoridad para aprobarlos.

---

### 2. Agronomico (Agronómico - Acceso Completo)
**Permisos:**
- ✅ Acceso completo a todo el módulo de agronomía sin restricciones
- ✅ Puede ingresar, aprobar, rechazar, revertir, activar e inactivar
- ✅ Máximo nivel de permisos en el módulo

**Código en Backend:** `agronomico`

**Uso típico:** Ingeniero agrónomo o supervisor principal con autoridad total.

---

### 3. Sup_logistica1 (Supervisor Logística 1)
**Permisos:**
- ✅ Puede ingresar información
- ✅ Tiene acceso a botones de aprobar/rechazar
- ✅ Puede ver información
- ❌ **NO** puede revertir registros aprobados
- ⚠️ **SOLO** puede INACTIVAR error_registro (NO puede activar)

**Código en Backend:** `sup_logistica1`

**Uso típico:** Supervisor del área de logística con autoridad de aprobación pero sin reversión.

---

### 4. Sup_logistica2 (Supervisor Logística 2)
**Permisos:**
- ✅ Puede ingresar información
- ✅ Tiene acceso a botones de aprobar/rechazar
- ✅ Puede ver información
- ❌ **NO** puede revertir registros aprobados
- ⚠️ **SOLO** puede INACTIVAR error_registro (NO puede activar)

**Código en Backend:** `sup_logistica2`

**Uso típico:** Otro supervisor del área de logística con los mismos permisos que Sup_logistica1.

---

### 5. Asist_agronomico (Asistente Agronómico)
**Permisos:**
- ✅ Puede ingresar información
- ✅ Tiene acceso a botones de aprobar/rechazar
- ✅ Puede ver información
- ✅ **PUEDE** revertir registros aprobados
- ✅ **Puede ACTIVAR** error_registro (tanto activar como desactivar)

**Código en Backend:** `asist_agronomico`

**Uso típico:** Asistente con más autoridad que supervisores, puede corregir errores revertiendo aprobaciones.

---

## Matriz de Permisos

| Permiso | Aux_agronomico | Agronomico | Sup_logistica1 | Sup_logistica2 | Asist_agronomico |
|---------|----------------|------------|----------------|----------------|------------------|
| Ver información | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ingresar/Editar datos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Aprobar/Rechazar | ❌ | ✅ | ✅ | ✅ | ✅ |
| Revertir aprobados | ❌ | ✅ | ❌ | ❌ | ✅ |
| Inactivar error_registro | ✅ | ✅ | ✅ | ✅ | ✅ |
| Activar error_registro | ❌ | ✅ | ❌ | ❌ | ✅ |

---

## Instalación de Roles

### 1. Ejecutar el Script SQL

Para crear los roles en la base de datos, ejecute el script SQL:

```bash
psql -U postgres -d web_osm -f deployment/sql/insert_agronomia_roles.sql
```

O desde psql:

```sql
\i deployment/sql/insert_agronomia_roles.sql
```

### 2. Verificar Roles Creados

```sql
SELECT id, nombre, estado 
FROM adm_roles 
WHERE nombre IN ('agronomico', 'aux_agronomico', 'sup_logistica1', 'sup_logistica2', 'asist_agronomico')
ORDER BY nombre;
```

---

## Asignación de Roles a Usuarios

### Método 1: Actualizar tabla usuarios

```sql
-- Asignar rol a un usuario específico
UPDATE usuarios 
SET rol = 'agronomico' 
WHERE username = 'nombre_usuario';

-- Asignar rol aux_agronomico
UPDATE usuarios 
SET rol = 'aux_agronomico' 
WHERE username = 'auxiliar1';

-- Asignar múltiples roles (separados por comas)
UPDATE usuarios 
SET rol = 'sup_logistica1,asist_agronomico' 
WHERE username = 'supervisor1';
```

### Método 2: Tabla usuarios_roles (si existe en su esquema)

```sql
-- Asignar un rol específico
INSERT INTO usuarios_roles (usuario_id, rol_id) 
VALUES (
  (SELECT id FROM usuarios WHERE username = 'nombre_usuario'),
  (SELECT id FROM adm_roles WHERE nombre = 'agronomico')
);

-- Asignar múltiples roles a un usuario
INSERT INTO usuarios_roles (usuario_id, rol_id) 
SELECT 
  (SELECT id FROM usuarios WHERE username = 'supervisor1'),
  id
FROM adm_roles 
WHERE nombre IN ('sup_logistica1', 'asist_agronomico');
```

---

## Verificación de Permisos

### En el Backend (PHP)

Los archivos API usan `roles_auth.php` para verificar permisos:

```php
// Verificar si puede aprobar/rechazar
if ($action === 'aprobar' || $action === 'rechazar') {
    require_approve_reject_permission();
}

// Verificar si puede revertir
if ($action === 'revertir') {
    require_revert_permission();
}

// Verificar si puede activar error_registro
if ($action === 'activar') {
    require_activate_error_registro_permission();
}
```

### En el Frontend (JavaScript)

Los permisos se exponen globalmente:

```javascript
// Verificar permisos en JavaScript
if (window.AGRONOMIA_PERMISSIONS) {
  const canApprove = window.AGRONOMIA_PERMISSIONS.canApproveReject;
  const canRevert = window.AGRONOMIA_PERMISSIONS.canRevert;
  const canActivate = window.AGRONOMIA_PERMISSIONS.canActivateError;
  const canInactivate = window.AGRONOMIA_PERMISSIONS.canInactivateError;
  const canEnter = window.AGRONOMIA_PERMISSIONS.canEnterData;
}
```

---

## Tablas Disponibles

Todos los roles de agronomía tienen acceso a las siguientes 25 tablas:

1. Recolección Fruta (Cosecha Fruta)
2. Mantenimientos
3. Oficios Varios Palma
4. Fertilización Orgánica
5. Monitoreos Generales
6. Calidad Sanidad
7. Nivel Freático
8. Calidad Labores
9. Monitoreo Trampas
10. Compactación
11. Plagas
12. Calidad Trampas
13. Reporte Lote Monitoreo
14. Coberturas
15. Calidad Polinización Flores
16. Auditoría Cosecha
17. Auditoría Fertilización
18. Auditoría Mantenimiento
19. Auditoría Pérdidas
20. Auditoría Vagones
21. Labores Diarias
22. Polinización
23. Resiembra
24. Salida Vivero
25. Siembra Nueva

---

## Solución de Problemas

### Problema: Las tablas no se muestran

**Solución:**
1. Verificar que el usuario tenga un rol de agronomía asignado
2. Verificar en la consola del navegador: `console.log(window.AGRONOMIA_USER_ROLES)`
3. Verificar que el rol esté en minúsculas en la BD
4. Limpiar caché del navegador (Ctrl+Shift+Del)

### Problema: Los botones de aprobar/rechazar no aparecen

**Solución:**
1. Verificar que el usuario NO sea `aux_agronomico`
2. Verificar permisos: `console.log(window.AGRONOMIA_PERMISSIONS.canApproveReject)`
3. Revisar la sesión PHP: `/php/verificar_sesion.php`

### Problema: No puede activar error_registro

**Solución:**
- Solo `agronomico` y `asist_agronomico` pueden activar
- Verificar: `console.log(window.AGRONOMIA_PERMISSIONS.canActivateError)`
- Los demás roles solo pueden inactivar

---

## Archivos Modificados

### Backend (PHP)
- `/m_agronomia/assets/php/roles_auth.php` - Funciones de verificación de permisos
- `/m_agronomia/assets/php/*_api.php` - Todos los 28 archivos API actualizados

### Frontend (JavaScript)
- `/m_agronomia/assets/js/role_guard_agronomia.js` - Guard principal de roles
- `/m_agronomia/assets/js/agronomia.js` - Publicación de roles al DOM
- `/m_agronomia/assets/js/material-super.js` - Gestión de tabs y visibilidad

### SQL
- `/deployment/sql/insert_agronomia_roles.sql` - Script de creación de roles

---

## Contacto y Soporte

Para preguntas o problemas con el sistema de roles, contacte al equipo de desarrollo.

**Última actualización:** Diciembre 2024
