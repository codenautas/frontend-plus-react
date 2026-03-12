import { RenderSummaryCellProps } from "react-data-grid";
import { FixedField } from "../../../types";
import FilterInputRenderer from "../FilterInputRender";
import { Box } from "@mui/material";

export const defaultColumnSummaryCellRenderer = (props: RenderSummaryCellProps<any, any>, fixedFields: FixedField[] | undefined, isFilterRowVisible: boolean, filters: Record<string, string>, setFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>) => {
    const { column, row } = props;

    // Solo mostramos filtros en la fila dedicada a filtros
    if (row.id === 'filterRow') {
        // Si el campo es fijo, no debe aparecer en los filtros
        const fixedFieldEntry = fixedFields?.find(f => f.fieldName === column.key);
        // El filtro solo se muestra si NO es un campo fijo O si es un campo fijo que sí tiene 'until' o bien si el filtro está deshabilitado
        if ((fixedFieldEntry && fixedFieldEntry.until === undefined) || !isFilterRowVisible) return null;
        
        return (
            <Box>
                <FilterInputRenderer
                    column={column}
                    filters={filters}
                    setFilters={setFilters}
                />
            </Box>
        );
    }

    // Para la fila de resumen inferior (bottomSummaryRow) o cualquier otra que no sea de filtros:
    // Por ahora devolvemos null, permitiendo que sea configurada independientemente en el futuro.
    return null;
}

export const actionsColumnSummaryCellRenderer = (props: RenderSummaryCellProps<any, unknown>) => null

export const detailColumnCellSummaryRenderer = (props: RenderSummaryCellProps<any, unknown>) => null