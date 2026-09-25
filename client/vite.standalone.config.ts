import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Standalone dev server (no AppKit/Databricks auth needed) for local UX iteration.
// The prototype uses only in-memory synthetic data, so no backend is required.
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5199,
    strictPort: true,
    open: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
