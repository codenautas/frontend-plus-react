// src/components/grid/detalles.tsx
// Grillas de detalle desplegadas dentro de la grilla, como lo hace backend-plus (my-tables.js):
// al apretar el botón de un detalle se inserta debajo de la fila una "fila de detalle" que ocupa
// todas las columnas y contiene otra grilla (que a su vez puede desplegar sus propios detalles).
import React, { createContext, useContext } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { DetailTable } from 'backend-plus';
import { FixedField, TableDefinition } from '../../types';
import { SortColumn } from '../../hooks/grid/useGridDataView';

/** Marca de las filas de detalle (es un Symbol para que no se confunda con ningún campo) */
export const DETALLE = Symbol('detalle');

export interface FilaDetalle {
    [DETALLE]: true;
    /** `${rowId}|${abr}`: identifica el detalle dentro de su grilla */
    clave: string;
    filaPadre: Record<string, any>;
    detailTable: DetailTable;
    fixedFields: FixedField[];
}

export const esFilaDetalle = (row: unknown): row is FilaDetalle =>
    typeof row === 'object' && row !== null && (row as Partial<FilaDetalle>)[DETALLE] === true;

export const claveDetalle = (rowId: string, detailTable: DetailTable) => `${rowId}|${detailTable.abr}`;

/** Alto de la fila de detalle mientras la grilla anidada todavía no informó cuánto necesita */
export const ALTO_INICIAL_DETALLE = 140;
export const ALTO_MINIMO_DETALLE = 110;
/** Más que esto la grilla anidada scrollea por dentro (y virtualiza sus propias filas) */
export const ALTO_MAXIMO_DETALLE = 420;

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
export function calcularFixedFieldsDetalle(detailTable: DetailTable, row: Record<string, any>): FixedField[] {
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
    tableData: any[];
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
    alternarDetalle: (row: Record<string, any>, rowId: string, detailTable: DetailTable, enOtraPestana: boolean) => void;
    renderDetalle: (fila: FilaDetalle) => React.ReactNode;
}

export const DetallesGrillaContext = createContext<DetallesGrilla | null>(null);

const useDetallesGrilla = () => {
    const detalles = useContext(DetallesGrillaContext);
    if (!detalles) throw new Error('falta DetallesGrillaContext.Provider');
    return detalles;
};

interface BotonDetalleProps {
    row: Record<string, any>;
    rowId: string;
    detailTable: DetailTable;
    deshabilitado: boolean;
}

/** Botón de la columna de un detalle: despliega/repliega; con Ctrl o el botón del medio lo abre en otra pestaña */
export function BotonDetalle({ row, rowId, detailTable, deshabilitado }: BotonDetalleProps) {
    const { abiertos, alternarDetalle } = useDetallesGrilla();
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

/** Contenido de la fila de detalle (lo arma GenericDataGrid para evitar una importación circular) */
export function CeldaDetalle({ fila }: { fila: FilaDetalle }) {
    const { renderDetalle } = useDetallesGrilla();
    return <>{renderDetalle(fila)}</>;
}
