import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/org-chart-app/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@xyflow/')) {
            return 'flow-vendor'
          }
          if (id.includes('node_modules/@dagrejs/')) {
            return 'dagre-vendor'
          }
        },
      },
    },
  },
})
