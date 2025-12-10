/**
 * agronomia.js
 * 
 * Script principal para el módulo de agronomía.
 * 
 * Funcionalidades principales:
 * - Carga dinámica de componentes (navbar, sidebar)
 * - Inicialización de controles multiselect tipo CoreUI
 * - Verificación de sesión del usuario
 * - Publicación de roles en el DOM para otros scripts
 * - Gestión de cierre de sesión
 * 
 * Este script se ejecuta en todas las páginas del módulo de agronomía.
 */

/**
 * Carga un componente HTML dinámicamente e inyecta su contenido en un selector.
 * 
 * Uso: Cargar navbar y sidebar desde archivos externos.
 * 
 * @param {string} file - Ruta del archivo HTML a cargar
 * @param {string} selector - Selector CSS donde inyectar el contenido
 */
async function includeComponent(file, selector) {
  try {
    const res = await fetch(file);
    const html = await res.text();
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  } catch (err) {
    console.error(`Error al cargar ${file}:`, err);
  }
}

/**
 * Inicializa un control multiselect estilo CoreUI.
 * 
 * El multiselect permite seleccionar múltiples opciones de una lista con una interfaz
 * moderna que incluye chips para visualizar las selecciones y botones para limpiar/alternar.
 * 
 * Características:
 * - Muestra opciones seleccionadas como chips removibles
 * - Soporte para botón de limpiar todo
 * - Soporte para botón de alternar lista
 * - Sincronización con select HTML oculto
 * 
 * @param {string} suffix - Sufijo único para identificar los elementos del multiselect
 *                          Busca elementos con IDs: multiSelect{suffix}, optionsList{suffix}, etc.
 */
function initMultiselect(suffix) {
  const ms = document.getElementById(`multiSelect${suffix}`);
  const list = document.getElementById(`optionsList${suffix}`);
  const selected = document.getElementById(`selectedContainer${suffix}`);
  const hidden = document.getElementById(`hiddenSelect${suffix}`);
  const placeholder = document.getElementById(`placeholder${suffix}`);
  const clearBtn = document.getElementById(`clearBtn${suffix}`); // Opcional
  const toggleBtn = document.getElementById(`toggleBtn${suffix}`); // Opcional

  // Prevenir doble inicialización
  if (!ms || ms.dataset.initialized === 'true') return;
  ms.dataset.initialized = 'true';

  // Click en el contenedor principal: alternar lista de opciones
  ms.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-clear') && !e.target.closest('.btn-toggle')) {
      list.style.display = list.style.display === 'block' ? 'none' : 'block';
    }
  });

  // Click fuera del multiselect: cerrar lista de opciones
  document.addEventListener('click', (e) => {
    if (!ms.contains(e.target)) {
      list.style.display = 'none';
    }
  });

  // Escuchar cambios en los checkboxes
  list.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', update);
  });

  // Botón para limpiar todas las selecciones (opcional)
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      list.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
      update();
    });
  }

  // Botón para alternar visibilidad de la lista (opcional)
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      list.style.display = list.style.display === 'block' ? 'none' : 'block';
    });
  }

  /**
   * Actualiza la visualización de chips y sincroniza con el select oculto.
   * Se ejecuta cada vez que cambia una selección.
   */
  function update() {
    // Obtener todos los checkboxes marcados
    const checked = Array.from(list.querySelectorAll('input[type="checkbox"]:checked'));

    // Limpiar chips existentes
    selected.querySelectorAll('.coreui-ms-chip').forEach(chip => chip.remove());
    
    // Mostrar u ocultar placeholder según haya selecciones
    placeholder.style.display = checked.length === 0 ? 'inline' : 'none';

    // Crear un chip por cada opción seleccionada
    checked.forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'coreui-ms-chip';
      chip.textContent = item.parentElement.textContent.trim();

      // Botón X para remover el chip
      const remove = document.createElement('button');
      remove.innerHTML = `<i class="bi bi-x-lg"></i>`;
      remove.onclick = (e) => {
        e.stopPropagation();
        item.checked = false;
        update();
      };

      chip.appendChild(remove);
      selected.appendChild(chip);
    });

    // Sincronizar con el select HTML oculto (para envío de formulario)
    Array.from(hidden.options).forEach(opt => {
      opt.selected = checked.some(chk => chk.value === opt.value);
    });
  }

  // Actualizar estado inicial
  update();
}

/**
 * Función principal que se ejecuta al cargar el DOM.
 * 
 * Realiza las siguientes operaciones:
 * 1. Carga componentes de UI (navbar, sidebar)
 * 2. Verifica la sesión del usuario
 * 3. Publica roles del usuario en el DOM
 * 4. Configura el botón de cierre de sesión
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Cargar componentes dinámicos
  await includeComponent("../includes/navbar.html", "#navbar");
  await includeComponent("../includes/sidebar.html", "#sidebar");

  try {
    // Verificar sesión del usuario
    const res = await fetch("../php/verificar_sesion.php");
    const data = await res.json();

    // Si la sesión no es válida, redirigir al login
    if (!data.success) {
      window.location.href = "../index.html";
      return;
    }

    // Mostrar nombre del usuario en la UI
    const nombreEl = document.getElementById("usuarioNombre");
    if (nombreEl) nombreEl.textContent = data.nombre;

    // Mostrar u ocultar enlace de administración según el rol
    const adminLink = document.getElementById("link_admon");
    if (adminLink) {
      data.rol === "admin"
        ? adminLink.classList.remove("d-none")
        : adminLink.classList.add("d-none");
    }

    /**
     * Publica los roles del usuario en el DOM para que otros scripts puedan acceder a ellos.
     * 
     * Los roles se publican en:
     * - Atributo data-role del body
     * - Meta tag user-roles
     * - Variable global window.USER_ROLES
     * 
     * Esto permite que scripts como role_guard_agronomia.js, verificacion_icons.js
     * y otros puedan verificar permisos sin hacer peticiones adicionales al servidor.
     */
    (function publishRoles(){
      const body = document.body;
      if (!body) return;
      const raw = String(data.rol || '').toLowerCase();

      const roles = new Set();

      // Normalizar nombres de roles a los estándares usados en los scripts del módulo
      if (raw.includes('admin')) roles.add('administrador');
      if (raw.includes('aux')) roles.add('aux_agronomico');

      // Si el backend devuelve un array data.roles, procesarlo también
      if (Array.isArray(data.roles)) {
        data.roles.forEach(r => {
          const s = String(r || '').toLowerCase().trim();
          if (s) roles.add(s);
          if (s.includes('admin')) roles.add('administrador');
          if (s.includes('aux')) roles.add('aux_agronomico');
        });
      }

      const rolesStr = Array.from(roles).join(',');
      if (rolesStr) {
        // Publicar en atributo data-role del body
        body.setAttribute('data-role', rolesStr);
        
        // Publicar en meta tag para acceso desde verificacion_icons.js y otros
        let meta = document.querySelector('meta[name="user-roles"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'user-roles');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', rolesStr);
        
        // Publicar en variable global (fallback)
        window.USER_ROLES = Array.from(roles);
      }
    })();

    // Configurar botón de cierre de sesión
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        fetch("../php/logout.php", {
          method: "GET",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
          .then(() => window.location.href = "../index.html")
          .catch(() => alert("No se pudo cerrar la sesión"));
      });
    }

  } catch (error) {
    console.error("Error al verificar la sesión:", error);
    window.location.href = "../index.html";
  }
});