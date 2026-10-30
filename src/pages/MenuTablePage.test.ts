import { describe, expect, it } from 'vitest';
import { fixedFieldsDeMenu } from './MenuTablePage';

describe('fixedFieldsDeMenu', () => {
    it('acepta la forma de objeto {campo: valor} (la que usa dmencu)', () => {
        expect(fixedFieldsDeMenu({ tarea: 'encu', asignado: 5 })).toEqual([
            { fieldName: 'tarea', value: 'encu' },
            { fieldName: 'asignado', value: 5 },
        ]);
    });

    it('acepta la forma de arreglo [{fieldName, value}] (la que documenta backend-plus) y conserva show, que la grilla usa para no ocultar la columna', () => {
        expect(fixedFieldsDeMenu([{ fieldName: 'estado', value: null, show: true }])).toEqual([{ fieldName: 'estado', value: null, show: true }]);
    });

    it('sin ff no hay filtros', () => {
        expect(fixedFieldsDeMenu(undefined)).toEqual([]);
    });
});
