import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const isProd = process.env.NODE_ENV === 'production';
const enableSourceMap = !!process.env.VITE_SOURCEMAP; // mets VITE_SOURCEMAP=1 pour build avec sourcemap
const n8nProxyTarget = 'https://n8n.myconfort.fr';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // Dev: accessible depuis l'iPad
  server: {
    host: true,        // 0.0.0.0
    port: 5173,
    strictPort: true,
    // Utile si l'iPad ne met pas à jour en HMR derrière la box :
    // hmr: { clientPort: 5173 },
    // Pour activer https local (si besoin de PWA/secure context) :
    // https: true, // nécessite cert (mkcert)
    proxy: {
      // Proxy N8N: /api/n8n -> https://.../webhook
      '/api/n8n': {
        target: n8nProxyTarget,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom']
  },

  preview: {
    host: true,
    port: 5173,
    strictPort: true,
  },

  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: enableSourceMap,
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000, // evite faux positifs avec libs PDF
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdf: ['jspdf', 'html2canvas'],
          // ajoute ici d'autres gros paquets si besoin (dexie, etc.)
          // db: ['dexie'],
        },
      },
    },
  },

  esbuild: {
    // En prod, on peut retirer console/debugger (désactive si tu veux garder les logs)
    drop: isProd ? ['console', 'debugger'] : [],
  },
});
