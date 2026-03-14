import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
   /*  {
      name: 'request-logger',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
          next();
        });
      },
    }, */
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
