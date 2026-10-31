import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { previewHostnames } from './src/tenancy/environment.js';

// Use Vercel's actual deployment target rather than an editable public env var.
const deploymentEnvironment = process.env.VERCEL_ENV === 'development' ? 'local' : process.env.VERCEL_ENV || 'local';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEPLOYMENT_ENV': JSON.stringify(deploymentEnvironment),
    'import.meta.env.VITE_PREVIEW_HOSTS': JSON.stringify(previewHostnames(deploymentEnvironment, [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL])),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          charts: ['recharts'],
        },
      },
    },
  },
});
