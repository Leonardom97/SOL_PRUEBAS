# Guía rápida del módulo `m_agronomia`

Resumen en español de los métodos y piezas clave de **PHP** y **JavaScript** dentro de `m_agronomia`. Se enfoca en las funciones más importantes y en cómo se enlazan entre sí.

## Flujo general
1. Las páginas HTML cargan los scripts JS del módulo.
2. Los JS pintan tablas, formularios y acciones de aprobación/rechazo/exportación.
3. Las llamadas AJAX van contra los endpoints PHP ubicados en `assets/php`, que operan sobre dos BD:
   - `db_postgres_prueba.php`: base principal.
   - `db_temporal.php`: base temporal usada para ediciones previas a aprobación.
4. Roles/permisos se publican en el DOM y se leen desde los scripts para decidir qué botones mostrar.

---

## Scripts JavaScript (`assets/js`)

### Núcleo y utilidades
- **agronomia.js**
  - `includeComponent(file, selector)`: trae HTML (navbar/sidebar) y lo inyecta.
  - `initMultiselect(suffix)`: arma un multiselect CoreUI (chips, limpiar, toggle, sincroniza con `<select>` oculto).
  - Listener `DOMContentLoaded`: carga navbar/sidebar, verifica sesión (`../php/verificar_sesion.php`), publica roles en `data-role`, meta `user-roles` y `window.USER_ROLES`, y arma el botón de logout.
- **role_guard_agronomia.js**
  - Recoge roles desde `data-role`, meta y variables globales.
  - Si el usuario no es admin ni auxiliar, quita secciones sensibles (tabs, campana de notificaciones).
- **role_permissions.js**
  - Tabla `ROLE_PERMISSIONS` con permisos por rol.
  - `getUserPermissions()`, `hasPermission()`, `hasAnyRole()`, `getPrimaryRole()`: exponen permisos calculados según roles en sesión/DOM.
  - Exporta en `window.AgronomiaRolePermissions`.
- **verificacion_icons.js**
  - Lee roles publicados y alterna iconos/acciones visibles según permisos.
- **init_noti_admin.js** / **notificaciones_operaciones.js**
  - Inicializan y muestran el badge/campana de notificaciones para eventos de operaciones pendientes.
- **material-super.js**
  - Helpers visuales para formularios (chips, selectores, tooltips) usados por varias pantallas.
- **F_cortes.js**
  - Gestiona la “fecha de corte”: lee con `GET` y actualiza con `PUT` a `assets/php/fecha_corte.php`.
  - Guarda la fecha en `localStorage`, la expone en `window.FECHA_CORTE` y dispara el evento `fechaCorteChanged`.

### Páginas de auditoría/operación (patrón común)
Archivos: `aud_cosecha.js`, `aud_fertilizacion.js`, `aud_mantenimiento.js`, `aud_maquinaria.js`, `aud_perdidas.js`, `aud_vagones.js`, `coberturas.js`, `compactacion.js`, `compostaje.js`, `cosecha_fruta.js`, `ct_cal_labores.js`, `ct_cal_sanidad.js`, `ct_cal_trampas.js`, `ct_polinizacion_flores.js`, `erradicaciones.js`, `fertilizacion_organica.js`, `labores_diarias.js`, `mantenimientos.js`, `monitoreo_trampas.js`, `monitoreos_generales.js`, `nivel_freatico.js`, `oficios_varios_palma.js`, `plagas.js`, `polinizacion.js`, `reporte_lote_monitoreo.js`, `resiembra.js`, `salida_vivero.js`, `siembra_nueva.js`.

Todos comparten la misma gama de responsabilidades:
- Constantes de DOM, columnas, `API` y clave primaria (`ID_KEY`).
- `fetchData()`: arma querystring con filtros, orden, paginación; prueba alias de acción (`conexion`, `listar`, `list`) y parsea respuesta del endpoint PHP.
- `render()`: dibuja la tabla, iconos de estado (`supervision`/`error_registro`), y botones (editar, ver, aprobar, rechazar, activar/inactivar). Respeta la `fecha_corte` de `localStorage` para bloquear ediciones.
- Listeners: filtros con *debounce*, paginación, ordenamiento, exportación a Excel (usa `xlsx.full.min.js`), selección masiva y apertura de modal de edición/lectura.
- `save()` / `guardar()`: envía payload al API con acción `upsert`/`actualizar` para la BD temporal.
- Acciones de estado:
  - Inactivar/activar `error_registro`.
  - Aprobar/Rechazar (requieren rol con permiso; usan botones condicionados por `role_permissions` y `role_guard`).
- Modal de edición: precarga datos, valida campos y sincroniza selectores/custom chips antes de enviar.

### Otros scripts
- **aud_*_js** usan `xlsx.full.min.js` únicamente para exportar datos a Excel.
- **init_noti_admin.js** / **notificaciones_operaciones.js**: consultan APIs de pendientes y actualizan el contador visual.

---

## Endpoints PHP (`assets/php`)

### Patrón de los APIs por entidad
Archivos: `aud_cosecha_api.php`, `aud_fertilizacion_api.php`, `aud_mantenimiento_api.php`, `aud_maquinaria_api.php`, `aud_perdidas_api.php`, `aud_vagones_api.php`, `coberturas_api.php`, `compactacion_api.php`, `compostaje_api.php`, `cosecha_fruta_api.php`, `ct_cal_labores_api.php`, `ct_cal_sanidad_api.php`, `ct_cal_trampas_api.php`, `ct_polinizacion_flores_api.php`, `erradicaciones_api.php`, `fertilizacion_organica_api.php`, `labores_diarias_api.php`, `mantenimientos_api.php`, `monitoreo_trampas_api.php`, `monitoreos_generales_api.php`, `nivel_freatico_api.php`, `oficios_varios_palma_api.php`, `plagas_api.php`, `polinizacion_api.php`, `reporte_lote_monitoreo_api.php`, `resiembra_api.php`, `salida_vivero_api.php`, `siembra_nueva_api.php`.

Estructura clave (varía solo la lista de columnas y la tabla):
- `respond($data, $code)`: helper para responder JSON y salir.
- `getTemporal()` / `getMain()`: incluyen `db_temporal.php` y `db_postgres_prueba.php` para abrir PDO.
- `map_action($action)`: alias legibles (`conexion/listar/list`, `actualizar/upsert`, `inactivar`, `rechazar`, `aprobar`, `activar`).
- **Acciones:**
  - `conexion` (GET con filtros/paginación): consulta la tabla principal con `WHERE` dinámico (`filtro_*`), orden y `LIMIT/OFFSET`; devuelve `datos` y `total`.
  - `actualizar`/`upsert`: valida ID, arma INSERT o UPDATE en la tabla temporal; fuerza `PDO::ERRMODE_EXCEPTION`.
  - `inactivar`: marca `error_registro='inactivo'` en principal y temporal.
  - `activar`: limpia `error_registro` en ambas BD.
  - `rechazar`: requiere admin; intenta actualizar principal, actualiza temporal y limpia temporal si principal fue afectada.
  - `aprobar`: requiere admin; intenta UPDATE en principal, si no existe hace INSERT desde temporal; borra temporal al éxito.
- Todas validan acción requerida y devuelven errores HTTP coherentes.

### Helpers PHP
- **db_postgres_prueba.php** / **db_temporal.php**: crean el objeto `PDO` a la BD principal/temporal.
- **require_admin.php**: `require_admin_only()` verifica sesión y corta con 403 si no hay rol admin/aux según configuración.
- **roles_auth.php**:
  - `get_user_roles()`: recolecta roles en sesión (`rol`, `roles`, `user.roles`).
  - `has_role($needle)`: busca coincidencia exacta o equivalente auxiliar.
  - `require_any_role([...])`, `require_read_roles()`, `require_admin_role()`: abortan con 403 si el rol no está presente.
- **verificacion_helpers.php**:
  - `vh_quote_ident()`: valida identificadores SQL.
  - `ensure_supervision_column($pg, $schema, $table)`: crea columna `supervision` si falta.
  - `normalize_supervision($v, $isAdmin)`: normaliza valor (`pendiente`/`aprobado`/`rechazado`).
- **fecha_corte.php**: expone y actualiza la fecha de corte (GET/PUT) consumida por `F_cortes.js`.
- **eventos_pendientes_operaciones.php**, **pendientes_operaciones.php**, **operaciones_aprobacion.php**: listan/actualizan pendientes de operaciones para notificaciones y aprobación.
- Estos helpers se invocan desde los APIs cuando se ejecutan acciones sensibles como `aprobar` o `rechazar`.

---

## Cómo leer/usar el código
- Para inspeccionar permisos en front: revisa `data-role` en `<body>` o `window.AgronomiaRolePermissions`.
- Para agregar nuevas columnas en tablas: ajusta la constante `COLUMNAS` y la lista de columnas/valores en el API correspondiente.
- Para habilitar acciones por rol: revisa `role_permissions.js` y los checks en cada página (botones de aprobar/rechazar/activar usan esos permisos).
- Exportar a Excel: todos los listados usan `xlsx.full.min.js`; la función de exportación arma arrays con las filas renderizadas.
