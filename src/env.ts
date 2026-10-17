// frontend-plus-react/src/config/env.ts

interface EnvVariables {
  backendUrl: string;
  // Agrega aquí cualquier otra variable de entorno que tu librería necesite
}

// Función auxiliar para obtener la variable de entorno de forma agnóstica al bundler
const getEnvVar = (key: string): string => {
  // Intenta leer de import.meta.env (Vite)
  // import.meta.env lo define Vite; la librería no depende de los tipos de vite/client
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (viteEnv) {
    const viteKey = `VITE_${key}`;
    const valor = viteEnv[viteKey];
    if (valor) {
      return valor;
    }
  }

  // Intenta leer de process.env (CRA, Node.js)
  if (typeof process !== 'undefined' && process.env) {
    const craKey = `REACT_APP_${key}`;
    if (process.env[craKey]) {
      return process.env[craKey]!; // '!' para asegurar que no es undefined después de la verificación
    }
    // También intenta sin prefijo para otros entornos Node.js (menos común para frontends)
    if (process.env[key]) {
      return process.env[key]!;
    }
  }

  // Si no se encuentra, puedes lanzar un error o devolver un valor por defecto
  console.warn(`Variable de entorno "${key}" no encontrada. Asegúrate de definirla con el prefijo correcto (VITE_ o REACT_APP_).`);
  return ''; // O lanza un error: throw new Error(`Variable de entorno ${key} no definida.`);
};

// Exporta un objeto con todas las variables de entorno que tu librería necesita
export const envConfig: EnvVariables = {
  backendUrl: getEnvVar('BACKEND_URL'),
  // Agrega aquí las demás variables siguiendo el mismo patrón
};