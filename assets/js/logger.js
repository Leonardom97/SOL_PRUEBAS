/**
 * Sistema de Logging Centralizado
 * Proporciona logging condicional basado en configuración
 * 
 * Uso:
 *   Logger.debug('[module]', 'Debug message', data);
 *   Logger.info('[module]', 'Info message');
 *   Logger.warn('[module]', 'Warning message');
 *   Logger.error('[module]', 'Error message', error);
 */

(function() {
  'use strict';
  
  // Niveles de log
  const LogLevel = {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
  };
  
  // Configuración por defecto: solo errores en producción
  // Para activar modo debug, ejecutar en consola: Logger.setLevel('DEBUG')
  let currentLevel = LogLevel.ERROR;
  
  // Buffer para logs en caso de que se necesite exportar
  const logBuffer = [];
  const MAX_BUFFER_SIZE = 100;
  
  /**
   * Logger principal
   */
  const Logger = {
    /**
     * Establecer nivel de logging
     * @param {string} level - 'NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG'
     */
    setLevel: function(level) {
      if (LogLevel[level] !== undefined) {
        currentLevel = LogLevel[level];
        console.log(`[Logger] Nivel establecido a: ${level}`);
      } else {
        console.error(`[Logger] Nivel inválido: ${level}`);
      }
    },
    
    /**
     * Obtener nivel actual
     */
    getLevel: function() {
      return Object.keys(LogLevel).find(key => LogLevel[key] === currentLevel);
    },
    
    /**
     * Log de debug (solo en modo debug)
     */
    debug: function(module, message, ...args) {
      if (currentLevel >= LogLevel.DEBUG) {
        console.log(`%c${module}`, 'color: #888', message, ...args);
        this._addToBuffer('DEBUG', module, message, args);
      }
    },
    
    /**
     * Log informativo
     */
    info: function(module, message, ...args) {
      if (currentLevel >= LogLevel.INFO) {
        console.info(`%c${module}`, 'color: #0066cc', message, ...args);
        this._addToBuffer('INFO', module, message, args);
      }
    },
    
    /**
     * Log de advertencia
     */
    warn: function(module, message, ...args) {
      if (currentLevel >= LogLevel.WARN) {
        console.warn(`%c${module}`, 'color: #ff9900', message, ...args);
        this._addToBuffer('WARN', module, message, args);
      }
    },
    
    /**
     * Log de error (siempre se muestra)
     */
    error: function(module, message, ...args) {
      if (currentLevel >= LogLevel.ERROR) {
        console.error(`%c${module}`, 'color: #cc0000; font-weight: bold', message, ...args);
        this._addToBuffer('ERROR', module, message, args);
      }
    },
    
    /**
     * Agregar al buffer interno
     */
    _addToBuffer: function(level, module, message, args) {
      // Sanitizar args para evitar problemas con objetos grandes o circulares
      let sanitizedArgs = [];
      try {
        sanitizedArgs = args.map(arg => {
          // Si es un objeto, limitarlo
          if (arg && typeof arg === 'object') {
            try {
              // Intentar stringificar para detectar referencias circulares
              JSON.stringify(arg);
              return arg;
            } catch (e) {
              // Si falla, solo guardar tipo y constructor
              return `[${arg.constructor?.name || 'Object'}]`;
            }
          }
          return arg;
        });
      } catch (e) {
        sanitizedArgs = ['[Error sanitizing args]'];
      }
      
      logBuffer.push({
        timestamp: new Date().toISOString(),
        level: level,
        module: module,
        message: message,
        args: sanitizedArgs
      });
      
      // Mantener tamaño del buffer
      if (logBuffer.length > MAX_BUFFER_SIZE) {
        logBuffer.shift();
      }
    },
    
    /**
     * Obtener historial de logs
     */
    getHistory: function() {
      return [...logBuffer];
    },
    
    /**
     * Limpiar buffer
     */
    clearHistory: function() {
      logBuffer.length = 0;
      console.log('[Logger] Historial limpiado');
    },
    
    /**
     * Exportar logs como JSON
     */
    exportLogs: function() {
      const logs = this.getHistory();
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[Logger] Logs exportados');
    }
  };
  
  // Exponer Logger globalmente
  window.Logger = Logger;
  
  // Mensajes de inicialización solo si nivel es INFO o superior
  if (currentLevel >= LogLevel.INFO) {
    console.log('%c[Logger] Sistema de logging inicializado', 'color: #00cc00; font-weight: bold');
    console.log('%c[Logger] Nivel actual: ' + Logger.getLevel(), 'color: #888');
    console.log('%c[Logger] Para cambiar nivel: Logger.setLevel("DEBUG")', 'color: #888');
    console.log('%c[Logger] Para exportar logs: Logger.exportLogs()', 'color: #888');
  }
  
})();
