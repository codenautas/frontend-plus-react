// Mientras hay una pantalla de backend-plus en la página, lo que ella (o el código de la aplicación sobre backend-plus)
// manda a las páginas del backend se resuelve dentro de la aplicación: clics en enlaces, asignaciones a `location` y
// `history.replaceState`.
import { rutaBase } from '../rutaBase';
import { rutaDeEnlaceBP } from './pantallaDeBP';

interface EventoNavegacion extends Event {
    canIntercept: boolean;
    destination: { url: string; sameDocument: boolean };
    downloadRequest: string | null;
}

interface ApiNavegacion {
    addEventListener(tipo: 'navigate', escucha: (evento: EventoNavegacion) => void): void;
    removeEventListener(tipo: 'navigate', escucha: (evento: EventoNavegacion) => void): void;
}

// la Navigation API no está en todos los navegadores (ni en los tipos del DOM de esta versión de TypeScript)
function apiDeNavegacion(): ApiNavegacion | null {
    const api: unknown = Reflect.get(window, 'navigation');
    return typeof api === 'object' && api !== null && 'addEventListener' in api && typeof api.addEventListener === 'function'
        ? api as ApiNavegacion
        : null;
}

/** Empieza a capturar; devuelve la función que deja de hacerlo */
export function capturarNavegacionBP(urlBackend: string, navegar: (ruta: string) => void): () => void {
    const alHacerClick = (evento: MouseEvent) => {
        if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
        const enlace = evento.target instanceof Element ? evento.target.closest('a[href]') : null;
        if (!enlace || enlace.hasAttribute('download') || (enlace.getAttribute('target') ?? '_self') !== '_self') return;
        const ruta = rutaDeEnlaceBP(enlace.getAttribute('href') ?? '', document.baseURI, urlBackend);
        if (ruta) {
            // el botón «proceder» de backend-plus además tiene su propio onclick (history.pushState a `<base-url>/menu#...` y
            // showPage): si corriera, la dirección quedaría fuera de la aplicación
            evento.preventDefault();
            evento.stopPropagation();
            navegar(ruta);
        }
    };
    // cubre los enlaces de los diálogos y de todo lo que backend-plus cuelga fuera de su contenedor
    document.addEventListener('click', alHacerClick, true);

    // `location.href = ...` no pasa por ningún clic: donde existe, la Navigation API avisa de cualquier navegación
    const navegacion = apiDeNavegacion();
    const alNavegar = (evento: EventoNavegacion) => {
        if (!evento.cancelable || evento.destination.sameDocument || evento.downloadRequest !== null) return;
        const ruta = rutaDeEnlaceBP(evento.destination.url, document.baseURI, urlBackend);
        if (ruta) {
            evento.preventDefault();
            navegar(ruta);
        }
    };
    navegacion?.addEventListener('navigate', alNavegar);

    // al editar un parámetro, backend-plus reescribe la dirección (`myOwn.replaceAddrParams`: `history.replaceState(null, null, 'menu#...')`)
    // y, con el `<base>` en la base-url del backend, eso deja la aplicación; `replaceState` no pasa por la Navigation API
    const reemplazarOriginal = history.replaceState;
    const reemplazar: History['replaceState'] = (estado, titulo, url) => {
        const ruta = url === undefined || url === null ? null : rutaDeEnlaceBP(String(url), document.baseURI, urlBackend);
        reemplazarOriginal.call(history, estado, titulo, ruta === null ? url : rutaBase + ruta);
    };
    history.replaceState = reemplazar;

    return () => {
        if (history.replaceState === reemplazar) history.replaceState = reemplazarOriginal;
        document.removeEventListener('click', alHacerClick, true);
        navegacion?.removeEventListener('navigate', alNavegar);
    };
}
