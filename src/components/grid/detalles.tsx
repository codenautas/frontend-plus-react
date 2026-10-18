// src/components/grid/detalles.tsx
// Grillas de detalle desplegadas dentro de la grilla, como lo hace backend-plus (my-tables.js):
// al apretar el botón de un detalle se inserta debajo de la fila una "fila de detalle" que ocupa
// todas las columnas y contiene otra grilla (que a su vez puede desplegar sus propios detalles).
import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { DetailTable } from 'backend-plus';
import { FilaDeDatos, FixedField, TableDefinition } from '../../types';
import { SortColumn } from '../../hooks/grid/useGridDataView';
import { FallbackWScreen, wScreens } from '../../pages/WScreens';
import { cumpleCondicion } from './condiciones';

/** Marca de las filas de detalle (es un Symbol para que no se confunda con ningún campo) */
export const DETALLE = Symbol('detalle');

// un type y no una interface: así es asignable a FilaDeDatos (las interfaces no tienen firma de índice implícita)
export type FilaDetalle = {
    [DETALLE]: true;
    /** `${rowId}|${abr}`: identifica el detalle dentro de su grilla */
    clave: string;
    filaPadre: FilaDeDatos;
    detailTable: DetailTable;
    fixedFields: FixedField[];
};

export const esFilaDetalle = (row: unknown): row is FilaDetalle =>
    typeof row === 'object' && row !== null && (row as Partial<FilaDetalle>)[DETALLE] === true;

export const claveDetalle = (rowId: string, detailTable: DetailTable) => `${rowId}|${detailTable.abr}`;

/** Alto de la fila de detalle mientras la grilla anidada todavía no informó cuánto necesita */
export const ALTO_INICIAL_DETALLE = 140;
export const ALTO_MINIMO_DETALLE = 80;

/** Un campo de DetailTable['fields'] normalizado; `until` lo acepta my-tables.js aunque no esté en el .d.ts */
interface CampoDeDetalle {
    target: string;
    source?: string;
    value?: unknown;
    tieneValor: boolean;
    nullMeansAll?: boolean;
    until?: unknown;
}

const normalizarCampoDeDetalle = (campo: DetailTable['fields'][number]): CampoDeDetalle => {
    if (typeof campo === 'string') return { target: campo, source: campo, tieneValor: false };
    if ('value' in campo) return { target: campo.target, value: campo.value, tieneValor: true, until: (campo as { until?: unknown }).until };
    return { target: campo.target, source: campo.source, tieneValor: false, nullMeansAll: campo.nullMeansAll, until: (campo as { until?: unknown }).until };
};

/** Los fixedFields de la grilla de detalle a partir de la fila padre (mismo cálculo que calculateFixedFields de my-tables.js) */
export function calcularFixedFieldsDetalle(detailTable: DetailTable, row: FilaDeDatos): FixedField[] {
    return detailTable.fields
        .map(normalizarCampoDeDetalle)
        .filter(campo => !campo.nullMeansAll || (campo.source !== undefined && row[campo.source] != null))
        .map(campo => {
            const fixedField: FixedField = {
                fieldName: campo.target,
                value: campo.tieneValor ? campo.value : row[campo.source!],
            };
            if (campo.until !== undefined) fixedField.until = campo.until;
            return fixedField;
        });
}

/** Lo que una grilla anidada guarda para volver a mostrarse sin recargar (por ejemplo al scrollear) */
export interface GrillaGuardada {
    tableDefinition: TableDefinition;
    tableData: FilaDeDatos[];
    anchosCalculados: Map<string, number>;
    sortColumns: readonly SortColumn[];
    detallesAbiertos: string[];
    altosDetalle: Map<string, number>;
}

/**
 * Las filas de detalle salen del DOM cuando se scrollea (virtualización) y su grilla se desmonta.
 * Este cache, compartido por toda la jerarquía de grillas, permite volver a mostrarlas como estaban,
 * igual que backend-plus reusa el divDetail al volver a desplegar.
 */
export const CacheGrillasContext = createContext<Map<string, GrillaGuardada> | null>(null);

interface DetallesGrilla {
    abiertos: ReadonlySet<string>;
    alternarDetalle: (row: FilaDeDatos, rowId: string, detailTable: DetailTable, enOtraPestana: boolean) => void;
    renderDetalle: (fila: FilaDetalle) => React.ReactNode;
}

export const DetallesGrillaContext = createContext<DetallesGrilla | null>(null);

const useDetallesGrilla = () => {
    const detalles = useContext(DetallesGrillaContext);
    if (!detalles) throw new Error('falta DetallesGrillaContext.Provider');
    return detalles;
};

interface BotonDetalleProps {
    row: FilaDeDatos;
    rowId: string;
    detailTable: DetailTable;
    deshabilitado: boolean;
}

/** Botón de la columna de un detalle: despliega/repliega; con Ctrl o el botón del medio lo abre en otra pestaña */
export function BotonDetalle({ row, rowId, detailTable, deshabilitado }: BotonDetalleProps) {
    const { abiertos, alternarDetalle } = useDetallesGrilla();
    // la `condition` del detalle (función de la aplicación) puede ocultar el botón para algunas filas
    if (!cumpleCondicion(detailTable.condition, row)) return <div className="fpr-boton-detalle" />;
    const abierto = abiertos.has(claveDetalle(rowId, detailTable));
    const titulo = deshabilitado
        ? 'Grabá la fila para ver sus detalles'
        : `${detailTable.label || detailTable.abr}${abierto ? ' (replegar)' : ''} — Ctrl+click: en otra pestaña`;
    return (
        <Tooltip title={titulo}>
            <span className="fpr-boton-detalle">
                <IconButton
                    size="small"
                    disabled={deshabilitado}
                    onClick={(e) => alternarDetalle(row, rowId, detailTable, e.ctrlKey || e.metaKey)}
                    onAuxClick={(e) => { if (e.button === 1) alternarDetalle(row, rowId, detailTable, true); }}
                >
                    {abierto ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                </IconButton>
            </span>
        </Tooltip>
    );
}

/**
 * Alto máximo que puede ocupar lo que se dibuja dentro de un detalle. Lo usan las grillas que una wScreen arma
 * adentro de un detalle para acotarse sin que la wScreen tenga que saber de alturas.
 */
export const AltoDisponibleContext = createContext<number | undefined>(undefined);

/** Alto que ocupan las filas de detalle además de su contenido (el padding de .fpr-detalle) */
const MARGEN_VERTICAL_DETALLE = 8;

interface DetalleWScreenProps {
    fila: FilaDetalle;
    /** Alto máximo de la fila de detalle: si el contenido lo pasa, scrollea */
    altoMaximo?: number;
    /** El contenido informa el alto que necesita para mostrarse completo */
    onAlto: (alto: number) => void;
    /** El contenido informa el ancho que necesita */
    onAncho: (ancho: number) => void;
}

/**
 * Detalle que en lugar de otra tabla es una pantalla propia de la aplicación (`wScreen`), por ejemplo las anotaciones
 * de un ticket en gestik. Recibe como `params` los fixedFields del detalle, igual que `mainAction(params, div)` de backend-plus.
 */
export function DetalleWScreen({ fila, altoMaximo, onAlto, onAncho }: DetalleWScreenProps) {
    const nombre = fila.detailTable.wScreen ?? '';
    const Pantalla = wScreens[nombre];
    const params = useMemo(
        () => Object.fromEntries(fila.fixedFields.map(fixedField => [fixedField.fieldName, fixedField.value])),
        [fila.fixedFields]
    );
    const contenido = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const elemento = contenido.current;
        if (!elemento) return;
        const medir = () => {
            onAlto(elemento.offsetHeight + MARGEN_VERTICAL_DETALLE);
            onAncho(elemento.offsetWidth);
        };
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(elemento);
        return () => observador.disconnect();
    }, [onAlto, onAncho]);
    return (
        <AltoDisponibleContext.Provider value={altoMaximo === undefined ? undefined : altoMaximo - MARGEN_VERTICAL_DETALLE}>
            <div className="fpr-detalle-wscreen">
                <div ref={contenido} className="fpr-detalle-wscreen-contenido">
                    {Pantalla
                        ? <Pantalla screenName={nombre} params={params} />
                        : <FallbackWScreen screenName={nombre} />}
                </div>
            </div>
        </AltoDisponibleContext.Provider>
    );
}

/** Contenido de la fila de detalle (lo arma GenericDataGrid para evitar una importación circular) */
export function CeldaDetalle({ fila }: { fila: FilaDetalle }) {
    const { renderDetalle } = useDetallesGrilla();
    return <>{renderDetalle(fila)}</>;
}
