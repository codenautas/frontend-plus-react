// Cómo se ejecuta una wScreen de backend-plus, igual que `showPage` de my-menu.js
import type { DefinicionPantallaBP, MyOwnBP, PantallaBP } from './clienteBP';

export interface PantallaResuelta {
    definicion: DefinicionPantallaBP;
    ejecutar: PantallaBP;
}

/** Ruta de las pantallas de backend-plus dentro de la aplicación: se parece a la página de BP (`<base-url>/menu#w=...`) */
export const RUTA_PANTALLA_BP = '/bp/menu';

/** La ruta de una pantalla de backend-plus con sus parámetros, en el formato de dirección de BP (`#w=<pantalla>&...`) */
export function rutaDePantallaBP(nombre: string, parametros: string = ''): string {
    const resto = parametros.replace(/^[#?]/, '').replace(/(^|&)w=[^&]*/, '').replace(/^&/, '');
    return `${RUTA_PANTALLA_BP}#w=${encodeURIComponent(nombre)}${resto ? `&${resto}` : ''}`;
}

/**
 * Las direcciones de backend-plus a las que apunta lo que él arma (el botón «proceder» de una wScreen con parámetros, los
 * vínculos de la ayuda, `location.href = 'login'` al vencer la sesión): son páginas del backend y recargan todo. Dentro de
 * esta aplicación hay que quedarse en ella: devuelve la ruta equivalente, o null si la dirección es de otra cosa.
 */
export function rutaDeEnlaceBP(href: string, baseDelDocumento: string, urlBackend: string): string | null {
    const enlace = new URL(href, baseDelDocumento);
    const base = `${urlBackend.replace(/\/*$/, '/')}`;
    const pagina = (nombre: string) => new URL(`${base}${nombre}`, baseDelDocumento);
    if (enlace.origin !== pagina('menu').origin) return null;
    if (enlace.pathname === pagina('login').pathname) return '/login';
    if (enlace.pathname === pagina('logout').pathname) return '/logout';
    if (enlace.pathname !== pagina('menu').pathname) return null;
    const texto = (enlace.hash || enlace.search).slice(1);
    const nombre = new URLSearchParams(texto).get('w');
    return nombre ? rutaDePantallaBP(nombre, texto) : null;
}

/** La función que dibuja la pantalla, o null si backend-plus no la tiene (o no tiene cómo dibujarla) */
export function resolverPantallaBP(myOwn: MyOwnBP, nombre: string, contenedor: HTMLElement): PantallaResuelta | null {
    const registrada = myOwn.wScreens[nombre];
    if (!registrada) return null;
    if (typeof registrada === 'function') {
        return { definicion: { mainFunction: registrada }, ejecutar: registrada };
    }
    if (registrada.mainFunction) {
        return { definicion: registrada, ejecutar: registrada.mainFunction };
    }
    const { parameters, mainAction, resultClass, proceedLabel } = registrada;
    const procAux = myOwn.wScreens.procAux;
    const mostrarParametros = typeof procAux === 'object' ? procAux.showParams : undefined;
    if (parameters && mostrarParametros) {
        return {
            definicion: registrada,
            ejecutar: parametros => mostrarParametros({ parameters, resultClass, proceedLabel }, contenedor, parametros, mainAction),
        };
    }
    return null;
}
