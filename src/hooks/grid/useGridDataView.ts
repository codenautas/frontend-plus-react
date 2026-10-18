// src/hooks/grid/useGridDataView.ts
import { useState, useCallback, useMemo, useRef } from 'react';
import { TableDefinition, FieldDefinition, FilaDeDatos, FiltrosDeGrilla, EntradaDeTotal } from '../../types';
import typeStore from 'type-store';
import { compararValores, sameValue } from '../../components/grid/utils/helpers';
import { getBestTypedValue } from '../../components/grid/utils/typedControls';

export type SortColumn = { columnKey: string; direction: 'ASC' | 'DESC' };

export type SummaryEntry = EntradaDeTotal;
export type SummaryData = Record<string, SummaryEntry>;

/** Si cambian más filas que esto se considera una recarga (refrescar, importar) y se vuelve a ordenar y filtrar */
const MAXIMO_FILAS_EDICION_PUNTUAL = 3;

interface UseGridDataViewProps {
    tableData: FilaDeDatos[];
    tableDefinition: TableDefinition | null;
}

export const useGridDataView = ({ tableData, tableDefinition }: UseGridDataViewProps) => {

    // ── Sorting ──────────────────────────────────────────────────────────────
    const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

    const getInitialSortColumns = useCallback((def: TableDefinition): readonly SortColumn[] => {
        if (def.sortColumns && def.sortColumns.length > 0) {
            return def.sortColumns.map(sc => ({
                columnKey: sc.column,
                direction: sc.order === -1 ? 'DESC' : 'ASC'
            }));
        }
        const pk = def.primaryKey && def.primaryKey.length > 0 ? def.primaryKey : ['id'];
        return pk.map(pkField => ({ columnKey: pkField, direction: 'ASC' }));
    }, []);

    const resetSorting = useCallback((def: TableDefinition) => {
        setSortColumns(getInitialSortColumns(def));
    }, [getInitialSortColumns]);

    const handleSortColumnsChange = useCallback((nextSortColumns: readonly SortColumn[]) => {
        if (nextSortColumns.length === 0) {
            setSortColumns([]);
            return;
        }
        const lastClicked = nextSortColumns[nextSortColumns.length - 1];
        const { columnKey, direction } = lastClicked;
        setSortColumns(prev => {
            const existingIndex = prev.findIndex(c => c.columnKey === columnKey);
            const newSort = [...prev];
            if (existingIndex !== -1) newSort.splice(existingIndex, 1);
            newSort.unshift({ columnKey, direction });
            return newSort;
        });
    }, []);

    // ── Filters ───────────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<FiltrosDeGrilla>({});
    const [isFilterRowVisible, setIsFilterRowVisible] = useState(false);

    const toggleFilterVisibility = useCallback(() => {
        setIsFilterRowVisible(prev => {
            if (prev) setFilters({});
            return !prev;
        });
    }, []);

    // ── filteredRows ──────────────────────────────────────────────────────────
    // Lo último que se calculó, para no reordenar ni refiltrar cuando solo se editaron algunas filas
    const vistaAnteriorRef = useRef<{
        tableData: FilaDeDatos[], filas: FilaDeDatos[], filters: FiltrosDeGrilla, isFilterRowVisible: boolean,
        sortColumns: readonly SortColumn[], tableDefinition: TableDefinition | null
    } | null>(null);

    const filteredRows = useMemo(() => {
        const anterior = vistaAnteriorRef.current;
        if (anterior
            && anterior.filters === filters
            && anterior.isFilterRowVisible === isFilterRowVisible
            && anterior.sortColumns === sortColumns
            && anterior.tableDefinition === tableDefinition
            && anterior.tableData.length === tableData.length
        ) {
            // Misma vista y misma cantidad de filas: si solo cambiaron unas pocas (una edición),
            // se reemplazan en su lugar. Así la fila que se está editando no salta a otra posición
            // ni desaparece por el filtro; se reacomoda cuando el usuario cambia el orden o los filtros.
            const reemplazos = new Map<FilaDeDatos, FilaDeDatos>();
            for (let i = 0; i < tableData.length && reemplazos.size <= MAXIMO_FILAS_EDICION_PUNTUAL; i++) {
                if (anterior.tableData[i] !== tableData[i]) reemplazos.set(anterior.tableData[i], tableData[i]);
            }
            if (reemplazos.size <= MAXIMO_FILAS_EDICION_PUNTUAL) {
                const filas = reemplazos.size === 0 ? anterior.filas : anterior.filas.map(fila => reemplazos.get(fila) ?? fila);
                vistaAnteriorRef.current = { ...anterior, tableData, filas };
                return filas;
            }
        }

        let rows = [...tableData];

        // 1. Filtrado
        if (isFilterRowVisible) {
            Object.keys(filters).forEach(key => {
                const filterObj = filters[key];
                if (!filterObj) return;

                let operator = '~';
                let filterValue = '';

                if (typeof filterObj === 'string') {
                    filterValue = filterObj;
                } else {
                    operator = filterObj.operator || '~';
                    filterValue = filterObj.value || '';
                }

                if (filterValue === '' && operator !== '∅' && operator !== '!=∅') return;

                const fieldDef = tableDefinition?.fields.find(f => f.name === key);
                const typer = fieldDef ? typeStore.typerFrom(fieldDef) : null;

                // Intentamos parsear el valor del filtro al tipo real para comparaciones matemáticas/fechas
                let parsedFilterValue: unknown = filterValue;
                if (typer && filterValue !== '' && !['~', '!~', '∅', '!=∅'].includes(operator)) {
                    try {
                        parsedFilterValue = getBestTypedValue(filterValue, typer);
                    } catch (e) {
                        // Si falla el parseo (ej: fecha incompleta), seguimos con el valor original
                    }
                }

                rows = rows.filter(row => {
                    const rawValue = row[key];

                    // cellValue se usa para búsquedas parciales (~) o como fallback
                    let cellValue = '';
                    if (typer && rawValue !== null && rawValue !== undefined) {
                        try { cellValue = typer.toLocalString(rawValue).toLowerCase(); }
                        catch (e) { cellValue = String(rawValue).toLowerCase(); }
                    } else {
                        cellValue = String(rawValue || '').toLowerCase();
                    }

                    const fValLower = String(filterValue).toLowerCase();

                    switch (operator) {
                        case '=':
                            return sameValue(rawValue, parsedFilterValue) || cellValue === fValLower;
                        case '!=':
                            return !sameValue(rawValue, parsedFilterValue) && cellValue !== fValLower;
                        case '~': return cellValue.includes(fValLower);
                        case '!~': return !cellValue.includes(fValLower);
                        case '∅': return rawValue === null || rawValue === undefined || rawValue === '';
                        case '!=∅': return rawValue !== null && rawValue !== undefined && rawValue !== '';
                        case '>': {
                            const orden = compararValores(rawValue, parsedFilterValue);
                            return orden !== null && orden > 0;
                        }
                        case '>=': {
                            const orden = compararValores(rawValue, parsedFilterValue);
                            return orden !== null && orden >= 0;
                        }
                        case '<': {
                            const orden = compararValores(rawValue, parsedFilterValue);
                            return orden !== null && orden < 0;
                        }
                        case '<=': {
                            const orden = compararValores(rawValue, parsedFilterValue);
                            return orden !== null && orden <= 0;
                        }
                        default: return cellValue.includes(fValLower);
                    }
                });
            });
        }

        // 2. Sorting
        if (sortColumns.length > 0) {
            rows.sort((a, b) => {
                for (const sort of sortColumns) {
                    const { columnKey, direction } = sort;
                    const valA = a[columnKey];
                    const valB = b[columnKey];
                    if (valA === valB) continue;
                    if (valA === null || valA === undefined) return direction === 'ASC' ? -1 : 1;
                    if (valB === null || valB === undefined) return direction === 'ASC' ? 1 : -1;
                    let comparison = 0;
                    if (typeof valA === 'number' && typeof valB === 'number') {
                        comparison = valA - valB;
                    } else {
                        comparison = String(valA).localeCompare(String(valB));
                    }
                    if (comparison !== 0) return direction === 'ASC' ? comparison : -comparison;
                }
                return 0;
            });
        }

        vistaAnteriorRef.current = { tableData, filas: rows, filters, isFilterRowVisible, sortColumns, tableDefinition };
        return rows;
    }, [tableData, filters, isFilterRowVisible, tableDefinition, sortColumns]);

    // ── Summary Data (totales calculados) ─────────────────────────────────────
    const summaryData: SummaryData = useMemo(() => {
        if (!tableDefinition) return {};
        const result: SummaryData = {};

        tableDefinition.fields.forEach((field: FieldDefinition) => {
            const agg = field.aggregate;
            if (!agg) return;

            const values = filteredRows
                .map(r => r[field.name])
                .filter(v => v !== null && v !== undefined);

            if (values.length === 0 && agg !== 'count' && agg !== 'countTrue') return;

            switch (agg) {
                case 'sum':
                    result[field.name] = { type: 'sum', value: values.reduce<number>((a, b) => a + Number(b), 0) };
                    break;
                case 'avg':
                    const sum = values.reduce<number>((a, b) => a + Number(b), 0);
                    result[field.name] = { type: 'avg', value: sum / values.length };
                    break;
                case 'min':
                    result[field.name] = { type: 'min', value: Math.min(...values.map(v => Number(v))) };
                    break;
                case 'max':
                    result[field.name] = { type: 'max', value: Math.max(...values.map(v => Number(v))) };
                    break;
                case 'count':
                    result[field.name] = { type: 'count', value: values.length };
                    break;
                case 'countTrue':
                    result[field.name] = { type: 'countTrue', value: filteredRows.filter(r => r[field.name] === true).length };
                    break;
            }
        });

        return result;
    }, [tableDefinition, filteredRows]);

    // ── Reset (llamar al cambiar de tabla) ────────────────────────────────────
    const resetView = useCallback(() => {
        setFilters({});
        setIsFilterRowVisible(false);
        setSortColumns([]);
    }, []);

    return {
        // Sorting
        sortColumns,
        setSortColumns,
        getInitialSortColumns,
        handleSortColumnsChange,
        resetSorting,
        // Filters
        filters,
        setFilters,
        isFilterRowVisible,
        toggleFilterVisibility,
        // Data
        filteredRows,
        summaryData,
        // Reset
        resetView,
    };
};
