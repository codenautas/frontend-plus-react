import { useCallback } from 'react';
import { useApiCall } from './useApiCall';
import { FilaDeDatos, TableDefinition } from '../types';
import { requerido } from '../utils/errores';

/** Lo que devuelve table_record_save: la fila como quedó en la base (con lo que calcularon triggers y valores por omisión) */
export interface RespuestaDeGuardado {
    row?: FilaDeDatos;
}

export interface SaveRecordParams {
    tableDefinition: TableDefinition; // se guarda en la tabla que nombra su definición (`name`), no en la física (`tableName`)
    isNewRow: boolean;
    formData: FilaDeDatos; // The entire row state after changes (or potential updated row)
    initialData: FilaDeDatos; // The row before the change
    targetFieldName?: string; // If provided, it's an update to a specific field. Si no, asume mandar todo (o si es $new)
}

export const useTableRecordSave = () => {
    const { callApi, loading, error } = useApiCall();

    const saveRecord = useCallback(async ({
        tableDefinition,
        isNewRow,
        formData,
        initialData,
        targetFieldName
    }: SaveRecordParams) => {
        const status = isNewRow ? 'new' : 'update';
        let rowToSend: FilaDeDatos = {};

        if (isNewRow) {
            tableDefinition.fields.forEach(fieldDef => {
                const fieldValue = formData[fieldDef.name];
                if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') {
                    rowToSend[fieldDef.name] = fieldValue;
                } else if (tableDefinition.primaryKey.includes(fieldDef.name) && (fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '')) {
                     // Conservamos pk vacías para backend-plus
                     rowToSend[fieldDef.name] = fieldValue;
                }
            });
            delete rowToSend['$new'];
        } else {
            // Es un update, a un campo específico (como InputRenderer y VerticalEditor autosave)
            if (targetFieldName) {
                rowToSend[targetFieldName] = formData[targetFieldName];
            } else {
                // Por si se quiere guardar la fila entera forzosamente
                Object.keys(formData).forEach(key => {
                    if (formData[key] !== initialData[key]) {
                        rowToSend[key] = formData[key];
                    }
                });
            }
            // como backend-plus: en un update `newRow` lleva solo lo que cambió; la clave viaja aparte (`primaryKeyValues`).
            // Si se agregara, un campo con `table` (de otra tabla) dejaría la tabla principal con un update de solo claves
            // («orden de modificación sin columnas a modificar»).
        }

        const primaryKeyValuesForBackend = isNewRow ? [] : tableDefinition.primaryKey.map(key => initialData[key]);

        const response = await callApi<RespuestaDeGuardado>('table_record_save', {
            // como backend-plus (`depot.def.name`): el servidor busca la definición por este nombre. Una definición que guarda en
            // otra tabla (`tableName`, con campos de `table`) no existe con el nombre de la física: ahí faltarían sus campos
            table: tableDefinition.name,
            primaryKeyValues: primaryKeyValuesForBackend,
            newRow: rowToSend,
            oldRow: isNewRow ? {} : initialData,
            status
        });

        return requerido(response, 'la respuesta del guardado');
    }, [callApi]);

    return { saveRecord, loading, error };
};
