import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: 'frontend',
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: [
      { find: '$lib', replacement: path.resolve(__dirname, 'frontend/src/lib') },
      // Grafa svelte : forcer l'entrée client de Svelte (vitest charge les modules
      // de test dans un graphe SSR où 'svelte' résout vers l'entrée serveur, ce qui
      // fait lever "mount() is not available on the server").
      { find: /^svelte\/internal/, replacement: path.resolve(__dirname, 'node_modules/svelte/src/internal') },
      { find: /^svelte$/, replacement: path.resolve(__dirname, 'node_modules/svelte/src/index-client.js') },
    ],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,svelte}', 'test/**/*.{test,spec}.{js,ts}'],
    globals: true,
    setupFiles: ['./test/vitest-setup.js'],
  },
});
