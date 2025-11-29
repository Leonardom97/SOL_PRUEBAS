# Documentación de APIs - Sistema SOL Agronomía

## Tabla de Contenidos

1. [Organización de la Plantilla](#organización-de-la-plantilla)
2. [Estructura de un Archivo API](#estructura-de-un-archivo-api)
3. [Acciones Disponibles](#acciones-disponibles)
4. [Reglas para Crear Nuevos Módulos](#reglas-para-crear-nuevos-módulos)
5. [Recomendaciones para Evitar Errores](#recomendaciones-para-evitar-errores)
6. [Diagnóstico de Problemas Comunes](#diagnóstico-de-problemas-comunes)

---

## Organización de la Plantilla

La plantilla base se encuentra en:
```
/m_agronomia/assets/php/templates/api_template.php
```

### Componentes Principales

| Componente | Descripción |
|------------|-------------|
| `respond()` | Función para retornar respuestas JSON estandarizadas |
| `getTemporal()` | Obtiene conexión a BD temporal |
| `getMain()` | Obtiene conexión a BD principal |
| `map_action()` | Normaliza los nombres de acciones recibidas |
| `$TABLE_NAME` | Variable de configuración: nombre de la tabla |
| `$PRIMARY_KEY` | Variable de configuración: nombre de la columna ID |
| `$cols` | Array de columnas válidas para la tabla |

---

## Estructura de un Archivo API

Cada archivo `*_api.php` debe seguir esta estructura:

```php
<?php
// 1. Cabecera con descripción del módulo
header('Content-Type: application/json; charset=utf-8');

// 2. Funciones auxiliares (respond, getTemporal, getMain, map_action)

// 3. Bloque try-catch principal
try {
    // 4. Obtener datos del request
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?: [];
    $action = $_GET['action'] ?? $body['action'] ?? null;
    
    // 5. Acciones: conexion, actualizar, inactivar, rechazar, aprobar
    
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>'exception','message'=>$e->getMessage()]);
}
?>
```

---

## Acciones Disponibles

### 1. `conexion` / `listar` / `list`
Lista registros con paginación y filtros.

**Método:** GET  
**Parámetros:**
- `page` (opcional): Número de página (default: 1)
- `pageSize` (opcional): Registros por página (default: 25)
- `filtro_{columna}` (opcional): Filtros ILIKE por columna
- `ordenColumna` (opcional): Columna para ordenar
- `ordenAsc` (opcional): 1=ASC, 0=DESC

**Respuesta:**
```json
{
  "success": true,
  "action": "conexion",
  "datos": [...],
  "total": 100,
  "page": 1,
  "pageSize": 25
}
```

### 2. `actualizar` / `upsert`
Inserta o actualiza registros en la BD temporal.

**Método:** POST  
**Body JSON:**
```json
{
  "{nombre_tabla}_id": "uuid",
  "campo1": "valor1",
  "campo2": "valor2"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "guardado correctamente"
}
```

### 3. `inactivar` / `desactivar`
Marca un registro como inactivo en la BD principal.

**Método:** POST  
**Body JSON:**
```json
{
  "{nombre_tabla}_id": "uuid"
}
```

**Respuesta:**
```json
{
  "success": true,
  "action": "inactivar",
  "id": "uuid",
  "estado": "inactivo"
}
```

### 4. `rechazar` / `reject` (Requiere Admin)
Rechaza un registro. Opera en BD principal y temporal.

**Método:** POST (obligatorio)  
**Body JSON:**
```json
{
  "{nombre_tabla}_id": "uuid"
}
```

**Respuesta:**
```json
{
  "success": true,
  "action": "rechazar",
  "id": "uuid",
  "updated_main": 1,
  "updated_temp": 0,
  "deleted_temp": 1,
  "estado": "rechazado",
  "warnings": []
}
```

### 5. `aprobar` / `approve` (Requiere Admin)
Aprueba un registro. Si no existe en BD principal, lo inserta desde BD temporal.

**Método:** POST (obligatorio)  
**Body JSON:**
```json
{
  "{nombre_tabla}_id": "uuid"
}
```

**Respuesta:**
```json
{
  "success": true,
  "action": "aprobar",
  "id": "uuid",
  "updated_main": 1,
  "inserted_main": 0,
  "updated_temp": 0,
  "deleted_temp": 1,
  "warnings": []
}
```

---

## Reglas para Crear Nuevos Módulos

### Paso 1: Copiar la Plantilla
```bash
cp templates/api_template.php nuevo_modulo_api.php
```

### Paso 2: Configurar Variables
```php
$TABLE_NAME = 'nombre_tabla';           // Nombre exacto de la tabla en BD
$PRIMARY_KEY = 'nombre_tabla_id';       // Columna clave primaria
```

### Paso 3: Definir Columnas
```php
$cols = [
    'nombre_tabla_id',
    'columna1',
    'columna2',
    // ... más columnas
    'error_registro',      // ¡OBLIGATORIO!
    'supervision',         // ¡OBLIGATORIO!
    'check'               // ¡OBLIGATORIO!
];
```

### Checklist de Validación

- [ ] El nombre del archivo sigue el formato `{nombre_tabla}_api.php`
- [ ] `$TABLE_NAME` coincide exactamente con la tabla en BD
- [ ] `$PRIMARY_KEY` es el nombre correcto de la columna ID
- [ ] `$cols` incluye TODAS las columnas que la interfaz puede enviar
- [ ] `$cols` incluye `error_registro`, `supervision`, `check`
- [ ] El archivo no tiene errores de sintaxis PHP (`php -l archivo.php`)

---

## Recomendaciones para Evitar Errores

### 1. Siempre Incluir Columnas de Control
```php
// CORRECTO ✓
$cols = ['tabla_id', 'campo1', 'campo2', 'error_registro', 'supervision', 'check'];

// INCORRECTO ✗
$cols = ['tabla_id', 'campo1', 'campo2', 'error_registro'];
```

### 2. Validar Nombres de Columnas
- Los nombres deben coincidir EXACTAMENTE con la BD
- Sensible a mayúsculas/minúsculas
- Sin espacios ni caracteres especiales

### 3. Usar el ID Correcto
```php
// La clave primaria SIEMPRE es: {nombre_tabla}_id
// Ejemplo: mantenimientos_id, cosecha_fruta_id, plagas_id
```

### 4. Verificar Sintaxis PHP
```bash
php -l archivo_api.php
```

### 5. Probar Todas las Acciones
Antes de desplegar, verificar:
- [ ] `conexion` lista registros correctamente
- [ ] `actualizar` guarda cambios
- [ ] `inactivar` marca registros
- [ ] `aprobar` funciona (con permisos admin)
- [ ] `rechazar` funciona (con permisos admin)

---

## Diagnóstico de Problemas Comunes

### Problema: "No guarda lo editado"
**Causa:** Falta alguna columna en el array `$cols`  
**Solución:** Agregar las columnas faltantes, especialmente `supervision` y `check`

### Problema: "No deja aprobar"
**Causa:** Las columnas `supervision` y `check` no están en `$cols`  
**Solución:** Verificar que `$cols` incluya:
```php
'supervision', 'check'
```

### Problema: "No deja inactivar"
**Causa:** La columna `error_registro` no está en `$cols` o el ID es incorrecto  
**Solución:** 
1. Verificar que `error_registro` esté en `$cols`
2. Verificar que el nombre de la clave primaria sea correcto

### Problema: "JSON inválido"
**Causa:** El frontend no envía JSON o el formato es incorrecto  
**Solución:** Verificar que el Content-Type sea `application/json`

### Problema: "id_invalid"
**Causa:** No se envía el ID correcto en el body  
**Solución:** El body debe incluir `{nombre_tabla}_id` o `id` como fallback

---

## Archivos Corregidos

Los siguientes archivos fueron actualizados para incluir las columnas `supervision` y `check`:

| Archivo | Estado |
|---------|--------|
| aud_fertilizacion_api.php | ✅ Corregido |
| aud_vagones_api.php | ✅ Corregido |
| resiembra_api.php | ✅ Corregido |
| aud_cosecha_api.php | ✅ Corregido |
| aud_mantenimiento_api.php | ✅ Corregido |
| aud_perdidas_api.php | ✅ Corregido |
| coberturas_api.php | ✅ Corregido |
| ct_polinizacion_flores_api.php | ✅ Corregido |
| labores_diarias_api.php | ✅ Corregido |
| salida_vivero_api.php | ✅ Corregido |
| siembra_nueva_api.php | ✅ Corregido |

---

## Contacto y Soporte

Para reportar problemas o solicitar nuevas funcionalidades, contactar al equipo de desarrollo.

*Documento generado automáticamente - Sistema SOL Agronomía*
