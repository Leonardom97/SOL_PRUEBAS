// www/assets/js/panel.js
// Versión defensiva: rellena datos desde /php/panel.php sin tocar thead ni sus atributos.
// Si el thead pierde su estilo inline lo restablece al valor original detectado al cargar la página.

(function () {
  const ENDPOINT = '/php/panel.php';
  const FETCH_CREDENTIALS = 'same-origin';

  const IDS = {
    usuarios: 'usuarios-registrados-panel',
    colaboradores: 'usuarios-colaboradores-panel',
    capacitaciones_total: 'capacitaciones-realizadas-panel',
    fecha_corte: 'fecha-corte-panel',
    tabla_capacitaciones: 'tabla-capacitaciones'
  };

  function $id(id) { return document.getElementById(id); }

  // Guarda el atributo 'style' original del thead (si existe) para restituirlo después
  function captureTheadStyle(table) {
    if (!table) return null;
    const thead = table.querySelector && table.querySelector('thead');
    if (!thead) return null;
    // guardamos el atributo style completo y también el outerHTML por si hace falta
    return {
      styleAttr: thead.getAttribute('style'),
      outerHTML: thead.outerHTML
    };
  }

  // Restaura el styleAttr guardado si el thead actual no tiene un style o si fue cambiado.
  function restoreTheadStyleIfNeeded(table, snapshot) {
    if (!table || !snapshot) return;
    const thead = table.querySelector && table.querySelector('thead');
    if (!thead) return;
    // Si no hay style inline o difiere del snapshot, restablecer el atributo style (solo si snapshot.styleAttr !== null)
    // No forzamos colores nuevos, simplemente devolvemos lo que había al cargar.
    try {
      const currentStyle = thead.getAttribute('style');
      if (snapshot.styleAttr !== currentStyle) {
        if (snapshot.styleAttr === null) {
          // eliminar atributo si antes no existía
          thead.removeAttribute('style');
        } else {
          thead.setAttribute('style', snapshot.styleAttr);
        }
      }
      // Aseguramos que cada th tenga el color heredado si estaban explícitos en snapshot.outerHTML
      // (solo en caso extremo donde el thead fuese reescrito por otro script)
      // No forzamos valores que el usuario no tuviese originalmente.
      // Si el snapshot tenía th con inline styles, restauramos esos th inline styles.
      // Para mantener simpleza, si current outerHTML difiere sustancialmente volvemos a snapshot.outerHTML.
      if (snapshot.outerHTML && thead.outerHTML !== snapshot.outerHTML) {
        // Reemplazamos solo si difiere (puede afectar listeners en thead, pero es necesario si otro script reescribió thead)
        // Esto restituye exactamente lo que había.
        thead.outerHTML = snapshot.outerHTML;
      }
    } catch (e) {
      // en caso de error no hacer nada para no romper la página
      console.warn('[panel.js] restoreTheadStyleIfNeeded failed', e);
    }
  }

  // Obtiene o crea un <span data-value> dentro del contenedor sin modificar contenedor.
  function getOrCreateValueSpan(container) {
    if (!container) return null;
    try {
      const found = container.querySelector && container.querySelector('[data-value]');
      if (found) return found;
    } catch (e) { }
    try {
      const firstSpan = container.querySelector && container.querySelector('span');
      if (firstSpan) return firstSpan;
    } catch (e) { }
    // buscar nodo de texto para reemplazar
    for (let i = 0; i < container.childNodes.length; i++) {
      const node = container.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '') {
        const newSpan = document.createElement('span');
        newSpan.setAttribute('data-value', 'true');
        // asegurar herencia visual
        newSpan.style.color = 'inherit';
        newSpan.style.fontSize = 'inherit';
        newSpan.style.fontWeight = 'inherit';
        newSpan.style.fontFamily = 'inherit';
        newSpan.textContent = node.nodeValue.trim();
        container.replaceChild(newSpan, node);
        return newSpan;
      }
    }
    // crear al final sin tocar otros hijos
    const created = document.createElement('span');
    created.setAttribute('data-value', 'true');
    created.style.color = 'inherit';
    created.style.fontSize = 'inherit';
    created.style.fontWeight = 'inherit';
    created.style.fontFamily = 'inherit';
    container.appendChild(created);
    return created;
  }

  function setCounterValueById(id, value) {
    const el = $id(id);
    if (!el) return;
    const span = getOrCreateValueSpan(el);
    if (span) span.textContent = (value === null || value === undefined || value === '') ? '--' : String(value);
  }

  function formatDateToDDMMYYYY(dateIso) {
    if (!dateIso) return '--';
    const m = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(dateIso);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return dateIso;
  }

  // Vacía filas del tbody sin tocar thead ni sus atributos
  function clearTableRows(tableId) {
    const table = $id(tableId);
    if (!table) return null;
    let tbody = table.tBodies[0];
    if (!tbody) {
      // crear tbody sin alterar thead
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    return tbody;
  }

  function addTableRow(tableId, cols) {
    const table = $id(tableId);
    if (!table) return;
    let tbody = table.tBodies[0];
    if (!tbody) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
    const tr = document.createElement('tr');
    cols.forEach(col => {
      const td = document.createElement('td');
      if (col && typeof col === 'object' && col.html) {
        // caso excepcional: HTML controlado
        td.innerHTML = col.value;
      } else {
        td.textContent = (col === null || col === undefined) ? '' : String(col);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  async function fetchAndPopulate(periodCap = 'month', periodPesadasKPI = 'month', periodPesadasChart = 'month') {
    try {
      const table = $id(IDS.tabla_capacitaciones);
      const theadSnapshot = table ? captureTheadStyle(table) : null;

      const url = `${ENDPOINT}?period_capacitaciones=${periodCap}&period_pesadas_kpi=${periodPesadasKPI}&period_pesadas_chart=${periodPesadasChart}`;
      console.log('[panel.js] fetching', url);
      const resp = await fetch(url, {
        method: 'GET',
        credentials: FETCH_CREDENTIALS,
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });

      if (resp.status === 401) {
        console.warn('[panel.js] 401 no autenticado');
        setCounterValueById(IDS.usuarios, '--');
        setCounterValueById(IDS.colaboradores, '--');
        setCounterValueById(IDS.capacitaciones_total, '--');
        setCounterValueById(IDS.fecha_corte, '--');
        if (table) clearTableRows(IDS.tabla_capacitaciones);
        return;
      }

      if (!resp.ok) {
        const txt = await resp.text();
        console.error('[panel.js] HTTP error', resp.status, txt);
        throw new Error('HTTP ' + resp.status);
      }

      const data = await resp.json();
      if (!data || data.ok !== true) {
        console.error('[panel.js] API error or ok!=true', data);
        setCounterValueById(IDS.usuarios, '--');
        setCounterValueById(IDS.colaboradores, '--');
        setCounterValueById(IDS.capacitaciones_total, '--');
        setCounterValueById(IDS.fecha_corte, '--');
        if (table) clearTableRows(IDS.tabla_capacitaciones);
        return;
      }

      // actualizar contadores (solo spans)
      setCounterValueById(IDS.usuarios, data.usuarios ?? '--');
      setCounterValueById(IDS.colaboradores, data.colaboradores ?? '--');
      setCounterValueById(IDS.capacitaciones_total, data.capacitaciones_total ?? '--');
      setCounterValueById(IDS.fecha_corte, data.fecha_corte ? formatDateToDDMMYYYY(data.fecha_corte) : '--');

      // Nuevos KPIs
      setCounterValueById('pesadas-hoy-panel', data.pesadas_count ?? '--');
      setCounterValueById('capacitaciones-mes-panel', data.capacitaciones_mes ?? '--');
      setCounterValueById('evaluaciones-realizadas-panel', data.evaluaciones_realizadas ?? '--');

      // Actualizar gráficos
      if (window.Chart) {
        updateCharts(data, periodPesadasChart);
      }

      // actualizar tabla (solo tbody)
      if (table) {
        clearTableRows(IDS.tabla_capacitaciones);
        const recientes = Array.isArray(data.capacitaciones_recientes) ? data.capacitaciones_recientes : [];
        if (recientes.length === 0) {
          addTableRow(IDS.tabla_capacitaciones, ['—', '—', '—']);
        } else {
          recientes.forEach(item => {
            addTableRow(IDS.tabla_capacitaciones, [
              item.nombre || 'Sin nombre',
              item.fecha ? formatDateToDDMMYYYY(item.fecha) : '--',
              (typeof item.asistentes !== 'undefined') ? item.asistentes : 0
            ]);
          });
        }
        // Restaurar thead si otro script lo modificó
        restoreTheadStyleIfNeeded(table, theadSnapshot);
      }

      console.log('[panel.js] datos actualizados');
    } catch (err) {
      console.error('[panel.js] error al cargar datos:', err);
      try {
        setCounterValueById(IDS.usuarios, '--');
        setCounterValueById(IDS.colaboradores, '--');
        setCounterValueById(IDS.capacitaciones_total, '--');
        setCounterValueById(IDS.fecha_corte, '--');
        const table = $id(IDS.tabla_capacitaciones);
        if (table) clearTableRows(IDS.tabla_capacitaciones);
      } catch (e) { }
    }
  }

  // Variables globales para instancias de gráficos
  let chartPesadasInstance = null;
  let chartProductosInstance = null;
  let chartEvaluacionesInstance = null;

  function updateCharts(data, periodPesadasChart) {
    // Gráfico Pesadas
    const ctxBar = document.getElementById('chartPesadas');
    if (ctxBar && data.chart_pesadas) {
      const labels = data.chart_pesadas.map(item => item.fecha);
      const values = data.chart_pesadas.map(item => item.total);

      if (chartPesadasInstance) {
        chartPesadasInstance.data.labels = labels;
        chartPesadasInstance.data.datasets[0].data = values;
        chartPesadasInstance.update();
      } else {
        chartPesadasInstance = new Chart(ctxBar, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Pesajes',
              data: values,
              backgroundColor: 'rgba(78, 115, 223, 0.05)',
              borderColor: 'rgba(78, 115, 223, 1)',
              pointRadius: 3,
              pointBackgroundColor: 'rgba(78, 115, 223, 1)',
              pointBorderColor: 'rgba(78, 115, 223, 1)',
              pointHoverRadius: 3,
              pointHoverBackgroundColor: 'rgba(78, 115, 223, 1)',
              pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
              pointHitRadius: 10,
              pointBorderWidth: 2,
              fill: true,
              tension: 0.3
            }]
          },
          options: {
            maintainAspectRatio: false,
            layout: { padding: { left: 10, right: 25, top: 25, bottom: 0 } },
            scales: {
              x: {
                grid: { display: false, drawBorder: false },
                ticks: {
                  maxTicksLimit: 12,
                  callback: function (value, index, values) {
                    const label = this.getLabelForValue(value);
                    const date = new Date(label);
                    if (isNaN(date)) return label;

                    // Formatos solicitados:
                    if (periodPesadasChart === 'year' || periodPesadasChart === 'total') {
                      // Año: Inicial del mes (E, F, M...)
                      const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
                      return monthName.charAt(0).toUpperCase();
                    } else if (periodPesadasChart === 'month') {
                      // Mes: Inicial Mes + Dia (O 31, N 1)
                      const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
                      const parts = label.split('-');
                      const d = parseInt(parts[2]);
                      const mIndex = parseInt(parts[1]) - 1;
                      const mName = new Date(parts[0], mIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
                      return `${mName.charAt(0).toUpperCase()} ${d}`;
                    } else if (periodPesadasChart === 'week') {
                      // Semana: Inicial Dia + Numero (L 2, M 3)
                      const parts = label.split('-');
                      const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
                      const dayName = localDate.toLocaleDateString('es-ES', { weekday: 'long' });
                      return `${dayName.charAt(0).toUpperCase()} ${localDate.getDate()}`;
                    }
                    return label;
                  }
                }
              },
              y: { ticks: { maxTicksLimit: 5, padding: 10 }, grid: { color: "rgb(234, 236, 244)", drawBorder: false } },
            },
            plugins: { legend: { display: false } }
          }
        });
      }
    }

    // Gráfico Productos
    const ctxPie = document.getElementById('chartProductos');
    if (ctxPie && data.chart_productos) {
      const labels = data.chart_productos.map(item => item.nombre_producto);
      const values = data.chart_productos.map(item => item.total);
      const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'];

      if (chartProductosInstance) {
        chartProductosInstance.data.labels = labels;
        chartProductosInstance.data.datasets[0].data = values;
        chartProductosInstance.update();
      } else {
        chartProductosInstance = new Chart(ctxPie, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: values,
              backgroundColor: colors,
              hoverBackgroundColor: colors,
              hoverBorderColor: "rgba(234, 236, 244, 1)",
            }],
          },
          options: {
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                display: true,
                labels: { usePointStyle: true, padding: 20 }
              }
            },
            cutout: '70%',
            onClick: (evt, elements) => {
              const container = document.getElementById('detalles-productos');
              if (!container) return;

              if (elements && elements.length > 0) {
                // Mostrar detalle del elemento clickeado
                const index = elements[0].index;
                const label = labels[index];
                const value = values[index];
                const color = colors[index % colors.length];
                container.innerHTML = `
                        <div class="d-flex align-items-center p-2 border rounded bg-light">
                            <span style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                            <strong>${label}:</strong> <span class="ms-2">${value}</span>
                        </div>
                    `;
              } else {
                // Si se hace click fuera, ocultar detalles (volver a estado limpio)
                container.innerHTML = '';
              }
            }
          },
        });
      }
    }

    // Gráfico Evaluaciones por Tema
    const ctxEvaluaciones = document.getElementById('chartEvaluacionesTema');
    if (ctxEvaluaciones && data.chart_evaluaciones_tema) {
      const labels = data.chart_evaluaciones_tema.map(item => item.tema);
      const values = data.chart_evaluaciones_tema.map(item => item.total);

      // Calcular stepSize dinámico
      const maxVal = Math.max(...values, 0);
      let stepSize = 1;
      if (maxVal > 50) stepSize = 10;
      else if (maxVal > 10) stepSize = 5;
      else stepSize = 1;

      if (chartEvaluacionesInstance) {
        chartEvaluacionesInstance.data.labels = labels;
        chartEvaluacionesInstance.data.datasets[0].data = values;
        chartEvaluacionesInstance.options.scales.y.ticks.stepSize = stepSize;
        chartEvaluacionesInstance.update();
      } else {
        chartEvaluacionesInstance = new Chart(ctxEvaluaciones, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Evaluaciones Programadas',
              data: values,
              backgroundColor: '#4e73df',
              borderColor: '#4e73df',
              borderWidth: 1
            }]
          },
          options: {
            maintainAspectRatio: false,
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  maxRotation: 90,
                  minRotation: 90,
                  autoSkip: false // Mostrar todas las etiquetas
                }
              },
              y: {
                beginAtZero: true,
                ticks: {
                  font: { size: 11 },
                  stepSize: stepSize,
                  precision: 0 // Enteros
                }
              }
            },
            plugins: { legend: { display: false } }
          }
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const selectPeriodCap = document.getElementById('select-periodo-capacitaciones');
    const selectPeriodPesadasKPI = document.getElementById('select-periodo-pesadas-kpi');
    const selectPeriodPesadasChart = document.getElementById('select-periodo-pesadas-chart');

    const getPeriodCap = () => selectPeriodCap ? selectPeriodCap.value : 'month';
    const getPeriodPesadasKPI = () => selectPeriodPesadasKPI ? selectPeriodPesadasKPI.value : 'month';
    const getPeriodPesadasChart = () => selectPeriodPesadasChart ? selectPeriodPesadasChart.value : 'month';

    // Carga inicial
    fetchAndPopulate(getPeriodCap(), getPeriodPesadasKPI(), getPeriodPesadasChart());

    // Evento cambio de periodo Capacitaciones
    if (selectPeriodCap) {
      selectPeriodCap.addEventListener('change', (e) => {
        fetchAndPopulate(e.target.value, getPeriodPesadasKPI(), getPeriodPesadasChart());
      });
    }

    // Listeners Pesadas KPI
    if (selectPeriodPesadasKPI) {
      selectPeriodPesadasKPI.addEventListener('change', (e) => {
        fetchAndPopulate(getPeriodCap(), e.target.value, getPeriodPesadasChart());
      });
    }

    // Listeners Pesadas Chart
    if (selectPeriodPesadasChart) {
      selectPeriodPesadasChart.addEventListener('change', (e) => {
        fetchAndPopulate(getPeriodCap(), getPeriodPesadasKPI(), e.target.value);
      });
    }

    // Auto-refresh cada minuto
    setInterval(() => {
      fetchAndPopulate(getPeriodCap(), getPeriodPesadasKPI(), getPeriodPesadasChart());
    }, 60 * 1000);
  });
})();