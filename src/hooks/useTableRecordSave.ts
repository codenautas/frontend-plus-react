import { useCallback } from 'react';
import { useApiCall } from './useApiCall';
import { TableDefinition } from '../types';

export interface SaveRecordParams {
    tableName: string;
    tableDefinition: TableDefinition;
    isNewRow: boolean;
    formData: Record<string, any>; // The entire row state after changes (or potential updated row)
    initialData: Record<string, any>; // The row before the change
    targetFieldName?: string; // If provided, it's an update to a specific field. Si no, asume mandar todo (o si es $new)
}

export const useTableRecordSave = () => {
    const { callApi, loading, error } = useApiCall();

    const saveRecord = useCallback(async ({
        tableName,
        tableDefinition,
        isNewRow,
        formData,
        initialData,
        targetFieldName
    }: SaveRecordParams) => {
        const status = isNewRow ? 'new' : 'update';
        let rowToSend: Record<string, any> = {};

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
            
            tableDefinition.primaryKey.forEach(pkField => {
                rowToSend[pkField] = formData[pkField];
            });
        }

        const primaryKeyValuesForBackend = isNewRow ? [] : tableDefinition.primaryKey.map(key => initialData[key]);

        const response = await callApi('table_record_save', {
            table: tableName,
            primaryKeyValues: primaryKeyValuesForBackend,
            newRow: rowToSend,
            oldRow: isNewRow ? {} : initialData,
            status
        });

        return response;
    }, [callApi]);

    return { saveRecord, loading, error };
};
