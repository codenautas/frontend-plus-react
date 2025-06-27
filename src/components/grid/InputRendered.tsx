import { useCallback, useMemo, useState } from "react";
import { Column } from "react-data-grid";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { useApiCall } from "../../hooks/useApiCall";
import InputBase from "@mui/material/InputBase";
import { InputRendererProps } from "../../types";
import { getPrimaryKeyValues, NEW_ROW_INDICATOR } from "./GenericDataGrid";

function InputRenderer<R extends Record<string, any>, S>({
    column,
    row,
    rowIdx,
    tableDefinition,
    onRowChange,
    onClose,
    setCellFeedback,
    onEnterPress,
    setTableData,
    setLocalCellChanges,
    localCellChanges,
    primaryKey
}: InputRendererProps<R, S>) {
    const tableName = tableDefinition.tableName!;
    const [editingValue, setEditingValue] = useState(row[column.key]);

    const { showSuccess, showError } = useSnackbar();

    const initialRowId = useMemo(() => getPrimaryKeyValues(row, primaryKey), [row, primaryKey]);
    const { callApi, loading, error } = useApiCall();
    const handleCommit = useCallback(async (currentValue: any, closeEditor: boolean, focusNextCell: boolean) => {
        const processedNewValue = typeof currentValue === 'string'
            ? (currentValue.trim() === '' ? null : currentValue.trim())
            : currentValue;

        const potentialUpdatedRow = { ...row, [column.key]: processedNewValue } as R;

        const arePKValuesFilled = tableDefinition.primaryKey.every(key =>
            potentialUpdatedRow[key] !== undefined && potentialUpdatedRow[key] !== null && String(potentialUpdatedRow[key]).trim() !== ''
        );
        const isNewRow = !arePKValuesFilled || potentialUpdatedRow[NEW_ROW_INDICATOR];

        const isMandatoryField = tableDefinition.primaryKey.includes(column.key) || (tableDefinition.fields.find(f => f.name === column.key)?.nullable === false);
        const isMandatoryFieldEmpty = isNewRow && isMandatoryField && (processedNewValue === null || processedNewValue === undefined || String(processedNewValue).trim() === '');

        if (processedNewValue === row[column.key] && !isNewRow && !isMandatoryFieldEmpty) {
            console.log("No se guardó: el valor no cambió (y no es una nueva fila o campo obligatorio vacío que se está iniciando).");
            onClose(false, focusNextCell);
            setLocalCellChanges(prev => {
                const newMap = new Map(prev);
                const columnKeys = newMap.get(initialRowId);
                if (columnKeys) {
                    columnKeys.delete(column.key);
                    if (columnKeys.size === 0) {
                        newMap.delete(initialRowId);
                    } else {
                        newMap.set(initialRowId, columnKeys);
                    }
                }
                return newMap;
            });
            return;
        }

        const oldRowData = { ...row };
        const primaryKeyValuesForBackend = tableDefinition.primaryKey.map(key => potentialUpdatedRow[key]);
        const currentRowIdBeforeUpdate = getPrimaryKeyValues(oldRowData, tableDefinition.primaryKey); // Usar oldRowData aquí

        onRowChange({ ...row, [column.key]: processedNewValue } as R, true);
        onClose(true, focusNextCell);

        if (isNewRow) {
            const areAllMandatoryFieldsFilled = tableDefinition.fields.every(fieldDef => {
                const isMandatory = (fieldDef.nullable === false || fieldDef.isPk);
                const fieldValue = potentialUpdatedRow[fieldDef.name];
                return !isMandatory || (fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== '');
            });

            if (!areAllMandatoryFieldsFilled) {
                console.log("Nueva fila: Faltan campos obligatorios. No se guarda en el backend todavía.");
                setLocalCellChanges(prev => {
                    const newMap = new Map(prev);
                    const currentColumnsInRow = newMap.get(initialRowId) || new Set();

                    tableDefinition.fields.forEach(fieldDef => {
                        const isMandatory = (fieldDef.nullable === false || fieldDef.isPk);
                        const isEditable = fieldDef.editable !== false;
                        const fieldValue = potentialUpdatedRow[fieldDef.name];
                        if (isMandatory && isEditable && (fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '')) {
                            currentColumnsInRow.add(fieldDef.name);
                        } else {
                            currentColumnsInRow.delete(fieldDef.name);
                        }
                    });
                    newMap.set(initialRowId, currentColumnsInRow);
                    return newMap;
                });
                return;
            } else {
                console.log("Nueva fila: Todos los campos obligatorios están llenos. Procediendo a guardar.");
                setLocalCellChanges(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(initialRowId);
                    return newMap;
                });
            }
        }
        
        const status = isNewRow ? 'new' : 'update';
        let rowToSend: Record<string, any> = {};
        if (isNewRow) {
            tableDefinition.fields.forEach(fieldDef => {
                const fieldValue = potentialUpdatedRow[fieldDef.name];
                if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') {
                    rowToSend[fieldDef.name] = fieldValue;
                } else if (tableDefinition.primaryKey.includes(fieldDef.name) && (fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '')) {
                    rowToSend[fieldDef.name] = fieldValue;
                }
            });
            if (localCellChanges.has(initialRowId)) {
                localCellChanges.get(initialRowId)?.forEach((colKey: string) => {
                    if (!rowToSend.hasOwnProperty(colKey)) {
                        rowToSend[colKey] = potentialUpdatedRow[colKey];
                    }
                });
            }
            delete rowToSend[NEW_ROW_INDICATOR];
        } else {
            rowToSend[column.key] = processedNewValue;
            tableDefinition.primaryKey.forEach(pkField => {
                rowToSend[pkField] = potentialUpdatedRow[pkField];
            });
        }
        try {
            const response = await callApi('table_record_save',{
                table:tableName,
                primaryKeyValues: primaryKeyValuesForBackend,
                newRow: rowToSend,
                oldRow: oldRowData,
                status
            });

            setLocalCellChanges(prev => {
                const newMap = new Map(prev);
                const columnKeys = newMap.get(initialRowId);
                if (columnKeys) {
                    columnKeys.delete(column.key);
                    if (columnKeys.size === 0) {
                        newMap.delete(initialRowId);
                    } else {
                        newMap.set(initialRowId, columnKeys);
                    }
                }
                return newMap;
            });
            showSuccess('Registro guardado exitosamente!');
            let finalRowIdForFeedback: string;
            let persistedRowData: R;

            if (response.row && isNewRow) {
                persistedRowData = { ...response.row };
                setTableData(prevData => {
                    const newData = [...prevData];
                    const originalRowId = getPrimaryKeyValues(oldRowData, tableDefinition.primaryKey);
                    const rowIndex = newData.findIndex(r => getPrimaryKeyValues(r, tableDefinition.primaryKey) === originalRowId);
                    if (rowIndex !== -1) {
                        newData[rowIndex] = persistedRowData;
                    } else {
                        console.warn("Fila no encontrada para actualizar después de la inserción. Podría haber un problema de sincronización.");
                        const newPrimaryKeyId = getPrimaryKeyValues(persistedRowData, tableDefinition.primaryKey);
                        const newRowIndex = newData.findIndex(r => getPrimaryKeyValues(r, tableDefinition.primaryKey) === newPrimaryKeyId);
                        if (newRowIndex !== -1) {
                            newData[newRowIndex] = persistedRowData;
                        }
                    }
                    return newData;
                });
                finalRowIdForFeedback = getPrimaryKeyValues(persistedRowData, tableDefinition.primaryKey);
            } else {
                persistedRowData = potentialUpdatedRow;
                const isPrimaryKeyColumn = tableDefinition.primaryKey.includes(column.key);
                finalRowIdForFeedback = isPrimaryKeyColumn
                    ? getPrimaryKeyValues(potentialUpdatedRow, tableDefinition.primaryKey)
                    : currentRowIdBeforeUpdate;
            }
            setCellFeedback({ rowId: finalRowIdForFeedback, columnKey: column.key, type: 'success' });
        } catch (err: any) {
            console.error('Error al guardar el registro:', err);
            setCellFeedback({ rowId: currentRowIdBeforeUpdate, columnKey: column.key, type: 'error' });
            onRowChange(oldRowData as R, true);
        }
    }, [
        column, row, onRowChange, tableName, tableDefinition.primaryKey,
        tableDefinition.fields, showSuccess, showError, setCellFeedback, onClose,
        setTableData, setLocalCellChanges, localCellChanges, initialRowId
    ]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleCommit(editingValue, true, true);
            event.preventDefault();

            if (onEnterPress) {
                onEnterPress(rowIdx, column.key);
            }
        } else if (event.key === 'Tab') {
            handleCommit(editingValue, true, true);
        }
    }, [handleCommit, editingValue, column.key, rowIdx, onEnterPress]);

    const handleBlur = useCallback(() => {
        handleCommit(editingValue, true, false);
    }, [handleCommit, editingValue]);

    const fieldDefinition = tableDefinition.fields.find(f => f.name === column.key);
    const isFieldEditable = fieldDefinition?.editable !== false;

    return (
        <InputBase
            value={editingValue === null ? '' : editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={''}
            sx={{
                width: '100%',
                margin: '0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '2px 4px',
                fontSize: '0.8rem',
                boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            disabled={!isFieldEditable}
        />
    );
}

export default InputRenderer