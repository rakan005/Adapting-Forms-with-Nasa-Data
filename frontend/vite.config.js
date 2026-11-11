import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Adapting-Forms-with-Nasa-Data/',
  build: { rollupOptions: { output: { manualChunks(id) {
    if (!id.includes('node_modules')) return
    if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
    if (id.includes('/jspdf/')) return 'pdf'
    if (id.includes('/lucide-react/')) return 'icons'
    return 'vendor'
  } } } }
})
