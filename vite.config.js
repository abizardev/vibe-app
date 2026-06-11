import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://abizarrr19-flow-backend.hf.space',
        changeOrigin: true,
      },
    },
  },
})

