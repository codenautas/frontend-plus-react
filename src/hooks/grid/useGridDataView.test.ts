import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { TableDefinition } from 'backend-plus';
import { useGridDataView } from './useGridDataView';

interface Persona {
    id: number;
    nombre: string;
    edad: number | null;
}

const definicion: TableDefinition = {
    name: 'personas',
    primaryKey: ['id'],
    fields: [
        { name: 'id', typeName: 'integer' },
        { name: 'nombre', typeName: 'text' },
        { name: 'edad', typeName: 'integer', aggregate: 'sum' },
    ],
};

const datos: Persona[] = [
    { id: 1, nombre: 'Carla', edad: 30 },
    { id: 2, nombre: 'Ana', edad: 20 },
    { id: 3, nombre: 'Bruno', edad: 40 },
    { id: 4, nombre: 'Anabel', edad: null },
];

function vista(tableData: Persona[]) {
    return renderHook(
        ({ tableData }) => useGridDataView({ tableData, tableDefinition: definicion }),
        { initialProps: { tableData } }
    );
}

const nombres = (filas: Persona[]) => filas.map(f => f.nombre);

describe('useGridDataView', () => {
    it('ordena por la columna elegida y por las siguientes en cada desempate', () => {
        const { result } = vista(datos);
        act(() => result.current.setSortColumns([{ columnKey: 'nombre', direction: 'ASC' }]));
        expect(nombres(result.current.filteredRows)).toEqual(['Ana', 'Anabel', 'Bruno', 'Carla']);
        act(() => result.current.setSortColumns([{ columnKey: 'edad', direction: 'DESC' }]));
        expect(nombres(result.current.filteredRows)).toEqual(['Bruno', 'Carla', 'Ana', 'Anabel']);
    });

    it('los filtros solo se aplican con la fila de filtros visible', () => {
        const { result } = vista(datos);
        act(() => result.current.setFilters({ nombre: { operator: '~', value: 'ana' } }));
        expect(result.current.filteredRows).toHaveLength(4);
        act(() => result.current.toggleFilterVisibility());
        act(() => result.current.setFilters({ nombre: { operator: '~', value: 'ana' } }));
        expect(nombres(result.current.filteredRows)).toEqual(['Ana', 'Anabel']);
    });

    it('al ocultar la fila de filtros se vuelven a ver todas las filas', () => {
        const { result } = vista(datos);
        act(() => result.current.toggleFilterVisibility());
        act(() => result.current.setFilters({ nombre: { operator: '~', value: 'zzz' } }));
        expect(result.current.filteredRows).toHaveLength(0);
        act(() => result.current.toggleFilterVisibility());
        expect(result.current.filteredRows).toHaveLength(4);
    });

    it('los totales se calculan sobre las filas que se ven', () => {
        const { result } = vista(datos);
        expect(result.current.summaryData.edad).toEqual({ type: 'sum', value: 90 });
        act(() => result.current.toggleFilterVisibility());
        act(() => result.current.setFilters({ nombre: { operator: '~', value: 'ana' } }));
        expect(result.current.summaryData.edad).toEqual({ type: 'sum', value: 20 });
    });

    describe('al editar una fila', () => {
        it('la fila editada queda en su lugar aunque el nuevo valor cambie su posición en el orden', () => {
            const { result, rerender } = vista(datos);
            act(() => result.current.setSortColumns([{ columnKey: 'edad', direction: 'ASC' }]));
            const antes = nombres(result.current.filteredRows);
            const bruno = datos[2];
            // Bruno pasa de 40 a 5: ordenado de nuevo iría primero, pero mientras se edita no tiene que saltar
            rerender({ tableData: datos.map(f => f === bruno ? { ...f, edad: 5 } : f) });
            expect(nombres(result.current.filteredRows)).toEqual(antes);
            expect(result.current.filteredRows.find(f => f.nombre === 'Bruno')?.edad).toBe(5);
        });

        it('la fila editada no desaparece si deja de cumplir el filtro', () => {
            const { result, rerender } = vista(datos);
            act(() => result.current.toggleFilterVisibility());
            act(() => result.current.setFilters({ nombre: { operator: '~', value: 'ana' } }));
            const ana = datos[1];
            rerender({ tableData: datos.map(f => f === ana ? { ...f, nombre: 'Zulema' } : f) });
            expect(nombres(result.current.filteredRows)).toEqual(['Zulema', 'Anabel']);
        });

        it('si cambian muchas filas a la vez (refrescar, importar) se vuelve a ordenar y filtrar', () => {
            const { result, rerender } = vista(datos);
            act(() => result.current.setSortColumns([{ columnKey: 'edad', direction: 'ASC' }]));
            rerender({ tableData: datos.map(f => ({ ...f, edad: f.id === 4 ? 1 : 100 - f.id })) });
            expect(result.current.filteredRows[0].id).toBe(4);
            expect(result.current.filteredRows.map(f => f.id)).toEqual([4, 3, 2, 1]);
        });

        it('si cambia la cantidad de filas se recalcula todo', () => {
            const { result, rerender } = vista(datos);
            act(() => result.current.setSortColumns([{ columnKey: 'nombre', direction: 'ASC' }]));
            rerender({ tableData: [...datos, { id: 5, nombre: 'Aaron', edad: 1 }] });
            expect(nombres(result.current.filteredRows)[0]).toBe('Aaron');
        });
    });
});
