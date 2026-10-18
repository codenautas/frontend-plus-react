import { afterEach, describe, expect, it, vi } from 'vitest';
import { cumpleCondicion, extendConditions } from './condiciones';

describe('cumpleCondicion', () => {
    afterEach(() => vi.restoreAllMocks());

    it('sin condición el detalle siempre se muestra', () => {
        expect(cumpleCondicion(undefined, { provincia: 'CABA' })).toBe(true);
    });

    it('usa la condición registrada, que decide según la fila (como my.conditions de backend-plus)', () => {
        extendConditions({ noCABA: fila => fila.provincia !== 'CABA' });
        expect(cumpleCondicion('noCABA', { provincia: 'CABA' })).toBe(false);
        expect(cumpleCondicion('noCABA', { provincia: 'Chubut' })).toBe(true);
    });

    it('extendConditions suma sin pisar las que ya había', () => {
        extendConditions({ unaCondicion: () => false });
        extendConditions({ otraCondicion: () => true });
        expect(cumpleCondicion('unaCondicion', {})).toBe(false);
        expect(cumpleCondicion('otraCondicion', {})).toBe(true);
    });

    it('una condición que no está registrada muestra el detalle y avisa una sola vez', () => {
        const advertir = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(cumpleCondicion('noExiste', {})).toBe(true);
        expect(cumpleCondicion('noExiste', {})).toBe(true);
        expect(advertir).toHaveBeenCalledTimes(1);
        expect(String(advertir.mock.calls[0][0])).toContain('noExiste');
    });
});
