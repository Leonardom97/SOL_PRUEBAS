/**
 * assets/js/agronomia.js
 *
 * Este archivo contiene la lógica de integración mínima para:
 * - Detectar secciones .md-table-card con id "tab-content-..." y
 *   añadir pestañas/claves en la barra y en el selector modal,
 *   clonando la estructura existente para no romper el diseño.
 * - Proveer un fallback robusto que, al activar una pestaña:
 *   * muestre/oculte la sección correspondiente
 *   * marque visualmente la pestaña como active
 *   * intente llamar funciones de re-inicialización conocidas
 *   * ejecute window.updateVerifIcons() si existe
 *   * despache un evento custom 'agro-tab-shown' y un 'resize' global
 *
 * NOTA IMPORTANTE:
 * - Este archivo actúa como capa no intrusiva. Si tienes una versión
 *   existente de agronomia.js con más lógica, integra (merge) manualmente
 *   las funciones de este archivo en ella, o reemplaza sólo la parte final.
 *
 * Uso:
 * - Guardar en assets/js/agronomia.js y asegurarse de que se cargue
 *   después del HTML principal y antes de material-super.js (o al final).
 */

(function(){
  'use strict';

  // Lista de nombres de funciones de inicialización que intentaremos llamar
  // cuando el usuario active una pestaña (no modifica CSS ni HTML).
  var INIT_NAMES = [
    'initMaterialTabs','initTabs','initTabsUI','initMaterialUI',
    'initMDTabs','materialTabsInit','initTabsGroup'
  ];

  function tryCall(name){
    try{
      var fn = window[name];
      if(typeof fn === 'function'){
        console.debug('[agronomia] intentando llamar a', name);
        try { fn(); } catch(e){ console.warn('[agronomia] error ejecutando', name, e); }
        return true;
      }
    }catch(e){}
    return false;
  }

  // Lógica para clonar/crear pestañas y checks sin romper estilos
  function ensureTabsAndChecks(){
    var tabsGroup = document.getElementById('tabsGroup');
    var checksContainer = document.getElementById('tabSelectorChecks');
    if(!tabsGroup || !checksContainer){
      console.warn('[agronomia] #tabsGroup o #tabSelectorChecks no encontrados');
      return;
    }

    // Plantillas: tomamos la primera .md-tab y el primer label para clonar
    var tabTemplate = tabsGroup.querySelector('.md-tab') || null;
    var checkTemplate = checksContainer.querySelector('label') || null;

    // Devuelve iconHTML y title desde .md-table-title dentro de la sección
    function textOfTitle(section){
      var titleEl = section.querySelector('.md-table-title');
      if(titleEl){
        var icon = titleEl.querySelector('i');
        var iconHTML = icon ? icon.outerHTML + ' ' : '';
        var t = (titleEl.textContent || '').trim();
        if(!t) t = section.id.replace(/^tab-content-/, '').replace(/[-_]/g,' ');
        return { iconHTML: iconHTML, titleText: t };
      }
      var fallback = section.id.replace(/^tab-content-/, '').replace(/[-_]/g,' ');
      return { iconHTML: '', titleText: fallback };
    }

    // Crear/asegurar pestaña clonando plantilla si existe
    function ensureTabFor(section){
      var sid = section.id;
      if(!sid || !sid.startsWith('tab-content-')) return;
      if(tabsGroup.querySelector('[data-target="#'+sid+'"]')) return;

      var info = textOfTitle(section);
      var newTab;
      if(tabTemplate){
        newTab = tabTemplate.cloneNode(true);
        if(newTab.id) newTab.id = '';
        // actualizar icon y texto respetando la estructura existente
        var iEl = newTab.querySelector('i');
        var spanEl = newTab.querySelector('span');
        if(info.iconHTML){
          if(iEl){
            var wrapper = document.createElement('span');
            wrapper.innerHTML = info.iconHTML;
            iEl.replaceWith(wrapper.firstChild);
          } else {
            newTab.innerHTML = info.iconHTML + (spanEl ? spanEl.outerHTML : ('<span>' + info.titleText + '</span>'));
          }
        } else {
          if(iEl) iEl.remove();
        }
        if(spanEl) spanEl.textContent = info.titleText;
        else newTab.innerHTML = (info.iconHTML || '') + '<span>' + info.titleText + '</span>';
      } else {
        newTab = document.createElement('button');
        newTab.className = 'md-tab';
        newTab.innerHTML = (info.iconHTML || '') + '<span>' + info.titleText + '</span>';
      }
      newTab.setAttribute('data-target', '#'+sid);
      tabsGroup.appendChild(newTab);
      console.debug('[agronomia] pestaña añadida:', sid);
    }

    // Crear/asegurar checkbox clonando plantilla si existe
    function ensureCheckFor(section){
      var sid = section.id;
      if(!sid || !sid.startsWith('tab-content-')) return;
      if(checksContainer.querySelector('[data-target="#'+sid+'"]')) return;

      var info = textOfTitle(section);
      var newLabel;
      if(checkTemplate){
        newLabel = checkTemplate.cloneNode(true);
        // actualizar checkbox dentro del label
        var cb = newLabel.querySelector('input[type="checkbox"]');
        if(cb){
          if(cb.id) cb.id = '';
          cb.checked = true;
          cb.setAttribute('data-target', '#'+sid);
          if(cb.name) cb.name = '';
          if(cb.value) cb.value = '';
        } else {
          var input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = true;
          input.setAttribute('data-target', '#'+sid);
          newLabel.insertBefore(input, newLabel.firstChild);
        }
        // icono dentro del label
        var iEl = newLabel.querySelector('i');
        if(iEl && info.iconHTML){
          var wrapper = document.createElement('span');
          wrapper.innerHTML = info.iconHTML;
          iEl.replaceWith(wrapper.firstChild);
        } else if(iEl && !info.iconHTML){
          iEl.remove();
        } else if(info.iconHTML && !iEl){
          var cbNode = newLabel.querySelector('input[type="checkbox"]');
          var spanWrapper = document.createElement('span');
          spanWrapper.innerHTML = info.iconHTML;
          if(cbNode) cbNode.insertAdjacentElement('afterend', spanWrapper.firstChild);
        }
        var spanText = newLabel.querySelector('span');
        if(spanText) spanText.textContent = info.titleText;
        else newLabel.appendChild(document.createTextNode(' ' + info.titleText));
      } else {
        newLabel = document.createElement('label');
        newLabel.className = 'md-tab-selector-item';
        newLabel.innerHTML = '<input type="checkbox" checked data-target="#'+sid+'"> ' + (info.iconHTML || '') + info.titleText;
      }
      checksContainer.appendChild(newLabel);
      console.debug('[agronomia] check añadido:', sid);
    }

    // Procesar las secciones
    var sections = document.querySelectorAll('.md-table-card[id^="tab-content-"]');
    sections.forEach(function(section){
      ensureTabFor(section);
      ensureCheckFor(section);
    });
  }

  // Fallback robusto que se ejecuta cuando el usuario activa una pestaña.
  // No modifica estilos; intenta reinicializar componentes y forzar refresh.
  function onTabActivatedFallback(btn){
    try{
      var target = btn && btn.getAttribute && btn.getAttribute('data-target');
      if(target){
        document.querySelectorAll('.md-table-card').forEach(function(s){ s.style.display = 'none'; });
        var el = document.querySelector(target);
        if(el) el.style.display = 'block';
      }
      var tabsGroup = document.getElementById('tabsGroup');
      if(tabsGroup){
        tabsGroup.querySelectorAll('.md-tab').forEach(function(b){ b.classList.remove('active'); });
        if(btn) btn.classList.add('active');
      }

      // 1) Intentar llamar a inicializadores conocidos
      for(var i=0;i<INIT_NAMES.length;i++){
        if(tryCall(INIT_NAMES[i])) break;
      }

      // 2) Forzar re-pintado de iconos/pendientes si existe la función
      if(window.updateVerifIcons) try { window.updateVerifIcons(); } catch(e) { console.warn('[agronomia] updateVerifIcons error', e); }

      // 3) Despachar evento custom 'agro-tab-shown' y evento 'resize'
      if(target){
        var section = document.querySelector(target);
        if(section){
          try{
            var ev = new Event('agro-tab-shown', { bubbles: true, cancelable: false });
            section.dispatchEvent(ev);
            window.dispatchEvent(new Event('resize'));
          }catch(e){ /* ignore */ }
        }
      }

      // 4) Intento conservador de ejecutar alguna función global de reload/refresh
      try {
        Object.keys(window).some(function(k){
          try{
            if(/reload|refresh|reinit/i.test(k) && typeof window[k] === 'function' && k.length < 40){
              return tryCall(k); // si retorna true, some() dejará de iterar
            }
          }catch(e){}
          return false;
        });
      }catch(e){ /* ignore */ }

    }catch(err){
      console.error('[agronomia] fallback onTabActivated error', err);
    }
  }

  // Delegado global: si el sistema ya maneja clicks en .md-tab, nuestro delegado no interfiere
  function attachDelegationFallbacks(){
    // Click en pestañas
    document.addEventListener('click', function(e){
      var btn = e.target.closest && e.target.closest('.md-tab');
      if(!btn) return;
      // Ejecutar fallback asincrónico (dejar que otros handlers corran primero)
      setTimeout(function(){ onTabActivatedFallback(btn); }, 40);
    }, true);

    // Cambios en checkbox del selector de pestañas
    document.addEventListener('change', function(e){
      var cb = e.target;
      if(!cb || !cb.matches || !cb.matches('input[type="checkbox"][data-target]')) return;
      var targetSel = cb.getAttribute('data-target');
      var el = document.querySelector(targetSel);
      if(el) el.style.display = cb.checked ? 'block' : 'none';
      // sincronizar active si la pestaña oculta estaba activa
      if(!cb.checked){
        var tabsGroup = document.getElementById('tabsGroup');
        if(tabsGroup){
          var tabBtn = tabsGroup.querySelector('[data-target="'+targetSel+'"]');
          if(tabBtn && tabBtn.classList.contains('active')){
            tabBtn.classList.remove('active');
            var other = Array.from(tabsGroup.querySelectorAll('.md-tab')).find(function(b){
              var t = b.getAttribute('data-target'); var s = document.querySelector(t); return s && getComputedStyle(s).display !== 'none';
            });
            if(other) other.classList.add('active');
          }
        }
      }
    }, true);
  }

  // Inicialización en DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function(){
    try{
      ensureTabsAndChecks();
      attachDelegationFallbacks();

      // Si no existe ninguna pestaña activa, marcar la primera visible como active
      var tabsGroup = document.getElementById('tabsGroup');
      if(tabsGroup){
        var active = tabsGroup.querySelector('.md-tab.active');
        if(!active){
          var firstVisible = Array.from(tabsGroup.querySelectorAll('.md-tab')).find(function(b){
            var t = b.getAttribute('data-target'); var s = document.querySelector(t); return s && getComputedStyle(s).display !== 'none';
          });
          if(firstVisible) firstVisible.classList.add('active');
        }
      }

      console.debug('[agronomia] init completo');
    }catch(e){
      console.error('[agronomia] init error', e);
    }
  });

  // Exponer función para reintentar manualmente (si necesitas reiniciar desde consola)
  window.agroTabsInit = function(){
    try{ ensureTabsAndChecks(); }catch(e){ console.warn('[agroTabsInit] error', e); }
  };

})();