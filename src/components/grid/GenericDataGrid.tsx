// src/components/GenericDataGrid.tsx
import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { DataGrid, DataGridHandle, RenderCellProps, CellSelectArgs, Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import './GenericDataGrid.css';

import { useApiCall } from '../../hooks/useApiCall';
import { CircularProgress, Typography, Box, Alert, useTheme, Dialog } from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';

import { FixedField, TableDefinition, Ancestor, TeclaDeEditor } from '../../types';

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
import {
    ALTO_INICIAL_DETALLE, ALTO_MINIMO_DETALLE, CacheGrillasContext, calcularFixedFieldsDetalle,
    claveDetalle, DETALLE, DetallesGrillaContext, esFilaDetalle, FilaDetalle, GrillaGuardada
} from './detalles';


export const SUMMARY_ROW_HEIGHT = 35;
export const FILTER_ROW_HEIGHT = 35;
export const HEADER_ROW_HEIGHT = 30;
export const ROW_HEIGHT = 30;
export const MIN_BODY_HEIGHT = 260;

/** Cuánto dura el feedback verde de una celda grabada */
const DURACION_FEEDBACK_EXITO = 3000;

/** Alto del título de una grilla anidada (para informar cuánto necesita) */
const ALTO_TITULO_ANIDADA = 26;
/** Alto mínimo de una grilla anidada sin filas (alcanza para el mensaje "No hay filas") */
const ALTO_MINIMO_CUERPO_ANIDADA = 120;
/** Espacio extra bajo una grilla anidada: lo justo para una barra de scroll horizontal */
const HOLGURA_ANIDADA = 18;
/** Ancho mínimo de una grilla anidada: que alcance para el título */
const ANCHO_MINIMO_ANIDADA = 240;
/** Lo que el detalle ocupa de más que su grilla: sangría a la izquierda, margen a la derecha y la línea de color */
const SANGRIA_DETALLE = 28 + 8 + 3;
/** Valores por omisión de backend-plus (myOwn.firstDisplayCount y myOwn.firstDisplayOverLimit) */
const PRIMERAS_FILAS_ANIDADA = 20;
const LIMITE_PRIMERAS_FILAS_ANIDADA = 30;

interface GenericDataGridProps {
    tableName: string;
    fixedFields?: FixedField[];
    /** Abre un detalle en otra pestaña (Ctrl+click o botón del medio en el botón del detalle) */
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => void;
    gridStyles?: React.CSSProperties;
    ancestors?: Ancestor[];
    /** Es una grilla de detalle desplegada dentro de otra grilla */
    anidada?: boolean;
    /** Título a mostrar en lugar del de la tabla (lo usan las grillas anidadas) */
    titulo?: string;
    /** Clave en el CacheGrillasContext para volver a mostrarse sin recargar */
    claveCache?: string;
    /** La grilla anidada informa el alto que necesita para mostrarse completa */
    onAltoDeseado?: (alto: number) => void;
    /** La grilla anidada informa el ancho que necesita (sus columnas y los detalles que tenga abiertos) */
    onAnchoDeseado?: (ancho: number) => void;
    /**
     * Tope opcional para el alto de las filas de detalle (en px). Sin tope (lo normal) cada detalle
     * se muestra completo, como en backend-plus; con tope, el detalle más alto scrollea por dentro
     * y virtualiza sus propias filas (útil si hay detalles de miles de filas).
     */
    altoMaximoDetalle?: number;
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
    registrarEditor: (procesar: (key: string) => void) => () => void,
    handleKeyPressInEditor: (rowIndex: number, columnKey: string, event: TeclaDeEditor, currentColumns: Column<any>[], handleCommit: (currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => void
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
    ancestors = SIN_ANCESTROS,
    anidada = false,
    titulo,
    claveCache,
    onAltoDeseado,
    onAnchoDeseado,
    altoMaximoDetalle,
}) => {
    // fixedFields suele llegar como un array nuevo en cada render del padre:
    // se estabiliza por contenido para no volver a pedir los datos ni recrear las columnas
    const claveFixedFields = JSON.stringify(fixedFieldsRecibidos ?? null);
    const fixedFields = useMemo(() => fixedFieldsRecibidos, [claveFixedFields]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cache compartido por toda la jerarquía de grillas (la grilla de más arriba lo crea)
    const cacheHeredado = useContext(CacheGrillasContext);
    const [cachePropio] = useState(() => new Map<string, GrillaGuardada>());
    const cache = cacheHeredado ?? cachePropio;
    // Lo guardado de esta grilla (si ya se mostró antes y salió de la pantalla por la virtualización)
    const [guardada] = useState(() => claveCache ? cache.get(claveCache) : undefined);
    // Qué tabla+fixedFields están cargados; si viene del cache ya están y no se vuelve a pedir
    const claveCargadaRef = useRef<string | null>(guardada ? `${tableName}|${claveFixedFields}` : null);

    const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(guardada?.tableDefinition ?? null);
    const [tableData, setTableData] = useState<any[]>(guardada?.tableData ?? []);
    const [cargandoInicial, setCargandoInicial] = useState(!guardada);
    const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
    const [anchosCalculados, setAnchosCalculados] = useState<Map<string, number>>(() => guardada?.anchosCalculados ?? new Map());
    // Detalles desplegados (claves `${rowId}|${abr}`) y el alto que pidió cada grilla anidada
    const [detallesAbiertos, setDetallesAbiertos] = useState<string[]>(guardada?.detallesAbiertos ?? []);
    const [altosDetalle, setAltosDetalle] = useState<Map<string, number>>(() => guardada?.altosDetalle ?? new Map());
    // Ancho que pidió cada grilla anidada (para ensanchar esta grilla si el detalle es más ancho que sus columnas)
    const [anchosDetalle, setAnchosDetalle] = useState<Map<string, number>>(() => new Map());
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

    // ── Detalles desplegados ─────────────────────────────────────────────────
    const abiertos = useMemo(() => new Set(detallesAbiertos), [detallesAbiertos]);
    // Se reusan los objetos de las filas de detalle mientras no cambie su fila padre:
    // así react-data-grid no redibuja la grilla anidada en cada render
    const filasDetalleRef = useRef(new Map<string, FilaDetalle>());

    /** filteredRows con las filas de detalle intercaladas debajo de su fila padre (en el orden de detailTables) */
    const filasMostradas = useMemo(() => {
        const detailTables = tableDefinition?.detailTables ?? [];
        if (abiertos.size === 0 || detailTables.length === 0) return filteredRows;
        const anteriores = filasDetalleRef.current;
        const nuevas = new Map<string, FilaDetalle>();
        const filas: any[] = [];
        filteredRows.forEach(row => {
            filas.push(row);
            const rowId = getPrimaryKeyValues(row, primaryKey);
            detailTables.forEach(detailTable => {
                const clave = claveDetalle(rowId, detailTable);
                if (!abiertos.has(clave)) return;
                const anterior = anteriores.get(clave);
                const filaDetalle: FilaDetalle = anterior && anterior.filaPadre === row ? anterior : {
                    [DETALLE]: true,
                    clave,
                    filaPadre: row,
                    detailTable,
                    fixedFields: calcularFixedFieldsDetalle(detailTable, row),
                };
                nuevas.set(clave, filaDetalle);
                filas.push(filaDetalle);
            });
        });
        filasDetalleRef.current = nuevas;
        return filas;
    }, [filteredRows, abiertos, tableDefinition, primaryKey]);

    const altoDeDetalle = useCallback((clave: string) => altosDetalle.get(clave) ?? ALTO_INICIAL_DETALLE, [altosDetalle]);
    const altoDetalles = useMemo(() =>
        filasMostradas.reduce((total, row) => esFilaDetalle(row) ? total + altoDeDetalle(row.clave) : total, 0)
    , [filasMostradas, altoDeDetalle]);

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

    // Como en backend-plus: hasta firstDisplayOverLimit filas se muestran todas; si hay más, solo
    // firstDisplayCount. En BP el resto se pide con "ver más"; acá se scrollea (con virtualización).
    // Solo aplica a las grillas anidadas: la principal ocupa la pantalla y scrollea siempre.
    const firstDisplayCount = tableDefinition?.firstDisplayCount ?? PRIMERAS_FILAS_ANIDADA;
    const firstDisplayOverLimit = tableDefinition?.firstDisplayOverLimit ?? LIMITE_PRIMERAS_FILAS_ANIDADA;
    const filasVisiblesMax = anidada ? (filteredRows.length <= firstDisplayOverLimit ? filteredRows.length : firstDisplayCount) : undefined;

    const { gridHeight, bottomSummaryRow, summaryRows, filterHeight } = useGridLayout({
        filteredRows, isFilterRowVisible, tableData, summaryData, filters, setFilters, altoDetalles,
        altoMinimoCuerpo: anidada ? ALTO_MINIMO_CUERPO_ANIDADA : MIN_BODY_HEIGHT,
        holgura: anidada ? HOLGURA_ANIDADA : undefined,
        filasVisiblesMax,
    });

    const { handleCellDoubleClick, handleCellClick, handleCellKeyDown, handleCellMouseDown, handleKeyPressInEditor, registrarEditor, handleSelectedCellChange, handleRowsChange } = useGridEvents({
        dataGridRef, filteredRows: filasMostradas, fixedFields, tableData, tableDefinition, setSelectedCell, setTableData, setSortColumns
    });

    // Al cambiar de tabla se limpia todo (no al montar: puede venir restaurada del cache)
    const tableNameAnteriorRef = useRef(tableName);
    useEffect(() => {
        if (tableNameAnteriorRef.current === tableName) return;
        tableNameAnteriorRef.current = tableName;
        setDetallesAbiertos([]);
        setAltosDetalle(new Map());
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
        const claveCarga = `${tableName}|${claveFixedFields}`;
        if (claveCargadaRef.current === claveCarga) {
            // Restaurada del cache: no se vuelve a pedir (como backend-plus al volver a desplegar un detalle)
            if (guardada) setSortColumns(guardada.sortColumns);
            return;
        }
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
                claveCargadaRef.current = claveCarga;
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
    }, [tableName, claveFixedFields, fixedFields, showError, callApi, getInitialSortColumns, setSortColumns, guardada]);

    // Se guarda el estado para poder volver a mostrar la grilla tal cual si se desmonta
    useEffect(() => {
        if (!claveCache || !tableDefinition || cargandoInicial) return;
        cache.set(claveCache, { tableDefinition, tableData, anchosCalculados, sortColumns, detallesAbiertos, altosDetalle });
    }, [cache, claveCache, tableDefinition, tableData, anchosCalculados, sortColumns, detallesAbiertos, altosDetalle, cargandoInicial]);

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
        registrarEditor,
        handleDeleteRow,
        handleAddRow,
        handleVerticalEditRow: editarEnFicha,
        toggleFilterVisibility,
        abrirOpcionesDeGrilla,
    });

    /** Abre el detalle en otra pestaña (lo que antes hacía siempre el botón del detalle) */
    const abrirDetalleEnPestana = useCallback((row: Record<string, any>, detailTable: DetailTable) => {
        if (!onOpenDetail || !tableDefinition || !detailTable.table) return;
        // Se acumulan los filtros que ya tiene la grilla actual (heredados de arriba), sin repetir campos
        const porCampo = new Map<string, FixedField>();
        [...(fixedFields ?? []), ...calcularFixedFieldsDetalle(detailTable, row)].forEach(ff => porCampo.set(ff.fieldName, ff));
        const allFixedFields = Array.from(porCampo.values());
        const filterDescription = allFixedFields
            .map(ff => `${cambiarGuionesBajosPorEspacios(ff.fieldName)}: ${ff.value}`)
            .join(', ');
        const label = `${cambiarGuionesBajosPorEspacios(detailTable.table).toUpperCase()} (${filterDescription})`;
        const newAncestors: Ancestor[] = [...ancestors, { tableName: tableDefinition.name, row, tableDefinition, fixedFields: allFixedFields }];
        onOpenDetail(detailTable.table, allFixedFields, label, newAncestors);
    }, [onOpenDetail, tableDefinition, fixedFields, ancestors]);

    const alternarDetalle = useCallback((row: Record<string, any>, rowId: string, detailTable: DetailTable, enOtraPestana: boolean) => {
        if (enOtraPestana && onOpenDetail) {
            abrirDetalleEnPestana(row, detailTable);
            return;
        }
        const clave = claveDetalle(rowId, detailTable);
        setDetallesAbiertos(anteriores => anteriores.includes(clave) ? anteriores.filter(c => c !== clave) : [...anteriores, clave]);
    }, [onOpenDetail, abrirDetalleEnPestana]);

    // Lo que se ve de esta grilla (el área de scroll de react-data-grid) y el ancho de su barra de scroll vertical
    const [medidas, setMedidas] = useState<{ ancho: number, alto: number, barra: number } | null>(null);
    useEffect(() => {
        const elemento = dataGridRef.current?.element;
        if (!elemento) return;
        const medir = () => setMedidas(anteriores => {
            const nuevas = { ancho: elemento.clientWidth, alto: elemento.clientHeight, barra: elemento.offsetWidth - elemento.clientWidth };
            return anteriores && anteriores.ancho === nuevas.ancho && anteriores.alto === nuevas.alto && anteriores.barra === nuevas.barra ? anteriores : nuevas;
        });
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(elemento);
        return () => observador.disconnect();
    }, [tableDefinition, cargandoInicial]);
    const anchoVisible = medidas?.ancho ?? null;

    // Los detalles de esta grilla se acotan a lo que se ve de ella (menos el encabezado, el pie y la fila padre),
    // así el detalle completo —con su propio pie— entra sin tener que scrollear la grilla de arriba.
    // Un detalle con más contenido que eso scrollea por dentro y virtualiza sus filas.
    const altoMaximoDetalleEfectivo = altoMaximoDetalle ?? (medidas
        ? Math.max(ALTO_MINIMO_DETALLE, medidas.alto - HEADER_ROW_HEIGHT - SUMMARY_ROW_HEIGHT - ROW_HEIGHT - (isFilterRowVisible ? FILTER_ROW_HEIGHT : 0))
        : undefined);

    const cambiarAnchoDetalle = useCallback((clave: string, ancho: number) => {
        setAnchosDetalle(anteriores => anteriores.get(clave) === ancho ? anteriores : new Map(anteriores).set(clave, ancho));
    }, []);

    const cambiarAltoDetalle = useCallback((clave: string, altoDeseado: number) => {
        const alto = Math.min(Math.max(Math.round(altoDeseado), ALTO_MINIMO_DETALLE), altoMaximoDetalleEfectivo ?? Infinity);
        setAltosDetalle(anteriores => anteriores.get(clave) === alto ? anteriores : new Map(anteriores).set(clave, alto));
    }, [altoMaximoDetalleEfectivo]);

    const renderDetalle = useCallback((fila: FilaDetalle) => {
        const { detailTable } = fila;
        const titulo = `${detailTable.label || cambiarGuionesBajosPorEspacios(detailTable.table ?? detailTable.abr)}`;
        return (
            <div
                className="fpr-detalle"
                // el ancho lo da el contenido (ver .fpr-detalle) pero no pasa de lo visible de esta grilla
                style={{ maxWidth: anchoVisible ? anchoVisible - 2 : undefined }}
                // las teclas de la grilla anidada no tienen que mover la selección de esta grilla
                onKeyDown={(e) => e.stopPropagation()}
            >
                {detailTable.table
                    ? <GenericDataGrid
                        tableName={detailTable.table}
                        fixedFields={fila.fixedFields}
                        anidada
                        titulo={titulo}
                        claveCache={`${claveCache ?? tableName}>${fila.clave}`}
                        onAltoDeseado={(alto) => cambiarAltoDetalle(fila.clave, alto)}
                        onAnchoDeseado={(ancho) => cambiarAnchoDetalle(fila.clave, ancho)}
                        onOpenDetail={onOpenDetail}
                        ancestors={tableDefinition ? [...ancestors, { tableName: tableDefinition.name, row: fila.filaPadre, tableDefinition, fixedFields: fila.fixedFields }] : ancestors}
                    />
                    : <Alert severity="info">El detalle '{detailTable.abr}' es una wScreen ({detailTable.wScreen}): todavía no se puede desplegar acá.</Alert>
                }
            </div>
        );
    }, [anchoVisible, claveCache, tableName, cambiarAltoDetalle, onOpenDetail, tableDefinition, ancestors]);

    const detallesGrilla = useMemo(() => ({ abiertos, alternarDetalle, renderDetalle }), [abiertos, alternarDetalle, renderDetalle]);

    // La grilla anidada le informa a su padre cuánto alto necesita para mostrarse completa
    const altoDeseado = cargandoInicial ? ALTO_INICIAL_DETALLE : gridHeight + ALTO_TITULO_ANIDADA + 8;
    useEffect(() => {
        onAltoDeseado?.(altoDeseado);
    }, [onAltoDeseado, altoDeseado]);

    const rowKeyGetter = useCallback((row: any) => esFilaDetalle(row) ? `detalle:${row.clave}` : getPrimaryKeyValues(row, primaryKey), [primaryKey]);
    const rowHeight = useCallback((row: any) => esFilaDetalle(row) ? altoDeDetalle(row.clave) : ROW_HEIGHT, [altoDeDetalle]);
    // Las filas que se están borrando se marcan con una clase en lugar de copiar cada fila con un style:
    // copiar las filas en cada render anula la memorización de filas de react-data-grid
    const rowClass = useCallback((row: any) =>
        esFilaDetalle(row) ? 'fpr-fila-detalle'
            : exitingRowIds.has(getPrimaryKeyValues(row, primaryKey)) ? 'fpr-fila-saliendo' : undefined
    , [exitingRowIds, primaryKey]);
    // Una grilla anidada es tan ancha como sus columnas (más la barra de scroll si la tiene), como las tablas de backend-plus;
    // sin esto el título y el pie quedaban estirados mucho más allá de los datos
    const anchoContenido = useMemo(() => {
        if (!anidada || columns.length === 0) return undefined;
        const sumaColumnas = columns.reduce((total, col) => {
            const medido = columnWidths.get(col.key as string)?.width;
            return total + (typeof medido === 'number' ? medido : typeof col.width === 'number' ? col.width : 100);
        }, 0);
        const propio = sumaColumnas + (medidas?.barra ?? 0) + 2;
        // si algún detalle abierto es más ancho que las columnas, esta grilla se ensancha para contenerlo
        const anchoDetalleMax = detallesAbiertos.reduce((max, clave) => Math.max(max, anchosDetalle.get(clave) ?? 0), 0);
        return Math.max(ANCHO_MINIMO_ANIDADA, propio, anchoDetalleMax > 0 ? anchoDetalleMax + SANGRIA_DETALLE + (medidas?.barra ?? 0) + 2 : 0);
    }, [anidada, columns, columnWidths, medidas?.barra, detallesAbiertos, anchosDetalle]);
    useEffect(() => {
        if (anchoContenido !== undefined) onAnchoDeseado?.(anchoContenido);
    }, [onAnchoDeseado, anchoContenido]);
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
        <CacheGrillasContext.Provider value={cache}>
        <Box sx={{ pt: anidada ? 0 : 2, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', width: anchoContenido ?? undefined, maxWidth: '100%' }}>
            {/* Primero los ancestros jerárquicos (en una grilla anidada el padre está justo arriba) */}
            {!anidada && ancestors.length > 0 && (
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
                    ml: anidada ? 0 : 2 + (ancestors.length * 4), // Margen dinámico basado en jerarquía
                    mr: anidada ? 0 : 2,
                    minHeight: anidada ? ALTO_TITULO_ANIDADA : undefined,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}
            >
                <Typography variant="subtitle2" component="div">
                    {titulo ?? cambiarGuionesBajosPorEspacios(tableDefinition.title || tableDefinition.name)} - {filteredRows.length === tableData.length ? `${tableData.length} registros`
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
                    px: anidada ? 0 : 2,
                    ml: anidada ? 0 : ancestors.length * 4, // Indentación de la grilla principal
                    pb: anidada ? 0 : 3,
                }}
            >
                <EstadoGrillaContext.Provider value={estadoGrilla}>
                    <VistaGrillaContext.Provider value={vistaGrilla}>
                    <DetallesGrillaContext.Provider value={detallesGrilla}>
                        <DataGrid
                            className='rdg-light'
                            ref={dataGridRef}
                            columns={columns as Column<any, any>[]}
                            rows={filasMostradas}
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
                            rowHeight={rowHeight}
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
                    </DetallesGrillaContext.Provider>
                    </VistaGrillaContext.Provider>
                </EstadoGrillaContext.Provider>

                {/* Fallbacks */}
                {fallBackMessage && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: filterHeight + HEADER_ROW_HEIGHT + 1,
                            bottom: anidada ? SUMMARY_ROW_HEIGHT + 4 : 102,
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
        </CacheGrillasContext.Provider>
    );

};
export default GenericDataGrid;
