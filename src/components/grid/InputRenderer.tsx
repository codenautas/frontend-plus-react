import { useCallback, useMemo, useState } from "react";
import { Column } from "react-data-grid";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { useApiCall } from "../../hooks/useApiCall";
import InputBase from "@mui/material/InputBase";
// Importamos CellFeedbackMap junto con InputRendererProps
import { InputRendererProps, CellFeedback, CellFeedbackMap } from "../../types"; 
// getCellKey y getPrimaryKeyValues deben provenir de tu archivo GenericDataGrid
import { getCellKey, getPrimaryKeyValues, NEW_ROW_INDICATOR } from "./GenericDataGrid"; 
import { useTheme } from "@mui/material";

function findChangedValues(oldRowData:any, newRowData:any, isNewRow: boolean) {
  let changes: string[] = [];
  for (const key in newRowData) {
    // Si la propiedad existe en ambos Y el valor es diferente, O es una nueva fila
    if (Object.prototype.hasOwnProperty.call(oldRowData, key) && oldRowData[key] !== newRowData[key] || isNewRow ) {
      changes.push(key);
    }
  }
  return changes;
}

function InputRenderer<R extends Record<string, any>, S>({
    column,
    row,
    rowIdx,
    tableDefinition,
    onRowChange,
    onClose,
    cellFeedbackMap, // Tipo: CellFeedbackMap
    setCellFeedbackMap, // Tipo: Dispatch<SetStateAction<CellFeedbackMap>>
    onKeyPress,
    setTableData,
    setLocalCellChanges,
    localCellChanges,
    primaryKey
}: InputRendererProps<R, S>) {
    const tableName = tableDefinition.tableName!;
    const [editingValue, setEditingValue] = useState(row[column.key]);
    const theme = useTheme();
    const { showSuccess, showError } = useSnackbar();
    
    // Generamos la clave única usando la función importada
    const cellKey = getCellKey(row, column.key, primaryKey);
    
    // --- LÍNEA CORREGIDA ---
    // Asumimos que cellFeedbackMap es un Map<string, CellFeedback>
    const currentCellFeedback = cellFeedbackMap.get(cellKey);
    // ------------------------
    
    let cellBackgroundColor;
    if (currentCellFeedback) {
        cellBackgroundColor = currentCellFeedback.type === 'error' ? theme.palette.error.light : theme.palette.success.light;
    }
    
    const initialRowId = useMemo(() => getPrimaryKeyValues(row, primaryKey), [row, primaryKey]);
    const { callApi } = useApiCall();

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
            return;
        }

        const oldRowData = { ...row };
        const primaryKeyValuesForBackend = tableDefinition.primaryKey.map(key => potentialUpdatedRow[key]);
        const currentRowIdBeforeUpdate = getPrimaryKeyValues(oldRowData, tableDefinition.primaryKey); 

        onRowChange({ ...row, [column.key]: processedNewValue } as R, true);
        
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
                persistedRowData = response.row;
                const isPrimaryKeyColumn = tableDefinition.primaryKey.includes(column.key);
                finalRowIdForFeedback = isPrimaryKeyColumn
                    ? getPrimaryKeyValues(potentialUpdatedRow, tableDefinition.primaryKey)
                    : currentRowIdBeforeUpdate;
                onRowChange({ ...response.row } as R, true);
            }

            // --- MULTI-FEEDBACK DE ÉXITO ---
            const changes = findChangedValues(oldRowData, response.row, isNewRow);
            setCellFeedbackMap(prevFeedback => {
                // Siempre usamos new Map(prevFeedback) para garantizar inmutabilidad
                const newFeedback = new Map(prevFeedback);
                
                changes.forEach((key) => {
                    // Creamos la clave única de forma más robusta (idealmente usando getCellKey)
                    const keyForMap = `${finalRowIdForFeedback}-${key}`; 
                    newFeedback.set(keyForMap, { rowId: finalRowIdForFeedback, columnKey: key, type: 'success' } as CellFeedback);
                });

                return newFeedback;
            });
            // -------------------------------

        } catch (err: any) {
            console.error('Error al guardar el registro:', err);
            
            // --- MULTI-FEEDBACK DE ERROR ---
            const keyForMap = `${currentRowIdBeforeUpdate}-${column.key}`;
            setCellFeedbackMap(prevFeedback => {
                // Siempre usamos new Map(prevFeedback) para garantizar inmutabilidad
                const newFeedback = new Map(prevFeedback); 
                newFeedback.set(keyForMap, { 
                    rowId: currentRowIdBeforeUpdate, 
                    columnKey: column.key, 
                    type: 'error', 
                    message: err.message 
                } as CellFeedback);
                return newFeedback;
            });
            // -------------------------------
        }
    }, [
        column, row, onRowChange, tableName, tableDefinition.primaryKey,
        tableDefinition.fields, showSuccess, showError, setCellFeedbackMap, onClose, 
        setTableData, setLocalCellChanges, localCellChanges, initialRowId
    ]);

    const handleKeyDown = useCallback(async(event: React.KeyboardEvent) => {
        if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp','ArrowRight', 'ArrowLeft', 'F4'].includes(event.key)) {
            await handleCommit(editingValue, true, true);
            if (onKeyPress) {
                onKeyPress(rowIdx, column.key, event, handleCommit);
            }
        }
    }, [handleCommit, editingValue, column.key, rowIdx, onKeyPress]);

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
                backgroundColor: cellBackgroundColor,
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            disabled={!isFieldEditable}
        />
    );
}

export default InputRenderer;