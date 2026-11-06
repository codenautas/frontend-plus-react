// Las hojas de estilo de backend-plus son globales (la fuente y el tamaño del `body`, los skins...) y, cargadas tal cual,
// cambian el aspecto de todo lo demás (el menú incluido). Se bajan como texto y se acotan al contenedor `.fpr-bp`
// que rodea lo que dibuja backend-plus: cada selector se prefija con él y los de `html`, `body` y `:root` pasan a ser el contenedor.

export const CLASE_CONTENEDOR_BP = 'fpr-bp';

/** Índice del `}` que cierra el bloque abierto en `abre` (que apunta a un `{`), sin contar las llaves de los textos */
const cierreDeBloque = (css: string, abre: number): number => {
    let profundidad = 0;
    let comilla = '';
    for (let i = abre; i < css.length; i++) {
        const c = css[i];
        if (comilla) {
            if (c === '\\') i++;
            else if (c === comilla) comilla = '';
        } else if (c === '"' || c === "'") comilla = c;
        else if (c === '{') profundidad++;
        else if (c === '}' && --profundidad === 0) return i;
    }
    return css.length - 1;
};

/** Parte un texto por el separador cuando no está dentro de paréntesis, corchetes ni textos */
const partirPor = (lista: string, separador: string): string[] => {
    const partes: string[] = [];
    let profundidad = 0;
    let comilla = '';
    let inicio = 0;
    for (let i = 0; i < lista.length; i++) {
        const c = lista[i];
        if (comilla) {
            if (c === '\\') i++;
            else if (c === comilla) comilla = '';
        } else if (c === '"' || c === "'") comilla = c;
        else if (c === '(' || c === '[') profundidad++;
        else if (c === ')' || c === ']') profundidad--;
        else if (c === separador && profundidad === 0) {
            partes.push(lista.slice(inicio, i));
            inicio = i + 1;
        }
    }
    partes.push(lista.slice(inicio));
    return partes;
};

const RAIZ = /^(html|body|:root)(?![\w-])/;
// backend-plus le pone al `body` el atributo `my-skin` (lib/my-skin.js) y las hojas de los skins lo usan de condición: `[my-skin=default] body`, `[my-skin=default] td`
const ATRIBUTO_DE_RAIZ = /^\[my-skin[^\]]*\]/;
// el alto y el scroll del documento no se le pueden dar al contenedor (`body { height: 100%; overflow: hidden }` le cortaría el contenido a la pantalla)
const MEDIDAS_DE_DOCUMENTO = /^(overflow(-[xy])?|(min-|max-)?height|position)$/i;

interface SelectorAcotado {
    selector: string;
    /** El selector era el del documento (`body`, `html`, `:root`): ahora es el contenedor */
    deRaiz: boolean;
}

// los diálogos de backend-plus (dialog-promise) cuelgan del `body`, afuera del contenedor: sus clases son propias y no se acotan
const DE_DIALOGO = /^(div)?\.dialog-|^\[key-selected\]/;

const acotarSelector = (selector: string): SelectorAcotado => {
    const limpio = selector.trim();
    // `:where` no suma especificidad: cada regla pesa lo mismo que en la página de backend-plus (con `.fpr-bp` a secas, `button { }` pasaba
    // a ganarle a las clases de MUI de lo que corre adentro, como el tablero de dmencu, y le pisaba tamaños, botones y enlaces)
    const contenedor = `:where(.${CLASE_CONTENEDOR_BP})`;
    if (DE_DIALOGO.test(limpio)) return { selector: limpio, deRaiz: false };
    const atributo = ATRIBUTO_DE_RAIZ.exec(limpio);
    if (atributo) {
        const resto = limpio.slice(atributo[0].length).trim();
        const raiz = RAIZ.exec(resto);
        if (!resto) return { selector: contenedor + atributo[0], deRaiz: true };
        if (raiz) return { selector: contenedor + atributo[0] + resto.slice(raiz[0].length), deRaiz: true };
        return { selector: `${contenedor}${atributo[0]} ${resto}`, deRaiz: false };
    }
    const raiz = RAIZ.exec(limpio);
    if (raiz) {
        // `html body ...` y `html > body ...` también son el contenedor
        return { selector: contenedor + limpio.slice(raiz[0].length).replace(/^\s*>?\s*body(?![\w-])/, ''), deRaiz: true };
    }
    return { selector: `${contenedor} ${limpio}`, deRaiz: false };
};

const sinMedidasDeDocumento = (bloque: string): string =>
    `{${partirPor(bloque.slice(1, -1), ';').filter(declaracion => !MEDIDAS_DE_DOCUMENTO.test(declaracion.split(':')[0].trim())).join(';')}}`;

const acotarRegla = (preludio: string, bloque: string): string => {
    const selectores = partirPor(preludio, ',').filter(selector => selector.trim()).map(acotarSelector);
    const deRaiz = selectores.filter(s => s.deRaiz).map(s => s.selector);
    const otros = selectores.filter(s => !s.deRaiz).map(s => s.selector);
    return [
        deRaiz.length ? `${deRaiz.join(', ')} ${sinMedidasDeDocumento(bloque)}` : '',
        otros.length ? `${otros.join(', ')} ${bloque}` : '',
    ].filter(Boolean).join(' ');
};

/** Las `url(...)` relativas de una hoja dejan de serlo: la hoja ya no está donde estaba */
const urlsAbsolutas = (css: string, urlHoja: string): string =>
    css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (completo, comilla: string, ruta: string) =>
        /^(data:|#)/.test(ruta) ? completo : `url(${comilla}${new URL(ruta, urlHoja).href}${comilla})`
    );

const ARROBAS_CON_REGLAS = /^@(media|supports|layer|container|document)\b/i;

const acotarReglas = (css: string): string => {
    let salida = '';
    let i = 0;
    while (i < css.length) {
        const llave = css.indexOf('{', i);
        const puntoYComa = css.indexOf(';', i);
        if (llave === -1 && puntoYComa === -1) {
            salida += css.slice(i);
            break;
        }
        // una arroba sin bloque (@import, @charset, @layer a;): queda como está
        if (puntoYComa !== -1 && (llave === -1 || puntoYComa < llave) && css.slice(i).trimStart().startsWith('@')) {
            salida += css.slice(i, puntoYComa + 1);
            i = puntoYComa + 1;
            continue;
        }
        if (llave === -1) {
            salida += css.slice(i);
            break;
        }
        const preludio = css.slice(i, llave);
        const cierre = cierreDeBloque(css, llave);
        const bloque = css.slice(llave, cierre + 1);
        const encabezado = preludio.trim();
        if (encabezado.startsWith('@')) {
            // @media y similares llevan reglas adentro; @font-face, @keyframes, @page, etc. no se tocan
            salida += ARROBAS_CON_REGLAS.test(encabezado)
                ? `${preludio}{${acotarReglas(bloque.slice(1, -1))}}`
                : preludio + bloque;
        } else {
            salida += acotarRegla(preludio, bloque);
        }
        i = cierre + 1;
    }
    return salida;
};

/** El texto de una hoja de estilo de backend-plus (que está en `urlHoja`) acotado al contenedor `.fpr-bp` */
export const acotarEstilos = (css: string, urlHoja: string): string =>
    acotarReglas(urlsAbsolutas(css.replace(/\/\*[\s\S]*?\*\//g, ''), urlHoja));

/** Copia al contenedor el atributo `my-skin` que backend-plus le puso al `body`: las reglas de los skins lo piden */
export const copiarSkinAlContenedor = (dentro: HTMLElement): void => {
    const skin = document.body.getAttribute('my-skin');
    const contenedor = dentro.closest(`.${CLASE_CONTENEDOR_BP}`);
    if (skin && contenedor) contenedor.setAttribute('my-skin', skin);
};
