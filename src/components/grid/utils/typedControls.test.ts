import { describe, expect, it } from 'vitest';
import typeStore from 'type-store';
import { caracterRechazado, textoPegadoRechazado, tiparEntrada } from './typedControls';

// como el de una columna de la grilla: el campo es anulable (con nullable:false el vacío sería 0)
const entero = typeStore.typerFrom({ typeName: 'integer', nullable: true });
const texto = typeStore.typerFrom({ typeName: 'text' });
const fecha = typeStore.typerFrom({ typeName: 'date' });

describe('tiparEntrada', () => {
    it('un número escrito es el número; vacío es null', () => {
        expect(tiparEntrada('42', entero)).toBe(42);
        expect(tiparEntrada('', entero)).toBeNull();
        expect(tiparEntrada('   ', entero)).toBeNull();
        expect(tiparEntrada(null, entero)).toBeNull();
    });

    it('lo escrito que no es un número avisa en vez de convertirse en null (que borraba el valor o no guardaba nada: result_sup en edicion_tem)', () => {
        expect(() => tiparEntrada('abc', entero)).toThrow(/no es un valor válido/);
        expect(() => tiparEntrada('5x', entero)).toThrow(/«5x»/);
    });

    it('una fecha que no existe avisa; una que existe se entiende', () => {
        expect(() => tiparEntrada('31/02/2024', fecha)).toThrow(/no es un valor válido/);
        expect(tiparEntrada('2026-03-07', fecha)).toBeInstanceOf(Date);
    });

    it('un texto es siempre válido', () => {
        expect(tiparEntrada('lo que sea 123 !', texto)).toBe('lo que sea 123 !');
    });
});

describe('caracteres que el tipo rechaza (backend-plus no deja escribirlos)', () => {
    it('en un entero entran los dígitos y el signo menos; no letras, punto, coma, barra ni espacio', () => {
        expect(['1', '0', '-'].some(c => caracterRechazado(c, entero))).toBe(false);
        expect(['a', '.', ',', '/', ' '].every(c => caracterRechazado(c, entero))).toBe(true);
    });

    it('en un texto entra cualquier carácter', () => {
        expect(['a', '.', ' ', '/'].some(c => caracterRechazado(c, texto))).toBe(false);
    });

    it('una tecla con nombre (Enter, F9) no es un carácter', () => {
        expect(caracterRechazado('Enter', entero)).toBe(false);
    });

    it('un texto pegado se rechaza si tiene algún carácter que el tipo no admite', () => {
        expect(textoPegadoRechazado('1234', entero)).toBe(false);
        expect(textoPegadoRechazado('12a4', entero)).toBe(true);
        expect(textoPegadoRechazado('cualquier cosa', texto)).toBe(false);
    });
});
