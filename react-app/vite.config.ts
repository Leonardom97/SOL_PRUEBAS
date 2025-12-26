import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/php': {
        target: 'http://localhost/php',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/php/, '')
      },
      // Proxy for legacy modules - Target root to avoid path duplication (/m_admin/x -> localhost/m_admin/x)
      '/m_admin': { target: 'http://localhost', changeOrigin: true },
      '/m_agronomia': { target: 'http://localhost', changeOrigin: true },
      '/m_bascula': { target: 'http://localhost', changeOrigin: true },
      '/m_capacitaciones': { target: 'http://localhost', changeOrigin: true },
      '/m_laboratorio': { target: 'http://localhost', changeOrigin: true },
      '/m_logistica': { target: 'http://localhost', changeOrigin: true },
      '/m_porteria': { target: 'http://localhost', changeOrigin: true },
      '/m_remision': { target: 'http://localhost', changeOrigin: true },
      '/assets': { target: 'http://localhost', changeOrigin: true },
    }
  }
})
