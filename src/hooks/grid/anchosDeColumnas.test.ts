import { describe, expect, it } from 'vitest';
import { TableDefinition } from 'backend-plus';
import { calcularAnchosDeColumnas } from './useGridColumns';

const definicion: TableDefinition = {
    name: 'personas',
    primaryKey: ['id'],
    fields: [
        { name: 'id', typeName: 'integer' },
        { name: 'nombre', typeName: 'text', width: 250 },
        { name: 'detalle', typeName: 'text', label: 'una etiqueta bastante larga', width: 40 },
        { name: 'codigo', typeName: 'text' },
    ],
};

describe('calcularAnchosDeColumnas', () => {
    it('el ancho que declara el backend para el campo (width, en píxeles) manda sobre el calculado, también si es más angosto que el título o más ancho que el tope', () => {
        const anchos = calcularAnchosDeColumnas(definicion, [{ id: 1, nombre: 'x'.repeat(200), detalle: 'y', codigo: 'z' }]);
        expect(anchos.get('nombre')).toBe(250);
        expect(anchos.get('detalle')).toBe(40);
    });

    it('sin width se calcula con el título y los datos', () => {
        const anchos = calcularAnchosDeColumnas(definicion, [{ id: 1, nombre: 'a', detalle: 'b', codigo: 'un código de once' }]);
        const esperado = ('un código de once'.length * 8 + 16);
        expect(anchos.get('codigo')).toBe(esperado);
        expect(anchos.get('id')).toBeGreaterThanOrEqual(80);
    });
});
