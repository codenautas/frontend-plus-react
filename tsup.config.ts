import { defineConfig } from 'tsup';

/**
 * Build de la librería.
 * - Las dependencias y peerDependencies del package.json quedan externas automáticamente
 *   (las resuelve el bundler de la aplicación que use la librería).
 * - sourcemap con sourcesContent: el código fuente viaja dentro del .map, así que en F12
 *   se ven los .ts/.tsx originales aunque el paquete publique solo dist/.
 * - Sin splitting: hay una sola entrada y con splitting el .map del formato CJS sale roto
 *   (apunta al propio index.cjs y sin contenido).
 */
export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    target: 'es2020',
});
