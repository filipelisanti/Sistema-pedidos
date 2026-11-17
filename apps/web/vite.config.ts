import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Accesible desde el celular en la misma red Wi-Fi: http://<ip-de-tu-pc>:5173
    host: true,
    proxy: {
      // En desarrollo, /api/* va a la API de Nest (evita problemas de CORS)
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
