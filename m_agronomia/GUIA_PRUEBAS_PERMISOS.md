# Guía de Pruebas - Sistema de Permisos por Rol

## Objetivo
Validar que el sistema de permisos basado en roles funciona correctamente tanto en frontend como en backend para el módulo de agronomía.

---

## Preparación

### 1. Crear Usuarios de Prueba
Crear al menos un usuario para cada rol:
- Usuario con rol `Aux_agronomico`
- Usuario con rol `Agronomico`
- Usuario con rol `Sup_logistica1`
- Usuario con rol `Sup_logistica2`
- Usuario con rol `Asist_agronomico`
- Usuario con rol `Administrador`

### 2. Datos de Prueba
Preparar registros en diferentes estados:
- Registros en estado "edición" (sin aprobar)
- Registros en estado "pendiente" (enviados para aprobación)
- Registros en estado "aprobado"
- Registros con `error_registro` = 'activo'
- Registros con `error_registro` = 'inactivo'

---

## Matriz de Pruebas por Rol

### ROL: Aux_agronomico (Auxiliar Agronómico)

#### Frontend - Visibilidad
- [ ] **SIDEBAR**: Puede ver el menú "Agronomía"
- [ ] **FORMULARIO**: Puede ver todas las tablas del módulo
- [ ] **BOTONES APROBAR/RECHAZAR**: NO deben aparecer en notificaciones pendientes
- [ ] **BOTÓN REVERTIR**: NO debe aparecer
- [ ] **TOGGLE ERROR_REGISTRO**: 
  - [ ] Cuando está activo → puede inactivar (switch habilitado)
  - [ ] Cuando está inactivo → NO puede activar (switch deshabilitado)

#### Backend - Permisos API
- [ ] **Ingresar (upsert)**: ✅ Permitido
- [ ] **Ver (list/conexion)**: ✅ Permitido
- [ ] **Editar (actualizar)**: ✅ Permitido
- [ ] **Aprobar**: ❌ Debe retornar 403 - "No tiene permisos para aprobar registros"
- [ ] **Rechazar**: ❌ Debe retornar 403 - "No tiene permisos para rechazar registros"
- [ ] **Inactivar**: ✅ Permitido
- [ ] **Activar**: ❌ Debe retornar 403 - "No tiene permisos para activar registros"

#### Pruebas Backend con cURL
```bash
# Aprobar (debe fallar)
curl -X POST http://localhost/m_agronomia/assets/php/cosecha_fruta_api.php?action=aprobar \
  -H "Content-Type: application/json" \
  -d '{"cosecha_fruta_id": "123"}' \
  -b "PHPSESSID=<session_id>"

# Activar (debe fallar)
curl -X POST http://localhost/m_agronomia/assets/php/cosecha_fruta_api.php?action=activar \
  -H "Content-Type: application/json" \
  -d '{"cosecha_fruta_id": "123"}' \
  -b "PHPSESSID=<session_id>"

# Inactivar (debe funcionar)
curl -X POST http://localhost/m_agronomia/assets/php/cosecha_fruta_api.php?action=inactivar \
  -H "Content-Type: application/json" \
  -d '{"cosecha_fruta_id": "123"}' \
  -b "PHPSESSID=<session_id>"
```

---

### ROL: Agronomico (Agronómico - Acceso Completo)

#### Frontend - Visibilidad
- [ ] **SIDEBAR**: Puede ver el menú "Agronomía"
- [ ] **FORMULARIO**: Puede ver todas las tablas del módulo
- [ ] **BOTONES APROBAR/RECHAZAR**: SÍ deben aparecer en notificaciones pendientes
- [ ] **BOTÓN REVERTIR**: SÍ debe aparecer (si aplicable)
- [ ] **TOGGLE ERROR_REGISTRO**: 
  - [ ] Cuando está activo → puede inactivar (switch habilitado)
  - [ ] Cuando está inactivo → puede activar (switch habilitado)

#### Backend - Permisos API
- [ ] **Ingresar**: ✅ Permitido
- [ ] **Ver**: ✅ Permitido
- [ ] **Editar**: ✅ Permitido
- [ ] **Aprobar**: ✅ Permitido
- [ ] **Rechazar**: ✅ Permitido
- [ ] **Inactivar**: ✅ Permitido
- [ ] **Activar**: ✅ Permitido
- [ ] **Revertir**: ✅ Permitido (si existe endpoint)

---

### ROL: Sup_logistica1 (Supervisor Logística 1)

#### Frontend - Visibilidad
- [ ] **SIDEBAR**: Puede ver el menú "Agronomía"
- [ ] **FORMULARIO**: Puede ver todas las tablas del módulo
- [ ] **BOTONES APROBAR/RECHAZAR**: SÍ deben aparecer en notificaciones pendientes
- [ ] **BOTÓN REVERTIR**: NO debe aparecer
- [ ] **TOGGLE ERROR_REGISTRO**: 
  - [ ] Cuando está activo → puede inactivar (switch habilitado)
  - [ ] Cuando está inactivo → NO puede activar (switch deshabilitado)

#### Backend - Permisos API
- [ ] **Ingresar**: ✅ Permitido
- [ ] **Ver**: ✅ Permitido
- [ ] **Editar**: ✅ Permitido
- [ ] **Aprobar**: ✅ Permitido
- [ ] **Rechazar**: ✅ Permitido
- [ ] **Inactivar**: ✅ Permitido
- [ ] **Activar**: ❌ Debe retornar 403
- [ ] **Revertir**: ❌ Debe retornar 403 (si existe endpoint)

---

### ROL: Sup_logistica2 (Supervisor Logística 2)

#### Frontend - Visibilidad
- [ ] **SIDEBAR**: Puede ver el menú "Agronomía"
- [ ] **FORMULARIO**: Puede ver todas las tablas del módulo
- [ ] **BOTONES APROBAR/RECHAZAR**: SÍ deben aparecer en notificaciones pendientes
- [ ] **BOTÓN REVERTIR**: NO debe aparecer
- [ ] **TOGGLE ERROR_REGISTRO**: 
  - [ ] Cuando está activo → puede inactivar (switch habilitado)
  - [ ] Cuando está inactivo → NO puede activar (switch deshabilitado)

#### Backend - Permisos API
- [ ] **Ingresar**: ✅ Permitido
- [ ] **Ver**: ✅ Permitido
- [ ] **Editar**: ✅ Permitido
- [ ] **Aprobar**: ✅ Permitido
- [ ] **Rechazar**: ✅ Permitido
- [ ] **Inactivar**: ✅ Permitido
- [ ] **Activar**: ❌ Debe retornar 403
- [ ] **Revertir**: ❌ Debe retornar 403 (si existe endpoint)

---

### ROL: Asist_agronomico (Asistente Agronómico)

#### Frontend - Visibilidad
- [ ] **SIDEBAR**: Puede ver el menú "Agronomía"
- [ ] **FORMULARIO**: Puede ver todas las tablas del módulo
- [ ] **BOTONES APROBAR/RECHAZAR**: SÍ deben aparecer en notificaciones pendientes
- [ ] **BOTÓN REVERTIR**: SÍ debe aparecer (si aplicable)
- [ ] **TOGGLE ERROR_REGISTRO**: 
  - [ ] Cuando está activo → puede inactivar (switch habilitado)
  - [ ] Cuando está inactivo → puede activar (switch habilitado)

#### Backend - Permisos API
- [ ] **Ingresar**: ✅ Permitido
- [ ] **Ver**: ✅ Permitido
- [ ] **Editar**: ✅ Permitido
- [ ] **Aprobar**: ✅ Permitido
- [ ] **Rechazar**: ✅ Permitido
- [ ] **Inactivar**: ✅ Permitido
- [ ] **Activar**: ✅ Permitido
- [ ] **Revertir**: ✅ Permitido (si existe endpoint)

---

### ROL: Administrador

#### Frontend - Visibilidad
- [ ] **SIDEBAR**: Puede ver todos los menús incluido "Agronomía"
- [ ] **FORMULARIO**: Puede ver todas las tablas del módulo
- [ ] **BOTONES APROBAR/RECHAZAR**: SÍ deben aparecer
- [ ] **BOTÓN REVERTIR**: SÍ debe aparecer
- [ ] **TOGGLE ERROR_REGISTRO**: Siempre habilitado (puede activar e inactivar)

#### Backend - Permisos API
- [ ] **TODAS LAS ACCIONES**: ✅ Permitidas sin restricción

---

## Pruebas de Seguridad

### 1. Bypass de Frontend
Intentar manipular directamente las llamadas API sin usar la interfaz:

```bash
# Intentar aprobar como Aux_agronomico (debe fallar)
curl -X POST http://localhost/m_agronomia/assets/php/mantenimientos_api.php?action=aprobar \
  -H "Content-Type: application/json" \
  -d '{"mantenimientos_id": "456"}' \
  -b "PHPSESSID=<aux_agronomico_session>"

# Intentar activar como Sup_logistica1 (debe fallar)
curl -X POST http://localhost/m_agronomia/assets/php/oficios_varios_palma_api.php?action=activar \
  -H "Content-Type: application/json" \
  -d '{"oficios_varios_palma_id": "789"}' \
  -b "PHPSESSID=<sup_logistica1_session>"
```

### 2. Acceso Directo a URLs
- [ ] Intentar acceder a `/m_agronomia/tb_agronomia.html` con usuario sin rol → debe redirigir o mostrar error
- [ ] Intentar acceder a APIs directamente sin sesión → debe retornar 403

### 3. Modificación de Roles en Sesión
- [ ] Verificar que modificar `$_SESSION['rol']` manualmente no otorga permisos adicionales
- [ ] El backend debe validar roles desde la base de datos, no solo desde sesión

---

## Pruebas de Integración

### Flujo Completo 1: Ingreso y Aprobación
1. **Aux_agronomico** ingresa un nuevo registro
2. El registro queda en estado "pendiente"
3. **Sup_logistica1** ve el registro en notificaciones pendientes
4. **Sup_logistica1** aprueba el registro
5. El registro pasa a la tabla principal con estado "aprobado"
6. **Aux_agronomico** NO puede revertir la aprobación
7. **Agronomico** SÍ puede revertir la aprobación si es necesario

### Flujo Completo 2: Gestión de Error_registro
1. **Aux_agronomico** marca un registro como inactivo (error_registro)
2. El toggle cambia a "Inactivo"
3. **Aux_agronomico** NO puede reactivar el registro (toggle deshabilitado)
4. **Asist_agronomico** SÍ puede reactivar el registro
5. El toggle vuelve a "Activo"

---

## Registro de Resultados

### Resumen por Rol
| Rol | Frontend OK | Backend OK | Seguridad OK | Notas |
|-----|------------|------------|--------------|-------|
| Aux_agronomico | [ ] | [ ] | [ ] | |
| Agronomico | [ ] | [ ] | [ ] | |
| Sup_logistica1 | [ ] | [ ] | [ ] | |
| Sup_logistica2 | [ ] | [ ] | [ ] | |
| Asist_agronomico | [ ] | [ ] | [ ] | |
| Administrador | [ ] | [ ] | [ ] | |

---

## Problemas Encontrados
(Documentar aquí cualquier problema o inconsistencia encontrada durante las pruebas)

1. 
2. 
3. 

---

## Conclusiones

- [ ] Todos los roles cumplen con la matriz de permisos definida
- [ ] El frontend muestra/oculta controles correctamente según permisos
- [ ] El backend valida permisos correctamente para todas las acciones
- [ ] No es posible bypass de seguridad mediante manipulación de frontend
- [ ] La coherencia entre UI, backend y base de datos está validada

---

**Fecha de Última Prueba**: _______________  
**Probado por**: _______________  
**Estado**: [ ] Aprobado [ ] Requiere correcciones
