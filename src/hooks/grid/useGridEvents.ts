import { TableDefinition } from 'backend-plus';
import { useCallback } from 'react';
import { CellMouseArgs, CellKeyDownArgs, CellMouseEvent, CellKeyboardEvent, DataGridHandle, Column, CellSelectArgs } from 'react-data-grid';
import { DetailColumn } from '../../components/grid/GenericDataGrid';
import { FixedField } from '../../types';

interface UseGridEventsProps {
    dataGridRef: React.RefObject<DataGridHandle>
    tableDefinition: TableDefinition | null,
    fixedFields: FixedField[] | undefined
    filteredRows: any[],
    tableData: any[],
    setSelectedCell: React.Dispatch<React.SetStateAction<CellSelectArgs<any, NoInfer<{id: string;}>> | undefined>>,
    setTableData: React.Dispatch<React.SetStateAction<any[]>>,
}

export const useGridEvents = ({dataGridRef, tableDefinition, filteredRows, tableData, fixedFields, setSelectedCell, setTableData}: UseGridEventsProps) => {

    const handleKeyPressInEditor = useCallback((rowIndex: number, columnKey: string, event: React.KeyboardEvent, currentColumns: Column<any>[], handleCommit:(currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => {
        if (dataGridRef.current && tableDefinition) {
            const currentColumnIndex = currentColumns.findIndex((col: Column<any>) => col.key === columnKey);
            const editableColumns = currentColumns.filter(col => {
                const fieldDefinition = tableDefinition.fields.find(f => f.name === col.key);
                return col.key !== 'actionsColumn' && (col as DetailColumn<any, unknown>).customType !== 'detail' && (fieldDefinition?.editable !== false && !fieldDefinition?.clientSide);
            });
            const {key, target} = event;
            const input = target as HTMLInputElement;

            if (currentColumnIndex !== -1 && editableColumns.length > 0) {
                const editableColumnKeys = editableColumns.map(col => col.key);
                let currentEditableColumnIndex = editableColumnKeys.indexOf(columnKey);
                
                const hacerFoco = ({rowIdx, idx}:{rowIdx:number, idx: number}) => 
                    setTimeout(()=>dataGridRef.current?.selectCell({ rowIdx, idx }, { enableEditor: true, shouldFocusCell: true }),10);
                
                const calcularColumnaSiguiente = ()=>{
                    let nextEditableColumnIndex = currentEditableColumnIndex + 1;
                    let nextRowIndex = rowIndex;
                    if (nextEditableColumnIndex >= editableColumns.length) {
                        nextEditableColumnIndex = 0;
                        nextRowIndex++;
                        if (nextRowIndex >= filteredRows.length) {
                            nextRowIndex = 0;
                        }
                    }
                    const nextColumnKey = editableColumnKeys[nextEditableColumnIndex];
                    const nextColumnIndex = currentColumns.findIndex(col => col.key === nextColumnKey);
                    return {rowIdx: nextRowIndex, idx:nextColumnIndex}
                }
                
                const calcularColumnaAnterior = ()=>{
                    let nextEditableColumnIndex = currentEditableColumnIndex - 1;
                    let nextRowIndex = rowIndex;
                    if (nextEditableColumnIndex <= 0) {
                        nextEditableColumnIndex = 0;
                    }
                    const nextColumnKey = editableColumnKeys[nextEditableColumnIndex];
                    const nextColumnIndex = currentColumns.findIndex(col => col.key === nextColumnKey);
                    return {rowIdx: nextRowIndex, idx:nextColumnIndex}
                }
                
                const calcularFilaSiguiente = ()=>{
                    let nextRowIndex = rowIndex;   
                    nextRowIndex++;               
                    if (nextRowIndex >= filteredRows.length) {
                        return {rowIdx: rowIndex, idx:currentColumnIndex}
                    }
                    return {rowIdx: nextRowIndex, idx:currentColumnIndex}
                }

                const calcularFilaAnterior = ()=>{
                    let nextRowIndex = rowIndex;
                    nextRowIndex--;
                    if (nextRowIndex < 0) {
                        return {rowIdx: rowIndex, idx:currentColumnIndex}
                    }
                    return {rowIdx: nextRowIndex, idx:currentColumnIndex}
                }
                
                if (currentEditableColumnIndex !== -1) {
                    switch(true){
                        case ['Enter','Tab'].includes(key): {
                            hacerFoco(calcularColumnaSiguiente());
                            break;
                        }
                        case (key === 'ArrowRight'): {
                            if (input && typeof input.selectionStart === 'number') {
                                const cursorPosition = input.selectionStart;
                                const inputValueLength = input.value?.length || 0;
                                if(cursorPosition === inputValueLength){
                                    hacerFoco(calcularColumnaSiguiente());
                                }
                            }
                            break;
                        }
                        case (key === 'ArrowLeft'): {
                            if (input && typeof input.selectionStart === 'number') {
                                const cursorPosition = input.selectionStart;
                                if(cursorPosition === 0){
                                    hacerFoco(calcularColumnaAnterior());
                                }
                            }
                            break;
                        }
                        case (key === 'ArrowUp'): {
                            hacerFoco(calcularFilaAnterior());
                            break;
                        }
                        case (key === 'ArrowDown'): {
                            hacerFoco(calcularFilaSiguiente());
                            break;
                        }
                        case (key === 'F4'): {
                            const {rowIdx, idx} = calcularFilaSiguiente();
                            const previousRow = tableData[rowIndex-1]
                            if(previousRow){
                                handleCommit(previousRow[columnKey], true, true).then(()=>hacerFoco({rowIdx ,idx}))
                            }
                            break;
                        }
                        default: break;
                    }
                }    
            }        
        }
    }, [filteredRows, tableDefinition, tableData, dataGridRef]); // Agregado dataGridRef por seguridad

    const handleCellKeyDown = useCallback((args: CellKeyDownArgs<any, { id: string }>, event: CellKeyboardEvent) => {
        if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp','ArrowRight', 'ArrowLeft'].includes(event.key)) {
            event.preventGridDefault();
        }
    }, []);

    const handleCellMouseDown = useCallback((_args: CellMouseArgs<any, { id: string }>, event: CellMouseEvent) => {
        event.preventGridDefault();  
    }, []);

    const handleCellDoubleClick = useCallback((_args: CellMouseArgs<any, { id: string }>, event: CellMouseEvent) => {
        event.preventGridDefault();  
    }, []);

    const handleSelectedCellChange = useCallback((args: CellSelectArgs<any, NoInfer<{id: string}>>|undefined) => {
        setSelectedCell(args);
    }, [setSelectedCell]);

    const handleCellClick = useCallback((args: CellMouseArgs<any, { id: string }>, _event: CellMouseEvent) => {
        const fieldDefinition = tableDefinition?.fields.find(f => f.name === args.column.key);
        const isFixedField = fixedFields?.some(f => f.fieldName === args.column.key);
        const isEditable = fieldDefinition?.editable !== false && !isFixedField;
        if(isEditable){
            args.selectCell(true);
        }
    }, [tableDefinition, fixedFields]);

    const handleRowsChange = useCallback((updatedRows: any[]) => {
        setTableData(updatedRows);
    }, [setTableData]);

    return {
        handleCellMouseDown,
        handleCellDoubleClick,
        handleCellClick,
        handleCellKeyDown,
        handleKeyPressInEditor,
        handleSelectedCellChange,
        handleRowsChange
    };
};