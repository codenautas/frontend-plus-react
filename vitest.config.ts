import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
        // los .css que importan los componentes no hacen falta en los tests
        css: false,
        setupFiles: ['src/test/preparacion.ts'],
    },
});
