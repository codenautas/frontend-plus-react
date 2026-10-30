// Cómo se sale de una celda en edición con el teclado, igual que backend-plus (`captureKeys` de my-things.js).
// Dejar la celda por cualquier camino la guarda; lo que cambia es adónde va el foco y cuándo una tecla deja la celda
// o solo mueve el cursor dentro del texto.

/** Hacia dónde va el foco. `siguiente` y `anterior` saltan de fila al pasar el borde; `izquierda` y `derecha` no */
export type DireccionDeSalida = 'siguiente' | 'anterior' | 'izquierda' | 'derecha' | 'arriba' | 'abajo';

export interface TeclaPulsada {
    key: string;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
}

/** Dónde está el cursor dentro del texto del editor */
export interface PosicionDelCursor {
    vacio: boolean;
    alPrincipio: boolean;
    alFinal: boolean;
}

/**
 * La dirección a la que la tecla manda el foco, o null si la tecla no deja la celda (sigue su curso: mueve el cursor, escribe...).
 * - Enter y Tab van a la celda siguiente; Shift+Tab a la anterior. Shift+Enter no hace nada especial.
 * - ↑ y ↓ pasan a la misma columna de la fila de arriba o de abajo.
 * - ← pasa a la celda de la izquierda si el texto está vacío o el cursor está al principio.
 * - → pasa a la de la derecha si el texto está vacío, o si la tecla anterior también fue → y el cursor está al final
 *   (hace falta apretarla dos veces: la primera solo llega al final).
 * Con Ctrl, Alt o Meta ninguna tecla deja la celda.
 */
export function direccionDeSalida(tecla: TeclaPulsada, cursor: PosicionDelCursor, teclaAnterior: string | null): DireccionDeSalida | null {
    if (tecla.ctrlKey || tecla.altKey || tecla.metaKey) return null;
    const conShift = !!tecla.shiftKey;
    switch (tecla.key) {
        case 'Enter': return conShift ? null : 'siguiente';
        case 'Tab': return conShift ? 'anterior' : 'siguiente';
        case 'ArrowUp': return conShift ? null : 'arriba';
        case 'ArrowDown': return conShift ? null : 'abajo';
        case 'ArrowLeft': return !conShift && (cursor.vacio || cursor.alPrincipio) ? 'izquierda' : null;
        case 'ArrowRight': return !conShift && (cursor.vacio || (teclaAnterior === 'ArrowRight' && cursor.alFinal)) ? 'derecha' : null;
        default: return null;
    }
}

/** La posición del cursor en un campo de texto (o, si el elemento no es uno, la de un texto vacío) */
export function posicionDelCursor(elemento: EventTarget | null): PosicionDelCursor {
    if (elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement) {
        // como backend-plus, se mira donde termina la selección
        const fin = elemento.selectionEnd ?? elemento.value.length;
        return { vacio: elemento.value === '', alPrincipio: fin === 0, alFinal: fin === elemento.value.length };
    }
    return { vacio: true, alPrincipio: true, alFinal: true };
}
