(function() {
  "use strict";

  var sidebar = document.querySelector('.sidebar');
  var sidebarToggles = document.querySelectorAll('#sidebarToggle, #sidebarToggleTop');

  if (sidebar) {

    // 🔒 Ocultar sidebar al inicio
    document.body.classList.add('sidebar-toggled');
    sidebar.classList.add('toggled');

    var collapseElementList = [].slice.call(document.querySelectorAll('.sidebar .collapse'));
    var sidebarCollapseList = collapseElementList.map(function (collapseEl) {
      return new bootstrap.Collapse(collapseEl, { toggle: false });
    });

    for (var toggle of sidebarToggles) {
      toggle.addEventListener('click', function(e) {
        document.body.classList.toggle('sidebar-toggled');
        sidebar.classList.toggle('toggled');

        if (!sidebar.classList.contains('toggled')) {
          for (var bsCollapse of sidebarCollapseList) {
            bsCollapse.show(); // 👉 Mostrar los menús al abrir
          }
        } else {
          for (var bsCollapse of sidebarCollapseList) {
            bsCollapse.hide(); // 👉 Ocultar los menús al cerrar
          }
        }
      });
    }

    // 🪟 Ocultar menús si pantalla es muy pequeña
    window.addEventListener('resize', function() {
      var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

      if (vw < 768) {
        for (var bsCollapse of sidebarCollapseList) {
          bsCollapse.hide();
        }
      }
    });
  }

  // 🧭 Bloquear scroll al hacer hover sobre sidebar fija
  var fixedNavigation = document.querySelector('body.fixed-nav .sidebar');

  if (fixedNavigation) {
    fixedNavigation.addEventListener('wheel', function(e) {
      var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

      if (vw > 768) {
        var e0 = e.originalEvent || e;
        var delta = e0.wheelDelta || -e0.detail;
        this.scrollTop += (delta < 0 ? 1 : -1) * 30;
        e.preventDefault();
      }
    }, { passive: false });
  }

  // 🔝 Mostrar botón scroll-to-top al hacer scroll
  var scrollToTop = document.querySelector('.scroll-to-top');

  if (scrollToTop) {
    window.addEventListener('scroll', function() {
      var scrollDistance = window.pageYOffset;

      if (scrollDistance > 100) {
        scrollToTop.style.display = 'block';
      } else {
        scrollToTop.style.display = 'none';
      }
    });
  }

})();
