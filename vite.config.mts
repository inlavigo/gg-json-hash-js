// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'gg-json-hash',
      fileName: (format) => `gg-json-hash.${format}.js`,
      formats: ['es', 'cjs', 'umd'],
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
  },
});
