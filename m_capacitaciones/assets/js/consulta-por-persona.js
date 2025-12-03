let datosPersona = [];
let paginaPersona = 1;
let porPaginaPersona = 25;
let filtrosPersona = {};
let seleccionadosPersona = new Set();
let sortColPersona = null;
let sortDirPersona = 'asc';

// Carga datos vía fetch del backend PHP
fetch('assets/php/consultas_por_persona_api.php')
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
    datosPersona = json;
    renderTablaPersona();
  })
  .catch(err => {
    console.error('Error cargando datos:', err);
    alert('Error cargando datos: ' + err);
  });

function filtrarDatosPersona() {
  return datosPersona.filter(row => {
    return Object.keys(filtrosPersona).every(col => {
      if (!filtrosPersona[col]) return true;
      return row[col] && row[col].toString().toLowerCase().includes(filtrosPersona[col].toLowerCase());
    });
  }).sort((a, b) => {
    if (!sortColPersona) return 0;
    let va = a[sortColPersona];
    let vb = b[sortColPersona];
    if (va < vb) return sortDirPersona === 'asc' ? -1 : 1;
    if (va > vb) return sortDirPersona === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderTablaPersona() {
  const tbody = document.querySelector('#tabla-persona tbody');
  tbody.innerHTML = '';
  const filtrados = filtrarDatosPersona();
  const total = filtrados.length;
  const inicio = (paginaPersona-1)*porPaginaPersona;
  const fin = Math.min(inicio+porPaginaPersona, total);

  for (let i=inicio; i<fin; i++) {
    const row = filtrados[i];
    const idStr = String(row.id);
    const tr = document.createElement('tr');
    if (seleccionadosPersona.has(idStr)) tr.classList.add('selected');
    
    tr.innerHTML = `
      <td><input type="checkbox" class="selectRowPersona md-checkbox" value="${idStr}" ${seleccionadosPersona.has(idStr)?'checked':''}></td>
      <td>${row.id}</td>
      <td>${row.cedula || ''}</td>
      <td>${row.nombres_apellidos || ''}</td>
      <td>${row.cargo || ''}</td>
      <td>${row.sub_area || ''}</td>
      <td>${row.capacitaciones_realizadas || 0}</td>
      <td>${row.capacitaciones_pendientes || 0}</td>
      <td>${row.total_esperadas || 0}</td>
    `;
    tbody.appendChild(tr);
  }

  renderPaginacionPersona(total);
}

function renderPaginacionPersona(total) {
  const nav = document.getElementById('pagination-persona');
  if (!nav) return;
  const ul = nav.querySelector('.md-pagination-list');
  if (!ul) return;
  ul.innerHTML = '';
  const totalPaginas = Math.max(1, Math.ceil(total / porPaginaPersona));
  
  if (totalPaginas <= 1) {
    return;
  }

  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = 'md-page-item' + (paginaPersona === 1 ? ' disabled' : '');
  const prevA = document.createElement('a');
  prevA.className = 'md-page-link';
  prevA.href = '#';
  prevA.setAttribute('aria-label', 'Previous');
  prevA.innerHTML = '<span aria-hidden="true">&laquo;</span>';
  prevA.onclick = function(e){
    e.preventDefault();
    if(paginaPersona > 1) { paginaPersona--; renderTablaPersona(); }
  };
  prevLi.appendChild(prevA);
  ul.appendChild(prevLi);

  // Calculate page numbers to show (max 7)
  let startPage = 1;
  let endPage = totalPaginas;
  
  if (totalPaginas > 7) {
    if (paginaPersona <= 4) {
      startPage = 1;
      endPage = 5;
    } else if (paginaPersona >= totalPaginas - 3) {
      startPage = totalPaginas - 4;
      endPage = totalPaginas;
    } else {
      startPage = paginaPersona - 1;
      endPage = paginaPersona + 1;
    }
  }

  // First page button if not in range
  if (startPage > 1) {
    const li = document.createElement('li');
    li.className = 'md-page-item';
    const a = document.createElement('a');
    a.className = 'md-page-link';
    a.href = '#';
    a.textContent = '1';
    a.onclick = function(e){
      e.preventDefault();
      paginaPersona = 1;
      renderTablaPersona();
    };
    li.appendChild(a);
    ul.appendChild(li);
    
    // Add ellipsis if there's a gap
    if (startPage > 2) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = 'md-page-item disabled';
      const ellipsisA = document.createElement('a');
      ellipsisA.className = 'md-page-link';
      ellipsisA.href = '#';
      ellipsisA.textContent = '...';
      ellipsisLi.appendChild(ellipsisA);
      ul.appendChild(ellipsisLi);
    }
  }

  // Page numbers
  for(let i=startPage; i<=endPage; i++) {
    const li = document.createElement('li');
    li.className = 'md-page-item' + (i === paginaPersona ? ' active' : '');
    const a = document.createElement('a');
    a.className = 'md-page-link';
    a.href = '#';
    a.textContent = i;
    a.onclick = function(e){
      e.preventDefault();
      paginaPersona = i;
      renderTablaPersona();
    };
    li.appendChild(a);
    ul.appendChild(li);
  }

  // Last page button if not in range
  if (endPage < totalPaginas) {
    // Add ellipsis if there's a gap
    if (endPage < totalPaginas - 1) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = 'md-page-item disabled';
      const ellipsisA = document.createElement('a');
      ellipsisA.className = 'md-page-link';
      ellipsisA.href = '#';
      ellipsisA.textContent = '...';
      ellipsisLi.appendChild(ellipsisA);
      ul.appendChild(ellipsisLi);
    }
    
    const li = document.createElement('li');
    li.className = 'md-page-item';
    const a = document.createElement('a');
    a.className = 'md-page-link';
    a.href = '#';
    a.textContent = totalPaginas;
    a.onclick = function(e){
      e.preventDefault();
      paginaPersona = totalPaginas;
      renderTablaPersona();
    };
    li.appendChild(a);
    ul.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = 'md-page-item' + (paginaPersona === totalPaginas ? ' disabled' : '');
  const nextA = document.createElement('a');
  nextA.className = 'md-page-link';
  nextA.href = '#';
  nextA.setAttribute('aria-label', 'Next');
  nextA.innerHTML = '<span aria-hidden="true">&raquo;</span>';
  nextA.onclick = function(e){
    e.preventDefault();
    if(paginaPersona < totalPaginas) { paginaPersona++; renderTablaPersona(); }
  };
  nextLi.appendChild(nextA);
  ul.appendChild(nextLi);
}

// Manejadores de eventos
document.addEventListener('click', e => {
  // Checkbox individual
  if (e.target.classList.contains('selectRowPersona')) {
    const val = e.target.value;
    if (e.target.checked) seleccionadosPersona.add(val);
    else seleccionadosPersona.delete(val);
    renderTablaPersona();
  }
});

// Seleccionar todos
const selectAllPersona = document.getElementById('selectAllPersona');
if (selectAllPersona) {
  selectAllPersona.addEventListener('change', e => {
    if (e.target.checked) {
      filtrarDatosPersona().forEach(r => seleccionadosPersona.add(String(r.id)));
    } else {
      seleccionadosPersona.clear();
    }
    renderTablaPersona();
  });
}

// Ordenamiento
document.querySelectorAll('#tabla-persona .icon-sort').forEach(icon => {
  icon.addEventListener('click', e => {
    const col = e.target.dataset.col;
    if (sortColPersona === col) {
      sortDirPersona = sortDirPersona === 'asc' ? 'desc' : 'asc';
    } else {
      sortColPersona = col;
      sortDirPersona = 'asc';
    }
    document.querySelectorAll('#tabla-persona .icon-sort').forEach(i => {
      i.className = 'fas fa-sort icon-sort';
    });
    e.target.className = sortDirPersona === 'asc' ? 'fas fa-sort-up icon-sort' : 'fas fa-sort-down icon-sort';
    renderTablaPersona();
  });
});

// Filtros
document.querySelectorAll('#tabla-persona .md-input').forEach(inp => {
  inp.addEventListener('input', e => {
    const col = e.target.dataset.col;
    filtrosPersona[col] = e.target.value.trim();
    paginaPersona = 1;
    renderTablaPersona();
  });
});

// Limpiar filtros
const clearFiltersBtn2 = document.getElementById('clearFiltersBtn2');
if (clearFiltersBtn2) {
  clearFiltersBtn2.addEventListener('click', () => {
    filtrosPersona = {};
    document.querySelectorAll('#tabla-persona .md-input').forEach(inp => inp.value = '');
    renderTablaPersona();
  });
}

// Cambiar registros por página
const limitSelect2 = document.getElementById('limitSelect2');
if (limitSelect2) {
  limitSelect2.addEventListener('change', e => {
    porPaginaPersona = parseInt(e.target.value);
    paginaPersona = 1;
    renderTablaPersona();
  });
}

// Exportar a Excel - Por Persona
const exportBtnPersona = document.getElementById('exportBtnPersona');
if (exportBtnPersona) {
  exportBtnPersona.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
      alert('Biblioteca XLSX no cargada');
      return;
    }
    
    const dataToExport = filtrarDatosPersona().map(row => ({
      'ID': row.id,
      'Cédula': row.cedula,
      'Nombres y Apellidos': row.nombres_apellidos,
      'Cargo': row.cargo,
      'Sub Área': row.sub_area,
      'Realizadas': row.capacitaciones_realizadas,
      'Pendientes': row.capacitaciones_pendientes,
      'Programadas': row.total_esperadas
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultas por Persona');
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Consultas_Por_Persona_${fecha}.xlsx`);
  });
}
