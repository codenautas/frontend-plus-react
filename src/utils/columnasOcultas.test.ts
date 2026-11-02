import { describe, expect, it } from 'vitest';
import { TableDefinition } from 'backend-plus';
import { campoDibujable, columnasOcultasIniciales } from './columnasOcultas';

const definicion = (cambios: Partial<TableDefinition>): TableDefinition => ({
    name: 'personas',
    primaryKey: ['id'],
    fields: [
        { name: 'id', typeName: 'integer' },
        { name: 'nombre', typeName: 'text' },
        { name: 'interno', typeName: 'text', visible: false },
        { name: 'saldo', typeName: 'decimal' },
    ],
    ...cambios,
});

describe('columnasOcultasIniciales', () => {
    it('sin hiddenColumns no se oculta nada', () => {
        expect(columnasOcultasIniciales(definicion({}))).toEqual([]);
    });

    it('son las hiddenColumns de la definición, sin repetir; un visible:false no es una columna oculta (no se puede mostrar)', () => {
        expect(columnasOcultasIniciales(definicion({ hiddenColumns: ['saldo', 'saldo'] }))).toEqual(['saldo']);
    });
});

describe('campoDibujable', () => {
    it('un campo con visible:false viaja en la definición pero no se dibuja', () => {
        const [id, , interno] = definicion({}).fields;
        expect(campoDibujable(id)).toBe(true);
        expect(campoDibujable(interno)).toBe(false);
    });
});
