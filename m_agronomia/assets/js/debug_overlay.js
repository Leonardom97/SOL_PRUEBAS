/**
 * debug_overlay.js
 * Herramienta visual de depuración superpuesta.
 * Muestra logs en pantalla y analiza la estructura del DOM.
 */
(function () {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '10px';
    div.style.right = '10px';
    div.style.backgroundColor = 'rgba(0,0,0,0.8)';
    div.style.color = '#00ff00';
    div.style.padding = '20px';
    div.style.zIndex = '99999';
    div.style.fontFamily = 'monospace';
    div.style.maxWidth = '400px';
    div.style.maxHeight = '80vh';
    div.style.overflow = 'auto';
    div.innerHTML = '<h3>Debug Info</h3><button onclick="this.parentElement.remove()">X</button><div id="debug-log"></div>';
    document.body.appendChild(div);

    function log(msg) {
        (function () {
            const div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.bottom = '10px';
            div.style.right = '10px';
            div.style.backgroundColor = 'rgba(0,0,0,0.8)';
            div.style.color = '#00ff00';
            div.style.padding = '20px';
            div.style.zIndex = '99999';
            div.style.fontFamily = 'monospace';
            div.style.maxWidth = '400px';
            div.style.maxHeight = '80vh';
            div.style.overflow = 'auto';
            div.innerHTML = '<h3>Debug Info</h3><button onclick="this.parentElement.remove()">X</button><div id="debug-log"></div>';
            document.body.appendChild(div);

            function log(msg) {
                const d = document.getElementById('debug-log');
                if (d) d.innerHTML += `<div>> ${msg}</div>`;
                console.log('[DEBUG-OVERLAY]', msg);
            }

            setTimeout(() => {
                log('Verificando Elementos...');
                log('--- FASE DE DIAGNOSTICO 2 ---');

                // 1. Contar total de secciones
                const allSections = document.querySelectorAll('section');
                log(`Total elementos <section> en DOM: ${allSections.length}`);

                // 2. Contar .md-table-card
                const cards = document.querySelectorAll('.md-table-card');
                log(`Total elementos .md-table-card: ${cards.length}`);

                if (cards.length > 0) {
                    log('IDs encontrados en .md-table-card:');
                    cards.forEach(c => log(` - "${c.id}" (Display: ${c.style.display})`));
                } else {
                    log('CRÍTICO: ¡No se encontraron elementos .md-table-card en el DOM!');

                    // 3. Volcar contenedor padre
                    const main = document.querySelector('main');
                    if (main) {
                        log(`Contenedor principal encontrado. Hijos: ${main.children.length}`);
                        log(`Primera etiqueta hija: ${main.firstElementChild ? main.firstElementChild.tagName : 'NINGUNA'}`);
                    } else {
                        log('CRÍTICO: ¡Etiqueta <main> no encontrada!');
                    }
                }

                const tabs = [
                    'mantenimientos',
                    'cosecha-fruta',
                    'oficios-varios-palma',
                    'fertilizacion-organica',
                    'monitoreos-generales'
                ];

                tabs.forEach(key => {
                    const id = 'tab-content-' + key;
                    const el = document.getElementById(id);
                    if (el) {
                        const style = window.getComputedStyle(el);
                        log(`${key}: ENCONTRADO. Display: ${style.display}. Visibility: ${style.visibility}. Height: ${style.height}`);
                        // Verificar tabla
                        const table = el.querySelector('table');
                        if (table) {
                            const tbody = table.querySelector('tbody');
                            log(`  -> Tabla Encontrada. Filas: ${tbody ? tbody.children.length : 'Sin TBODY'}`);
                        } else {
                            log(`  -> NO SE ENCONTRÓ TABLA dentro de la sección`);
                        }
                    } else {
                        log(`${key}: NO ENCONTRADO (ID: ${id})`);
                    }
                });

                const activeBtn = document.querySelector('.md-tab-btn.active');
                if (activeBtn) {
                    log(`Botón Activo: ${activeBtn.dataset.tab}`);
                } else {
                    log('Ningún Botón Activo');
                }

            }, 3000); // Esperar 3s para inicio
        })();
    }
    // Exponer log globalmente si es necesario
    window.debugLog = log;
})();
