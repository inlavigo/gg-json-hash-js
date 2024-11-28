import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Wenn du globale Funktionen wie "describe" und "it" verwenden möchtest
    environment: 'jsdom', // Standardumgebung für Tests
    exclude: [...configDefaults.exclude], // Tests ausschließen (optional)
    coverage: {
      provider: 'istanbul', // c8 Oder 'istanbul', wenn du Coverage möchtest
    },
  },
});
