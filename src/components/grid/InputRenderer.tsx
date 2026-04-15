import React, { useCallback, useMemo, useState } from "react";
import { Column } from "react-data-grid";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { useApiCall } from "../../hooks/useApiCall";
import { useTableRecordSave } from "../../hooks/useTableRecordSave";
import InputBase from "@mui/material/InputBase";
// Importamos CellFeedbackMap junto con InputRendererProps
import { InputRendererProps, CellFeedback, CellFeedbackMap } from "../../types";
// getCellKey deben provenir de tu archivo GenericDataGrid
import { NEW_ROW_INDICATOR } from "./GenericDataGrid";
import { useTheme } from "@mui/material";
import { getPrimaryKeyValues, getCellKey, isNumericType, sameValue } from "./utils/helpers";
import { getBestTypedValue } from "./utils/typedControls";
// @ts-ignore
import typeStore from 'type-store';


function findChangedValues(oldRowData: any, newRowData: any, isNewRow: boolean) {
    let changes: string[] = [];
    for (const key in newRowData) {
        // Si la propiedad existe en ambos Y el valor es diferente, O es una nueva fila
        if (Object.prototype.hasOwnProperty.call(oldRowData, key) && oldRowData[key] !== newRowData[key] || isNewRow) {
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
    const fieldDefinition = tableDefinition.fields.find(f => f.name === column.key);
    const typer = useMemo(() => typeStore.typerFrom(fieldDefinition), [fieldDefinition]);
    const [editingValue, setEditingValue] = useState(() => row[column.key] !== null ? isNumericType(fieldDefinition?.typeName) ? row[column.key] : typer.toLocalString(row[column.key]) : null);
    const isCommitInProgress = React.useRef(false);

    const theme = useTheme();
    const { showSuccess, showError } = useSnackbar();
    const { saveRecord } = useTableRecordSave();
    const tableName = tableDefinition.tableName!;


    // Generamos la clave única para la celda manualmente usando el formato esperado
    const rowId = getPrimaryKeyValues(row, primaryKey);
    const cellKey = `${rowId}-${column.key}`;

    // Asumimos que cellFeedbackMap es un Map<string, CellFeedback>
    const currentCellFeedback = cellFeedbackMap.get(cellKey);
    // ------------------------

    const isMandatory = tableDefinition.primaryKey.includes(column.key) || (fieldDefinition?.nullable === false);
    const isEmpty = editingValue === null || editingValue === undefined || String(editingValue).trim() === '';

    let cellBackgroundColor;
    let cellBorderColor = '#ccc';

    if (currentCellFeedback) {
        cellBackgroundColor = currentCellFeedback.type === 'error' ? theme.palette.error.light : theme.palette.success.light;
        cellBorderColor = currentCellFeedback.type === 'error' ? theme.palette.error.main : theme.palette.success.main;
    }

    const initialRowId = useMemo(() => getPrimaryKeyValues(row, primaryKey), [row, primaryKey]);

    const handleCommit = useCallback(async (currentValue: any, closeEditor: boolean, focusNextCell: boolean) => {
        if (isCommitInProgress.current) return;
        isCommitInProgress.current = true;

        let processedNewValue;
        try {
            // Usamos la lógica de BestControls portada de TypedControls.js a getBestTypedValue
            processedNewValue = getBestTypedValue(currentValue, typer);
            // Validamos contra el esquema del typer
            typer.validateTypedData(processedNewValue);
        } catch (err: any) {
            showError(err.message);
            isCommitInProgress.current = false;
            return; // Detenemos el commit ante errores
        }


        const potentialUpdatedRow = { ...row, [column.key]: processedNewValue } as R;

        const arePKValuesFilled = tableDefinition.primaryKey.every(key =>
            potentialUpdatedRow[key] !== undefined && potentialUpdatedRow[key] !== null && String(potentialUpdatedRow[key]).trim() !== ''
        );
        const isNewRow = !arePKValuesFilled || potentialUpdatedRow[NEW_ROW_INDICATOR];

        const isMandatoryField = tableDefinition.primaryKey.includes(column.key) || (tableDefinition.fields.find(f => f.name === column.key)?.nullable === false);
        const isMandatoryFieldEmpty = isNewRow && isMandatoryField && (processedNewValue === null || processedNewValue === undefined || String(processedNewValue).trim() === '');

        // Usamos sameValue para una comparación robusta (Dates, nulls, etc)
        if (sameValue(processedNewValue, row[column.key]) && !isNewRow && !isMandatoryFieldEmpty) {
            console.log("No se guardó: el valor no cambió.");
            isCommitInProgress.current = false;
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
                isCommitInProgress.current = false;
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

        try {
            const response = await saveRecord({
                tableName,
                tableDefinition,
                isNewRow,
                formData: potentialUpdatedRow,
                initialData: oldRowData,
                targetFieldName: column.key
            });


            const responseRow = response.row;

            let finalRowIdForFeedback: string;
            let persistedRowData: R;

            if (response.row && isNewRow) {
                persistedRowData = { ...responseRow } as R;
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
                persistedRowData = responseRow as R;
                const isPrimaryKeyColumn = tableDefinition.primaryKey.includes(column.key);
                finalRowIdForFeedback = isPrimaryKeyColumn
                    ? getPrimaryKeyValues(potentialUpdatedRow, tableDefinition.primaryKey)
                    : currentRowIdBeforeUpdate;
                onRowChange({ ...responseRow } as R, true);
            }

            // --- MULTI-FEEDBACK DE ÉXITO ---
            const changes = findChangedValues(oldRowData, responseRow, isNewRow);
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
        } finally {
            if (!closeEditor) {
                isCommitInProgress.current = false;
            }
        }
    }, [
        column, row, onRowChange, tableName, tableDefinition.primaryKey,
        tableDefinition.fields, showSuccess, showError, setCellFeedbackMap, onClose,
        setTableData, setLocalCellChanges, localCellChanges, initialRowId, typer
    ]);


    const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
        if (event.key === 'F4') {
            event.preventDefault();
            if (onKeyPress) {
                onKeyPress(rowIdx, column.key, event, handleCommit);
            }
            return;
        }

        if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) {
            await handleCommit(editingValue, true, true);
            if (onKeyPress) {
                onKeyPress(rowIdx, column.key, event, handleCommit);
            }
        }
    }, [handleCommit, editingValue, column.key, rowIdx, onKeyPress]);

    const handleBlur = useCallback(() => {
        handleCommit(editingValue, true, false);
    }, [handleCommit, editingValue]);

    const isFieldEditable = fieldDefinition?.editable !== false;

    const isNumeric = isNumericType(fieldDefinition?.typeName);

    return (
        <InputBase
            autoFocus
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={isMandatory ? '*' : ''}
            className={editingValue === '--' ? 'typed-controls-signal-no-data' : editingValue === '//' ? 'typed-controls-signal-unknown-data' : ''}
            sx={{
                width: '100%',
                margin: '0',
                border: `1px solid ${cellBorderColor}`,
                borderRadius: '4px',
                padding: '2px 4px',
                fontSize: '0.8rem',
                boxSizing: 'border-box',
                backgroundColor: cellBackgroundColor,
                input: {
                    textAlign: isNumeric ? 'right' : 'left',
                }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={!isFieldEditable}
        />

    );
}

export default InputRenderer;