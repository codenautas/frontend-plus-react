import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DataGridHandle } from 'react-data-grid';
import { TableDefinition } from 'backend-plus';
import { useGridEvents } from './useGridEvents';
import { ColumnaDeGrilla } from '../../components/grid/GenericDataGrid';
import { DETALLE, FilaDetalle } from '../../components/grid/detalles';
import { FilaDeDatos, TeclaDeEditor } from '../../types';

// un type y no una interface: las interfaces no tienen firma de índice y no son asignables a FilaDeDatos
type Fila = { id: number; nombre: string; codigo: string };

const definicion: TableDefinition = {
    name: 'personas',
    primaryKey: ['id'],
    fields: [
        { name: 'id', typeName: 'integer', editable: false },
        { name: 'nombre', typeName: 'text' },
        { name: 'codigo', typeName: 'text' },
    ],
};

// las columnas: id (no se edita), nombre y codigo (índices 0, 1 y 2)
const columnas: ColumnaDeGrilla[] = ['id', 'nombre', 'codigo'].map(key => ({ key, name: key }));
const filas: Fila[] = [1, 2, 3].map(id => ({ id, nombre: `P${id}`, codigo: String(id) }));
const filaDetalle: FilaDetalle = { [DETALLE]: true, clave: '2|T', filaPadre: filas[1], detailTable: { table: 'x', abr: 'T', fields: [] }, fixedFields: [] };

const selectCell = vi.fn();

/** Único doble con aserción de tipo de este archivo: de la grilla solo se usa selectCell */
function grillaConSelectCell(): { current: DataGridHandle } {
    return { current: { selectCell } as unknown as DataGridHandle };
}

function editor(filasVisibles: Array<Fila | FilaDetalle> = filas) {
    const handleCommit = vi.fn(async () => undefined);
    const dataGridRef = grillaConSelectCell();
    // las filas visibles incluyen las de detalle intercaladas, y ambas son filas de datos para la grilla
    const visibles: FilaDeDatos[] = filasVisibles;
    const { result } = renderHook(() => useGridEvents({
        dataGridRef,
        tableDefinition: definicion,
        filteredRows: visibles,
        tableData: filas,
        fixedFields: undefined,
        setSelectedCell: vi.fn(),
        setTableData: vi.fn(),
        setSortColumns: vi.fn(),
    }));
    /** Aprieta `key` en el editor de (fila, columna) con `texto` y el cursor en `cursor` (al final por omisión) */
    const apretar = (rowIdx: number, columna: string, key: string, texto = 'abc', cursor = texto.length, extra: Partial<TeclaDeEditor> = {}) => {
        const input = document.createElement('input');
        input.value = texto;
        input.setSelectionRange(cursor, cursor);
        return result.current.handleKeyPressInEditor(rowIdx, columna, { key, target: input, ...extra }, columnas, handleCommit, texto);
    };
    return { apretar, handleCommit };
}

function destino(): { rowIdx: number; idx: number } | null {
    const llamada = selectCell.mock.calls.at(-1);
    return llamada ? llamada[0] : null;
}

describe('teclas del editor de una celda', () => {
    beforeEach(() => selectCell.mockClear());

    it('Enter y Tab guardan y pasan a la celda editable siguiente de la fila', () => {
        for (const key of ['Enter', 'Tab']) {
            selectCell.mockClear();
            const { apretar, handleCommit } = editor();
            expect(apretar(1, 'nombre', key)).toBe(true);
            expect(handleCommit).toHaveBeenCalledWith('abc', true, true);
            expect(destino()).toEqual({ rowIdx: 1, idx: 2 });
        }
    });

    it('al final de la fila pasan a la primera celda editable de la fila de abajo', () => {
        const { apretar } = editor();
        apretar(0, 'codigo', 'Tab');
        expect(destino()).toEqual({ rowIdx: 1, idx: 1 });
    });

    it('Shift+Tab pasa a la anterior, y desde la primera a la última de la fila de arriba (se guarda en los dos casos)', () => {
        const { apretar, handleCommit } = editor();
        expect(apretar(1, 'codigo', 'Tab', 'abc', 3, { shiftKey: true })).toBe(true);
        expect(destino()).toEqual({ rowIdx: 1, idx: 1 });
        expect(apretar(1, 'nombre', 'Tab', 'abc', 3, { shiftKey: true })).toBe(true);
        expect(destino()).toEqual({ rowIdx: 0, idx: 2 });
        expect(handleCommit).toHaveBeenCalledTimes(2);
    });

    it('Shift+Tab en la primera celda de la primera fila no tiene adónde ir: la tecla es de la grilla (no sale el foco) y no guarda', () => {
        const { apretar, handleCommit } = editor();
        expect(apretar(0, 'nombre', 'Tab', 'abc', 3, { shiftKey: true })).toBe(true);
        expect(handleCommit).not.toHaveBeenCalled();
        expect(selectCell).not.toHaveBeenCalled();
    });

    it('↑ y ↓ guardan y pasan a la misma columna de la fila de arriba o de abajo, salteando los detalles', () => {
        const { apretar, handleCommit } = editor([filas[0], filas[1], filaDetalle, filas[2]]);
        expect(apretar(1, 'codigo', 'ArrowDown', 'abc', 1)).toBe(true);
        expect(destino()).toEqual({ rowIdx: 3, idx: 2 });
        expect(apretar(3, 'codigo', 'ArrowUp')).toBe(true);
        expect(destino()).toEqual({ rowIdx: 1, idx: 2 });
        expect(handleCommit).toHaveBeenCalledTimes(2);
    });

    it('↑ en la primera fila y ↓ en la última no hacen nada (tampoco guardan)', () => {
        const { apretar, handleCommit } = editor();
        expect(apretar(0, 'nombre', 'ArrowUp')).toBe(true);
        expect(apretar(2, 'nombre', 'ArrowDown')).toBe(true);
        expect(handleCommit).not.toHaveBeenCalled();
        expect(selectCell).not.toHaveBeenCalled();
    });

    it('← y → a mitad del texto solo mueven el cursor: no guardan, no cierran el editor y no se cancelan', () => {
        const { apretar, handleCommit } = editor();
        expect(apretar(1, 'nombre', 'ArrowLeft', 'abc', 1)).toBe(false);
        expect(apretar(1, 'nombre', 'ArrowRight', 'abc', 1)).toBe(false);
        expect(handleCommit).not.toHaveBeenCalled();
        expect(selectCell).not.toHaveBeenCalled();
    });

    it('← con el cursor al principio guarda y pasa a la celda de la izquierda; en la primera editable no tiene adónde ir', () => {
        const { apretar, handleCommit } = editor();
        expect(apretar(1, 'codigo', 'ArrowLeft', 'abc', 0)).toBe(true);
        expect(destino()).toEqual({ rowIdx: 1, idx: 1 });
        expect(handleCommit).toHaveBeenCalledTimes(1);
        expect(apretar(1, 'nombre', 'ArrowLeft', 'abc', 0)).toBe(true);
        expect(handleCommit).toHaveBeenCalledTimes(1);
    });

    it('→ al final del texto necesita apretarse dos veces seguidas; con el texto vacío deja la celda a la primera', () => {
        const { apretar, handleCommit } = editor();
        apretar(1, 'nombre', 'x', 'abc');
        expect(apretar(1, 'nombre', 'ArrowRight', 'abc')).toBe(false);
        expect(handleCommit).not.toHaveBeenCalled();
        expect(apretar(1, 'nombre', 'ArrowRight', 'abc')).toBe(true);
        expect(destino()).toEqual({ rowIdx: 1, idx: 2 });
        expect(handleCommit).toHaveBeenCalledTimes(1);
        apretar(1, 'nombre', 'x', '');
        expect(apretar(1, 'nombre', 'ArrowRight', '')).toBe(true);
        expect(handleCommit).toHaveBeenCalledTimes(2);
    });

    it('→ no salta de fila: en la última celda editable no tiene adónde ir', () => {
        const { apretar, handleCommit } = editor();
        expect(apretar(1, 'codigo', 'ArrowRight', '')).toBe(true);
        expect(handleCommit).not.toHaveBeenCalled();
    });

    it('con Ctrl las teclas no son de la grilla, y las demás teclas tampoco', () => {
        const { apretar, handleCommit } = editor();
        expect(apretar(1, 'nombre', 'ArrowDown', 'abc', 3, { ctrlKey: true })).toBe(false);
        expect(apretar(1, 'nombre', 'a')).toBe(false);
        expect(handleCommit).not.toHaveBeenCalled();
    });
});
