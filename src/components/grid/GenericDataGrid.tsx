// src/components/GenericDataGrid.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataGrid, DataGridHandle, RenderCellProps, CellSelectArgs, Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import './GenericDataGrid.css';

import { useApiCall } from '../../hooks/useApiCall';
import { CircularProgress, Typography, Box, Alert, useTheme, Dialog } from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';

import { FixedField, TableDefinition, Ancestor } from '../../types';

import { ConfirmDialog } from '../ConfirmDialog';
import { DataGridOptionsDialog } from './DataGridOptionsDialog';

import { DetailTable, FieldDefinition } from 'backend-plus';
import { getPrimaryKeyValues, sameValue, Typer, NEW_ROW_INDICATOR } from './utils/helpers';
import { useGridActions } from '../../hooks/grid/useGridActions';
import { useGridDataView } from '../../hooks/grid/useGridDataView';
import { useGridEvents } from '../../hooks/grid/useGridEvents';
import { useGridLayout } from '../../hooks/grid/useGridLayout';
import { useGridMenu } from '../../hooks/grid/useGridMenu';
import { calcularAnchosDeColumnas, useGridColumns } from '../../hooks/grid/useGridColumns';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { VerticalEditorPage } from '../../pages/VerticalEditorPage';
import { cambiarGuionesBajosPorEspacios } from '../../utils/functions';
import { crearEstadoGrilla, EstadoGrillaContext, MapaFeedback, VistaGrillaContext } from './estadoGrilla';


export const SUMMARY_ROW_HEIGHT = 35;
export const FILTER_ROW_HEIGHT = 35;
export const HEADER_ROW_HEIGHT = 30;
export const ROW_HEIGHT = 30;
export const MIN_BODY_HEIGHT = 260;

/** Cuánto dura el feedback verde de una celda grabada */
const DURACION_FEEDBACK_EXITO = 3000;

interface GenericDataGridProps {
    tableName: string;
    fixedFields?: FixedField[];
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => void;
    gridStyles?: React.CSSProperties;
    ancestors?: Ancestor[];
}

export { NEW_ROW_INDICATOR };
interface BaseCustomColumn<TRow, TSummaryRow = unknown> extends Column<TRow, TSummaryRow> {
    customType: 'default' | 'detail' | 'action',
    tableDefinition: TableDefinition,
}

/**
 * Columna de un campo. Solo lleva datos que no cambian mientras se edita
 * (el feedback y los cambios locales viven en el EstadoGrilla).
 */
export interface DefaultColumn<TRow, TSummaryRow = unknown> extends BaseCustomColumn<TRow, TSummaryRow> {
    customType: 'default';
    fieldDef: FieldDefinition;
    typer: Typer;
    isMandatory: boolean;
    isNumeric: boolean;
    setTableData: React.Dispatch<React.SetStateAction<any[]>>,
    primaryKey: string[],
    fixedFields: FixedField[] | undefined,
    handleKeyPressInEditor: (rowIndex: number, columnKey: string, event: React.KeyboardEvent, currentColumns: Column<any>[], handleCommit: (currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => void
}

export interface DetailColumn<TRow, TSummaryRow = unknown> extends BaseCustomColumn<TRow, TSummaryRow> {
    customType: 'detail';
    detailTable: DetailTable,
    primaryKey: string[],
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

const SIN_ANCESTROS: Ancestor[] = [];

/**
 * Componente auxiliar para mostrar un registro padre como una grilla estática.
 * Es de solo lectura: antes intentaba grabar con 'table_data_save', que no existe en backend-plus,
 * y además las columnas no tenían editor, así que la edición nunca funcionó.
 */
const StaticAncestorGrid: React.FC<{
    ancestor: Ancestor,
    index: number,
    fieldsToHide?: FixedField[],
}> = ({ ancestor, index, fieldsToHide }) => {
    const theme = useTheme();
    const { tableDefinition, row } = ancestor; // ya no usamos fixedFields del propio objeto para filtrar SE a sí mismo

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
                editable: false,
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
                rows={[row]}
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
    fixedFields: fixedFieldsRecibidos,
    gridStyles,
    onOpenDetail,
    ancestors = SIN_ANCESTROS
}) => {
    // fixedFields suele llegar como un array nuevo en cada render del padre:
    // se estabiliza por contenido para no volver a pedir los datos ni recrear las columnas
    const claveFixedFields = JSON.stringify(fixedFieldsRecibidos ?? null);
    const fixedFields = useMemo(() => fixedFieldsRecibidos, [claveFixedFields]); // eslint-disable-line react-hooks/exhaustive-deps

    const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
    const [anchosCalculados, setAnchosCalculados] = useState<Map<string, number>>(() => new Map());
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<string> => new Set());
    const [, setSelectedCell] = useState<CellSelectArgs<any, NoInfer<{ id: string }>> | undefined>(undefined);

    // feedback y cambios locales por celda: fuera del estado de React (ver estadoGrilla.ts)
    const [estadoGrilla] = useState(crearEstadoGrilla);
    const theme = useTheme();

    const [openDataGridOptions, setOpenDataGridOptions] = useState(false);
    const [dataGridOptionsAnchorEl, setDataGridOptionsAnchorEl] = useState<HTMLElement | null>(null);

    const [exitingRowIds, setExitingRowIds] = useState<Set<string>>(new Set());

    const { showError } = useSnackbar();
    const dataGridRef = useRef<DataGridHandle>(null);
    const rowAtEditStartRef = useRef<any>(null); // Captura la fila cuando abre el vertical editor
    const [openImportDialog, setOpenImportDialog] = useState(false);
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [columnWidths, setColumnWidths] = useState<ReadonlyMap<string, any>>(() => new Map());
    // loading solo indica que hay una llamada en curso (borrar, importar, refrescar):
    // ya no reemplaza la grilla por un spinner, eso es solo para la carga inicial
    const { callApi, callApiUpload, loading } = useApiCall();

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
        fixedFields, setExitingRowIds, setLocalCellChanges: estadoGrilla.setCambiosLocales,
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
        estadoGrilla.setFeedback(new Map());
        estadoGrilla.setCambiosLocales(new Map());
        setExitingRowIds(new Set());
        setColumnWidths(new Map());
    }, [tableName, estadoGrilla, resetView]);

    useEffect(() => {
        let vigente = true;
        const fetchDataAndDefinition = async () => {
            setCargandoInicial(true);
            setErrorDeCarga(null);
            try {
                const definition: TableDefinition = await callApi('table_structure', { table: tableName }, { isCritical: true });
                const validFixedFields = fixedFields?.filter(ff =>
                    definition.fields.some(field => field.name === ff.fieldName)
                );
                const data = await callApi('table_data', {
                    table: tableName,
                    fixedFields: validFixedFields ?? []
                }, { isCritical: true });
                if (!vigente) return;
                setTableDefinition(definition);
                setSortColumns(getInitialSortColumns(definition));
                setAnchosCalculados(calcularAnchosDeColumnas(definition, data));
                setTableData(data);
            } catch (err: any) {
                if (!vigente) return;
                setTableDefinition(null);
                setTableData([]);
                const mensaje = `Error al cargar datos para la tabla '${tableName}': ${err.message || 'Error desconocido'}`;
                setErrorDeCarga(mensaje);
                showError(mensaje);
            } finally {
                if (vigente) setCargandoInicial(false);
            }
        };
        fetchDataAndDefinition();
        // si cambia la tabla antes de que llegue la respuesta, se descarta la respuesta vieja
        return () => { vigente = false; };
    }, [tableName, fixedFields, showError, callApi, getInitialSortColumns, setSortColumns]);

    // El feedback de éxito se borra solo al rato; el de error queda hasta la próxima edición
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const desuscribir = estadoGrilla.suscribir(() => {
            const hayExitos = Array.from(estadoGrilla.obtenerFeedback().values()).some(f => f.type === 'success');
            if (!hayExitos || timer) return;
            timer = setTimeout(() => {
                timer = null;
                estadoGrilla.setFeedback(anterior => {
                    const nuevo: MapaFeedback = new Map(anterior);
                    let cambio = false;
                    for (const [cellId, feedback] of anterior.entries()) {
                        if (feedback.type === 'success') {
                            nuevo.delete(cellId);
                            cambio = true;
                        }
                    }
                    return cambio ? nuevo : anterior;
                });
            }, DURACION_FEEDBACK_EXITO);
        });
        return () => {
            desuscribir();
            if (timer) clearTimeout(timer);
        };
    }, [estadoGrilla]);

    const resetSortingDeLaTabla = useCallback(() => {
        if (tableDefinition) resetSorting(tableDefinition);
    }, [tableDefinition, resetSorting]);
    const abrirImportacion = useCallback(() => setOpenImportDialog(true), []);
    const abrirExportacion = useCallback(() => setOpenExportDialog(true), []);

    const { menuOptions } = useGridMenu({
        tableDefinition,
        tableName,
        fixedFields,
        setTableData,
        callApi,
        resetSorting: tableDefinition ? resetSortingDeLaTabla : undefined,
        triggerImport: abrirImportacion,
        triggerExport: abrirExportacion,
    });

    const abrirOpcionesDeGrilla = useCallback((anchorEl: HTMLElement) => {
        setDataGridOptionsAnchorEl(anchorEl);
        setOpenDataGridOptions(true);
    }, []);

    const editarEnFicha = useCallback((row: any) => {
        rowAtEditStartRef.current = { ...row }; // Capturar snapshot antes de abrir
        handleVerticalEditRow(row);
    }, [handleVerticalEditRow]);

    const { columns } = useGridColumns({
        tableDefinition,
        anchosCalculados,
        fixedFields,
        primaryKey,
        setTableData,
        handleKeyPressInEditor,
        handleDeleteRow,
        handleAddRow,
        handleVerticalEditRow: editarEnFicha,
        toggleFilterVisibility,
        abrirOpcionesDeGrilla,
        onOpenDetail,
        ancestors,
    });

    const rowKeyGetter = useCallback((row: any) => getPrimaryKeyValues(row, primaryKey), [primaryKey]);
    // Las filas que se están borrando se marcan con una clase en lugar de copiar cada fila con un style:
    // copiar las filas en cada render anula la memorización de filas de react-data-grid
    const rowClass = useCallback((row: any) =>
        exitingRowIds.has(getPrimaryKeyValues(row, primaryKey)) ? 'fpr-fila-saliendo' : undefined
    , [exitingRowIds, primaryKey]);
    const estiloGrilla = useMemo<React.CSSProperties>(() => ({ height: '100%', width: '100%', boxSizing: 'border-box', ...gridStyles }), [gridStyles]);
    const bottomSummaryRows = useMemo(() => [bottomSummaryRow], [bottomSummaryRow]);
    const vistaGrilla = useMemo(() => ({ isFilterRowVisible }), [isFilterRowVisible]);

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

    if (cargandoInicial) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Cargando tabla...</Typography>
            </Box>
        );
    }

    if (errorDeCarga) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="error">{errorDeCarga}</Alert>
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
            {ancestors.length > 0 && (
                <Box sx={{ px: 2, pt: 0, pb: 1, display: 'flex', flexDirection: 'column' }}>
                    {ancestors.map((ancestor, index) => (
                        <StaticAncestorGrid
                            key={index}
                            ancestor={ancestor}
                            index={index}
                            fieldsToHide={index > 0 ? ancestors[index - 1].fixedFields : []}
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
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}
            >
                <Typography variant="subtitle2" component="div">
                    {cambiarGuionesBajosPorEspacios(tableDefinition.title || tableDefinition.name)} - {filteredRows.length === tableData.length ? `${tableData.length} registros`
                        : `${filteredRows.length} (F)`
                    }
                </Typography>
                {loading && <CircularProgress size={14} color="inherit" />}
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
                <EstadoGrillaContext.Provider value={estadoGrilla}>
                    <VistaGrillaContext.Provider value={vistaGrilla}>
                        <DataGrid
                            className='rdg-light'
                            ref={dataGridRef}
                            columns={columns as Column<any, any>[]}
                            rows={filteredRows}
                            rowClass={rowClass}
                            columnWidths={columnWidths}
                            onColumnWidthsChange={setColumnWidths}
                            enableVirtualization={true}
                            rowKeyGetter={rowKeyGetter}
                            onSelectedRowsChange={setSelectedRows}
                            onSelectedCellChange={handleSelectedCellChange}
                            onRowsChange={handleRowsChange}
                            sortColumns={sortColumns}
                            onSortColumnsChange={handleSortColumnsChange}
                            selectedRows={selectedRows}
                            rowHeight={ROW_HEIGHT}
                            style={estiloGrilla}
                            headerRowHeight={HEADER_ROW_HEIGHT}
                            topSummaryRows={summaryRows}
                            bottomSummaryRows={bottomSummaryRows}
                            summaryRowHeight={SUMMARY_ROW_HEIGHT}
                            onCellMouseDown={handleCellMouseDown}
                            onCellDoubleClick={handleCellDoubleClick}
                            onCellClick={handleCellClick}
                            onCellKeyDown={handleCellKeyDown}
                        />
                    </VistaGrillaContext.Provider>
                </EstadoGrillaContext.Provider>

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
                            if (originalRow && serverRow) {
                                const rowId = getPrimaryKeyValues(serverRow, primaryKey);
                                const changedFields = tableDefinition.fields
                                    .filter(f => !sameValue(originalRow[f.name], serverRow[f.name]))
                                    .map(f => f.name);
                                if (changedFields.length > 0) {
                                    estadoGrilla.setFeedback(prev => {
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
        </Box>
    );

};
export default GenericDataGrid;
