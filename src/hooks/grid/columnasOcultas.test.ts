import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { TableDefinition } from 'backend-plus';
import { DefaultColumn } from '../../components/grid/GenericDataGrid';
import { useGridColumns } from './useGridColumns';

const definicion: TableDefinition = {
    name: 'personas',
    primaryKey: ['id'],
    fields: [
        { name: 'id', typeName: 'integer' },
        { name: 'nombre', typeName: 'text' },
        { name: 'saldo', typeName: 'decimal' },
        { name: 'interno', typeName: 'text', visible: false },
    ],
};

function clavesDeColumnas(columnasOcultas: string[]): string[] {
    const sinAccion = () => undefined;
    const { result } = renderHook(() => useGridColumns({
        tableDefinition: definicion, anchosCalculados: new Map(), primaryKey: ['id'], columnasOcultas: new Set(columnasOcultas), ocultarColumna: sinAccion,
        setTableData: sinAccion, handleKeyPressInEditor: () => false, registrarEditor: () => sinAccion, handleDeleteRow: sinAccion, handleAddRow: sinAccion,
        handleVerticalEditRow: sinAccion, toggleFilterVisibility: sinAccion, abrirOpcionesDeGrilla: sinAccion,
    }));
    return result.current.columns.filter((columna): columna is DefaultColumn => columna.customType === 'default').map(columna => columna.key);
}

describe('useGridColumns con columnas ocultas', () => {
    it('sin ocultas están todos los campos', () => {
        expect(clavesDeColumnas([])).toEqual(['id', 'nombre', 'saldo']);
    });

    it('un campo con visible:false no se dibuja nunca, ni siquiera sin columnas ocultas ni al mostrar todas', () => {
        expect(clavesDeColumnas([])).not.toContain('interno');
        expect(clavesDeColumnas(['id'])).not.toContain('interno');
    });

    it('las columnas ocultas no se dibujan (y mostrarlas las devuelve en su lugar)', () => {
        expect(clavesDeColumnas(['saldo'])).toEqual(['id', 'nombre']);
        expect(clavesDeColumnas(['id', 'nombre'])).toEqual(['saldo']);
    });
});
