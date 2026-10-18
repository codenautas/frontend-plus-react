import { describe, expect, it } from 'vitest';
import { compararValores, getPrimaryKeyValues, sameValue } from './helpers';
import { DOM_TEMP_ID } from '../../../types';

describe('compararValores', () => {
    it('compara números, textos, fechas y bigint del mismo tipo', () => {
        expect(compararValores(3, 5)).toBeLessThan(0);
        expect(compararValores('b', 'a')).toBeGreaterThan(0);
        expect(compararValores(new Date(2026, 0, 1), new Date(2026, 0, 1))).toBe(0);
        expect(compararValores(BigInt(10), BigInt(2))).toBeGreaterThan(0);
    });

    it('un número contra un texto numérico se compara como número (el valor de un filtro sin tipar)', () => {
        expect(compararValores(25, '20')).toBeGreaterThan(0);
        expect(compararValores('30', 25)).toBeGreaterThan(0);
    });

    it('lo que no es comparable da null (así un filtro > o < no deja pasar filas por error)', () => {
        expect(compararValores('abc', 3)).toBeNull();
        expect(compararValores(null, 3)).toBeNull();
        expect(compararValores(new Date(), 'x')).toBeNull();
    });
});

describe('sameValue', () => {
    it('trata null y undefined como el mismo valor vacío y compara las fechas por su valor', () => {
        expect(sameValue(null, undefined)).toBe(true);
        expect(sameValue(new Date(5), new Date(5))).toBe(true);
        expect(sameValue(0, null)).toBe(false);
    });
});

describe('getPrimaryKeyValues', () => {
    it('une los valores de la clave primaria', () => {
        expect(getPrimaryKeyValues({ operativo: 'o1', id: 7 }, ['operativo', 'id'])).toBe('o1|7');
    });

    it('una fila nueva usa su identidad temporal aunque todavía no tenga clave', () => {
        expect(getPrimaryKeyValues({ id: null, [DOM_TEMP_ID]: 'new_1' }, ['id'])).toBe('new_1');
    });

    it('un valor ausente no rompe la clave', () => {
        expect(getPrimaryKeyValues({ id: 1 }, ['id', 'otro'])).toBe('1|NULL_OR_UNDEFINED');
    });
});
