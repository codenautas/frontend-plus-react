// src/hooks/grid/useGridLayout.ts
import { useMemo } from 'react';
import { SummaryData } from './useGridDataView';
import { FilaDeDatos, FilaDeFiltros, FilaDeTotales, FiltrosDeGrilla } from '../../types';
import { FILTER_ROW_HEIGHT, HEADER_ROW_HEIGHT, MIN_BODY_HEIGHT, ROW_HEIGHT, SUMMARY_ROW_HEIGHT } from '../../components/grid/GenericDataGrid';

interface UseGridLayoutProps {
    filteredRows: FilaDeDatos[];
    isFilterRowVisible: boolean;
    tableData: FilaDeDatos[];
    summaryData: SummaryData;
    filters: FiltrosDeGrilla;
    setFilters: React.Dispatch<React.SetStateAction<FiltrosDeGrilla>>;
    /** Alto que agregan las filas de detalle desplegadas */
    altoDetalles?: number;
    /** Alto mínimo cuando no hay filas para mostrar (las grillas anidadas usan uno menor) */
    altoMinimoCuerpo?: number;
    /** Espacio extra debajo de la grilla (barra de scroll, margen) */
    holgura?: number;
    /**
     * Cuántas filas de datos se muestran a la vez antes de scrollear por dentro (y virtualizar):
     * la grilla crece según su contenido hasta ese tope. Sin valor, crece sin límite.
     */
    filasVisiblesMax?: number;
    /** Si la grilla muestra la fila de pie (totales); sin ella no se reserva su alto */
    conPie?: boolean;
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
    // 24 px de margen inferior de la caja que contiene la grilla + lo que ocupa una barra de scroll horizontal (que le quita
    // alto a la grilla y, si no sobra lugar, hace aparecer una barra vertical aunque haya una sola fila)
    holgura = 24 + 24,
    filasVisiblesMax,
    conPie = true,
}: UseGridLayoutProps) => {

    const gridHeight = useMemo(() => {
        const filterHeight = isFilterRowVisible ? FILTER_ROW_HEIGHT : 0;
        const filasParaAlto = filasVisiblesMax === undefined ? filteredRows.length : Math.min(filteredRows.length, filasVisiblesMax);
        let calculatedHeight = (filasParaAlto * ROW_HEIGHT) + altoDetalles + HEADER_ROW_HEIGHT + filterHeight + (conPie ? SUMMARY_ROW_HEIGHT : 0) + holgura;
        if (tableData.length > 0 && filteredRows.length === 0 && isFilterRowVisible || tableData.length === 0) {
            calculatedHeight = Math.max(calculatedHeight, altoMinimoCuerpo) + filterHeight;
        }
        return calculatedHeight;
    }, [filteredRows.length, isFilterRowVisible, tableData.length, altoDetalles, altoMinimoCuerpo, holgura, filasVisiblesMax, conPie]);

    const bottomSummaryRow = useMemo((): FilaDeTotales => {
        return { id: 'bottomSummaryRow', totales: summaryData };
    }, [summaryData]);

    const summaryRows = useMemo((): FilaDeFiltros[] | undefined => {
        if (!isFilterRowVisible) return undefined;
        return [{ id: 'filterRow', filters, setFilters }];
    }, [isFilterRowVisible, filters, setFilters]);

    const filterHeight = isFilterRowVisible ? FILTER_ROW_HEIGHT : 0;

    return { gridHeight, bottomSummaryRow, summaryRows, filterHeight };
};
