import { describe, expect, it } from 'vitest';
import { direccionDeSalida, posicionDelCursor, PosicionDelCursor } from './teclasDeCelda';

const alMedio: PosicionDelCursor = { vacio: false, alPrincipio: false, alFinal: false };
const alPrincipio: PosicionDelCursor = { vacio: false, alPrincipio: true, alFinal: false };
const alFinal: PosicionDelCursor = { vacio: false, alPrincipio: false, alFinal: true };
const vacio: PosicionDelCursor = { vacio: true, alPrincipio: true, alFinal: true };

describe('direccionDeSalida (las teclas de una celda en edición, como backend-plus)', () => {
    it('Enter y Tab van a la celda siguiente; Shift+Tab a la anterior', () => {
        expect(direccionDeSalida({ key: 'Enter' }, alMedio, null)).toBe('siguiente');
        expect(direccionDeSalida({ key: 'Tab' }, alMedio, null)).toBe('siguiente');
        expect(direccionDeSalida({ key: 'Tab', shiftKey: true }, alMedio, null)).toBe('anterior');
        expect(direccionDeSalida({ key: 'Enter', shiftKey: true }, alMedio, null)).toBeNull();
    });

    it('↑ y ↓ dejan la celda siempre, esté donde esté el cursor', () => {
        expect(direccionDeSalida({ key: 'ArrowUp' }, alMedio, null)).toBe('arriba');
        expect(direccionDeSalida({ key: 'ArrowDown' }, alMedio, 'a')).toBe('abajo');
    });

    it('← deja la celda solo con el texto vacío o con el cursor al principio', () => {
        expect(direccionDeSalida({ key: 'ArrowLeft' }, alMedio, null)).toBeNull();
        expect(direccionDeSalida({ key: 'ArrowLeft' }, alFinal, null)).toBeNull();
        expect(direccionDeSalida({ key: 'ArrowLeft' }, alPrincipio, null)).toBe('izquierda');
        expect(direccionDeSalida({ key: 'ArrowLeft' }, vacio, null)).toBe('izquierda');
    });

    it('→ deja la celda con el texto vacío, o con el cursor al final si la tecla anterior también fue → (la primera solo llega al final)', () => {
        expect(direccionDeSalida({ key: 'ArrowRight' }, vacio, null)).toBe('derecha');
        expect(direccionDeSalida({ key: 'ArrowRight' }, alFinal, 'a')).toBeNull();
        expect(direccionDeSalida({ key: 'ArrowRight' }, alFinal, 'ArrowRight')).toBe('derecha');
        expect(direccionDeSalida({ key: 'ArrowRight' }, alMedio, 'ArrowRight')).toBeNull();
    });

    it('con Ctrl, Alt o Meta (o Shift en las flechas) ninguna tecla deja la celda', () => {
        for (const modificador of ['ctrlKey', 'altKey', 'metaKey'] as const) {
            expect(direccionDeSalida({ key: 'Tab', [modificador]: true }, alMedio, null)).toBeNull();
            expect(direccionDeSalida({ key: 'ArrowDown', [modificador]: true }, alMedio, null)).toBeNull();
        }
        expect(direccionDeSalida({ key: 'ArrowDown', shiftKey: true }, alMedio, null)).toBeNull();
        expect(direccionDeSalida({ key: 'ArrowLeft', shiftKey: true }, vacio, null)).toBeNull();
    });

    it('las demás teclas no dejan la celda', () => {
        expect(direccionDeSalida({ key: 'a' }, vacio, null)).toBeNull();
        expect(direccionDeSalida({ key: 'F4' }, vacio, null)).toBeNull();
        expect(direccionDeSalida({ key: 'Escape' }, vacio, null)).toBeNull();
    });
});

describe('posicionDelCursor', () => {
    function campo(valor: string, desde: number, hasta: number = desde): HTMLInputElement {
        const input = document.createElement('input');
        input.value = valor;
        input.setSelectionRange(desde, hasta);
        return input;
    }

    it('distingue vacío, principio, medio y final', () => {
        expect(posicionDelCursor(campo('', 0))).toEqual({ vacio: true, alPrincipio: true, alFinal: true });
        expect(posicionDelCursor(campo('abc', 0))).toEqual({ vacio: false, alPrincipio: true, alFinal: false });
        expect(posicionDelCursor(campo('abc', 1))).toEqual({ vacio: false, alPrincipio: false, alFinal: false });
        expect(posicionDelCursor(campo('abc', 3))).toEqual({ vacio: false, alPrincipio: false, alFinal: true });
    });

    it('con un texto seleccionado se mira donde termina la selección, como backend-plus', () => {
        expect(posicionDelCursor(campo('abc', 0, 3))).toEqual({ vacio: false, alPrincipio: false, alFinal: true });
    });

    it('lo que no es un campo de texto cuenta como vacío', () => {
        expect(posicionDelCursor(document.createElement('div'))).toEqual({ vacio: true, alPrincipio: true, alFinal: true });
    });
});
