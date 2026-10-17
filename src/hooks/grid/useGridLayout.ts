// src/hooks/grid/useGridLayout.ts
import { useMemo } from 'react';
import { SummaryData } from './useGridDataView';
import { FILTER_ROW_HEIGHT, HEADER_ROW_HEIGHT, MIN_BODY_HEIGHT, ROW_HEIGHT, SUMMARY_ROW_HEIGHT } from '../../components/grid/GenericDataGrid';

interface UseGridLayoutProps {
    filteredRows: any[];
    isFilterRowVisible: boolean;
    tableData: any[];
    summaryData: SummaryData;
    filters: Record<string, any>;
    setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    /** Alto que agregan las filas de detalle desplegadas */
    altoDetalles?: number;
    /** Alto mínimo cuando no hay filas para mostrar (las grillas anidadas usan uno menor) */
    altoMinimoCuerpo?: number;
}

export const useGridLayout = ({
    filteredRows,
    isFilterRowVisible,
    tableData,
    summaryData,
    filters,
    setFilters,
    altoDetalles = 0,
    altoMinimoCuerpo = MIN_BODY_HEIGHT,
}: UseGridLayoutProps) => {

    const gridHeight = useMemo(() => {
        const filterHeight = isFilterRowVisible ? FILTER_ROW_HEIGHT : 0;
        let calculatedHeight = (filteredRows.length * ROW_HEIGHT) + altoDetalles + HEADER_ROW_HEIGHT + filterHeight + SUMMARY_ROW_HEIGHT + 40;
        if (tableData.length > 0 && filteredRows.length === 0 && isFilterRowVisible || tableData.length === 0) {
            calculatedHeight = Math.max(calculatedHeight, altoMinimoCuerpo) + filterHeight;
        }
        return calculatedHeight;
    }, [filteredRows.length, isFilterRowVisible, tableData.length, altoDetalles, altoMinimoCuerpo]);

    const bottomSummaryRow = useMemo(() => {
        return { id: 'bottomSummaryRow', ...summaryData };
    }, [summaryData]);

    const summaryRows = useMemo(() => {
        if (!isFilterRowVisible) return undefined;
        return [{ id: 'filterRow', filters, setFilters }];
    }, [isFilterRowVisible, filters, setFilters]);

    const filterHeight = isFilterRowVisible ? FILTER_ROW_HEIGHT : 0;

    return { gridHeight, bottomSummaryRow, summaryRows, filterHeight };
};
