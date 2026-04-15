// src/components/GenericDataGrid.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataGrid, DataGridHandle, CellMouseArgs, RenderCellProps, RenderHeaderCellProps, RenderSummaryCellProps, ColSpanArgs, CellSelectArgs, CellKeyDownArgs, CellKeyboardEvent, CellMouseEvent, Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

import { useApiCall } from '../../hooks/useApiCall';
import { CircularProgress, Typography, Box, Alert, useTheme, Button, Dialog } from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';

import { CellFeedback, FixedField, TableDefinition, Ancestor } from '../../types';

import { ConfirmDialog } from '../ConfirmDialog';
import { DataGridOptionsDialog } from './DataGridOptionsDialog';

import { DetailTable, FieldDefinition } from 'backend-plus';
import { EmptyRowsRenderer } from './renderers/emptyRowRenderer';
import { getPrimaryKeyValues, sameValue } from './utils/helpers';
import { useGridActions } from '../../hooks/grid/useGridActions';
import { useGridDataView } from '../../hooks/grid/useGridDataView';
import { useGridEvents } from '../../hooks/grid/useGridEvents';
import { useGridLayout } from '../../hooks/grid/useGridLayout';
import { useGridMenu } from '../../hooks/grid/useGridMenu';
import { useGridColumns } from '../../hooks/grid/useGridColumns';
import { ImportDialog, ImportOptions } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { VerticalEditorPage } from '../../pages/VerticalEditorPage';
import { cambiarGuionesBajosPorEspacios } from '../../utils/functions';


export const SUMMARY_ROW_HEIGHT = 35;
export const FILTER_ROW_HEIGHT = 35;
export const HEADER_ROW_HEIGHT = 30;
export const ROW_HEIGHT = 30;
export const MIN_BODY_HEIGHT = 260;

interface GenericDataGridProps {
    tableName: string;
    fixedFields?: FixedField[];
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => void;
    gridStyles?: React.CSSProperties;
    ancestors?: Ancestor[];
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
    handleVerticalEditRow: (row: any) => void;
}


export type CustomColumn<TRow, TSummaryRow = unknown> =
    | DefaultColumn<TRow, TSummaryRow>
    | DetailColumn<TRow, TSummaryRow>
    | ActionColumn<TRow, TSummaryRow>;

/** Componente auxiliar para mostrar un registro padre como una grilla estática y editable */
const StaticAncestorGrid: React.FC<{
    ancestor: Ancestor,
    index: number,
    fieldsToHide?: FixedField[],
    callApi: (proc: string, params: Record<string, any>, options?: { isCritical?: boolean }) => Promise<any>,
    showSuccess: (msg: string) => void,
    showError: (msg: string) => void
}> = ({ ancestor, index, fieldsToHide, callApi, showSuccess, showError }) => {
    const theme = useTheme();
    const { tableDefinition, row } = ancestor; // ya no usamos fixedFields del propio objeto para filtrar SE a sí mismo
    const [rowData, setRowData] = useState(row);

    const columns: Column<any>[] = useMemo(() => {
        // Ocultamos los campos que el nivel SUPERIOR usó para filtrar a ESTE ancestro
        const filteredFields = tableDefinition.fields.filter(field =>
            !fieldsToHide?.some(ff => ff.fieldName === field.name)
        );

        return filteredFields.map(field => {
            const isPrimaryKey = tableDefinition.primaryKey.includes(field.name);
            return {
                key: field.name,
                name: field.label || cambiarGuionesBajosPorEspacios(field.name),
                width: 150,
                editable: field.editable !== false,
                renderHeaderCell: () => (
                    <Box sx={{ p: 0.5, height: '100%', display: 'flex', alignItems: 'center' }}>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 'bold',
                                textDecoration: isPrimaryKey ? 'underline' : 'none',
                                fontSize: '0.930rem'
                            }}
                        >
                            {field.label || cambiarGuionesBajosPorEspacios(field.name)}
                        </Typography>
                    </Box>
                ),
                renderCell: (props: RenderCellProps<any>) => (
                    <Box sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }} noWrap>
                            {String(props.row[field.name] ?? '')}
                        </Typography>
                    </Box>
                )
            };
        });
    }, [tableDefinition, fieldsToHide]);

    const handleRowsChange = async (newRows: any[]) => {
        const updatedRow = newRows[0];
        setRowData(updatedRow);

        try {
            await callApi('table_data_save', {
                table: ancestor.tableName,
                row: updatedRow
            });
            showSuccess(`Registro de ${cambiarGuionesBajosPorEspacios(ancestor.tableName)} actualizado.`);
        } catch (err: any) {
            showError(`Error al actualizar padre: ${err.message}`);
            setRowData(row); // Revertir si hay error
        }
    };

    return (
        <Box sx={{
            mb: 1.5,
            ml: index * 4, // El primer ancestro (index 0) no tiene margen, los siguientes sí
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            boxShadow: theme.shadows[1],
            bgcolor: 'background.paper'
        }}>
            <Box sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 1.5,
                py: 0.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                gap: 1
            }}>
                <Typography variant="subtitle2" component="div">
                    {cambiarGuionesBajosPorEspacios(ancestor.tableName)}
                </Typography>
            </Box>
            <DataGrid
                className='rdg-light'
                columns={columns}
                rows={[rowData]}
                onRowsChange={handleRowsChange}
                headerRowHeight={HEADER_ROW_HEIGHT}
                rowHeight={ROW_HEIGHT}
                rowKeyGetter={() => 'single-row'}
                style={{ height: 78 }}
            />
        </Box>
    );
};

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
    tableName,
    fixedFields,
    gridStyles,
    onOpenDetail,
    ancestors = []
}) => {
    const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<string> => new Set());
    const [selectedCell, setSelectedCell] = useState<CellSelectArgs<any, NoInfer<{ id: string }>> | undefined>(undefined);

    const [cellFeedbackMap, setCellFeedbackMap] = useState<Map<string, CellFeedback>>(new Map());

    const [localCellChanges, setLocalCellChanges] = useState<Map<string, Set<string>>>(new Map());
    const theme = useTheme();

    const [openDataGridOptions, setOpenDataGridOptions] = useState(false);
    const [dataGridOptionsAnchorEl, setDataGridOptionsAnchorEl] = useState<HTMLElement | null>(null);

    const [exitingRowIds, setExitingRowIds] = useState<Set<string>>(new Set());

    // Estado para Vertical Editor Modal ahora en useGridActions


    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();
    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dataGridRef = useRef<DataGridHandle>(null);
    const rowAtEditStartRef = useRef<any>(null); // Captura la fila cuando abre el vertical editor
    const [openImportDialog, setOpenImportDialog] = useState(false);
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [columnWidths, setColumnWidths] = useState<ReadonlyMap<string, any>>(() => new Map());
    const { callApi, callApiUpload, loading, error } = useApiCall();

    const getRowCount = () => tableData.length;
    const getFilteredRowCount = () => filteredRows.length;

    const primaryKey = useMemo(() => {
        if (!tableDefinition) return ['id'];
        return tableDefinition.primaryKey && tableDefinition.primaryKey.length > 0 ? tableDefinition.primaryKey : ['id'];
    }, [tableDefinition]);

    const {
        sortColumns, setSortColumns, getInitialSortColumns, handleSortColumnsChange, resetSorting,
        filters, setFilters, isFilterRowVisible, toggleFilterVisibility,
        filteredRows, summaryData, resetView
    } = useGridDataView({ tableData, tableDefinition });

    const {
        handleAddRow, handleConfirmDelete, handleDeleteRow,
        openConfirmDialog, rowToDelete, handleImportFile,
        handleVerticalEditRow, openVerticalEditDialog,
        setOpenVerticalEditDialog, rowToEditVertical,
        setRowToEditVertical
    } = useGridActions({
        tableDefinition, tableName, primaryKey,
        fixedFields, setExitingRowIds, setLocalCellChanges,
        setSelectedRows, setTableData, callApi, callApiUpload,
        resetView
    });



    const { gridHeight, bottomSummaryRow, summaryRows, filterHeight } = useGridLayout({
        filteredRows, isFilterRowVisible, tableData, summaryData, filters, setFilters
    });


    const { handleCellDoubleClick, handleCellClick, handleCellKeyDown, handleCellMouseDown, handleKeyPressInEditor, handleSelectedCellChange, handleRowsChange } = useGridEvents({
        dataGridRef, filteredRows, fixedFields, tableData, tableDefinition, setSelectedCell, setTableData, setSortColumns
    });

    useEffect(() => {
        resetView();
        setSelectedRows(new Set());
        setTableDefinition(null);
        setTableData([]);
        setCellFeedbackMap(new Map());
        setLocalCellChanges(new Map());
        setExitingRowIds(new Set());
        setColumnWidths(new Map());
        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
        }
    }, [tableName]);

    useEffect(() => {
        const fetchDataAndDefinition = async () => {
            try {
                const definition: TableDefinition = await callApi('table_structure', { table: tableName }, { isCritical: true });
                setTableDefinition(definition);
                setSortColumns(getInitialSortColumns(definition));
                const validFixedFields = fixedFields?.filter(ff =>
                    definition.fields.some(field => field.name === ff.fieldName)
                );
                const data = await callApi('table_data', {
                    table: tableName,
                    fixedFields: validFixedFields
                }, { isCritical: true });
                setTableData(data);
            } catch (err: any) {
                setTableDefinition(null);
                setTableData([]);
                showError(`Error al cargar datos para la tabla '${tableName}': ${err.message || 'Error desconocido'}`);
            }
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
                    for (const [cellId, feedback] of prevMap.entries()) {
                        if (feedback.type === 'success') {
                            newMap.delete(cellId);
                            mapChanged = true;
                        }
                    }
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

    const { menuOptions } = useGridMenu({
        tableDefinition,
        tableName,
        fixedFields,
        setTableData,
        callApi,
        resetSorting: tableDefinition ? () => resetSorting(tableDefinition) : undefined,
        triggerImport: () => setOpenImportDialog(true),
        triggerExport: () => setOpenExportDialog(true),
    });

    const { columns } = useGridColumns({
        tableDefinition,
        tableData,
        fixedFields,
        isFilterRowVisible,
        sortColumns,
        primaryKey,
        localCellChanges,
        cellFeedbackMap,
        setCellFeedbackMap,
        setTableData,
        setLocalCellChanges,
        handleKeyPressInEditor,
        handleDeleteRow,
        handleAddRow,
        handleVerticalEditRow: (row: any) => {
            rowAtEditStartRef.current = { ...row }; // Capturar snapshot antes de abrir
            handleVerticalEditRow(row);
        },
        toggleFilterVisibility,
        setDataGridOptionsAnchorEl,
        setOpenDataGridOptions,
        onOpenDetail,
        ancestors: ancestors ?? [],
    });

    const getFallBackMessage = () => {
        if (tableData.length === 0) {
            return "No hay filas para mostrar";
        }
        if (filteredRows.length === 0) {
            // Aquí ya sabemos que tableData.length > 0 implícitamente por el if anterior
            return "No se encontraron resultados para tu búsqueda";
        }
        return null;
    };

    const fallBackMessage = getFallBackMessage();

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
            {/* Primero los ancestros jerárquicos */}
            {ancestors && ancestors.length > 0 && (
                <Box sx={{ px: 2, pt: 0, pb: 1, display: 'flex', flexDirection: 'column' }}>
                    {ancestors.map((ancestor, index) => (
                        <StaticAncestorGrid
                            key={index}
                            ancestor={ancestor}
                            index={index}
                            fieldsToHide={index > 0 ? ancestors[index - 1].fixedFields : []}
                            callApi={callApi}
                            showSuccess={showSuccess}
                            showError={showError}
                        />
                    ))}
                </Box>
            )}

            {/* Luego el título de la grilla actual */}
            <Box
                sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    px: 1.5,
                    py: 0.5,
                    textAlign: 'left',
                    fontWeight: 'bold',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    borderTopLeftRadius: theme.shape.borderRadius,
                    borderTopRightRadius: theme.shape.borderRadius,
                    ml: 2 + (ancestors.length * 4), // Margen dinámico basado en jerarquía
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
                    height: `min(${gridHeight}px, 100%)`, // Altura dinámica aquí
                    maxHeight: '100%',
                    boxSizing: 'border-box',
                    position: 'relative', // CRÍTICO para el centrado del fallback
                    overflowX: 'auto',
                    overflowY: 'auto',
                    px: 2,
                    ml: ancestors.length * 4, // Indentación de la grilla principal
                    pb: 3,
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
                    columnWidths={columnWidths}
                    onColumnWidthsChange={setColumnWidths}
                    enableVirtualization={true}
                    rowKeyGetter={(row: any) => getPrimaryKeyValues(row, primaryKey)}
                    onSelectedRowsChange={setSelectedRows}
                    onSelectedCellChange={handleSelectedCellChange}
                    onRowsChange={handleRowsChange}
                    sortColumns={sortColumns}
                    onSortColumnsChange={handleSortColumnsChange}
                    selectedRows={selectedRows}
                    rowHeight={(_row) => ROW_HEIGHT}
                    style={{ ...{ height: '100%', width: '100%', boxSizing: 'border-box' }, ...gridStyles }}
                    headerRowHeight={HEADER_ROW_HEIGHT}
                    topSummaryRows={summaryRows}
                    bottomSummaryRows={[bottomSummaryRow]}
                    summaryRowHeight={SUMMARY_ROW_HEIGHT}
                    renderers={undefined}
                    onCellMouseDown={handleCellMouseDown}
                    onCellDoubleClick={handleCellDoubleClick}
                    onCellClick={handleCellClick}
                    onCellKeyDown={handleCellKeyDown}
                />

                {/* Fallbacks */}
                {fallBackMessage && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: filterHeight + HEADER_ROW_HEIGHT + 1,
                            bottom: 102,
                            left: 18,
                            right: 0,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            pointerEvents: 'none',
                            zIndex: tableData.length === 0 ? 10 : 1, // Mantenemos el zIndex superior para el estado vacío total
                        }}
                    >
                        <Typography variant="body2" color="textSecondary">
                            {fallBackMessage}
                        </Typography>
                    </Box>
                )}
            </Box>
            <ExportDialog
                open={openExportDialog}
                onClose={() => setOpenExportDialog(false)}
                tableDefinition={tableDefinition}
                tableData={tableData}
                filteredRows={filteredRows}
                username={(window as any).my?.config?.username || 'anonymous'}
            />
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
                loading={loading}
            />


            {/* Modal de Editor Vertical */}
            {tableDefinition && (
                <Dialog
                    open={openVerticalEditDialog}
                    onClose={() => setOpenVerticalEditDialog(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    {rowToEditVertical && (
                        <VerticalEditorPage
                            tableName={tableName}
                            tableDefinition={tableDefinition}
                            initialData={rowToEditVertical}
                            fixedFields={fixedFields}
                            isNewRow={!!rowToEditVertical[NEW_ROW_INDICATOR]}
                            onSaveSuccess={(savedRow, isNewItem) => {
                                setRowToEditVertical(savedRow);
                                setTableData(prevData => {
                                    const newData = [...prevData];
                                    const pK = isNewItem ? getPrimaryKeyValues(rowToEditVertical, primaryKey) : getPrimaryKeyValues(savedRow, primaryKey);
                                    const index = newData.findIndex(r => getPrimaryKeyValues(r, primaryKey) === pK);
                                    if (index !== -1) {
                                        newData[index] = savedRow;
                                    } else {
                                        newData.unshift(savedRow);
                                    }
                                    return newData;
                                });
                            }}
                            onClose={() => {
                                // Resaltar los campos que cambiaron respecto al estado original al abrir,
                                // comparando con lo que devolvió el servidor (captura triggers también)
                                const originalRow = rowAtEditStartRef.current;
                                const serverRow = rowToEditVertical;
                                if (originalRow && serverRow && tableDefinition) {
                                    const rowId = getPrimaryKeyValues(serverRow, primaryKey);
                                    const changedFields = tableDefinition.fields
                                        .filter(f => !sameValue(originalRow[f.name], serverRow[f.name]))
                                        .map(f => f.name);
                                    if (changedFields.length > 0) {
                                        setCellFeedbackMap(prev => {
                                            const next = new Map(prev);
                                            changedFields.forEach(fieldName => {
                                                next.set(`${rowId}-${fieldName}`, { rowId, columnKey: fieldName, type: 'success' });
                                            });
                                            return next;
                                        });
                                    }
                                }
                                rowAtEditStartRef.current = null;
                                setOpenVerticalEditDialog(false);
                            }}
                        />
                    )}
                </Dialog>
            )}
        </Box>
    );

};
export default GenericDataGrid;
