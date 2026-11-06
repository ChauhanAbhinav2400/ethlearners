import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.VITE_PORT||5173), strictPort: true, proxy: { '/api': process.env.BACKEND_ORIGIN||'http://localhost:3001' } },
  test: { environment: 'jsdom', setupFiles: ['./src/tests/setup.ts'], css: false },
});
