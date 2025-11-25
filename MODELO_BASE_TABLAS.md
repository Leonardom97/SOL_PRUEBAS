# Modelo Base para Tablas - Sistema SOL_PRUEBAS

## Introducción
Este documento describe el modelo base extraído del módulo de **mantenimientos** que debe utilizarse como plantilla para todas las tablas del sistema. El modelo incluye patrones de frontend (JavaScript) y backend (PHP) probados y funcionales.

---

## 1. ESTRUCTURA FRONTEND (JavaScript)

### 1.1 Configuración Inicial

#### Constantes de Configuración
```javascript
// NOTA: Estos IDs deben coincidir exactamente con los IDs en tu HTML
// En este ejemplo, se mantienen los nombres originales del código fuente
// (algunos usan 'reuniones' y otros 'mantenimientos' por razones históricas)
const DOM = {
  tbody: 'tbody-mantenimientos',        // ID del tbody de la tabla
  table: 'tabla-reuniones',             // ID de la tabla
  pagination: 'pagination-reuniones',    // ID del contenedor de paginación
  exportBtn: 'exportBtnMantenimientos', // ID del botón de exportar
  clearBtn: 'clearFiltersBtn2',         // ID del botón limpiar filtros
  limitSelect: 'limitSelect2',          // ID del select de límite por página
  selectAll: 'selectAll2',              // ID del checkbox "seleccionar todo"
  form: 'form-editar',                  // ID del formulario de edición
  modal: 'modal-editar'                 // ID del modal de edición
};

const COLUMNAS = [
  'mantenimientos_id', 'fecha', 'responsable', 'plantacion', 'finca', 
  'siembra', 'lote', 'parcela', 'labor_especifica', 'observacion', 
  'contratista', 'codigo', 'colaborador', 'personas', 'hora_entrada',
  'hora_salida', 'linea_entrada', 'linea_salida', 'cantidad', 'unidad', 
  'maquina', 'tractorista', 'nuevo_operario', 'error_registro', 'supervision'
];

const API = 'assets/php/mantenimientos_api.php';
const ID_KEY = 'mantenimientos_id';
const DATE_COL = 'fecha';

const ACTIONS = {
  listFallback: ['conexion', 'listar', 'list'],  // Acciones alternativas para listar
  save: 'upsert',                                 // Acción para guardar/actualizar
  inactivate: 'inactivar',                        // Acción para inactivar
  reject: 'rechazar'                              // Acción para rechazar
};
```

### 1.2 Variables de Estado

```javascript
let data = [];           // Array de datos de la página actual
let page = 1;            // Página actual
let pageSize = 25;       // Registros por página
let total = 0;           // Total de registros
let filters = {};        // Objeto con filtros activos {columna: valor}
let sortCol = null;      // Columna de ordenamiento
let sortAsc = true;      // Dirección del ordenamiento (true = ASC, false = DESC)
```

### 1.3 Función de Debounce para Filtros

```javascript
const FILTER_DEBOUNCE_MS = 300;

function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
```

### 1.4 Función de Fetch de Datos

```javascript
async function fetchData() {
  let last = '';
  
  for (const act of ACTIONS.listFallback) {
    try {
      // Construir query string
      const qs = new URLSearchParams({
        action: act,
        page: page,
        pageSize: pageSize
      });
      
      // Agregar ordenamiento si existe
      if (sortCol) {
        qs.append('ordenColumna', sortCol);
        qs.append('ordenAsc', sortAsc ? '1' : '0');
      }
      
      // Agregar filtros (solo valores no vacíos)
      for (const k in filters) {
        const v = filters[k];
        if (v == null) continue;
        const tv = String(v).trim();
        if (tv !== '') {
          qs.append('filtro_' + k, tv);
        }
      }
      
      // Debug: mostrar URL de solicitud
      console.debug('[mantenimientos] request ->', `${API}?${qs.toString()}`);
      
      // Realizar fetch
      const r = await fetch(`${API}?${qs.toString()}`, {cache: 'no-store'});
      if (!r.ok) {
        last = `${act}: HTTP ${r.status}`;
        continue;
      }
      
      const txt = await r.text();
      let j;
      try {
        j = JSON.parse(txt);
      } catch {
        last = `${act}: JSON`;
        continue;
      }
      
      // Parsear respuesta (soporta varios formatos)
      if (Array.isArray(j)) return {datos: j, total: j.length};
      if (j.datos) return {datos: j.datos, total: j.total || j.datos.length};
      if (j.data) return {datos: j.data, total: j.total || j.data.length};
      
      const arr = Object.values(j).find(v => Array.isArray(v));
      if (arr) return {datos: arr, total: arr.length};
      
      last = `${act}: sin datos`;
    } catch (e) {
      last = `${act}: ${e.message}`;
    }
  }
  
  throw new Error('Error fetch ' + ID_KEY + ' => ' + last);
}
```

### 1.5 Renderizado de Tabla

```javascript
function render() {
  const tbody = document.getElementById(DOM.tbody);
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const corte = localStorage.getItem('fecha_corte') || '';
  
  data.forEach((row, i) => {
    const est = estado(row);
    const tr = document.createElement('tr');
    
    // Checkbox de selección
    tr.innerHTML = `<td><input type="checkbox" class="row-check" data-index="${i}"></td>`;
    
    // Renderizar columnas
    COLUMNAS.forEach(col => {
      const td = document.createElement('td');
      
      if (col === 'supervision') {
        td.dataset.estado = est;
        td.innerHTML = icono(est);
      } else if (col === 'error_registro') {
        const inact = (row.error_registro || '').toLowerCase() === 'inactivo';
        td.innerHTML = inact 
          ? '<span class="badge bg-secondary">Inactivo</span>'
          : `<button class="md-btn md-btn-icon btn-inactivar" data-id="${row[ID_KEY]}" title="Inactivar"><i class="fas fa-ban"></i></button>`;
      } else {
        td.textContent = row[col] ?? '';
      }
      
      tr.appendChild(td);
    });
    
    // Columna de acciones (editar, ver, bloquear)
    const fecha = row[DATE_COL] || '';
    const inactivo = (row.error_registro || '').toLowerCase() === 'inactivo';
    let edit = '', lock = '';
    
    if (inactivo) {
      lock = '<button class="md-btn md-btn-icon" disabled><i class="fa fa-lock"></i></button>';
    } else if (corte && fecha) {
      if (fecha < corte) {
        lock = '<button class="md-btn md-btn-icon" disabled><i class="fa fa-lock"></i></button>';
      } else {
        edit = `<button class="md-btn md-btn-icon btn-editar" data-id="${row[ID_KEY]}" title="Editar"><i class="fa fa-pen"></i></button>`;
      }
    } else {
      edit = `<button class="md-btn md-btn-icon btn-editar" data-id="${row[ID_KEY]}" title="Editar"><i class="fa fa-pen"></i></button>`;
      lock = '<button class="md-btn md-btn-icon" disabled title="Sin fecha corte"><i class="fa fa-question-circle"></i></button>';
    }
    
    const tdAcc = document.createElement('td');
    tdAcc.style.display = 'inline-flex';
    tdAcc.innerHTML = edit + 
      `<button class="md-btn md-btn-icon btn-ver" data-id="${row[ID_KEY]}" title="Ver"><i class="fa fa-eye"></i></button>` + 
      lock;
    tr.appendChild(tdAcc);
    
    tbody.appendChild(tr);
  });
  
  bindRowEvents();
  renderPagination();
}
```

### 1.6 Paginación

```javascript
function renderPagination() {
  const nav = document.getElementById(DOM.pagination);
  if (!nav) return;
  
  const ul = nav.querySelector('.md-pagination-list');
  if (!ul) return;
  ul.innerHTML = '';
  
  const pages = Math.max(1, Math.ceil(total / pageSize));
  
  function item(t, p, dis, act) {
    const li = document.createElement('li');
    li.className = dis ? 'disabled' : (act ? 'active' : '');
    const b = document.createElement('button');
    b.className = 'page-link';
    b.textContent = t;
    b.disabled = dis;
    b.onclick = () => {
      if (!dis && p !== page) {
        page = p;
        load();
      }
    };
    li.appendChild(b);
    return li;
  }
  
  // Botón anterior
  ul.appendChild(item('«', Math.max(1, page - 1), page === 1, false));
  
  // Páginas numeradas
  let start = Math.max(1, page - 1);
  let end = Math.min(pages, start + 3);
  if (end - start < 3) start = Math.max(1, end - 3);
  
  for (let i = start; i <= end; i++) {
    ul.appendChild(item(String(i), i, false, i === page));
  }
  
  // Botón siguiente
  ul.appendChild(item('»', Math.min(pages, page + 1), page === pages, false));
}
```

### 1.7 Filtros

```javascript
function initFilters() {
  const table = document.getElementById(DOM.table);
  if (!table) {
    console.warn('[mantenimientos] tabla no encontrada:', DOM.table);
    return;
  }
  
  const thead = table.querySelector('thead');
  if (!thead) {
    console.warn('[mantenimientos] thead no encontrado');
    return;
  }
  
  const inputs = Array.from(thead.querySelectorAll('input, select, textarea'));
  if (!inputs.length) {
    console.warn('[mantenimientos] no se encontraron inputs en thead');
    return;
  }
  
  inputs.forEach(inp => {
    // Ignorar checkboxes (columna de selección)
    if (inp.type && inp.type.toLowerCase() === 'checkbox') return;
    
    // Determinar nombre de columna
    let col = (inp.dataset && inp.dataset.col) ? inp.dataset.col : (inp.name || '');
    
    if (!col) {
      const th = inp.closest('th');
      if (th) {
        col = (th.dataset && (th.dataset.col || th.dataset.field)) 
          ? (th.dataset.col || th.dataset.field) 
          : '';
        
        if (!col) {
          // Intentar mapear por texto del encabezado
          const headerText = (th.innerText || th.textContent || '').trim();
          const key = headerText.replace(/\s+/g, ' ').trim().toLowerCase();
          if (key) {
            const found = COLUMNAS.find(c => 
              c.toLowerCase().includes(key) || key.includes(c.toLowerCase())
            );
            if (found) col = found;
          }
        }
      }
    }
    
    if (!col) {
      console.debug('[mantenimientos] input ignored (no col found):', inp);
      return;
    }
    
    // Almacenar mapeo
    inp.dataset._col = col;
    
    // Inicializar filtro desde valor existente
    const v = (inp.value == null) ? '' : String(inp.value);
    if (v.trim() !== '') filters[col] = v;
    
    // Handler con debounce
    const handlerDeb = debounce(function(evt) {
      const val = (evt.target.value == null) ? '' : String(evt.target.value);
      filters[col] = val;
      page = 1;
      console.debug('[mantenimientos] aplicar filtro (debounce):', col, val);
      load();
    }, FILTER_DEBOUNCE_MS);
    
    // Handler inmediato para Enter
    function handlerKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = (e.target.value == null) ? '' : String(e.target.value);
        filters[col] = val;
        page = 1;
        console.debug('[mantenimientos] aplicar filtro (Enter):', col, val);
        load();
      }
    }
    
    inp.removeEventListener('input', handlerDeb);
    inp.addEventListener('input', handlerDeb);
    inp.removeEventListener('change', handlerDeb);
    inp.addEventListener('change', handlerDeb);
    inp.removeEventListener('keydown', handlerKey);
    inp.addEventListener('keydown', handlerKey);
  });
  
  console.debug('[mantenimientos] filtros inicializados. columnas mapeadas:', 
    Object.keys(filters).length ? Object.keys(filters) : 'none');
}
```

### 1.8 Exportación a Excel

```javascript
function buildXLSX(rows, name) {
  const cols = COLUMNAS.filter(c => !['error_registro', 'supervision'].includes(c));
  const head = cols.map(c => c.toUpperCase());
  const body = rows.map(r => cols.map(c => r[c] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
  XLSX.writeFile(wb, `${name}.xlsx`);
}

function exportar(t) {
  if (t === 'todo') {
    const qs = new URLSearchParams({
      action: ACTIONS.listFallback[0],
      page: 1,
      pageSize: 100000
    });
    fetch(`${API}?${qs}`)
      .then(r => r.json())
      .then(j => buildXLSX((j.datos || j.data || []), 'mantenimientos_todo'));
    return;
  }
  
  let rows = data;
  if (t === 'seleccion') {
    rows = [];
    document.querySelectorAll(`#${DOM.tbody} .row-check`).forEach(ch => {
      if (ch.checked) rows.push(data[+ch.dataset.index]);
    });
  }
  
  buildXLSX(rows, 'mantenimientos_' + t);
}
```

### 1.9 Inicialización

```javascript
function init() {
  // Eventos de formulario
  document.getElementById(DOM.form)?.addEventListener('submit', save);
  
  // Botón limpiar filtros
  document.getElementById(DOM.clearBtn)?.addEventListener('click', () => {
    filters = {};
    page = 1;
    const table = document.getElementById(DOM.table);
    if (table) {
      const thead = table.querySelector('thead');
      if (thead) {
        thead.querySelectorAll('input, select, textarea').forEach(i => i.value = '');
      }
    }
    load();
  });
  
  // Select de límite de registros
  document.getElementById(DOM.limitSelect)?.addEventListener('change', e => {
    pageSize = parseInt(e.target.value, 10) || 25;
    page = 1;
    load();
  });
  
  // Checkbox "Seleccionar todo"
  document.getElementById(DOM.selectAll)?.addEventListener('change', e => {
    document.querySelectorAll(`#${DOM.tbody} .row-check`)
      .forEach(ch => ch.checked = e.target.checked);
  });
  
  // Iconos de ordenamiento
  document.querySelectorAll(`#${DOM.table} thead .icon-sort`).forEach(icon => {
    icon.addEventListener('click', () => {
      if (sortCol === icon.dataset.col) {
        sortAsc = !sortAsc;
      } else {
        sortCol = icon.dataset.col;
        sortAsc = true;
      }
      page = 1;
      load();
    });
  });
  
  // Botón de exportar
  document.getElementById(DOM.exportBtn)?.addEventListener('click', e => {
    e.stopPropagation();
    showExportMenu();
  });
  
  // Inicializar filtros y cargar datos
  initFilters();
  load();
}

document.addEventListener('DOMContentLoaded', init);
```

---

## 2. ESTRUCTURA BACKEND (PHP)

### 2.1 Estructura Básica del API

```php
<?php
/**
 * API mantenimientos (adaptado).
 * Maneja operaciones CRUD y aprobación/rechazo de registros.
 */
header('Content-Type: application/json; charset=utf-8');

function respond(array $d, int $c = 200) {
    http_response_code($c);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}

function getTemporal(): PDO {
    require __DIR__ . '/db_temporal.php';
    return $pg;
}

function getMain(): PDO {
    require __DIR__ . '/db_postgres_prueba.php';
    return $pg;
}
```

### 2.2 Mapeo de Acciones

```php
function map_action(?string $a): string {
    $a = is_string($a) ? strtolower(trim($a)) : '';
    $m = [
        'conexion' => 'conexion',
        'listar' => 'conexion',
        'list' => 'conexion',
        'actualizar' => 'actualizar',
        'upsert' => 'actualizar',
        'inactivar' => 'inactivar',
        'desactivar' => 'inactivar',
        'rechazar' => 'rechazar',
        'reject' => 'rechazar',
        'aprobar' => 'aprobar',
        'approve' => 'aprobar'
    ];
    return $m[$a] ?? '';
}
```

### 2.3 Procesamiento de Request

```php
try {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?: [];
    $action = $_GET['action'] ?? $body['action'] ?? null;
    
    if (!$action) {
        throw new RuntimeException('action requerido. Valores: conexion, actualizar, inactivar, rechazar, aprobar');
    }
    
    $action = map_action($action);
    
    // Verificar permisos para acciones sensibles
    if (in_array($action, ['aprobar', 'rechazar'], true)) {
        require_once __DIR__ . '/require_admin.php';
        require_admin_only();
    }
```

### 2.4 Acción: CONEXION (Listar con Paginación y Filtros)

```php
if ($action === 'conexion') {
    $pg = getMain();
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $pageSize = isset($_GET['pageSize']) ? max(1, intval($_GET['pageSize'])) : 25;
    $offset = ($page - 1) * $pageSize;
    
    // Construir filtros
    $where = [];
    $params = [];
    foreach ($_GET as $key => $value) {
        if (strpos($key, 'filtro_') === 0 && $value !== '') {
            $col = preg_replace('/[^a-zA-Z0-9_]/', '', substr($key, 7));
            if ($col === '') continue;
            $where[] = "\"$col\" ILIKE ?";
            $params[] = '%' . $value . '%';
        }
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Construir ordenamiento
    $orderSql = '';
    if (!empty($_GET['ordenColumna'])) {
        $ordenColumna = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['ordenColumna']);
        if ($ordenColumna !== '') {
            $ordenAsc = (isset($_GET['ordenAsc']) && $_GET['ordenAsc'] == '0') ? 'DESC' : 'ASC';
            $orderSql = "ORDER BY \"$ordenColumna\" $ordenAsc";
        }
    }
    
    // Query de datos
    $sql = "SELECT * FROM mantenimientos $whereSql $orderSql LIMIT :lim OFFSET :off";
    $stmt = $pg->prepare($sql);
    $i = 1;
    foreach ($params as $p) {
        $stmt->bindValue($i++, $p);
    }
    $stmt->bindValue(':lim', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Query de total
    $sqlT = "SELECT COUNT(*) FROM mantenimientos $whereSql";
    $stmtT = $pg->prepare($sqlT);
    $i = 1;
    foreach ($params as $p) {
        $stmtT->bindValue($i++, $p);
    }
    $stmtT->execute();
    $total = (int)$stmtT->fetchColumn();
    
    respond([
        'success' => true,
        'action' => 'conexion',
        'datos' => $datos,
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize
    ]);
}
```

### 2.5 Acción: ACTUALIZAR (Upsert)

```php
if ($action === 'actualizar') {
    $pg = getTemporal();
    if (!is_array($body)) throw new RuntimeException('JSON inválido');
    
    $cols = [
        'mantenimientos_id', 'fecha', 'responsable', 'plantacion', 'finca',
        'siembra', 'lote', 'parcela', 'labor_especifica', 'observacion',
        'contratista', 'codigo', 'colaborador', 'personas', 'hora_entrada',
        'hora_salida', 'linea_entrada', 'linea_salida', 'cantidad', 'unidad',
        'maquina', 'tractorista', 'nuevo_operario', 'supervision', 'check'
    ];
    
    $id = $body['mantenimientos_id'] ?? null;
    if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
    if (!$id || trim($id) === '') throw new RuntimeException('mantenimientos_id requerido');
    
    $insertCols = [];
    $insertPlaceholders = [];
    $insertVals = [];
    $updatePairs = [];
    $updateVals = [];
    
    foreach ($cols as $c) {
        if (array_key_exists($c, $body)) {
            $insertCols[] = $c;
            $insertPlaceholders[] = '?';
            $insertVals[] = $body[$c];
            if ($c !== 'mantenimientos_id') {
                $updatePairs[] = "\"$c\" = ?";
                $updateVals[] = $body[$c];
            }
        }
    }
    
    if (empty($insertCols)) {
        throw new RuntimeException('No hay datos para insertar o actualizar');
    }
    
    $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stC = $pg->prepare("SELECT 1 FROM mantenimientos WHERE mantenimientos_id=?");
    $stC->execute([$id]);
    $exists = (bool)$stC->fetchColumn();
    
    if ($exists) {
        // UPDATE
        $sql = "UPDATE mantenimientos SET " . implode(', ', $updatePairs) . " WHERE mantenimientos_id = ?";
        $valsToExecute = array_merge($updateVals, [$id]);
        $ok = $pg->prepare($sql)->execute($valsToExecute);
    } else {
        // INSERT
        if (!in_array('mantenimientos_id', $insertCols, true)) {
            $insertCols[] = 'mantenimientos_id';
            $insertPlaceholders[] = '?';
            $insertVals[] = $id;
        }
        $sql = "INSERT INTO mantenimientos (" . implode(',', $insertCols) . ") VALUES (" . implode(',', $insertPlaceholders) . ")";
        $ok = $pg->prepare($sql)->execute($insertVals);
    }
    
    if ($ok) {
        respond(['success' => true, 'message' => 'guardado correctamente']);
    } else {
        respond(['success' => false, 'error' => 'db_error'], 500);
    }
}
```

### 2.6 Acción: INACTIVAR

```php
if ($action === 'inactivar') {
    $pg = getMain();
    $id = $body['mantenimientos_id'] ?? null;
    if ((!$id || trim($id) === '') && isset($body['id'])) $id = $body['id'];
    if (!$id) respond(['success' => false, 'error' => 'id_invalid'], 400);
    
    $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $st = $pg->prepare("UPDATE mantenimientos SET error_registro='inactivo' WHERE mantenimientos_id=?");
    $st->execute([$id]);
    $success = $st->rowCount() > 0;
    
    respond([
        'success' => $success,
        'action' => 'inactivar',
        'id' => $id,
        'estado' => 'inactivo'
    ]);
}
```

### 2.7 Estructura de Respuesta JSON

#### Respuesta Exitosa - Listado
```json
{
  "success": true,
  "action": "conexion",
  "datos": [
    {
      "mantenimientos_id": "1",
      "fecha": "2024-01-15",
      "responsable": "Juan Pérez",
      "plantacion": "PL-001",
      "finca": "Finca Norte",
      "supervision": "aprobado",
      "check": 1,
      ...
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 25
}
```

#### Respuesta Exitosa - Guardado
```json
{
  "success": true,
  "message": "guardado correctamente"
}
```

#### Respuesta de Error
```json
{
  "success": false,
  "error": "exception",
  "message": "Descripción del error"
}
```

---

## 3. ESTRUCTURA HTML

### 3.1 Tabla con Filtros

> **NOTA IMPORTANTE**: Este es el HTML real del módulo de mantenimientos. 
> Observe que algunos IDs usan 'reuniones' y otros 'mantenimientos' por razones históricas del código fuente.
> 
> **RECOMENDACIÓN PARA NUEVAS IMPLEMENTACIONES**: 
> - Use nombres consistentes en TODOS los IDs (ej: 'empleados' en todo)
> - Si está trabajando con código existente, mantenga los IDs actuales por compatibilidad
> - Para migración/estandarización: Actualizar IDs en HTML + constantes JavaScript + eventos al mismo tiempo

```html
<section id="tab-content-reuniones" class="md-table-card">
  <div class="md-table-toolbar">
    <span class="md-table-title"><i class="fas fa-users"></i> Tabla Mantenimientos</span>
    <div class="md-table-actions">
      <button class="md-btn md-btn-icon" id="clearFiltersBtn2" title="Limpiar filtros">
        <i class="fas fa-broom"></i>
      </button>
      <button class="md-btn md-btn-icon" id="exportBtnMantenimientos" title="Exportar a Excel">
        <i class="fas fa-file-excel"></i>
      </button>
      <label class="md-table-show">
        Mostrar
        <select id="limitSelect2" class="md-select">
          <option value="10">10</option>
          <option value="25" selected>25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </label>
    </div>
  </div>
  
  <div class="md-table-scroll">
    <table class="md-table" id="tabla-reuniones" data-tabla="reuniones">
      <thead>
        <tr>
          <th><input type="checkbox" id="selectAll2" class="md-checkbox"></th>
          <th>
            <div class="md-th-flex">
              <span>ID</span>
              <input class="md-input" data-col="mantenimientos_id" placeholder="Filtrar">
              <i class="fas fa-sort icon-sort" data-col="mantenimientos_id"></i>
            </div>
          </th>
          <th>
            <div class="md-th-flex">
              <span>Fecha</span>
              <input class="md-input" data-col="fecha" placeholder="Filtrar">
              <i class="fas fa-sort icon-sort" data-col="fecha"></i>
            </div>
          </th>
          <!-- Más columnas... -->
          <th><div class="md-th-flex"><span>Acciones</span></div></th>
        </tr>
      </thead>
      <tbody id="tbody-mantenimientos"></tbody>
    </table>
  </div>
  
  <nav id="pagination-reuniones" class="md-pagination">
    <ul class="md-pagination-list"></ul>
  </nav>
</section>
```

---

## 4. PARÁMETROS AJAX

### 4.1 Parámetros para Listar (GET)
```
action=conexion
page=1
pageSize=25
ordenColumna=fecha (opcional)
ordenAsc=1 (opcional, 1=ASC, 0=DESC)
filtro_fecha=2024-01 (opcional, prefijo filtro_ + nombre_columna)
filtro_responsable=Juan (opcional)
filtro_plantacion=PL-001 (opcional)
... (cualquier columna puede filtrarse con filtro_nombreColumna)
```

### 4.2 Parámetros para Guardar/Actualizar (POST)
```json
{
  "mantenimientos_id": "123",
  "fecha": "2024-01-15",
  "responsable": "Juan Pérez",
  "plantacion": "PL-001",
  "finca": "Finca Norte",
  "siembra": "S-2023-01",
  "lote": "L-001",
  "parcela": "P-001",
  "labor_especifica": "Mantenimiento preventivo",
  "observacion": "Sin observaciones",
  ...
}
```

### 4.3 Parámetros para Inactivar (POST)
```json
{
  "mantenimientos_id": "123"
}
```

---

## 5. CARACTERÍSTICAS CLAVE DEL MODELO

### 5.1 Paginación del Lado del Servidor (Server-Side)
- ✅ La paginación se realiza en el servidor, no en el cliente
- ✅ Solo se envían los registros de la página actual
- ✅ El servidor retorna `total` para calcular número de páginas

### 5.2 Filtrado Dinámico
- ✅ Filtros por cualquier columna usando prefijo `filtro_`
- ✅ Búsqueda tipo LIKE/ILIKE en el servidor
- ✅ Debounce en el frontend (300ms) para evitar requests excesivos
- ✅ Aplicación inmediata al presionar Enter

### 5.3 Ordenamiento
- ✅ Ordenamiento del lado del servidor
- ✅ Ascendente/Descendente por cualquier columna
- ✅ Toggle al hacer clic en el mismo icono de ordenamiento

### 5.4 Exportación a Excel
- ✅ Exportar TODO (fetch con pageSize alto)
- ✅ Exportar FILTRADO (datos actuales con filtros)
- ✅ Exportar SELECCIÓN (solo filas seleccionadas con checkbox)

### 5.5 CRUD Completo
- ✅ Crear nuevos registros (INSERT)
- ✅ Leer con paginación y filtros (SELECT)
- ✅ Actualizar registros existentes (UPDATE)
- ✅ Inactivar registros (soft delete)

### 5.6 Sistema de Aprobación
- ✅ Estados: edicion, pendiente, aprobado, rechazado
- ✅ Supervisión con check visual
- ✅ Control por roles (administrador puede aprobar/rechazar)

---

## 6. GUÍA DE IMPLEMENTACIÓN PARA NUEVAS TABLAS

### Paso 1: Preparar Constantes
1. Copiar estructura de constantes DOM
2. **IMPORTANTE**: Actualizar TODOS los IDs para que coincidan con tu HTML
   - Usar un nombre consistente (ej: 'empleados' en todos los IDs)
   - `tbody: 'tbody-empleados'`
   - `table: 'tabla-empleados'`
   - `pagination: 'pagination-empleados'`
3. Definir array COLUMNAS con campos de tu tabla
4. Configurar API endpoint
5. Definir ID_KEY (clave primaria)

### Paso 2: HTML
1. Copiar estructura HTML de tabla
2. Actualizar IDs de elementos
3. Agregar columnas con `data-col` en inputs de filtros
4. Agregar `data-col` en iconos de ordenamiento

### Paso 3: JavaScript
1. Copiar funciones core: fetchData, render, renderPagination, initFilters, load
2. Adaptar función render() según columnas específicas
3. Implementar función save() según tu formulario
4. Copiar init() y eventos

### Paso 4: PHP
1. Copiar estructura básica del API
2. Actualizar nombre de tabla en queries
3. Actualizar array de columnas en acción 'actualizar'
4. Implementar acciones según necesidades

### Paso 5: Testing
1. Verificar carga inicial de datos
2. Probar filtros por varias columnas
3. Probar ordenamiento ascendente/descendente
4. Probar paginación
5. Probar CRUD (crear, editar, eliminar/inactivar)
6. Probar exportación a Excel

---

## 7. DEPENDENCIAS

### Frontend
- **Bootstrap 5**: Para modal y componentes UI
- **Font Awesome 6**: Para iconos
- **XLSX.js**: Para exportación a Excel

### Backend
- **PHP 7.4+**: Lenguaje del servidor
- **PDO**: Para conexión a base de datos
- **PostgreSQL**: Base de datos

---

## 8. SEGURIDAD - MEJORES PRÁCTICAS

### 8.1 Validación de Columnas en Ordenamiento

El código actual usa `preg_replace` para sanitizar nombres de columnas, pero se recomienda implementar una whitelist:

```php
// RECOMENDADO: Whitelist de columnas permitidas
$allowedColumns = [
    'mantenimientos_id', 'fecha', 'responsable', 'plantacion', 
    'finca', 'siembra', 'lote', 'parcela', 'labor_especifica',
    'observacion', 'contratista', 'codigo', 'colaborador'
];

if (!empty($_GET['ordenColumna'])) {
    $ordenColumna = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['ordenColumna']);
    
    // Verificar contra whitelist
    if (!in_array($ordenColumna, $allowedColumns, true)) {
        throw new RuntimeException('Columna de ordenamiento no válida');
    }
    
    $ordenAsc = (isset($_GET['ordenAsc']) && $_GET['ordenAsc'] == '0') ? 'DESC' : 'ASC';
    $orderSql = "ORDER BY \"$ordenColumna\" $ordenAsc";
}
```

### 8.2 Validación de Columnas en Filtros

Similar recomendación para filtros:

```php
$allowedFilterColumns = [
    'fecha', 'responsable', 'plantacion', 'finca', 'siembra', 
    'lote', 'parcela', 'labor_especifica', 'observacion'
];

foreach ($_GET as $key => $value) {
    if (strpos($key, 'filtro_') === 0 && $value !== '') {
        $col = preg_replace('/[^a-zA-Z0-9_]/', '', substr($key, 7));
        
        // Verificar contra whitelist
        if (!in_array($col, $allowedFilterColumns, true)) {
            continue; // O throw exception
        }
        
        $where[] = "\"$col\" ILIKE ?";
        $params[] = '%' . $value . '%';
    }
}
```

### 8.3 Validación de Entrada Adicional

```php
// Validar tipos de datos
if (!is_numeric($page) || $page < 1) {
    $page = 1;
}

if (!is_numeric($pageSize) || $pageSize < 1 || $pageSize > 1000) {
    $pageSize = 25; // Default seguro
}

// Limitar longitud de filtros
foreach ($params as &$param) {
    if (strlen($param) > 255) {
        $param = substr($param, 0, 255);
    }
}
```

### 8.4 Protección CSRF (Recomendado)

Para operaciones POST (save, inactivate, reject, approve), considerar implementar tokens CSRF:

```php
// Generar token en sesión
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Validar en API
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $body['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        respond(['success' => false, 'error' => 'Token CSRF inválido'], 403);
    }
}
```

### 8.5 Rate Limiting

Considerar implementar rate limiting para prevenir abuso:

```php
// Ejemplo simple con sesión
if (!isset($_SESSION['api_calls'])) {
    $_SESSION['api_calls'] = ['count' => 0, 'time' => time()];
}

if (time() - $_SESSION['api_calls']['time'] > 60) {
    $_SESSION['api_calls'] = ['count' => 0, 'time' => time()];
}

$_SESSION['api_calls']['count']++;

if ($_SESSION['api_calls']['count'] > 100) {
    respond(['success' => false, 'error' => 'Rate limit exceeded'], 429);
}
```

---

## 9. NOTAS IMPORTANTES

### Seguridad
1. **Sanitización de Inputs**: Todos los inputs de usuario se sanitizan con `preg_replace` en PHP
2. **Prepared Statements**: Se usan prepared statements con PDO para todas las queries
3. **⚠️ Validación de Columnas**: La sanitización de columnas con `preg_replace` es una capa básica. **RECOMENDACIÓN**: Implementar whitelist de columnas permitidas:
   ```php
   $allowedColumns = ['fecha', 'responsable', 'plantacion', 'finca', ...];
   if (!in_array($ordenColumna, $allowedColumns)) {
       throw new RuntimeException('Columna no válida');
   }
   ```
4. **Parameter Binding**: Se usa bindValue en vez de concatenación directa de strings
5. **Validación de Filtros**: Los filtros usan ILIKE con parámetros bound para evitar SQL injection

### Compatibilidad y Robustez
6. **Múltiples Formatos JSON**: El sistema soporta múltiples formatos de respuesta JSON
7. **Fallback**: La función fetchData intenta múltiples acciones alternativas
8. **Cache**: Se usa `cache: 'no-store'` en fetch para evitar datos obsoletos

### Funcionalidad
9. **Errores**: Sistema de manejo de errores con suppress de mensajes específicos
10. **Rol-based**: Algunas acciones requieren verificación de permisos
11. **Optimización**: Debounce en filtros evita llamadas excesivas al servidor
12. **UX**: Feedback visual con iconos de estado (aprobado, pendiente, etc.)
13. **⚠️ Consistencia de IDs**: Al implementar una nueva tabla, usar nombres consistentes en todos los IDs HTML y constantes JavaScript (ej: todos deben usar 'empleados' o todos 'mantenimientos')

---

## 10. EJEMPLO COMPLETO DE ADAPTACIÓN

### Para crear una tabla "Empleados":

#### 1. Constantes JavaScript
```javascript
const DOM = {
  tbody: 'tbody-empleados',
  table: 'tabla-empleados',
  pagination: 'pagination-empleados',
  exportBtn: 'exportBtnEmpleados',
  clearBtn: 'clearFiltersEmpleados',
  limitSelect: 'limitSelectEmpleados',
  selectAll: 'selectAllEmpleados',
  form: 'form-editar-empleado',
  modal: 'modal-editar-empleado'
};

const COLUMNAS = [
  'empleado_id', 'nombre', 'apellido', 'cedula', 
  'cargo', 'departamento', 'fecha_ingreso', 'estado'
];

const API = 'assets/php/empleados_api.php';
const ID_KEY = 'empleado_id';
const DATE_COL = 'fecha_ingreso';
```

#### 2. HTML
```html
<table class="md-table" id="tabla-empleados">
  <thead>
    <tr>
      <th><input type="checkbox" id="selectAllEmpleados"></th>
      <th>
        <div class="md-th-flex">
          <span>ID</span>
          <input class="md-input" data-col="empleado_id" placeholder="Filtrar">
          <i class="fas fa-sort icon-sort" data-col="empleado_id"></i>
        </div>
      </th>
      <th>
        <div class="md-th-flex">
          <span>Nombre</span>
          <input class="md-input" data-col="nombre" placeholder="Filtrar">
          <i class="fas fa-sort icon-sort" data-col="nombre"></i>
        </div>
      </th>
      <!-- Más columnas... -->
    </tr>
  </thead>
  <tbody id="tbody-empleados"></tbody>
</table>
```

#### 3. PHP
```php
if ($action === 'conexion') {
    $sql = "SELECT * FROM empleados $whereSql $orderSql LIMIT :lim OFFSET :off";
    // ... resto del código
}

if ($action === 'actualizar') {
    $cols = ['empleado_id', 'nombre', 'apellido', 'cedula', 'cargo', 'departamento', 'fecha_ingreso', 'estado'];
    // ... resto del código
}
```

---

## 11. CONCLUSIÓN

Este modelo proporciona una base sólida y probada para implementar tablas con funcionalidades completas de:
- ✅ Paginación del lado del servidor
- ✅ Filtrado dinámico por múltiples columnas
- ✅ Ordenamiento ascendente/descendente
- ✅ Exportación a Excel (todo/filtrado/selección)
- ✅ CRUD completo
- ✅ Sistema de aprobación/supervisión
- ✅ Manejo de errores robusto
- ✅ Optimización con debounce
- ✅ UI consistente y amigable

Al seguir este modelo, todas las tablas del sistema tendrán un comportamiento uniforme, predecible y mantenible.
