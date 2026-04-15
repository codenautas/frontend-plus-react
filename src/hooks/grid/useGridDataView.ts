// src/hooks/grid/useGridDataView.ts
import { useState, useCallback, useMemo } from 'react';
import { TableDefinition, FieldDefinition } from '../../types';

// @ts-ignore
import typeStore from 'type-store';
import { sameValue } from '../../components/grid/utils/helpers';
import { getBestTypedValue } from '../../components/grid/utils/typedControls';

export type SortColumn = { columnKey: string; direction: 'ASC' | 'DESC' };

export type SummaryEntry = { type: string; value: number };
export type SummaryData = Record<string, SummaryEntry>;

interface UseGridDataViewProps {
    tableData: any[];
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
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [isFilterRowVisible, setIsFilterRowVisible] = useState(false);

    const toggleFilterVisibility = useCallback(() => {
        setIsFilterRowVisible(prev => {
            if (prev) setFilters({});
            return !prev;
        });
    }, []);

    // ── filteredRows ──────────────────────────────────────────────────────────
    const filteredRows = useMemo(() => {
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
                let parsedFilterValue: any = filterValue;
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
                        case '>':
                            return (rawValue !== null && rawValue !== undefined) && (rawValue > parsedFilterValue);
                        case '>=':
                            return (rawValue !== null && rawValue !== undefined) && (rawValue >= parsedFilterValue);
                        case '<':
                            return (rawValue !== null && rawValue !== undefined) && (rawValue < parsedFilterValue);
                        case '<=':
                            return (rawValue !== null && rawValue !== undefined) && (rawValue <= parsedFilterValue);
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

        return rows;
    }, [tableData, filters, isFilterRowVisible, tableDefinition, sortColumns]);

    // ── Summary Data (totales calculados) ─────────────────────────────────────
    const summaryData: SummaryData = useMemo(() => {
        if (!tableDefinition) return {};
        const result: SummaryData = {};

        tableDefinition.fields.forEach((field: FieldDefinition) => {
            const agg = (field as any).aggregate;
            if (!agg) return;

            const values = filteredRows
                .map((r: any) => r[field.name])
                .filter((v: any) => v !== null && v !== undefined);

            if (values.length === 0 && agg !== 'count' && agg !== 'countTrue') return;

            switch (agg) {
                case 'sum':
                    result[field.name] = { type: 'sum', value: values.reduce((a: number, b: any) => Number(a) + Number(b), 0) };
                    break;
                case 'avg':
                    const sum = values.reduce((a: number, b: any) => Number(a) + Number(b), 0);
                    result[field.name] = { type: 'avg', value: sum / values.length };
                    break;
                case 'min':
                    result[field.name] = { type: 'min', value: Math.min(...values.map((v: any) => Number(v))) };
                    break;
                case 'max':
                    result[field.name] = { type: 'max', value: Math.max(...values.map((v: any) => Number(v))) };
                    break;
                case 'count':
                    result[field.name] = { type: 'count', value: values.length };
                    break;
                case 'countTrue':
                    result[field.name] = { type: 'countTrue', value: filteredRows.filter((r: any) => r[field.name] === true).length };
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
