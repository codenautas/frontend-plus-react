// src/components/grid/actions/eventHandlers.ts
import React from 'react';
import {
    Column,
    CellSelectArgs,
    CellKeyDownArgs,
    CellMouseArgs,
    CellKeyboardEvent,
    CellMouseEvent,
    DataGridHandle
} from 'react-data-grid';
import { TableDefinition, FixedField } from '../../../types';
import { DETAIL_ROW_INDICATOR } from '../utils/helpers';
import { DetailColumn } from '../GenericDataGrid';

/**
 * Parámetros para handleKeyPressInEditor
 */
export interface HandleKeyPressInEditorParams {
    rowIndex: number;
    columnKey: string;
    event: React.KeyboardEvent;
    currentColumns: Column<any>[];
    handleCommit: (currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>;
    dataGridRef: React.RefObject<DataGridHandle>;
    tableDefinition: TableDefinition | null;
    filteredRows: any[];
    tableData: any[];
}

/**
 * Maneja la navegación con teclado dentro de un editor de celda
 * Soporta: Enter, Tab, flechas, F4
 */
export const handleKeyPressInEditor = (params: HandleKeyPressInEditorParams): void => {
    const {
        rowIndex,
        columnKey,
        event,
        currentColumns,
        handleCommit,
        dataGridRef,
        tableDefinition,
        filteredRows,
        tableData
    } = params;

    if (dataGridRef.current && tableDefinition) {
        const currentColumnIndex = currentColumns.findIndex((col: Column<any>) => col.key === columnKey);
        const editableColumns = currentColumns.filter(col => {
            const fieldDefinition = tableDefinition.fields.find(f => f.name === col.key);
            return col.key !== 'actionsColumn' &&
                (col as DetailColumn<any, unknown>).customType != 'detail' &&
                (fieldDefinition?.editable !== false && !fieldDefinition?.clientSide);
        });

        const { key, target } = event;
        const input = target as HTMLInputElement;

        if (currentColumnIndex !== -1 && editableColumns.length > 0) {
            const editableColumnKeys = editableColumns.map(col => col.key);
            let currentEditableColumnIndex = editableColumnKeys.indexOf(columnKey);

            const hacerFoco = ({ rowIdx, idx }: { rowIdx: number, idx: number }) =>
                setTimeout(() => dataGridRef.current?.selectCell({ rowIdx, idx }, { enableEditor: true, shouldFocusCell: true }), 10);

            const calcularColumnaSiguiente = () => {
                let nextEditableColumnIndex = currentEditableColumnIndex + 1;
                let nextRowIndex = rowIndex;
                if (nextEditableColumnIndex >= editableColumns.length) {
                    nextEditableColumnIndex = 0;
                    nextRowIndex++;
                    while (filteredRows[nextRowIndex] && filteredRows[nextRowIndex][DETAIL_ROW_INDICATOR]) {
                        nextRowIndex++;
                    }
                    if (nextRowIndex >= filteredRows.length) {
                        nextRowIndex = 0;
                    }
                }
                const nextColumnKey = editableColumnKeys[nextEditableColumnIndex];
                const nextColumnIndex = currentColumns.findIndex(col => col.key === nextColumnKey);
                return { rowIdx: nextRowIndex, idx: nextColumnIndex }
            }

            const calcularColumnaAnterior = () => {
                let nextEditableColumnIndex = currentEditableColumnIndex - 1;
                let nextRowIndex = rowIndex;
                if (nextEditableColumnIndex <= 0) {
                    nextEditableColumnIndex = 0;
                }
                const nextColumnKey = editableColumnKeys[nextEditableColumnIndex];
                const nextColumnIndex = currentColumns.findIndex(col => col.key === nextColumnKey);
                return { rowIdx: nextRowIndex, idx: nextColumnIndex }
            }

            const calcularFilaSiguiente = () => {
                let nextRowIndex = rowIndex;
                nextRowIndex++;
                while (filteredRows[nextRowIndex] && filteredRows[nextRowIndex][DETAIL_ROW_INDICATOR]) {
                    nextRowIndex++;
                }
                if (nextRowIndex >= filteredRows.length) {
                    return { rowIdx: rowIndex, idx: currentColumnIndex }
                }
                return { rowIdx: nextRowIndex, idx: currentColumnIndex }
            }

            const calcularFilaAnterior = () => {
                let nextRowIndex = rowIndex;
                nextRowIndex--;
                while (filteredRows[nextRowIndex] && filteredRows[nextRowIndex][DETAIL_ROW_INDICATOR]) {
                    nextRowIndex--;
                }
                if (nextRowIndex < 0) {
                    return { rowIdx: rowIndex, idx: currentColumnIndex }
                }
                return { rowIdx: nextRowIndex, idx: currentColumnIndex }
            }

            if (currentEditableColumnIndex !== -1) {
                switch (true) {
                    case ['Enter', 'Tab'].includes(key): {
                        hacerFoco(calcularColumnaSiguiente());
                        break;
                    }
                    case (key == 'ArrowRight'): {
                        const cursorPosition = input.selectionStart;
                        const inputValueLength = input.value.length;
                        if (cursorPosition === inputValueLength) {
                            hacerFoco(calcularColumnaSiguiente());
                        }
                        break;
                    }
                    case (key == 'ArrowLeft'): {
                        const cursorPosition = input.selectionStart;
                        if (cursorPosition === 0) {
                            hacerFoco(calcularColumnaAnterior());
                        }
                        break;
                    }
                    case (key == 'ArrowUp'): {
                        hacerFoco(calcularFilaAnterior());
                        break;
                    }
                    case (key == 'ArrowDown'): {
                        hacerFoco(calcularFilaSiguiente());
                        break;
                    }
                    case (key == 'F4'): {
                        const { rowIdx, idx } = calcularFilaSiguiente();
                        const previousRow = tableData[rowIndex - 1]
                        if (previousRow && !previousRow[DETAIL_ROW_INDICATOR]) {
                            handleCommit(previousRow[columnKey], true, true).then(() => hacerFoco({ rowIdx, idx }))
                        }
                        break;
                    }
                    default: break;
                }
            }
        }
    }
};

/**
 * Parámetros para handleSelectedCellChange
 */
export interface HandleSelectedCellChangeParams {
    args: CellSelectArgs<any, NoInfer<{ id: string }>> | undefined;
    setSelectedCell: React.Dispatch<React.SetStateAction<CellSelectArgs<any, NoInfer<{ id: string }>> | undefined>>;
}

/**
 * Maneja el cambio de celda seleccionada
 */
export const handleSelectedCellChange = (params: HandleSelectedCellChangeParams): void => {
    const { args, setSelectedCell } = params;
    setSelectedCell(args);
};

/**
 * Parámetros para handleCellKeyDown
 */
export interface HandleCellKeyDownParams {
    args: CellKeyDownArgs<any, { id: string }>;
    event: CellKeyboardEvent;
}

/**
 * Maneja las teclas presionadas en una celda
 * Previene el comportamiento por defecto para navegación
 */
export const handleCellKeyDown = (params: HandleCellKeyDownParams): void => {
    const { event } = params;
    if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) {
        event.preventGridDefault();
    }
};

/**
 * Parámetros para handleCellMouseDown
 */
export interface HandleCellMouseDownParams {
    args: CellMouseArgs<any, { id: string }>;
    event: CellMouseEvent;
}

/**
 * Maneja el evento de mouse down en una celda
 */
export const handleCellMouseDown = (params: HandleCellMouseDownParams): void => {
    const { event } = params;
    event.preventGridDefault();
};

/**
 * Parámetros para handleCellDoubleClick
 */
export interface HandleCellDoubleClickParams {
    args: CellMouseArgs<any, { id: string }>;
    event: CellMouseEvent;
}

/**
 * Maneja el doble click en una celda
 */
export const handleCellDoubleClick = (params: HandleCellDoubleClickParams): void => {
    const { event } = params;
    event.preventGridDefault();
};

/**
 * Parámetros para handleCellClick
 */
export interface HandleCellClickParams {
    args: CellMouseArgs<any, { id: string }>;
    event: CellMouseEvent;
    tableDefinition: TableDefinition | null;
    fixedFields?: FixedField[];
    deselectAllOtherGrids: (currentGridElement: HTMLDivElement | undefined) => void;
}

/**
 * Maneja el click en una celda
 * Si la celda es editable, la selecciona y abre el editor
 */
export const handleCellClick = (params: HandleCellClickParams): void => {
    const { args, tableDefinition, fixedFields, deselectAllOtherGrids } = params;

    const fieldDefinition = tableDefinition?.fields.find(f => f.name === args.column.key);
    const isFixedField = fixedFields?.some(f => f.fieldName === args.column.key);
    const isEditable = fieldDefinition?.editable !== false && !isFixedField;

    if (isEditable) {
        deselectAllOtherGrids(args.selectCell as any); // TODO: Fix type
        args.selectCell(true);
    }

    console.log("Clicked column index:", args.column.idx);
    console.log("Clicked row index:", args.rowIdx);
    console.log("Is editable:", isEditable);
};
