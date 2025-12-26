# OSM - Sistema de Gestión Operacional

![OSM Logo](assets/img/Sin%20título-2.png)

Sistema web para la operación de Oleaginosas San Marcos. Incluye autenticación dual (administradores/colaboradores), panel de control y módulos para la operación agrícola, logística, capacitaciones, báscula, laboratorio y portería. El repositorio **SOL_PRUEBAS** (nombre del proyecto en GitHub) aloja el código de OSM tanto en su versión PHP/HTML tradicional como en una SPA moderna en React (Vite + TypeScript). Repositorio oficial: https://github.com/Leonardom97/SOL_PRUEBAS.

## 📋 Tabla de contenidos
- [Descripción general](#descripción-general)
- [Características principales](#características-principales)
- [Módulos disponibles](#módulos-disponibles)
- [Arquitectura y estructura](#arquitectura-y-estructura)
- [Seguridad](#seguridad)
- [Instalación y configuración](#instalación-y-configuración)
- [Aplicación React (SPA)](#aplicación-react-spa)
- [Flujos clave](#flujos-clave)
- [Despliegue](#despliegue)
- [Contacto y licencia](#contacto-y-licencia)

---

## Descripción general
OSM centraliza la operación de la empresa:
- Accesos diferenciados para colaboradores y administradores.
- Gestión de usuarios, roles y sesiones.
- Panel con KPIs (usuarios, pesadas, capacitaciones, etc.).
- Módulos específicos para agronomía, logística, laboratorio, báscula, portería y capacitaciones.

---

## Características principales
1. **Autenticación dual y control de sesiones**
   - Formularios independientes para colaboradores y administradores (`index.html`).
   - Gestión de sesiones en `php/session_manager.php` y validación en `php/verificar_sesion.php`.
2. **Panel de control central**
   - `panel.html` muestra KPIs dinámicos y navegación lateral/topbar cargada desde `includes/`.
3. **Gestión de usuarios y permisos**
   - CRUD de administradores y colaboradores en `m_admin/`.
   - API de roles y permisos (`php/permissions_api.php`, `php/roles_api.php`).
4. **Módulos operativos**
   - Capacitaciones, Agronomía, Báscula, Logística, Laboratorio y Portería con pantallas dedicadas.
5. **Conexiones a múltiples bases de datos**
   - PostgreSQL principal (`php/db_postgres.php`).
   - SQL Server opcional para sincronización de colaboradores (`php/db_sqlserver.php`, `php/sync_colaboradores.php`).

---

## Módulos disponibles
| Módulo | Entradas principales | Backend/Assets clave | Descripción breve |
| --- | --- | --- | --- |
| **Core / Panel** | `index.html`, `panel.html`, `sesiones.html`, `Usuarios.html` | `php/login_admin.php`, `php/login_colaborador.php`, `php/session_management_api.php`, `assets/js/auth_guard.js` | Login dual, guard de rutas, control de sesiones y KPIs. |
| **Administración** | `m_admin/ed_usuario.html`, `m_admin/ed_uscolaboradores.html` | `m_admin/php/usuarios_api.php`, `m_admin/php/colaboradores_api.php`, `m_admin/assets/js/usuarios.js` | Gestión de administradores, colaboradores, roles y cargos. |
| **Capacitaciones** | `m_capacitaciones/formulario.html`, `dashboard.html`, `programacion.html`, `programacion_evaluaciones.html`, `crear_evaluacion.html`, `realizar_evaluacion.html`, `mis_evaluaciones.html` | APIs en `m_capacitaciones/assets/php/` (`formulario_api.php`, `programacion_api.php`, `progreso_api.php`, etc.), JS en `m_capacitaciones/assets/js/` | Registro, programación, evaluaciones, progreso y adjuntos. |
| **Agronomía** | `m_agronomia/tb_agronomia.html`, `f_cortes.html`, `gestion_permisos_agronomia.html` | APIs y scripts en `m_agronomia/assets/` | Monitoreos agronómicos, programación de cortes, permisos por rol. |
| **Báscula** | `m_bascula/operacion_pesaje.html`, `reportes_pesaje.html` | `m_bascula/assets/` | Registro de pesajes y reportes. |
| **Logística** | `m_logistica/programacion.html`, `remision.html` | `m_logistica/assets/` | Programación logística y remisiones. |
| **Laboratorio** | `m_laboratorio/datos_tanques.html`, `formulario_calidad.html` | `m_laboratorio/assets/` | Seguimiento de tanques y control de calidad. |
| **Portería** | `m_porteria/control_acceso.html`, `inventario.html` | `m_porteria/assets/` | Control de accesos y registro de inventario en portería. |

---

## Arquitectura y estructura
```
.
├── assets/               # Bootstrap, fuentes, imágenes, JS compartido (login, navbar, sidebar, auth_guard, logger)
├── includes/             # Componentes HTML reutilizables (navbar, sidebar, modales)
├── php/                  # Servicios compartidos: auth, sesiones, permisos, seguridad, conexiones DB
├── m_admin/              # Módulo de administración (HTML, JS, APIs)
├── m_capacitaciones/     # Formularios, programación, evaluaciones y dashboards de capacitación
├── m_agronomia/          # Tablas y formularios agronómicos con APIs especializadas
├── m_bascula/            # Operación y reportes de báscula
├── m_logistica/          # Programación logística y remisiones
├── m_laboratorio/        # Tableros de tanques y control de calidad
├── m_porteria/           # Control de acceso e inventario de portería
├── deployment/           # Ejemplos de configuración (nginx, systemd) y SQL de seguridad
├── excel/                # Plantillas y referencias operativas
├── react-app/            # SPA en Vite + React + TypeScript
└── panel.html / index.html / sesiones.html / Usuarios.html
```

Backend en PHP (MVC ligero) con endpoints REST, frontend clásico en HTML/JS y una SPA moderna en React para nuevas vistas.

---

## Seguridad
- **CSRF y sesiones seguras:** `php/csrf_protection.php`, `php/secure_session.php`, `php/get_csrf_token.php`.
- **Rate limiting y anti-bruteforce:** `php/rate_limiter.php`.
- **Cabeceras y codificación segura:** `php/security_headers.php`, `php/output_encoder.php`, `php/input_validator.php`.
- **Control de permisos:** `php/permissions_api.php`, `php/role_check.php`, `php/debug_permissions.php`.
- **Variables de entorno:** cargadas desde `.env` vía `php/config.php` (nunca versionar credenciales).

---

## Instalación y configuración
### Requisitos
- PHP >= 8.1 (probado en 8.1 y 8.2) con extensiones `pdo_pgsql` y `sqlsrv` (opcional). Ajusta la versión en la ruta de PHP-FPM del servidor web (ej. `php8.1-fpm.sock`, `php8.2-fpm.sock`, etc.). La SPA en React es independiente de la versión de PHP.
- PostgreSQL (base principal) y SQL Server si se requiere sincronización.
- Servidor web (Apache/Nginx) con soporte PHP-FPM.
- Node 18+ para la SPA React (opcional pero recomendado).

### Pasos
1. **Clonar el repositorio (código de OSM)**
   ```bash
   git clone https://github.com/Leonardom97/SOL_PRUEBAS.git
   cd SOL_PRUEBAS
   ```
2. **Configurar variables de entorno (.env en la raíz)**
   ```env
   DB_PG_HOST=localhost
   DB_PG_PORT=5432
   DB_PG_NAME=osm2
   DB_PG_USER=postgres
   DB_PG_PASSWORD=CHANGE_ME

   # Opcional: sincronización con SQL Server
   DB_SQLSRV_HOST=
   DB_SQLSRV_PORT=1433
   DB_SQLSRV_NAME=
   DB_SQLSRV_USER=
   DB_SQLSRV_PASSWORD=

   SESSION_TIMEOUT=3600
   UPLOAD_MAX_SIZE=5242880
   ENABLE_DEBUG=false
   ```
3. **Configurar PHP**
   - Los conectores leen del `.env` usando `php/config.php`.
   - Reforzar permisos en carpetas de subida (si se usan) y denegar ejecución de `.php` en ellas.
4. **Servidor web**
   - Usar el ejemplo `deployment/nginx/osm-web.conf` como punto de partida (HTTPS, headers de seguridad, restricciones de rutas).
   - Hay una unidad de ejemplo `deployment/systemd/osm-web.service` para PHP-FPM/nginx.
5. **Base de datos**
   - Ajustar esquema según tu instancia. El SQL `deployment/security_migration.sql` contiene endurecimiento básico (roles/permisos).
6. **Front clásico**
   - Servir la raíz del proyecto desde el servidor web (`index.html` como login y `panel.html` como dashboard).

---

## Aplicación React (SPA)
La carpeta `react-app/` contiene una SPA con rutas equivalentes a los módulos principales (login, panel, portería, báscula, capacitaciones, agronomía, logística y laboratorio).

Scripts principales:
```bash
cd react-app
npm ci            # instalación reproducible (usa npm install para trabajo local)
npm run dev       # entorno de desarrollo (http://localhost:5173)
npm run lint      # ESLint
npm run build     # build a /react-app/dist
```
El build generado puede servirse de forma estática (nginx) o integrarse al servidor PHP según el flujo de despliegue que prefieras.

---

## Flujos clave
- **Autenticación y sesiones:** `assets/js/login.js` y `php/login_admin.php` / `php/login_colaborador.php` validan credenciales, crean sesión y redirigen a `panel.html`. `php/verificar_sesion.php` protege rutas y `assets/js/auth_guard.js` aplica permisos en el frontend.
- **Capacitaciones:** formularios y programación en `m_capacitaciones/`, APIs en `m_capacitaciones/assets/php/` para registro, progreso, notificaciones y evaluaciones.
- **Agronomía:** tablas y formularios en `m_agronomia/` para monitoreos y programación de cortes, con permisos configurables.
- **Báscula y logística:** captura de pesajes (`m_bascula/`) y programación/remisiones (`m_logistica/`) con reportes asociados.
- **Laboratorio y portería:** tableros de tanques/calidad (`m_laboratorio/`) y control de acceso/inventario (`m_porteria/`).

---

## Despliegue
- **Nginx:** plantilla en `deployment/nginx/osm-web.conf` (HTTPS, cache de estáticos, bloqueo de rutas sensibles).
- **Systemd:** ejemplo `deployment/systemd/osm-web.service` para levantar la aplicación.
- **SQL de seguridad:** `deployment/security_migration.sql` para roles/privilegios base en la base de datos.

---

## Contacto y licencia
- **Desarrollado para:** Oleaginosas San Marcos  
- **Año:** 2025  
- **Versión de referencia:** 1.0.0

© OSM 2025 - Todos los derechos reservados.
