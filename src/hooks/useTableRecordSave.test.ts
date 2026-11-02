import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { TableDefinition } from 'backend-plus';
import { ParametrosDeProcedimiento } from '../types';

const callApi = vi.fn<(procedimiento: string, parametros: ParametrosDeProcedimiento) => Promise<{ row: Record<string, unknown> }>>();
vi.mock('./useApiCall', () => ({ useApiCall: () => ({ callApi, loading: false, error: null }) }));

import { useTableRecordSave } from './useTableRecordSave';

const definicion: TableDefinition = {
    name: 'hoja_ruta',
    primaryKey: ['operativo', 'enc'],
    fields: [
        { name: 'operativo', typeName: 'text' },
        { name: 'enc', typeName: 'text' },
        { name: 'estado', typeName: 'text' },
        { name: 'sensibilizado', typeName: 'boolean', table: 'tem' },
    ],
};

const fila = { operativo: 'GGS', enc: '100', estado: 'A', sensibilizado: null };

describe('useTableRecordSave', () => {
    beforeEach(() => {
        callApi.mockReset();
        callApi.mockResolvedValue({ row: fila });
    });

    it('en un update newRow lleva solo lo que cambió, sin la clave (como backend-plus): con un campo de otra tabla (table) la principal quedaría con un update de solo claves', async () => {
        const { result } = renderHook(() => useTableRecordSave());
        await result.current.saveRecord({
            tableDefinition: definicion,
            isNewRow: false,
            formData: { ...fila, sensibilizado: true },
            initialData: fila,
            targetFieldName: 'sensibilizado',
        });
        const [procedimiento, parametros] = callApi.mock.calls[0];
        expect(procedimiento).toBe('table_record_save');
        expect(parametros.newRow).toEqual({ sensibilizado: true });
        expect(parametros.primaryKeyValues).toEqual(['GGS', '100']);
        expect(parametros.oldRow).toEqual(fila);
        expect(parametros.status).toBe('update');
    });

    it('si se cambia una columna de la clave, esa columna sí viaja en newRow y la clave vieja en primaryKeyValues', async () => {
        const { result } = renderHook(() => useTableRecordSave());
        await result.current.saveRecord({
            tableDefinition: definicion,
            isNewRow: false,
            formData: { ...fila, enc: '101' },
            initialData: fila,
            targetFieldName: 'enc',
        });
        const [, parametros] = callApi.mock.calls[0];
        expect(parametros.newRow).toEqual({ enc: '101' });
        expect(parametros.primaryKeyValues).toEqual(['GGS', '100']);
    });
});

describe('useTableRecordSave: definición que guarda en otra tabla', () => {
    it('se guarda con el nombre de la definición (def.name), no con el de la tabla física (tableName): el servidor busca ahí los campos con table', async () => {
        callApi.mockReset();
        callApi.mockResolvedValue({ row: fila });
        const definicionDeVista: TableDefinition = { ...definicion, name: 'areas_asignacion_general', tableName: 'areas' };
        const { result } = renderHook(() => useTableRecordSave());
        await result.current.saveRecord({
            tableDefinition: definicionDeVista,
            isNewRow: false,
            formData: { ...fila, estado: 'B' },
            initialData: fila,
            targetFieldName: 'estado',
        });
        expect(callApi.mock.calls[0][1].table).toBe('areas_asignacion_general');
    });
});
