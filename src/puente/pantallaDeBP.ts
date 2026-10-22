// Cómo se ejecuta una wScreen de backend-plus, igual que `showPage` de my-menu.js
import type { DefinicionPantallaBP, MyOwnBP, PantallaBP } from './clienteBP';

export interface PantallaResuelta {
    definicion: DefinicionPantallaBP;
    ejecutar: PantallaBP;
}

/**
 * Los enlaces de backend-plus entre pantallas (el botón «proceder» de una wScreen con parámetros, los vínculos de la
 * ayuda) apuntan a `<base-url>/menu#w=<pantalla>&...` y recargan la página con eso. Dentro de esta aplicación hay que
 * quedarse en ella: devuelve la ruta equivalente (con los mismos parámetros) o null si el enlace es de otra cosa.
 */
export function rutaDeEnlaceBP(href: string, baseDelDocumento: string, urlBackend: string): string | null {
    const enlace = new URL(href, baseDelDocumento);
    const paginaDelMenu = new URL(`${urlBackend.replace(/\/*$/, '/')}menu`, baseDelDocumento);
    if (enlace.origin !== paginaDelMenu.origin || enlace.pathname !== paginaDelMenu.pathname) return null;
    const texto = (enlace.hash || enlace.search).slice(1);
    const nombre = new URLSearchParams(texto).get('w');
    return nombre ? `/wScreens-fallback/${encodeURIComponent(nombre)}?${texto}` : null;
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
