import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { NEW_ROW_INDICATOR } from '../../components/grid/GenericDataGrid';
import { getPrimaryKeyValues } from '../../components/grid/utils/helpers';
import { FixedField, TableDefinition, CallApiOptions } from '../../types';
import { ImportOptions } from '../../components/grid/ImportDialog';

interface UseGridActionsProps {
    tableDefinition: TableDefinition | null,
    tableName: string,
    fixedFields?: FixedField[];
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    setSelectedRows: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
    primaryKey: string[],
    setLocalCellChanges: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>,
    setExitingRowIds: React.Dispatch<React.SetStateAction<Set<string>>>,
    callApi: (procedureName: string, params: Record<string, any>, opts?: CallApiOptions) => Promise<any | undefined>;
    callApiUpload: (procedureName: string, file: File, params: Record<string, any>, opts?: CallApiOptions) => Promise<any | undefined>;
}

export const useGridActions = ({
    tableDefinition, tableName, fixedFields, setTableData,
    setSelectedRows, primaryKey, setLocalCellChanges,
    setExitingRowIds, callApi, callApiUpload
}: UseGridActionsProps) => {

    const [rowToDelete, setRowToDelete] = useState<any | null>(null);
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();

    useEffect(() => {
        setLocalCellChanges(new Map());
        setOpenConfirmDialog(false);
        setRowToDelete(null);
    }, [tableName, setLocalCellChanges]);

    const handleAddRow = useCallback((currentRow?: any) => {
        if (!tableDefinition) {
            showWarning('No se puede agregar una fila sin la definición de la tabla.');
            return;
        }
        const newRow: Record<string, any> = {};
        tableDefinition.fields.forEach(field => {
            newRow[field.name] = null;
        });
        newRow[NEW_ROW_INDICATOR] = true;

        if (fixedFields) {
            fixedFields.forEach(fixedField => {
                newRow[fixedField.fieldName] = fixedField.value;
            });
        }

        setTableData(prevData => {
            if (currentRow) {
                const currentRowId = getPrimaryKeyValues(currentRow, primaryKey);
                const index = prevData.findIndex(row => getPrimaryKeyValues(row, primaryKey) === currentRowId);

                if (index !== -1) {
                    const newData = [...prevData];
                    newData.splice(index + 1, 0, newRow);
                    return newData;
                }
            }
            return [newRow, ...prevData];
        });
        setSelectedRows(new Set());

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

    }, [tableDefinition, fixedFields, primaryKey, showWarning, setTableData, setSelectedRows, setLocalCellChanges]);

    const handleDeleteRow = useCallback((row: any) => {
        setRowToDelete(row);
        setOpenConfirmDialog(true);
    }, []);

    const handleConfirmDelete = useCallback(async (confirm: boolean) => {
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

        setExitingRowIds(prev => new Set(prev).add(rowId));

        setTimeout(async () => {
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

            try {
                const primaryKeyValues = tableDefinition.primaryKey.map((key) => rowToDelete[key]);
                await callApi('table_record_delete', {
                    table: tableName,
                    primaryKeyValues: primaryKeyValues
                }, { isCritical: false });

                console.log(`Fila con ID ${rowId} eliminada exitosamente del backend.`);
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
    }, [
        rowToDelete, tableDefinition, tableName, primaryKey,
        showInfo, showSuccess, showError, showWarning,
        setTableData, setLocalCellChanges, setSelectedRows,
        setExitingRowIds, callApi
    ]);

    const handleImportFile = useCallback(async (file: File, options: ImportOptions) => {
        try {
            const result = await callApiUpload('table_upload', file, {
                table: tableName,
                prefilledFields: fixedFields,
                ...options
            }, { isCritical: false });

            if (result && result.uploaded) {
                const { inserted, updated, skipped, deleted, skippedColumns } = result.uploaded;
                const messages = [];
                if (inserted > 0) messages.push(`${inserted} fila(s) insertada(s).`);
                if (updated > 0) messages.push(`${updated} fila(s) actualizada(s).`);
                if (skipped > 0) messages.push(`${skipped} fila(s) omitida(s).`);
                if (deleted > 0) messages.push(`${deleted} fila(s) eliminada(s).`);
                if (skippedColumns?.length > 0) messages.push(`Columnas omitidas: ${skippedColumns.join(', ')}`);

                showSuccess(messages.join('\n') || 'Importación finalizada sin cambios detectados.');

                // Refrescar los datos después de la importación
                const newData = await callApi('table_data', {
                    table: tableName,
                    fixedFields: fixedFields
                });
                setTableData(newData);
            } else if (result && result.message) {
                showSuccess(result.message);
            }
        } catch (err: any) {
            console.error('Error durante la importación:', err);
            showError(`Importación cancelada: ${err.message || 'Error desconocido'}`);
        }
    }, [tableName, fixedFields, callApiUpload, callApi, showSuccess, showError, setTableData]);

    return {
        handleDeleteRow,
        handleConfirmDelete,
        handleAddRow,
        handleImportFile,
        openConfirmDialog,
        rowToDelete,
    };
};