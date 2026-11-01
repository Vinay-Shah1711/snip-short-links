import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app (5173) talks to the API (5000) through this proxy,
// so you never fight with CORS while coding.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
