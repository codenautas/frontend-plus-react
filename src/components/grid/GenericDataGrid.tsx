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
import { buildMenuOptions } from './menu/options';
import { getPrimaryKeyValues } from './utils/helpers';
import { useGridActions } from '../../hooks/grid/useGridActions';
import { useGridEvents } from '../../hooks/grid/useGridEvents';
import { ImportDialog, ImportOptions } from './ImportDialog';

interface GenericDataGridProps {
    tableName: string;
    fixedFields?: FixedField[];
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string) => void;
    gridStyles?: React.CSSProperties
}

export const NEW_ROW_INDICATOR = '$new';
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
    handleKeyPressInEditor: (rowIndex: number, columnKey: string, event: React.KeyboardEvent, currentColumns: Column<any>[], handleCommit: (currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => void
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
    handleAddRow: (row?: any) => void;
}

export type CustomColumn<TRow, TSummaryRow = unknown> =
    | DefaultColumn<TRow, TSummaryRow>
    | DetailColumn<TRow, TSummaryRow>
    | ActionColumn<TRow, TSummaryRow>;

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
    tableName,
    fixedFields,
    gridStyles,
    onOpenDetail
}) => {
    const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [isFilterRowVisible, setIsFilterRowVisible] = useState<boolean>(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<string> => new Set());
    const [selectedCell, setSelectedCell] = useState<CellSelectArgs<any, NoInfer<{ id: string }>> | undefined>(undefined);

    const [cellFeedbackMap, setCellFeedbackMap] = useState<Map<string, CellFeedback>>(new Map());

    const [localCellChanges, setLocalCellChanges] = useState<Map<string, Set<string>>>(new Map());
    const theme = useTheme();

    const [openDataGridOptions, setOpenDataGridOptions] = useState(false);
    const [dataGridOptionsAnchorEl, setDataGridOptionsAnchorEl] = useState<HTMLElement | null>(null);

    const [exitingRowIds, setExitingRowIds] = useState<Set<string>>(new Set());

    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();
    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dataGridRef = useRef<DataGridHandle>(null);
    const [openImportDialog, setOpenImportDialog] = useState(false);
    const { callApi, callApiUpload, loading: apiLoading, error } = useApiCall();

    const getRowCount = () => tableData.length;
    const getFilteredRowCount = () => filteredRows.length;

    const primaryKey = useMemo(() => {
        if (!tableDefinition) return ['id'];
        return tableDefinition.primaryKey && tableDefinition.primaryKey.length > 0 ? tableDefinition.primaryKey : ['id'];
    }, [tableDefinition]);

    const { handleAddRow, handleConfirmDelete, handleDeleteRow, openConfirmDialog, rowToDelete } = useGridActions({
        tableDefinition, tableName, primaryKey,
        fixedFields, setExitingRowIds, setLocalCellChanges,
        setSelectedRows, setTableData
    });

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

    const { handleCellDoubleClick, handleCellClick, handleCellKeyDown, handleCellMouseDown, handleKeyPressInEditor, handleSelectedCellChange, handleRowsChange } = useGridEvents({
        dataGridRef, filteredRows, fixedFields, tableData, tableDefinition, setSelectedCell, setTableData
    });

    useEffect(() => {
        setFilters({});
        setIsFilterRowVisible(false);
        setSelectedRows(new Set());
        setTableDefinition(null);
        setTableData([]);
        setCellFeedbackMap(new Map());
        setLocalCellChanges(new Map());
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

    const toggleFilterVisibility = useCallback(() => {
        setIsFilterRowVisible(prev => {
            if (prev) {
                setFilters({});
            }
            return !prev;
        });
    }, []);

    const triggerImport = useCallback(() => {
        setOpenImportDialog(true);
    }, []);

    const handleImportFile = async (file: File, options: ImportOptions) => {
        try {
            const result = await callApiUpload('table_upload', file, {
                table: tableName,
                prefilledFields: fixedFields,
                ...options
            });

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
            // El error ya lo muestra el snackbar de useApiCall
        }
    };

    const menuOptions = useMemo(() => buildMenuOptions({
        tableDefinition,
        tableName,
        fixedFields,
        setTableData,
        callApi,
        showSuccess,
        showError,
        showWarning,
        triggerImport
    }), [tableDefinition, tableName, fixedFields, setTableData, callApi, showSuccess, showError, showWarning, triggerImport]);

    const columns: CustomColumn<any>[] = useMemo(() => {
        if (!tableDefinition) return [];
        const fieldsToShow = tableDefinition.fields/*.filter((field: FieldDefinition) => {
            const fixedFieldEntry = fixedFields?.find(f => f.fieldName === field.name);
            return !(fixedFieldEntry && fixedFieldEntry.until === undefined);
        })*/;
        const defaultColumns: CustomColumn<any>[] = fieldsToShow.map((fieldDef: FieldDefinition) => {
            const isFixedField = fixedFields?.some(f => f.fieldName === fieldDef.name);
            const isFieldEditable = fieldDef.editable !== false && !isFixedField;

            return {
                key: fieldDef.name,
                customType: 'default',
                tableDefinition,
                fieldDef,
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
                width: undefined,
                minWidth: 20,
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

        // Ancho base para "Lupa" y "Opciones" (2 botones siempre presentes) + Paddington general = ~60px
        // Ancho extra por cada botón de acción habilitado (Agregar, Eliminar, Editar) = ~25px
        const actionColumnWidth = 60 + (availableActions * 10);

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
            }, handleAddRow, tableDefinition.allow?.insert),
            renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => actionsColumnSummaryCellRenderer(props),
        }; const detailColumns: CustomColumn<any>[] = [];
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
                    width: 30,
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
            editorOptions: { closeOnExternalRowChange: false }, //con esto no se pierde el foco
            renderEditCell: (props) => allColumnsEditCellRenderer(props, allColumns),
            renderCell: (props: RenderCellProps<any, unknown>) => allColumnsCellRenderer(props, onOpenDetail),
        }));
    }, [
        tableDefinition, isFilterRowVisible, filters, toggleFilterVisibility,
        cellFeedbackMap,
        primaryKey, theme.palette.success.light, theme.palette.error.light,
        theme.palette.info.light, theme.palette.action.selected,
        handleKeyPressInEditor, setTableData,
        localCellChanges, handleDeleteRow, handleAddRow, fixedFields, tableData, onOpenDetail
    ]);

    if (apiLoading) {
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
                    rowHeight={(_row) => 30}
                    style={{ ...{ height: '100%', width: '100%', boxSizing: 'border-box' }, ...gridStyles }}
                    headerRowHeight={30}
                    topSummaryRows={isFilterRowVisible ? [{ id: 'filterRow' }] : undefined}
                    summaryRowHeight={isFilterRowVisible ? 30 : 0}
                    renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                    onCellMouseDown={handleCellMouseDown}
                    onCellDoubleClick={handleCellDoubleClick}
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
            <ImportDialog
                open={openImportDialog}
                onClose={() => setOpenImportDialog(false)}
                onImport={handleImportFile}
                loading={apiLoading}
            />
        </Box>
    );
};
export default GenericDataGrid;
