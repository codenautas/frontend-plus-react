import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { CellKeyDownArgs, CellKeyboardEvent, DataGridHandle, RowsChangeData } from 'react-data-grid';
import { TableDefinition } from 'backend-plus';
import { useGridEvents } from './useGridEvents';
import { DETALLE, FilaDetalle } from '../../components/grid/detalles';

interface Fila {
    id: number;
    nombre: string;
    codigo: string;
}

const definicion: TableDefinition = {
    name: 'personas',
    primaryKey: ['id'],
    fields: [
        { name: 'id', typeName: 'integer', editable: false },
        { name: 'nombre', typeName: 'text' },
        { name: 'codigo', typeName: 'text' },
    ],
};

const todas: Fila[] = [1, 2, 3, 4, 5].map(id => ({ id, nombre: `P${id}`, codigo: String(id) }));

function eventos(filasVisibles: Fila[]) {
    const setTableData = vi.fn();
    const dataGridRef = { current: null as DataGridHandle | null };
    const hook = renderHook(() => useGridEvents({
        dataGridRef,
        tableDefinition: definicion,
        filteredRows: filasVisibles,
        tableData: todas,
        fixedFields: undefined,
        setSelectedCell: vi.fn(),
        setTableData,
        setSortColumns: vi.fn(),
    }));
    return { ...hook, setTableData };
}

/** Aplica la función que el hook le pasó a setTableData sobre los datos completos */
function resultadoDe(setTableData: ReturnType<typeof vi.fn>): Fila[] {
    const actualizar = setTableData.mock.calls[0][0] as (anterior: Fila[]) => Fila[];
    return actualizar(todas);
}

describe('handleRowsChange', () => {
    it('con un filtro activo reemplaza solo la fila editada y no pierde las que el filtro oculta', () => {
        // el filtro deja ver las filas 2 y 4; se edita la 4 (índice 1 de lo visible)
        const visibles = [todas[1], todas[3]];
        const { result, setTableData } = eventos(visibles);
        const editada: Fila = { ...todas[3], nombre: 'Editada' };
        const datos: RowsChangeData<Fila, unknown> = { indexes: [1], column: { key: 'nombre', name: 'nombre', idx: 1 } as RowsChangeData<Fila, unknown>['column'] };
        result.current.handleRowsChange([visibles[0], editada], datos);
        const resultado = resultadoDe(setTableData);
        expect(resultado).toHaveLength(5);
        expect(resultado.map(f => f.nombre)).toEqual(['P1', 'P2', 'P3', 'Editada', 'P5']);
    });

    it('si no cambió ninguna fila no toca los datos', () => {
        const { result, setTableData } = eventos(todas);
        result.current.handleRowsChange(todas, { indexes: [], column: { key: 'nombre', name: 'nombre', idx: 1 } as RowsChangeData<Fila, unknown>['column'] });
        expect(setTableData).not.toHaveBeenCalled();
    });
});

/**
 * Dobles de los argumentos y del evento de teclado de react-data-grid: solo lo que usa el manejador.
 * Es la única aserción de tipo de estos tests (los tipos reales tienen decenas de propiedades que acá no importan).
 */
function teclaEnCelda(key: string, target: EventTarget, columna: string, row: Fila | FilaDetalle = todas[0]) {
    const preventGridDefault = vi.fn();
    const args = { mode: 'SELECT', row, column: { key: columna }, rowIdx: 0 } as unknown as CellKeyDownArgs<Fila, { id: string }>;
    const evento = { key, target, preventGridDefault } as unknown as CellKeyboardEvent;
    return { args, evento, preventGridDefault };
}

describe('F4 apretado: teclas que llegan antes de que el editor tenga el foco', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('si hay un editor registrado se la pasa directo', () => {
        const { result } = eventos(todas);
        const procesar = vi.fn();
        result.current.registrarEditor(procesar);
        const { args, evento, preventGridDefault } = teclaEnCelda('F4', document.createElement('div'), 'codigo');
        result.current.handleCellKeyDown(args, evento);
        expect(procesar).toHaveBeenCalledWith('F4');
        expect(preventGridDefault).toHaveBeenCalled();
    });

    it('si todavía no hay editor la guarda y se la da al primero que se registre', () => {
        const { result } = eventos(todas);
        const { args, evento } = teclaEnCelda('F4', document.createElement('div'), 'codigo');
        result.current.handleCellKeyDown(args, evento);
        result.current.handleCellKeyDown(args, evento);
        const procesar = vi.fn();
        result.current.registrarEditor(procesar);
        expect(procesar).toHaveBeenCalledTimes(1);
        // la segunda queda para el editor siguiente
        const siguiente = vi.fn();
        result.current.registrarEditor(siguiente);
        expect(siguiente).toHaveBeenCalledWith('F4');
    });

    it('una tecla guardada se descarta si el editor tarda demasiado', () => {
        const { result } = eventos(todas);
        const { args, evento } = teclaEnCelda('F4', document.createElement('div'), 'codigo');
        result.current.handleCellKeyDown(args, evento);
        vi.advanceTimersByTime(1000);
        const procesar = vi.fn();
        result.current.registrarEditor(procesar);
        expect(procesar).not.toHaveBeenCalled();
    });

    it('no la toma si ya llegó al input del editor (eso lo resuelve el propio editor)', () => {
        const { result } = eventos(todas);
        const procesar = vi.fn();
        result.current.registrarEditor(procesar);
        const { args, evento } = teclaEnCelda('F4', document.createElement('input'), 'codigo');
        result.current.handleCellKeyDown(args, evento);
        expect(procesar).not.toHaveBeenCalled();
    });

    it('no la toma en una columna que no se edita', () => {
        const { result } = eventos(todas);
        const procesar = vi.fn();
        result.current.registrarEditor(procesar);
        const { args, evento } = teclaEnCelda('F4', document.createElement('div'), 'id');
        result.current.handleCellKeyDown(args, evento);
        expect(procesar).not.toHaveBeenCalled();
    });

    it('la baja del editor evita que reciba teclas', () => {
        const { result } = eventos(todas);
        const procesar = vi.fn();
        const baja = result.current.registrarEditor(procesar);
        baja();
        const { args, evento } = teclaEnCelda('F4', document.createElement('div'), 'codigo');
        result.current.handleCellKeyDown(args, evento);
        expect(procesar).not.toHaveBeenCalled();
    });

    it('en una fila de detalle no hace nada: ahí manda la grilla anidada', () => {
        const { result } = eventos(todas);
        const procesar = vi.fn();
        result.current.registrarEditor(procesar);
        const filaDetalle: FilaDetalle = { [DETALLE]: true, clave: '1|T', filaPadre: todas[0], detailTable: { table: 'x', abr: 'T', fields: [] }, fixedFields: [] };
        const { args, evento } = teclaEnCelda('F4', document.createElement('div'), 'codigo', filaDetalle);
        result.current.handleCellKeyDown(args, evento);
        expect(procesar).not.toHaveBeenCalled();
    });
});
