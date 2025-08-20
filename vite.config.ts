import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
<<<<<<< HEAD

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
=======
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  root: '.',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
<<<<<<< HEAD
      input: 'index.html'
=======
      input: path.resolve(__dirname, 'index.html')
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    }
  }
});