# OSM - Portal web de gestión operativa

Aplicación web en español para la operación de Oleaginosas San Marcos (OSM). Incluye autenticación de colaboradores y administradores, panel principal y múltiples módulos funcionales (agrónomía, logística, báscula, laboratorio, portería, capacitaciones y administración).

## Estructura principal
- `index.html`: pantalla de login para colaboradores y administradores.
- `panel.html`: tablero principal con KPI y acceso al menú lateral dinámico.
- `assets/`: estilos (Bootstrap, overrides), íconos e interactividad en JS (auth guard, logger, efectos de login, etc.).
- `includes/`: fragmentos HTML reutilizables (navbar, sidebar, gestión de roles y configuración visual).
- `php/`: APIs y utilidades del backend (conexión a PostgreSQL/SQL Server, login, gestión de sesiones, roles/permisos, sincronización de colaboradores, configuración visual `web_main_api`, subida de archivos y protección CSRF).
- Módulos de negocio:
  - `m_admin/`: administración de usuarios y colaboradores.
  - `m_agronomia/`, `m_logistica/`, `m_bascula/`, `m_laboratorio/`, `m_porteria/`: vistas específicas por área.
  - `m_capacitaciones/`: creación y programación de evaluaciones, formularios e informes.
- Otros directorios:
  - `excel/`: exportaciones.
  - `logs/`: salida de errores/actividad.
  - `deployment/`: plantillas para nginx y systemd.
  - `sesiones.html`: gestión y monitoreo de sesiones.

## Requisitos
- PHP 8.1+ con:
  - Extensiones: `pdo_pgsql` (principal), `json`, `session` habilitadas y `fileinfo` para validación de archivos.
  - Extensión opcional: `sqlsrv` si se usa SQL Server.
- Servidor web (nginx recomendado) o servidor embebido de PHP para desarrollo.
- Base de datos PostgreSQL (valores por defecto definidos en `php/config.php`) y, si aplica, SQL Server para sincronizaciones.

## Configuración
1. Cree un archivo `.env` en la raíz con las variables necesarias (se cargan en `php/config.php`):
   ```env
   DB_PG_HOST=localhost
   DB_PG_PORT=5432
   DB_PG_NAME=web_osm
   DB_PG_USER=postgres
   DB_PG_PASSWORD=YOUR_DB_PASSWORD
   SESSION_TIMEOUT=3600
   UPLOAD_MAX_SIZE=5242880
   ENABLE_DEBUG=false
   ```
2. Configure sus credenciales en `.env`; `php/config.php` las carga y son usadas por `php/db_postgres.php` y `php/db_sqlserver.php`. Modifique esos archivos solo si requiere lógica adicional.
3. Defina en su `.env` el nombre de la base (`web_osm` por defecto según `php/config.php`) acorde a su entorno.
   - En producción, haga una copia de seguridad de los archivos de configuración antes de modificarlos.
4. Asegúrese de otorgar permisos de escritura al directorio `logs/` si se usa en producción.
   - Ejemplo: `chmod 750 logs`
   - Propietario sugerido: usuario del servidor web (p. ej. `www-data`).

## Ejecución local rápida
```bash
cd /path/to/osm-portal
php -S 0.0.0.0:8000
```
Abra `http://localhost:8000` para acceder al login. Los recursos PHP requieren sesiones habilitadas y las extensiones indicadas.

## APIs y endpoints relevantes (`php/`)
- Autenticación y sesiones: `login_admin.php`, `login_colaborador.php`, `session_manager.php`, `session_management_api.php`, `logout.php`, `logout_session.php`.
- Roles y permisos: `roles_api.php`, `permissions_api.php`, `role_check.php`, `debug_permissions.php`.
- Configuración visual y uploads: `web_main_api.php`, `web_main_upload.php`.
- Sincronización y utilidades: `sync_colaboradores.php`, `funciones_sync.php`, `list_tables.php`, `list_columns.php`, `list_situacion.php`.

## Despliegue
- `deployment/nginx/osm-web.conf`: ejemplo de sitio con HTTPS, cabeceras de seguridad, límites de subida y bloqueo de acceso a `.env`, `logs` y archivos sensibles.
- `deployment/nginx/deploy.sh`: script base para aplicar la configuración nginx.
- `deployment/systemd/osm-web.service`: unidad systemd que valida la existencia de `.env` y del directorio `logs/` antes de iniciar el servicio gestionado por nginx/php-fpm.

## Buenas prácticas
- No incluya credenciales en el repositorio; use `.env` y permisos de archivo adecuados.
- Mantenga deshabilitado `ENABLE_DEBUG` en producción.
- Revise los módulos bajo `includes/` para extender navegación y roles antes de crear nuevas vistas.
