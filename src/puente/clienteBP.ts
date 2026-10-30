// Puente con el cliente de backend-plus: carga sus scripts en la página (los mismos que arma el servidor con
// `clientIncludes`) para poder usar su grilla y sus wScreens donde esta librería todavía no tiene una versión propia.
// Solo funciona en el mismo origen que el backend (comparte la sesión), por ejemplo bajo `<base-url>/react/`.
import { FixedField } from '../types';

export interface OpcionesGrillaBP {
    fixedFields?: FixedField[];
    tableDef?: Record<string, unknown>;
}

/** Una wScreen de backend-plus: dibuja en `#main_layout` a partir de los parámetros de la dirección */
export type PantallaBP = (parametros: Record<string, unknown>) => void;

/**
 * Las formas de wScreen que entiende `showPage` de backend-plus: una función, o un objeto con `mainFunction`, o un
 * objeto con `parameters` y `mainAction` (muestra el formulario de parámetros y después ejecuta `mainAction`).
 * `procAux` también vive en `wScreens`: es un objeto con `showParams`.
 */
export interface DefinicionPantallaBP {
    mainFunction?: PantallaBP;
    parameters?: unknown[];
    mainAction?: unknown;
    resultClass?: string;
    proceedLabel?: string;
    pageTitle?: string;
    showParams?: (definicion: Record<string, unknown>, contenedor: HTMLElement, parametros: Record<string, unknown>, accion: unknown) => void;
}

export interface MyOwnBP {
    autoSetup(): Promise<unknown>;
    wScreens: Record<string, PantallaBP | DefinicionPantallaBP | undefined>;
    /** Lee una dirección de backend-plus (`#w=...&up=...` o `?...`) con los decodificadores de cada parámetro */
    UriSearchToObject?(direccion: string): Record<string, unknown>;
    preDisplayPage?(parametros: Record<string, unknown>, pantalla: DefinicionPantallaBP, nombre: string): void;
    tableGrid(nombreTabla: string, elemento: HTMLElement, opciones: OpcionesGrillaBP): unknown;
}

declare global {
    interface Window {
        myOwn?: MyOwnBP;
        my?: MyOwnBP;
    }
}

export interface RecursosBP {
    hojasDeEstilo: string[];
    scripts: string[];
}

/** Las hojas de estilo y los scripts de la página que sirve backend-plus, en el orden en que los carga */
export function extraerRecursos(html: string): RecursosBP {
    const documento = new DOMParser().parseFromString(html, 'text/html');
    const referencias = (selector: string, atributo: string): string[] =>
        Array.from(documento.querySelectorAll(selector))
            .map(elemento => elemento.getAttribute(atributo))
            .filter((ruta): ruta is string => !!ruta);
    return {
        hojasDeEstilo: referencias('link[rel=stylesheet]', 'href'),
        scripts: referencias('script[src]', 'src'),
    };
}

/**
 * El cliente de backend-plus arma sus direcciones (`lib/...`, `img/...`, los procedimientos) relativas a la página:
 * con un `<base>` apuntando a la base-url se comporta como si estuviera en su propia página.
 */
function fijarBase(urlBackend: string): void {
    const href = new URL(urlBackend.replace(/\/*$/, '/'), window.location.href).href;
    let base = document.querySelector('base');
    if (!base) {
        base = document.createElement('base');
        document.head.prepend(base);
    }
    base.href = href;
}

function cargarScript(ruta: string): Promise<void> {
    return new Promise((resolver, rechazar) => {
        const script = document.createElement('script');
        script.async = false;
        script.src = ruta;
        script.onload = () => resolver();
        script.onerror = () => rechazar(new Error(`No se pudo cargar ${ruta}`));
        document.head.appendChild(script);
    });
}

/**
 * El cliente de backend-plus se engancha al evento `load` de la ventana para mostrar su página (`showPage`), que acá
 * no tiene dónde dibujar (`#total-layout`) y falla; su manejador de errores deja un cartel como primer hijo del `body`
 * que corre toda la aplicación hacia abajo. Por eso se lo carga recién cuando la ventana terminó de cargar.
 */
export function esperarCargaDeVentana(): Promise<void> {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise(resolver => window.addEventListener('load', () => resolver(), { once: true }));
}

/**
 * Mientras corre `inyectar`, ignora que lo que se está cargando registre escuchas de esos eventos de la ventana.
 * backend-plus (my-menu.js) escucha `popstate` para mostrar su página, salvo que la dirección termine en `/react`: sin esto
 * la aplicación quedaría atada a ese nombre. Con la navegación en manos del router de la aplicación, esa escucha sobra.
 */
export async function sinEscuchasDeVentana<R>(tipos: string[], inyectar: () => Promise<R>): Promise<R> {
    const original = window.addEventListener;
    const filtrada = function (this: Window, tipo: string, escucha: EventListenerOrEventListenerObject, opciones?: boolean | AddEventListenerOptions): void {
        if (tipos.includes(tipo)) return;
        original.call(this, tipo, escucha, opciones);
    };
    window.addEventListener = filtrada;
    try {
        return await inyectar();
    } finally {
        if (window.addEventListener === filtrada) window.addEventListener = original;
    }
}

async function cargarScripts(rutas: string[]): Promise<void> {
    for (const ruta of rutas) {
        await cargarScript(ruta);
    }
}

let carga: Promise<MyOwnBP> | null = null;

/** Carga (una sola vez) el cliente de backend-plus y lo deja listo para usar */
export function cargarClienteBP(urlBackend: string): Promise<MyOwnBP> {
    if (!carga) {
        carga = cargarSinMemoria(urlBackend).catch((error: unknown) => {
            carga = null;
            throw error;
        });
    }
    return carga;
}

async function cargarSinMemoria(urlBackend: string): Promise<MyOwnBP> {
    const destino = new URL(urlBackend, window.location.href);
    if (destino.origin !== window.location.origin) {
        throw new Error(`El cliente de backend-plus solo se puede usar desde el mismo origen que el backend (${destino.origin} no es ${window.location.origin}).`);
    }
    fijarBase(urlBackend);
    const respuesta = await fetch(`${destino.pathname.replace(/\/*$/, '')}/menu`, { credentials: 'include' });
    if (!respuesta.ok || /\/login\/?$/.test(new URL(respuesta.url).pathname)) {
        throw new Error('No hay una sesión iniciada en el backend.');
    }
    const recursos = extraerRecursos(await respuesta.text());
    recursos.hojasDeEstilo.forEach(ruta => {
        const enlace = document.createElement('link');
        enlace.rel = 'stylesheet';
        enlace.href = ruta;
        document.head.appendChild(enlace);
    });
    await esperarCargaDeVentana();
    await sinEscuchasDeVentana(['popstate'], () => cargarScripts(recursos.scripts));
    const myOwn = window.myOwn;
    if (!myOwn) throw new Error('El backend no definió myOwn.');
    // backend-plus lo hace al cargar la ventana, y esta ya está cargada; parte de su código usa el global `my`
    window.my = myOwn;
    await myOwn.autoSetup();
    return myOwn;
}
