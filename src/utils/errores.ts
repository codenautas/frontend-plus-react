// src/utils/errores.ts

/** El mensaje de lo que se atrapó en un catch (en TypeScript es `unknown`: puede no ser un Error) */
export function mensajeDeError(error: unknown, porDefecto: string = 'Error desconocido'): string {
    if (error instanceof Error) return error.message || porDefecto;
    if (typeof error === 'string' && error !== '') return error;
    return porDefecto;
}

/** Un valor que tiene que existir (por ejemplo, el resultado de un procedimiento): si no, se informa qué faltó */
export function requerido<T>(valor: T | null | undefined, descripcion: string): T {
    if (valor === null || valor === undefined) {
        throw new Error(`El servidor no devolvió ${descripcion}`);
    }
    return valor;
}
