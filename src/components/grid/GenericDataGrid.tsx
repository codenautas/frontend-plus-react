// src/components/GenericDataGrid.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataGrid, Column, DataGridHandle, CellMouseArgs, RenderCellProps, RenderHeaderCellProps, RenderSummaryCellProps, ColSpanArgs, CellSelectArgs, CellKeyDownArgs, CellKeyboardEvent, CellMouseEvent } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

import { useApiCall } from '../../hooks/useApiCall';
import { CircularProgress, Typography, Box, Alert, useTheme, Button } from '@mui/material';
import { cambiarGuionesBajosPorEspacios } from '../../utils/functions';


import { useSnackbar } from '../../contexts/SnackbarContext';

import { CellFeedback, FieldDefinition, FixedField, TableDefinition } from '../../types';

import { ConfirmDialog } from '../ConfirmDialog';
import { DataGridOptionsDialog } from './DataGridOptionsDialog';

import { actionsColumnHeaderCellRenderer, defaultColumnHeaderCellRenderer, detailColumnCellHeaderRenderer } from './renderers/headerCellRenderers';
import { actionsColumnSummaryCellRenderer, defaultColumnSummaryCellRenderer, detailColumnCellSummaryRenderer } from './renderers/summaryCellRenderers';
import { allColumnsCellRenderer } from './renderers/cellRenderers';
import { allColumnsEditCellRenderer } from './renderers/editCellRenderers';
import { DetailTable } from 'backend-plus';
import { EmptyRowsRenderer } from './renderers/emptyRowRenderer';
import { useIsDrawerOpen } from '../../store';
import { buildMenuOptions } from './menu/options';

interface GenericDataGridProps{
    tableName: string;
    fixedFields?: FixedField[];
    gridStyles?: React.CSSProperties
}

export const NEW_ROW_INDICATOR = '$new';
export const DETAIL_ROW_INDICATOR = '$detail';

// --- Funciones de Utilidad ---

export const getPrimaryKeyValues = (row: Record<string, any>, primaryKey: string[]): string => {
    let keys = [...primaryKey];
    if(row[DETAIL_ROW_INDICATOR]){
        keys = keys.concat(DETAIL_ROW_INDICATOR);
    }
    return keys.map(key => {
        return row[key] !== undefined && row[key] !== null
            ? String(row[key])
            : 'NULL_OR_UNDEFINED';
    }).join('|');
};

/**
 * Obtiene la clave única para una celda.
 * @param row La fila actual.
 * @param columnKey La clave de la columna.
 * @param primaryKey La clave primaria de la tabla.
 * @returns Clave única de la celda (ej: "pkValue1|pkValue2|columnKey").
 */
export const getCellKey = (row: Record<string, any>, columnKey: string, primaryKey: string[]): string => {
    return `${getPrimaryKeyValues(row, primaryKey)}|${columnKey}`;
};

// --- Tipos de Columna ---

interface BaseCustomColumn<TRow, TSummaryRow = unknown> extends Column<TRow, TSummaryRow> {
    customType: 'default' | 'detail' | 'action',
    tableDefinition: TableDefinition,
}

export interface DefaultColumn<TRow, TSummaryRow = unknown> extends BaseCustomColumn<TRow, TSummaryRow> {
    customType: 'default';
    fieldDef: FieldDefinition;
    // 💥 MULTI-CELL FEEDBACK: Se cambia a un mapa
    cellFeedbackMap: Map<string, CellFeedback>, 
    setCellFeedbackMap: React.Dispatch<React.SetStateAction<Map<string, CellFeedback>>>,
    setTableData: React.Dispatch<React.SetStateAction<any[]>>,
    primaryKey: string[],
    fixedFields: FixedField[] | undefined,
    localCellChanges: Map<string, Set<string>>,
    setLocalCellChanges: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>,
    handleKeyPressInEditor: (rowIndex: number, columnKey: string, event:React.KeyboardEvent, currentColumns: Column<any>[], handleCommit:(currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => void
}

export interface DetailColumn<TRow, TSummaryRow = unknown> extends BaseCustomColumn<TRow, TSummaryRow> {
    customType: 'detail';
    detailTable: DetailTable,
    primaryKey: string[],
    tableData: any[],
    setTableData: React.Dispatch<React.SetStateAction<any[]>>,
    detailKey: string
}

export interface ActionColumn<TRow, TSummaryRow = unknown> extends BaseCustomColumn<TRow, TSummaryRow> {
    customType: 'action';
    handleDeleteRow: (row: any) => void;
    handleAddRow: () => void
}

export type CustomColumn<TRow, TSummaryRow = unknown> =
    | DefaultColumn<TRow, TSummaryRow>
    | DetailColumn<TRow, TSummaryRow>
    | ActionColumn<TRow, TSummaryRow>;

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
    tableName,
    fixedFields,
    gridStyles,
}) => {
    const isOpenMenu = useIsDrawerOpen()
    const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [isFilterRowVisible, setIsFilterRowVisible] = useState<boolean>(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<string> => new Set());
    const [selectedCell, setSelectedCell] = useState<CellSelectArgs<any, NoInfer<{id: string}>> | undefined>(undefined);

    // 💥 MULTI-CELL FEEDBACK: Estado principal para manejar múltiples mensajes de feedback
    const [cellFeedbackMap, setCellFeedbackMap] = useState<Map<string, CellFeedback>>(new Map());
    
    // 🗑️ OLD: [cellFeedback, setCellFeedback] = useState<CellFeedback | null>(null);

    const [localCellChanges, setLocalCellChanges] = useState<Map<string, Set<string>>>(new Map());
    const theme = useTheme();

    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [openDataGridOptions, setOpenDataGridOptions] = useState(false);
    const [dataGridOptionsAnchorEl, setDataGridOptionsAnchorEl] = useState<HTMLElement | null>(null);
    const [rowToDelete, setRowToDelete] = useState<any | null>(null);
    const [exitingRowIds, setExitingRowIds] = useState<Set<string>>(new Set());

    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dataGridRef = useRef<DataGridHandle>(null);
    const { callApi, loading, error } = useApiCall();

    const getRowCount = () => tableData.filter((row)=> !row[DETAIL_ROW_INDICATOR]).length
    const getFilteredRowCount = () => filteredRows.filter((row)=> !row[DETAIL_ROW_INDICATOR]).length
    
    // 💥 MULTI-CELL: Limpieza de estado al cambiar de tabla
    useEffect(() => {
        setFilters({});
        setIsFilterRowVisible(false);
        setSelectedRows(new Set());
        setTableDefinition(null);
        setTableData([]);
        setCellFeedbackMap(new Map()); // 💥 MULTI-CELL: Limpiar el mapa
        setLocalCellChanges(new Map());
        setOpenConfirmDialog(false);
        setRowToDelete(null);
        setExitingRowIds(new Set());
        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
        }
    }, [tableName]);

    useEffect(() => {
        const fetchDataAndDefinition = async () => {
            try {
                const definition: TableDefinition = await callApi('table_structure', { table: tableName });
                setTableDefinition(definition);
                const data = await callApi('table_data', {
                    table: tableName,
                    fixedFields: fixedFields
                });
                setTableData(data);
            } catch (err: any) {
                setTableDefinition(null);
                setTableData([]);
                showError(`Error al cargar datos para la tabla '${tableName}': ${err.message || 'Error desconocido'}`);
            } finally { }
        };
        fetchDataAndDefinition();
    }, [tableName, fixedFields, showError]);

    // 💥 MULTI-CELL: Lógica del temporizador actualizada para el mapa
    useEffect(() => {
        if (cellFeedbackMap.size > 0) {
            if (feedbackTimerRef.current) {
                clearTimeout(feedbackTimerRef.current);
            }
            const timerDuration = 3000;
            feedbackTimerRef.current = setTimeout(() => {
                setCellFeedbackMap(prevMap => {
                    const newMap = new Map(prevMap);
                    let mapChanged = false;
                    
                    // Solo eliminamos el feedback de tipo 'success' automáticamente
                    for (const [cellId, feedback] of prevMap.entries()) {
                        if (feedback.type === 'success') {
                            newMap.delete(cellId);
                            mapChanged = true;
                        }
                    }
                    
                    // Retorna el nuevo mapa solo si hubo cambios
                    return mapChanged ? newMap : prevMap;
                });
                feedbackTimerRef.current = null;
            }, timerDuration);
        }
        return () => {
            if (feedbackTimerRef.current) {
                clearTimeout(feedbackTimerRef.current);
            }
        };
    }, [cellFeedbackMap]);


    const primaryKey = useMemo(() => {
        if (!tableDefinition) return ['id'];
        return tableDefinition.primaryKey && tableDefinition.primaryKey.length > 0 ? tableDefinition.primaryKey : ['id'];
    }, [tableDefinition]);

    const toggleFilterVisibility = useCallback(() => {
        setIsFilterRowVisible(prev => {
            if (prev) {
                setFilters({});
            }
            return !prev;
        });
    }, []);

    const handleAddRow = useCallback(() => {
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

        setTableData(prevData => [newRow, ...prevData]);
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

    }, [tableDefinition, showWarning, primaryKey, fixedFields]);

    const handleDeleteRow = useCallback(async (row: any) => {
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
                });

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
    }, [rowToDelete, tableDefinition, tableName, primaryKey, showInfo, showSuccess, showError, showWarning, setTableData, setLocalCellChanges, setSelectedRows]);

    const filteredRows = useMemo(() => {
        let rows = tableData;
        if (isFilterRowVisible) {
            Object.keys(filters).forEach(key => {
                const filterValue = filters[key].toLowerCase();
                if (filterValue) {
                    rows = rows.filter(row => {
                        const cellValue = String(row[key] || '').toLowerCase();
                        return cellValue.includes(filterValue);
                    });
                }
            });
        }
        return rows;
    }, [tableData, filters, isFilterRowVisible]);

    const handleKeyPressInEditor = useCallback((rowIndex: number, columnKey: string, event: React.KeyboardEvent, currentColumns: Column<any>[], handleCommit:(currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => {
        if (dataGridRef.current && tableDefinition) {
            const currentColumnIndex = currentColumns.findIndex((col: Column<any>) => col.key === columnKey);
            const editableColumns = currentColumns.filter(col => {
                const fieldDefinition = tableDefinition.fields.find(f => f.name === col.key);
                return col.key !== 'actionsColumn' && (col as DetailColumn<any, unknown>).customType != 'detail' && (fieldDefinition?.editable !== false && !fieldDefinition?.clientSide);
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
                        while(filteredRows[nextRowIndex] && filteredRows[nextRowIndex][DETAIL_ROW_INDICATOR]){
                            nextRowIndex++;
                        }
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
                    while(filteredRows[nextRowIndex] && filteredRows[nextRowIndex][DETAIL_ROW_INDICATOR]){
                        nextRowIndex++;
                    }                    
                    if (nextRowIndex >= filteredRows.length) {
                        return {rowIdx: rowIndex, idx:currentColumnIndex}
                    }
                    return {rowIdx: nextRowIndex, idx:currentColumnIndex}
                }

                const calcularFilaAnterior = ()=>{
                    let nextRowIndex = rowIndex;
                    nextRowIndex--;
                    while(filteredRows[nextRowIndex] && filteredRows[nextRowIndex][DETAIL_ROW_INDICATOR]){
                        nextRowIndex--;
                    }  
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
                        case (key == 'ArrowRight'): {
                            const cursorPosition = input.selectionStart;
                            const inputValueLength = input.value.length;
                            if(cursorPosition === inputValueLength){
                                hacerFoco(calcularColumnaSiguiente());
                            }
                            break;
                        }
                        case (key == 'ArrowLeft'): {
                            const cursorPosition = input.selectionStart;
                            if(cursorPosition === 0){
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
                            const {rowIdx, idx} = calcularFilaSiguiente();
                            const previousRow = tableData[rowIndex-1]
                            if(previousRow && !previousRow[DETAIL_ROW_INDICATOR]){
                                handleCommit(previousRow[columnKey], true, true).then(()=>hacerFoco({rowIdx ,idx}))
                            }
                            break;
                        }
                        default: break;
                    }
                }    
            }        
        }
    }, [filteredRows, tableDefinition, tableData]);
    
    const handleSelectedCellChange = useCallback((args: CellSelectArgs<any, NoInfer<{id: string}>>|undefined) => {
        setSelectedCell(args);
    }, []);
    
    
    const menuOptions = useMemo(() => buildMenuOptions({
        tableDefinition,
        tableName,
        fixedFields,
        setTableData,
        callApi,
        showSuccess,
        showError,
        showWarning
    }), [tableDefinition, tableName, fixedFields, setTableData, callApi, showSuccess, showError, showWarning]);
    const columns: CustomColumn<any>[] = useMemo(() => {
        if (!tableDefinition) return [];
        const fieldsToShow = tableDefinition.fields.filter((field: FieldDefinition) => {
            const fixedFieldEntry = fixedFields?.find(f => f.fieldName === field.name);
            return !(fixedFieldEntry && fixedFieldEntry.until === undefined);
        });
        const defaultColumns: CustomColumn<any>[] = fieldsToShow.map((fieldDef: FieldDefinition) => {
            const isFixedField = fixedFields?.some(f => f.fieldName === fieldDef.name);
            const isFieldEditable = fieldDef.editable !== false && !isFixedField;

            return {
                key: fieldDef.name,
                customType: 'default',
                tableDefinition,
                fieldDef,
                // 💥 MULTI-CELL: Se inyecta el mapa y su setter
                cellFeedbackMap,
                setCellFeedbackMap,
                primaryKey,
                fixedFields,
                localCellChanges,
                setLocalCellChanges,
                setTableData,
                name: fieldDef.label || cambiarGuionesBajosPorEspacios(fieldDef.name),
                resizable: true,
                sortable: true,
                editable: isFieldEditable,
                handleKeyPressInEditor,
                flexGrow: 1,
                minWidth: 60,     
                renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => defaultColumnHeaderCellRenderer(props, fieldDef),
                renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => defaultColumnSummaryCellRenderer(props, fixedFields, isFilterRowVisible, filters, setFilters),
            };
        });

        // Calcular ancho dinámico basado en botones disponibles
        const availableActions = [
            tableDefinition.allow?.insert,
            tableDefinition.allow?.delete,
            tableDefinition.allow?.['vertical-edit']
        ].filter(Boolean).length;
        
        const actionColumnWidth = availableActions === 0 ? 30 : 12 + (availableActions * 25);

        const actionsColumn: CustomColumn<any> = {
            key: 'actionsColumn',
            customType: 'action',
            tableDefinition,
            handleDeleteRow,
            handleAddRow,
            name: 'filterCol',
            width: actionColumnWidth,
            editable: false,
            resizable: false,
            sortable: false,            
            renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => actionsColumnHeaderCellRenderer(props, isFilterRowVisible, toggleFilterVisibility, (e: React.MouseEvent<HTMLElement>) => { 
                setDataGridOptionsAnchorEl(e.currentTarget); 
                setOpenDataGridOptions(true); 
            }),
            renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => actionsColumnSummaryCellRenderer(props),
        };        const detailColumns: CustomColumn<any>[] = [];
        if (tableDefinition.detailTables && tableDefinition.detailTables.length > 0) {
            tableDefinition.detailTables.forEach(detailTable => {
                const detailKey = `detail_${detailTable.abr}`;
                detailColumns.push({
                    key: detailKey,
                    customType: 'detail',
                    tableDefinition,
                    detailTable,
                    primaryKey,
                    tableData,
                    setTableData,
                    detailKey,
                    name: detailTable.label || `Detalle ${detailTable.abr}`,
                    resizable: false,
                    sortable: false,
                    editable: false,
                    width:30,
                    minWidth: 30,                  
                    renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => detailColumnCellHeaderRenderer(props, detailTable),
                    renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => detailColumnCellSummaryRenderer(props),
                });
            });
        }
        
        const allColumns = [
            actionsColumn,
            ...detailColumns,
            ...defaultColumns,
        ];

        return allColumns.map(col => ({
            ...col,
            colSpan: (args: ColSpanArgs<any, unknown>) => {
                if (args.type === 'ROW'){
                    const detailTableAbr = args.row[DETAIL_ROW_INDICATOR];
                    if(col.key === `detail_${detailTableAbr}`) {
                        return allColumns.length;
                    }
                }
                return undefined;
            },
            editorOptions:{closeOnExternalRowChange:false}, //con esto no se pierde el foco
            renderEditCell: (props) => allColumnsEditCellRenderer(props, allColumns),
            renderCell: (props: RenderCellProps<any, unknown>) => allColumnsCellRenderer(props),
        }));
    }, [
        tableDefinition, isFilterRowVisible, filters, toggleFilterVisibility,
        // 💥 MULTI-CELL: Se usa el mapa en lugar de la variable simple
        cellFeedbackMap, 
        primaryKey, theme.palette.success.light, theme.palette.error.light,
        theme.palette.info.light, theme.palette.action.selected,
        handleKeyPressInEditor, setTableData,
        localCellChanges, handleDeleteRow, handleAddRow, fixedFields, tableData
    ]);

    const handleRowsChange = useCallback((updatedRows: any[]) => {
        setTableData(updatedRows);
    }, []);

    //TODO: mejorar esto, por ahora no encontré una forma programática
    const deselectAllOtherGrids = (currentGridElement: HTMLDivElement|undefined|null) => {
        const allSelectedCells = document.querySelectorAll("div[aria-selected='true']");
        allSelectedCells.forEach(cell => {
            const parentGrid = cell.closest('.rdg'); 
            if (parentGrid && parentGrid !== currentGridElement) {
                cell.setAttribute("aria-selected", "false");
            }
        });
    };

    const handleCellKeyDown = (args: CellKeyDownArgs<any, { id: string }>, event: CellKeyboardEvent) => {
        if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp','ArrowRight', 'ArrowLeft'].includes(event.key)) {
            event.preventGridDefault();
        }
    }
    const handleCellMouseDown = useCallback((_args: CellMouseArgs<any, { id: string }>, event: CellMouseEvent) => {
        event.preventGridDefault();  
    },[]);

    const handlCellDoubleClick = useCallback((_args: CellMouseArgs<any, { id: string }>, event: CellMouseEvent) => {
        event.preventGridDefault();  
    },[]);

    const handleCellClick = useCallback((args: CellMouseArgs<any, { id: string }>, _event: CellMouseEvent) => {
        const fieldDefinition = tableDefinition?.fields.find(f => f.name === args.column.key);
        const isFixedField = fixedFields?.some(f => f.fieldName === args.column.key);
        const isEditable = fieldDefinition?.editable !== false && !isFixedField;
        if(isEditable){
            deselectAllOtherGrids(dataGridRef.current?.element);
            args.selectCell(true);
        }
        console.log("Clicked column index:", args.column.idx);
        console.log("Clicked row index:", args.rowIdx);
        console.log("Is editable:", isEditable);
    }, [tableDefinition, fixedFields]);

   
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Cargando tabla...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="error">{error.message}</Alert>
            </Box>
        );
    }

    if (!tableDefinition) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="warning">No se pudo cargar la definición de la tabla.</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <Box
                sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    padding: theme.spacing(1),
                    textAlign: 'left',
                    fontWeight: 'bold',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    borderTopLeftRadius: theme.shape.borderRadius,
                    borderTopRightRadius: theme.shape.borderRadius,
                    ml: 2,
                    mr: 2
                }}
            >
                <Typography variant="subtitle2" component="div">
                    {cambiarGuionesBajosPorEspacios(tableDefinition.title || tableDefinition.name)} - {getFilteredRowCount() === getRowCount() ? `${getRowCount()} registros`
                    : `${getFilteredRowCount()} (F)`
                    }
                </Typography>
            </Box>
            <Box
                sx={{
                    flexGrow: 1,
                    boxSizing: 'border-box',
                    position: 'relative',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    px: 2,
                    pb: 2,
                }}
            >
                <DataGrid
                    className='rdg-light'
                    ref={dataGridRef}
                    //@ts-ignore TODO: arreglar este tipo
                    columns={columns}
                    rows={filteredRows.map(row => ({
                        ...row,
                        style: exitingRowIds.has(getPrimaryKeyValues(row, primaryKey))
                            ? { maxHeight: 0, opacity: 0, overflow: 'hidden' }
                            : { maxHeight: '35px', opacity: 1 }
                    }))}
                    enableVirtualization={true}
                    rowKeyGetter={(row: any) => getPrimaryKeyValues(row, primaryKey)}
                    onSelectedRowsChange={setSelectedRows}
                    onSelectedCellChange={handleSelectedCellChange}
                    onRowsChange={handleRowsChange}
                    selectedRows={selectedRows}
                    // TODO: Arreglar tamaño fijo pasarlo a dinamico
                    rowHeight={(row) => row[DETAIL_ROW_INDICATOR] ? 400 : 30}
                    style={{...{ height: '100%', width: '100%', boxSizing: 'border-box' },...gridStyles}}
                    headerRowHeight={30}
                    topSummaryRows={isFilterRowVisible ? [{ id: 'filterRow' }] : undefined}
                    summaryRowHeight={isFilterRowVisible ? 30 : 0}
                    renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                    onCellMouseDown={handleCellMouseDown}
                    onCellDoubleClick={handlCellDoubleClick}
                    onCellClick={handleCellClick}
                    onCellKeyDown={handleCellKeyDown}
                />
            </Box>
            <ConfirmDialog
                open={openConfirmDialog}
                onClose={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={rowToDelete && rowToDelete[NEW_ROW_INDICATOR]
                    ? `¿Estás seguro de que quieres eliminar esta nueva fila (ID: ${getPrimaryKeyValues(rowToDelete, primaryKey)}) localmente?`
                    : rowToDelete
                        ? `¿Estás seguro de que quieres eliminar la fila con ID: ${getPrimaryKeyValues(rowToDelete, primaryKey)} de la base de datos? Esta acción es irreversible.`
                        : '¿Estás seguro de que quieres eliminar este registro? Esta acción es irreversible.'
                }
            />
            <DataGridOptionsDialog
                open={openDataGridOptions}
                onClose={() => setOpenDataGridOptions(false)}
                options={menuOptions}
                anchorEl={dataGridOptionsAnchorEl}
            />
        </Box>
    );
};
export default GenericDataGrid;
