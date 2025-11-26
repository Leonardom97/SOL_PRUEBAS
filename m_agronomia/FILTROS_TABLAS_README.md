# Guía de Funcionamiento de Filtros en Tablas

## Descripción General
Los filtros de las tablas en el módulo de agronomía están implementados con una arquitectura robusta que incluye:
- ✅ Detección automática de columnas mediante atributos `data-col`
- ✅ Filtrado con debounce (300ms) para optimizar rendimiento
- ✅ Activación inmediata con tecla Enter
- ✅ Sincronización con backend usando parámetros `filtro_*`
- ✅ Logging detallado para debugging

## Archivos Actualizados
1. `/m_agronomia/assets/js/cosecha_fruta.js`
2. `/m_agronomia/assets/js/oficios_varios_palma.js`
3. `/m_agronomia/assets/js/ct_cal_labores.js`
4. `/m_agronomia/assets/js/fertilizacion_organica.js`
5. `/m_agronomia/assets/js/monitoreos_generales.js`
6. `/m_agronomia/assets/js/ct_cal_sanidad.js`
7. `/m_agronomia/assets/js/nivel_freatico.js`
8. `/m_agronomia/assets/js/monitoreo_trampas.js`
9. `/m_agronomia/assets/js/compactacion.js`
10. `/m_agronomia/assets/js/plagas.js`
11. `/m_agronomia/assets/js/ct_cal_trampas.js`
12. `/m_agronomia/assets/js/reporte_lote_monitoreo.js`

## Cómo Usar los Filtros

### Para el Usuario Final
1. **Filtrar por columna**: Escribir en el campo de filtro debajo del encabezado de la columna
2. **Aplicación automática**: Los filtros se aplican automáticamente después de 300ms de dejar de escribir
3. **Aplicación inmediata**: Presionar Enter para aplicar el filtro inmediatamente
4. **Limpiar filtros**: Hacer clic en el botón de escoba (🧹) para limpiar todos los filtros

### Estructura HTML Requerida
Los filtros requieren que los inputs en el `<thead>` tengan el atributo `data-col`:

```html
<th>
  <div class="md-th-flex">
    <span>Nombre Columna</span>
    <input class="md-input" data-col="nombre_columna" placeholder="Filtrar">
    <i class="fas fa-sort icon-sort" data-col="nombre_columna"></i>
  </div>
</th>
```

## Funcionalidad Técnica

### Detección de Columnas
El sistema detecta columnas en el siguiente orden de prioridad:
1. **Atributo `data-col` del input**: `<input data-col="fecha">`
2. **Atributo `name` del input**: `<input name="fecha">`
3. **Atributo `data-col` del `<th>` padre**: `<th data-col="fecha">`
4. **Atributo `data-field` del `<th>` padre**: `<th data-field="fecha">`
5. **Matching por texto del header**: Compara el texto del `<th>` con el array `COLUMNAS`

### Parámetros Enviados al Backend
Cuando se aplica un filtro, se envía al backend con el prefijo `filtro_`:

```
GET /assets/php/cosecha_fruta_api.php?action=conexion&page=1&pageSize=25&filtro_fecha=2024&filtro_responsable=Juan
```

### Funciones Clave

#### `initFilters()`
Inicializa los filtros al cargar la página:
- Busca todos los inputs en el `<thead>`
- Ignora checkboxes
- Detecta la columna asociada a cada input
- Configura event listeners con debounce
- Registra handlers para prevenir duplicación

#### `debounce(fn, ms)`
Retrasa la ejecución de la función de filtrado para evitar múltiples requests:
- Espera 300ms después de que el usuario deja de escribir
- Cancela requests pendientes si el usuario continúa escribiendo

#### Clear Filters Button
El botón de limpiar filtros:
- Resetea el objeto `filters = {}`
- Limpia todos los inputs (excepto checkboxes)
- Resetea la página a 1
- Recarga los datos

## Debugging

### Mensajes de Consola

#### Inicialización
```
[cosecha_fruta] inicializando filtros para 26 inputs
[cosecha_fruta] filtro configurado para columna: fecha_actividad
[cosecha_fruta] filtro configurado para columna: responsable
...
[cosecha_fruta] filtros inicializados. Total columnas mapeadas: 0
```

#### Aplicación de Filtros
```
[cosecha_fruta] aplicar filtro: fecha_actividad = 2024-01
[cosecha_fruta] request -> assets/php/cosecha_fruta_api.php?action=conexion&page=1&pageSize=25&filtro_fecha_actividad=2024-01
```

#### Limpieza de Filtros
```
[cosecha_fruta] limpiando todos los filtros
[cosecha_fruta] filtros limpiados, recargando datos...
[cosecha_fruta] request -> assets/php/cosecha_fruta_api.php?action=conexion&page=1&pageSize=25
```

#### Errores Comunes
```
[cosecha_fruta] tabla no encontrada: tabla-capacitaciones
[cosecha_fruta] thead no encontrado
[cosecha_fruta] no se encontraron inputs en thead
[cosecha_fruta] input ignored (no col found): <input>
```

### Cómo Verificar que los Filtros Funcionan

1. **Abrir la Consola del Navegador** (F12 o Ctrl+Shift+I)
2. **Navegar a la pestaña Console**
3. **Escribir en un campo de filtro**
4. **Verificar los mensajes**:
   - Debe aparecer: `[nombre_modulo] aplicar filtro: columna = valor`
   - Debe aparecer: `[nombre_modulo] request -> ...?filtro_columna=valor`

5. **Verificar la Network Tab**:
   - Buscar requests al API PHP
   - Verificar que los parámetros `filtro_*` estén incluidos

### Problemas Comunes y Soluciones

#### Los filtros no se aplican
**Causa**: El input no tiene `data-col` o el ID de la tabla es incorrecto
**Solución**: 
1. Verificar que `<input data-col="nombre_columna">` esté presente
2. Verificar que `DOM.table` coincida con el `id` de la tabla en HTML
3. Revisar la consola para mensajes de error

#### Los filtros se aplican lentamente
**Causa**: El debounce está funcionando correctamente (300ms es normal)
**Solución**: Presionar Enter para aplicar inmediatamente

#### El botón "Limpiar Filtros" no funciona
**Causa**: El ID del botón no coincide con `DOM.clearBtn`
**Solución**: Verificar que el botón tenga el ID correcto (ej: `clearFiltersBtn1`)

#### Request no incluye los filtros
**Causa**: Los filtros no están en el objeto `filters`
**Solución**: Verificar en consola que aparezca el mensaje "aplicar filtro"

## Backend Requirements

Los filtros requieren que el backend PHP procese los parámetros `filtro_*`:

```php
// Construir filtros
$where = [];
$params = [];
foreach ($_GET as $key => $value) {
    if (strpos($key, 'filtro_') === 0 && $value !== '') {
        $col = substr($key, 7); // Remover prefijo 'filtro_'
        $col = preg_replace('/[^a-zA-Z0-9_]/', '', $col); // Sanitizar
        
        $where[] = "\"$col\" ILIKE ?";
        $params[] = '%' . $value . '%';
    }
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
```

## Mejoras Implementadas

### Versión Anterior vs. Nueva

| Aspecto | Anterior | Nueva |
|---------|----------|-------|
| Logging | `console.debug()` | `console.log()` para mejor visibilidad |
| Detección de columnas | Solo `data-col` o `name` | Múltiples estrategias de fallback |
| Clear button | No distinguía checkboxes | Ignora checkboxes correctamente |
| Error messages | Genéricos | Específicos con contexto |
| Inicialización | Sin feedback | Logs detallados del proceso |

## Testing

### Test Manual
1. Abrir la página de agronomía
2. Abrir Developer Tools (F12)
3. Ir a la tab Console
4. Escribir en un filtro
5. Verificar mensajes en consola
6. Verificar que la tabla se actualice
7. Probar el botón de limpiar filtros
8. Verificar que todos los filtros se limpien

### Test de Integración
1. Aplicar múltiples filtros simultáneamente
2. Verificar que todos los parámetros `filtro_*` se envíen
3. Verificar que los resultados sean correctos
4. Cambiar página con filtros activos
5. Verificar que los filtros persistan

## Contacto y Soporte

Para reportar problemas o sugerencias relacionadas con los filtros:
1. Incluir los mensajes de la consola del navegador
2. Describir los pasos para reproducir el problema
3. Indicar el módulo/tabla específica donde ocurre el problema
4. Incluir una captura de pantalla si es posible

---

**Última actualización**: 2025-11-26
**Versión**: 2.0
**Autor**: GitHub Copilot Agent
