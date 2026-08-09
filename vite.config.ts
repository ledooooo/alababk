import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const version = Date.now().toString();

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-sw-version',
        transformIndexHtml(html) {
          return html.replace(
            '</head>',
            `<script>window.__SW_VERSION__ = '${version}';</script></head>`
          );
        },
      },
    ],
    define: {
      __SW_VERSION__: JSON.stringify(version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/src/components/views/admin/')) return 'admin-views';
            if (
              id.includes('/src/components/views/finance/') ||
              id.includes('/src/components/views/supervisor/') ||
              id.includes('/src/components/views/orders/')
            ) {
              return 'finance-ops-views';
            }
            if (id.includes('/src/components/views/store/')) return 'store-views';
            if (id.includes('/src/components/views/delivery/')) return 'delivery-views';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
              return 'charts-vendor';
            }
            if (id.includes('node_modules/lucide-react')) return 'icons-vendor';
            if (id.includes('node_modules/leaflet')) return 'leaflet-vendor';
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});