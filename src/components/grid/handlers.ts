// src/components/grid/actions/handlers.ts
import React from 'react';
import { TableDefinition, FixedField } from '../../../types';
import { NEW_ROW_INDICATOR, getPrimaryKeyValues } from '../utils/helpers';

/**
 * Parámetros para handleAddRow
 */
export interface HandleAddRowParams {
    tableDefinition: TableDefinition | null;
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    setSelectedRows: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
    setLocalCellChanges: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>;
    primaryKey: string[];
    fixedFields?: FixedField[];
    showWarning: (message: string) => void;
}

/**
 * Agrega una nueva fila vacía a la grilla
 * La fila se marca como NEW_ROW_INDICATOR hasta que se guarde en BD
 */
export const handleAddRow = (params: HandleAddRowParams): void => {
    const {
        tableDefinition,
        setTableData,
        setSelectedRows,
        setLocalCellChanges,
        primaryKey,
        fixedFields,
        showWarning
    } = params;

    if (!tableDefinition) {
        showWarning('No se puede agregar una fila sin la definición de la tabla.');
        return;
    }

    // Crear fila vacía con todos los campos en null
    const newRow: Record<string, any> = {};
    tableDefinition.fields.forEach(field => {
        newRow[field.name] = null;
    });
    newRow[NEW_ROW_INDICATOR] = true;

    // Aplicar valores fijos si existen
    if (fixedFields) {
        fixedFields.forEach(fixedField => {
            newRow[fixedField.fieldName] = fixedField.value;
        });
    }

    // Agregar la fila al inicio del array
    setTableData(prevData => [newRow, ...prevData]);
    setSelectedRows(new Set());

    // Marcar las columnas obligatorias para edición
    const tempRowId = getPrimaryKeyValues(newRow, primaryKey);
    setLocalCellChanges(prev => {
        const newMap = new Map(prev);
        const mandatoryEditableColumns = new Set<string>();

        tableDefinition.fields.forEach(field => {
            const isMandatory = (field.nullable === false || field.isPk);
            const isEditable = field.editable !== false;

            if (isMandatory && isEditable) {
                mandatoryEditableColumns.add(field.name);
            }
        });
        newMap.set(tempRowId, mandatoryEditableColumns);
        return newMap;
    });
};

/**
 * Parámetros para handleDeleteRow
 */
export interface HandleDeleteRowParams {
    row: any;
    setRowToDelete: React.Dispatch<React.SetStateAction<any>>;
    setOpenConfirmDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Inicia el proceso de eliminación de una fila
 * Muestra el diálogo de confirmación
 */
export const handleDeleteRow = (params: HandleDeleteRowParams): void => {
    const { row, setRowToDelete, setOpenConfirmDialog } = params;
    setRowToDelete(row);
    setOpenConfirmDialog(true);
};

/**
 * Parámetros para handleConfirmDelete
 */
export interface HandleConfirmDeleteParams {
    confirm: boolean;
    rowToDelete: any;
    tableDefinition: TableDefinition | null;
    tableName: string;
    primaryKey: string[];
    setOpenConfirmDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setRowToDelete: React.Dispatch<React.SetStateAction<any>>;
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    setLocalCellChanges: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>;
    setSelectedRows: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
    setExitingRowIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    callApi: (service: string, params: any) => Promise<any>;
    showInfo: (message: string) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
}

/**
 * Confirma y ejecuta la eliminación de una fila
 * Si es una fila nueva (no guardada), la elimina localmente
 * Si es una fila existente, la elimina en BD y luego localmente
 */
export const handleConfirmDelete = async (params: HandleConfirmDeleteParams): Promise<void> => {
    const {
        confirm,
        rowToDelete,
        tableDefinition,
        tableName,
        primaryKey,
        setOpenConfirmDialog,
        setRowToDelete,
        setTableData,
        setLocalCellChanges,
        setSelectedRows,
        setExitingRowIds,
        callApi,
        showInfo,
        showSuccess,
        showError,
        showWarning
    } = params;

    setOpenConfirmDialog(false);

    if (!confirm || !rowToDelete) {
        showWarning('Eliminación cancelada por el usuario.');
        setRowToDelete(null);
        return;
    }

    if (!tableDefinition || !tableName) {
        showError('No se puede eliminar la fila sin la definición de la tabla o el nombre de la tabla.');
        setRowToDelete(null);
        return;
    }

    const rowId = getPrimaryKeyValues(rowToDelete, primaryKey);

    // Marcar la fila como "saliendo" para animación
    setExitingRowIds(prev => new Set(prev).add(rowId));

    setTimeout(async () => {
        // Si es una fila nueva (no guardada en BD), eliminar solo localmente
        if (rowToDelete[NEW_ROW_INDICATOR]) {
            setTimeout(() => {
                setTableData(prevData => prevData.filter(row => getPrimaryKeyValues(row, primaryKey) !== rowId));
                setLocalCellChanges(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(rowId);
                    return newMap;
                });
                setSelectedRows(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(rowId);
                    return newSet;
                });
                setExitingRowIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(rowId);
                    return newSet;
                });
                showInfo(`Fila no guardada '${rowId}' eliminada localmente.`);
                setRowToDelete(null);
            }, 500);
            return;
        }

        // Si es una fila existente, eliminar de BD
        try {
            const primaryKeyValues = tableDefinition.primaryKey.map((key) => rowToDelete[key]);
            await callApi('table_record_delete', {
                table: tableName,
                primaryKeyValues: primaryKeyValues
            });

            console.log(`Fila con ID ${rowId} eliminada exitosamente del backend.`);

            // Después de eliminar en BD, eliminar localmente
            setTimeout(() => {
                setTableData(prevData => prevData.filter(row => getPrimaryKeyValues(row, primaryKey) !== rowId));
                setLocalCellChanges(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(rowId);
                    return newMap;
                });
                setSelectedRows(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(rowId);
                    return newSet;
                });
                setExitingRowIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(rowId);
                    return newSet;
                });
                showSuccess(`Fila '${rowId}' eliminada exitosamente.`);
                setRowToDelete(null);
            }, 500);

        } catch (err: any) {
            console.error(`Error al eliminar la fila '${rowId}':`, err);
            showError(`Error al eliminar la fila '${rowId}': ${err.message || 'Error desconocido'}`);
            setExitingRowIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(rowId);
                return newSet;
            });
            setRowToDelete(null);
        }
    }, 10);
};
