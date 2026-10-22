// Prefijo de las rutas de la aplicación cuando no está en la raíz del sitio (por ejemplo `/ggs2026/react` cuando la sirve
// el propio backend). Lo define el bundler de la aplicación (`base` de Vite); sin prefijo es una cadena vacía.
const baseDelBundler: string = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.BASE_URL ?? '/';

export const rutaBase: string = baseDelBundler.replace(/\/+$/, '');
