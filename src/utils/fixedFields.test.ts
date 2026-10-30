import { describe, expect, it } from 'vitest';
import { columnaOcultaPorFixedField, fijaElValor, valorFijoDe } from './fixedFields';

describe('fixedFields (como TableConnector de backend-plus)', () => {
    it('un fixedField común fija el valor y oculta su columna', () => {
        const fixedFields = [{ fieldName: 'rol', value: 'admin' }];
        expect(valorFijoDe(fixedFields, 'rol')).toEqual({ fieldName: 'rol', value: 'admin' });
        expect(columnaOcultaPorFixedField(fixedFields, 'rol')).toBe(true);
        expect(columnaOcultaPorFixedField(fixedFields, 'otra')).toBe(false);
    });

    it('con show la columna fija sigue a la vista', () => {
        expect(columnaOcultaPorFixedField([{ fieldName: 'rol', value: 'admin', show: true }], 'rol')).toBe(false);
    });

    it('un fixedField con range o con until no fija el valor ni oculta la columna', () => {
        expect(fijaElValor({ fieldName: 'f', value: 1, until: 5 })).toBe(false);
        expect(fijaElValor({ fieldName: 'f', value: 1, range: true })).toBe(false);
        expect(columnaOcultaPorFixedField([{ fieldName: 'f', value: 1, until: 5 }], 'f')).toBe(false);
        expect(valorFijoDe([{ fieldName: 'f', value: 1, range: true }], 'f')).toBeUndefined();
    });

    it('sin fixedFields no hay nada fijo', () => {
        expect(valorFijoDe(undefined, 'rol')).toBeUndefined();
        expect(columnaOcultaPorFixedField(undefined, 'rol')).toBe(false);
    });
});
