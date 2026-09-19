import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('xlsx')) return 'xlsx-reader';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('/firebase/auth/')) return 'firebase-auth';
          if (id.includes('/firebase/firestore/')) return 'firebase-firestore';
          if (id.includes('/firebase/app/')) return 'firebase-app';
          if (id.includes('/firebase/')) return 'firebase-shared';
          if (id.includes('react')) return 'react-vendor';
        },
      },
    },
  },
});
