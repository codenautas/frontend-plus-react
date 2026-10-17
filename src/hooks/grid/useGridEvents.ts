import { TableDefinition } from 'backend-plus';
import { useCallback, useRef } from 'react';
import { CellMouseArgs, CellKeyDownArgs, CellMouseEvent, CellKeyboardEvent, DataGridHandle, Column, CellSelectArgs, RowsChangeData } from 'react-data-grid';
import { DetailColumn } from '../../components/grid/GenericDataGrid';
import { FixedField } from '../../types';
import { DOM_TEMP_ID } from '../../components/grid/utils/helpers';
import { SortColumn } from './useGridDataView';

interface UseGridEventsProps {
    dataGridRef: React.RefObject<DataGridHandle>
    tableDefinition: TableDefinition | null,
    fixedFields: FixedField[] | undefined
    filteredRows: any[],
    tableData: any[],
    setSelectedCell: React.Dispatch<React.SetStateAction<CellSelectArgs<any, NoInfer<{id: string;}>> | undefined>>,
    setTableData: React.Dispatch<React.SetStateAction<any[]>>,
    setSortColumns: React.Dispatch<React.SetStateAction<readonly SortColumn[]>>
}

export const useGridEvents = ({dataGridRef, tableDefinition, filteredRows, tableData, fixedFields, setSelectedCell, setTableData, setSortColumns}: UseGridEventsProps) => {

    // handleKeyPressInEditor viaja dentro de las columnas: tiene que ser estable para no recrearlas
    // en cada cambio de datos, así que lee las filas visibles y la definición a través de refs.
    const filteredRowsRef = useRef(filteredRows);
    filteredRowsRef.current = filteredRows;
    const tableDefinitionRef = useRef(tableDefinition);
    tableDefinitionRef.current = tableDefinition;

    const handleKeyPressInEditor = useCallback((rowIndex: number, columnKey: string, event: React.KeyboardEvent, currentColumns: Column<any>[], handleCommit:(currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => {
        const tableDefinition = tableDefinitionRef.current;
        const filteredRows = filteredRowsRef.current;
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
                            // no hace falta limpiar el orden: useGridDataView mantiene las filas en su lugar al editar
                            const {rowIdx, idx} = calcularFilaSiguiente();
                            const previousRow = filteredRows[rowIndex-1]
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
    }, [dataGridRef]);

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
            // antes se limpiaba el orden al clickear; ya no hace falta porque al editar
            // las filas no se reordenan hasta que el usuario cambie el orden o los filtros
            args.selectCell(true);
        }
    }, [tableDefinition, fixedFields]);

    const handleRowsChange = useCallback((updatedRows: any[], data: RowsChangeData<any, any>) => {
        // updatedRows son las filas visibles (filtradas y ordenadas), no todo tableData:
        // se reemplazan en tableData solo las filas editadas, buscándolas por identidad.
        const reemplazos = new Map<any, any>();
        data.indexes.forEach(index => {
            const oldRow = filteredRows[index];
            const newRow = updatedRows[index];
            if (!oldRow || !newRow) return;
            // Preservar la identidad (DOM_TEMP_ID) de las filas editadas
            if (oldRow[DOM_TEMP_ID] && !newRow[DOM_TEMP_ID]) {
                (newRow as any)[DOM_TEMP_ID] = oldRow[DOM_TEMP_ID];
            }
            reemplazos.set(oldRow, newRow);
        });
        if (reemplazos.size === 0) return;
        setTableData(prevData => prevData.map(row => reemplazos.get(row) ?? row));
    }, [setTableData, filteredRows]);

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