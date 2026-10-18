import { describe, expect, it } from 'vitest';
import { mensajeDeError, requerido } from './errores';

describe('mensajeDeError', () => {
    it('toma el mensaje de un Error, de un texto o usa el de por defecto', () => {
        expect(mensajeDeError(new Error('falló'))).toBe('falló');
        expect(mensajeDeError('texto suelto')).toBe('texto suelto');
        expect(mensajeDeError({ raro: true })).toBe('Error desconocido');
        expect(mensajeDeError(undefined, 'sin datos')).toBe('sin datos');
        expect(mensajeDeError(new Error(''), 'vacío')).toBe('vacío');
    });
});

describe('requerido', () => {
    it('devuelve el valor y falla si falta, diciendo qué faltó', () => {
        expect(requerido(5, 'un número')).toBe(5);
        expect(requerido(0, 'un número')).toBe(0);
        expect(() => requerido(undefined, 'la estructura de personas')).toThrow('la estructura de personas');
        expect(() => requerido(null, 'los datos')).toThrow(/los datos/);
    });
});
