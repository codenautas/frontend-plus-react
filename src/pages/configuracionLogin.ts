// El enlace «me olvidé la clave» del login es opcional: la aplicación lo enciende (prop `recuperarClave` de `App`).
// El servidor sirve esa página él mismo (`login.forget.urlPath` de backend-plus, `/new-pass` por omisión): esto es un enlace a ella.
const RUTA_POR_OMISION = '/new-pass';

let rutaDeRecuperarClave: string | null = null;

export const configurarRecuperarClave = (recuperarClave: boolean | string | undefined): void => {
    rutaDeRecuperarClave = recuperarClave === true ? RUTA_POR_OMISION : typeof recuperarClave === 'string' && recuperarClave !== '' ? recuperarClave : null;
};

/** La ruta, dentro del backend, de la página para recuperar la clave; `null` si la aplicación no la ofrece. */
export const rutaParaRecuperarClave = (): string | null => rutaDeRecuperarClave;
