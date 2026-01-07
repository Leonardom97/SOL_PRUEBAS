let datos = [];
let pagina = 1;
let porPagina = 10;
let filtros = {};
let seleccionados = new Set();
let sortCol = null;
let sortDir = 'asc';

// Carga datos vía fetch del backend PHP
fetch('assets/php/consultas_capacitacion_api.php')
  .then(res => {
    if (!res.ok) throw new Error('Error HTTP: ' + res.status);
    return res.json();
  })
  .then(json => {
    if (!Array.isArray(json)) {
      console.error("Respuesta no es un array:", json);
      alert('El backend no devolvió un array.');
      return;
    }
    datos = json;
    renderTabla();
  })
  .catch(err => {
    console.error('Error cargando datos:', err);
    alert('Error cargando datos: ' + err);
  });

function filtrarDatos() {
  return datos.filter(row => {
    return Object.keys(filtros).every(col => {
      if (!filtros[col]) return true;
      
      // Manejo especial para la columna "registrado_por"
      if (col === 'registrado_por') {
        const searchText = filtros[col].toLowerCase();
        const creado = (row.creado_por_nombre || '').toLowerCase();
        const editado = (row.editado_por_nombre || '').toLowerCase();
        return creado.includes(searchText) || editado.includes(searchText);
      }
      
      // Filtrado de columnas regular
      return row[col] && row[col].toString().toLowerCase().includes(filtros[col].toLowerCase());
    });
  }).sort((a, b) => {
    if (!sortCol) return 0;
    
    let va, vb;
    
    // Manejo especial para ordenar por "registrado_por"
    if (sortCol === 'registrado_por') {
      va = a.creado_por_nombre || '';
      vb = b.creado_por_nombre || '';
    } else if (sortCol === 'fecha') {
      va = a[sortCol].split('/').reverse().join('');
      vb = b[sortCol].split('/').reverse().join('');
    } else {
      va = a[sortCol];
      vb = b[sortCol];
    }
    
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderTabla() {
  // Intentar nueva estructura primero, usar estructura antigua para compatibilidad
  let tbody = document.querySelector('#tabla-capacitaciones tbody');
  if (!tbody) {
    tbody = document.querySelector('#tabla tbody');
    if (!tbody) {
      console.warn('No table body found for rendering');
      return;
    }
  }
  tbody.innerHTML = '';
  const filtrados = filtrarDatos();
  const total = filtrados.length;
  const inicio = (pagina-1)*porPagina;
  const fin = Math.min(inicio+porPagina, total);

  for (let i=inicio; i<fin; i++) {
    const row = filtrados[i];
    const idStr = String(row.id);
    const tr = document.createElement('tr');
    if (seleccionados.has(idStr)) tr.classList.add('selected');
    
    // Construir el contenido de la celda "Registrado por"
    let registradoPor = '';
    if (row.creado_por_nombre) {
      registradoPor = 'Creado por: ' + row.creado_por_nombre;
      if (row.editado_por_nombre) {
        registradoPor += '<br>Editado por: ' + row.editado_por_nombre;
      }
    } else {
      registradoPor = 'No disponible';
    }
    
    tr.innerHTML = `
      <td><input type="checkbox" class="selectRow md-checkbox" value="${idStr}" ${seleccionados.has(idStr)?'checked':''}></td>
      <td>${row.id}</td>
      <td>${row.capacitador || ''}</td>
      <td>${row.cedula || ''}</td>
      <td>${row.tema || ''}</td>
      <td>${row.lugar || ''}</td>
      <td>${row.actividad || ''}</td>
      <td>${row.proceso || ''}</td>
      <td>${row.fecha || ''}</td>
      <td>${row.total_asistentes || 0}</td>
      <td style="font-size: 0.85em;">${registradoPor}</td>
    `;
    tbody.appendChild(tr);
  }
  const downloadSelectedBtn = document.getElementById('downloadSelected');
  if (downloadSelectedBtn) {
    downloadSelectedBtn.classList.toggle('disabled', seleccionados.size === 0);
  }
  renderBootstrapPagination(total);
  renderSortIcons();
}

function renderBootstrapPagination(total) {
  const pagNav = document.getElementById('pagination-capacitaciones') || document.getElementById('bootstrap-pagination-nav');
  if (!pagNav) return;
  const pagUl = pagNav.querySelector('.md-pagination-list') || pagNav.querySelector('.pagination');
  if (!pagUl) return;
  pagUl.innerHTML = '';

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  
  if (totalPaginas <= 1) {
    return;
  }

  // Botón Anterior
  const prevLi = document.createElement('li');
  prevLi.className = (pagNav.id === 'pagination-capacitaciones' ? 'md-page-item' : 'page-item') + (pagina === 1 ? ' disabled' : '');
  const prevA = document.createElement('a');
  prevA.className = pagNav.id === 'pagination-capacitaciones' ? 'md-page-link' : 'page-link';
  prevA.href = '#';
  prevA.setAttribute('aria-label', 'Previous');
  prevA.innerHTML = '<span aria-hidden="true">&laquo;</span>';
  prevA.onclick = function(e){
    e.preventDefault();
    if(pagina > 1) { pagina--; renderTabla(); }
  };
  prevLi.appendChild(prevA);
  pagUl.appendChild(prevLi);

  // Calcular números de página a mostrar (máximo 7)
  let startPage = 1;
  let endPage = totalPaginas;
  
  if (totalPaginas > 7) {
    if (pagina <= 4) {
      // Cerca del inicio: mostrar 1 2 3 4 5 ... último
      startPage = 1;
      endPage = 5;
    } else if (pagina >= totalPaginas - 3) {
      // Cerca del final: mostrar 1 ... N-4 N-3 N-2 N-1 N
      startPage = totalPaginas - 4;
      endPage = totalPaginas;
    } else {
      // En el medio: mostrar 1 ... actual-1 actual actual+1 ... último
      startPage = pagina - 1;
      endPage = pagina + 1;
    }
  }

  const itemClass = pagNav.id === 'pagination-capacitaciones' ? 'md-page-item' : 'page-item';
  const linkClass = pagNav.id === 'pagination-capacitaciones' ? 'md-page-link' : 'page-link';
  
  // Botón primera página si no está en el rango
  if (startPage > 1) {
    const li = document.createElement('li');
    li.className = itemClass;
    const a = document.createElement('a');
    a.className = linkClass;
    a.href = '#';
    a.textContent = '1';
    a.onclick = function(e){
      e.preventDefault();
      pagina = 1;
      renderTabla();
    };
    li.appendChild(a);
    pagUl.appendChild(li);
    
    // Agregar puntos suspensivos si hay una brecha
    if (startPage > 2) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = itemClass + ' disabled';
      const ellipsisA = document.createElement('a');
      ellipsisA.className = linkClass;
      ellipsisA.href = '#';
      ellipsisA.textContent = '...';
      ellipsisLi.appendChild(ellipsisA);
      pagUl.appendChild(ellipsisLi);
    }
  }

  // Números de página
  for(let i=startPage; i<=endPage; i++) {
    const li = document.createElement('li');
    li.className = itemClass + (i === pagina ? ' active' : '');
    const a = document.createElement('a');
    a.className = linkClass;
    a.href = '#';
    a.textContent = i;
    a.onclick = function(e){
      e.preventDefault();
      pagina = i;
      renderTabla();
    };
    li.appendChild(a);
    pagUl.appendChild(li);
  }

  // Botón última página si no está en el rango
  if (endPage < totalPaginas) {
    // Agregar puntos suspensivos si hay una brecha
    if (endPage < totalPaginas - 1) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = itemClass + ' disabled';
      const ellipsisA = document.createElement('a');
      ellipsisA.className = linkClass;
      ellipsisA.href = '#';
      ellipsisA.textContent = '...';
      ellipsisLi.appendChild(ellipsisA);
      pagUl.appendChild(ellipsisLi);
    }
    
    const li = document.createElement('li');
    li.className = itemClass;
    const a = document.createElement('a');
    a.className = linkClass;
    a.href = '#';
    a.textContent = totalPaginas;
    a.onclick = function(e){
      e.preventDefault();
      pagina = totalPaginas;
      renderTabla();
    };
    li.appendChild(a);
    pagUl.appendChild(li);
  }

  // Botón Siguiente
  const nextLi = document.createElement('li');
  nextLi.className = itemClass + (pagina === totalPaginas ? ' disabled' : '');
  const nextA = document.createElement('a');
  nextA.className = linkClass;
  nextA.href = '#';
  nextA.setAttribute('aria-label', 'Next');
  nextA.innerHTML = '<span aria-hidden="true">&raquo;</span>';
  nextA.onclick = function(e){
    e.preventDefault();
    if(pagina < totalPaginas) { pagina++; renderTabla(); }
  };
  nextLi.appendChild(nextA);
  pagUl.appendChild(nextLi);
}

// Filtros individuales por columna
document.querySelectorAll('.consulta-cap-input, #tabla-capacitaciones .md-input').forEach(inp=>{
  inp.addEventListener('input', e=>{
    filtros[inp.dataset.col] = inp.value;
    pagina = 1;
    renderTabla();
  });
});

// Selección individual de filas
const tablaEl = document.getElementById('tabla-capacitaciones') || document.getElementById('tabla');
if (tablaEl) {
  tablaEl.addEventListener('change', function(e){
    if(e.target.classList.contains('selectRow')){
      const idStr = String(e.target.value);
      if(e.target.checked) {
        seleccionados.add(idStr);
      } else {
        seleccionados.delete(idStr);
      }
      renderTabla();
    }
  });
}

// Selección de todos en página
const selectAllEl = document.getElementById('selectAll1') || document.getElementById('selectAll');
if (selectAllEl) {
  selectAllEl.addEventListener('change', function(e){
    const filtrados = filtrarDatos();
    const inicio = (pagina-1)*porPagina;
    const fin = Math.min(inicio+porPagina, filtrados.length);
    for(let i=inicio; i<fin; i++){
      const idStr = String(filtrados[i].id);
      if(e.target.checked) seleccionados.add(idStr);
      else seleccionados.delete(idStr);
    }
    renderTabla();
  });
}

// Limpiar filtros
const clearBtn = document.getElementById('clearFiltersBtn1') || document.getElementById('clearFiltersBtn');
if (clearBtn) {
  clearBtn.addEventListener('click', function(){
    filtros = {};
    document.querySelectorAll('.consulta-cap-input, #tabla-capacitaciones .md-input').forEach(inp=>{
      inp.value = '';
    });
    pagina = 1;
    renderTabla();
  });
}

// Select de límite
const limitSelectEl = document.getElementById('limitSelect1') || document.getElementById('limitSelect');
if (limitSelectEl) {
  limitSelectEl.addEventListener('change', function(e){
    porPagina = parseInt(e.target.value,10);
    pagina = 1;
    renderTabla();
  });
}

// Lógica de dropdown (estructura antigua)
const downloadBtn = document.getElementById('downloadBtn');
const menu = document.getElementById('dropdownContent');
if (downloadBtn && menu) {
  downloadBtn.addEventListener('click',function(e){
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click',function(e){
    if(menu.classList.contains('open')) menu.classList.remove('open');
  });
  menu.addEventListener('click', function(e){
    e.stopPropagation();
  });
}

// Botón de exportar para la nueva estructura de pestañas
const exportBtnCapacitaciones = document.getElementById('exportBtnCapacitaciones');
if (exportBtnCapacitaciones) {
  exportBtnCapacitaciones.addEventListener('click', function(e){
    e.preventDefault();
    descargarXLSX('filtered');
  });
}

// Ordenar columnas
function renderSortIcons() {
  document.querySelectorAll('#tabla-capacitaciones .icon-sort, th.sortable .icon-sort').forEach(icon => {
    icon.classList.remove('active', 'fa-sort-amount-up', 'fa-sort-amount-down', 'fa-filter', 'fa-sort-up', 'fa-sort-down');
    icon.classList.add('fa-sort');
    if (sortCol === icon.dataset.col) {
      icon.classList.add('active');
      if (sortDir === 'asc') {
        icon.classList.remove('fa-sort');
        icon.classList.add('fa-sort-up');
      } else {
        icon.classList.remove('fa-sort');
        icon.classList.add('fa-sort-down');
      }
    }
  });
}
document.querySelectorAll('#tabla-capacitaciones .icon-sort, th.sortable .icon-sort').forEach(icon => {
  icon.addEventListener('click', function(e){
    const col = icon.dataset.col;
    if (sortCol === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = col;
      sortDir = 'asc';
    }
    renderTabla();
  });
});

// EXPORTA A EXCEL EN EL FORMATO QUE PIDES
function descargarXLSX(tipo){
  let filas;
  if(tipo === 'all') filas = datos;
  else if(tipo === 'filtered') filas = filtrarDatos();
  else if(tipo === 'selected') filas = datos.filter(row=>seleccionados.has(String(row.id)));
  else return;

  let arr = [
    [
      'id','Capacitador','Cédula','Tema','Lugar','Actividad','Proceso','Fecha',
      'hora inicio','hora final','duracion total','observaciones','total asistentes',
      'aprobados','no aprobados','creado por','editado por'
    ]
  ];
  filas.forEach(row=>{
    arr.push([
      row.id,
      row.capacitador,
      row.cedula,
      row.tema,
      row.lugar,
      row.actividad,
      row.proceso,
      row.fecha,
      row.hora_inicio || '',
      row.hora_final || '',
      row.duracion_total || '',
      row.observaciones || '',
      row.total_asistentes || 0,
      row.aprobados || '',
      row.no_aprobados || '',
      row.creado_por_nombre || 'No disponible',
      row.editado_por_nombre || 'No editado'
    ]);
  });

  let ws = XLSX.utils.aoa_to_sheet(arr);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Capacitaciones");
  XLSX.writeFile(wb, `capacitaciones_${tipo}.xlsx`);
}

// Opciones de dropdown (estructura antigua)
const downloadAllBtn = document.getElementById('downloadAll');
const downloadFilteredBtn = document.getElementById('downloadFiltered');
const downloadSelectedBtn2 = document.getElementById('downloadSelected');

if (downloadAllBtn) {
  downloadAllBtn.addEventListener('click', function(e){
    e.preventDefault();
    descargarXLSX('all');
    if (menu) menu.classList.remove('open');
  });
}
if (downloadFilteredBtn) {
  downloadFilteredBtn.addEventListener('click', function(e){
    e.preventDefault();
    descargarXLSX('filtered');
    if (menu) menu.classList.remove('open');
  });
}
if (downloadSelectedBtn2) {
  downloadSelectedBtn2.addEventListener('click', function(e){
    e.preventDefault();
    if(seleccionados.size===0) return;
    descargarXLSX('selected');
    if (menu) menu.classList.remove('open');
  });
}