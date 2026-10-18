import { RenderSummaryCellProps } from "react-data-grid";
import { FilaDeDatos, FilaDeResumen, FixedField } from "../../../types";
import FilterInputRenderer from "../FilterInputRender";
import { esColumnaPropia } from "../GenericDataGrid";
import { Box } from "@mui/material";

// La fila de filtros solo existe en topSummaryRows cuando está visible, por eso no hace falta recibir isFilterRowVisible
export const defaultColumnSummaryCellRenderer = (props: RenderSummaryCellProps<FilaDeResumen, FilaDeDatos>, fixedFields: FixedField[] | undefined) => {
    const { column, row } = props;

    // Solo mostramos filtros en la fila dedicada a filtros
    if (row.id === 'filterRow') {
        const { filters, setFilters } = row; // Extraemos del row para estabilidad de columnas
        // Si el campo es fijo, no debe aparecer en los filtros
        const fixedFieldEntry = fixedFields?.find(f => f.fieldName === column.key);
        // El filtro solo se muestra si NO es un campo fijo O si es un campo fijo que sí tiene 'until' o bien si el filtro está deshabilitado
        if (fixedFieldEntry && fixedFieldEntry.until === undefined) return null;

        const fieldDef = esColumnaPropia(column) && column.customType === 'default' ? column.fieldDef : undefined;
        return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                <FilterInputRenderer
                    columnKey={column.key}
                    currentFilter={filters[column.key]}
                    setFilters={setFilters}
                    fieldDef={fieldDef}
                />
            </Box>
        );
    }

    // Para la fila de totales (el pie de la grilla):
    const summaryData = row.totales[column.key];
    if (!summaryData) return null;

    const { type, value } = summaryData;
    let label = '';
    let formattedValue: string | number = value;

    // Formateo básico para números
    if (typeof value === 'number') {
        if (type === 'avg') {
            formattedValue = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            formattedValue = value.toLocaleString();
        }
    }

    switch (type) {
        case 'sum': label = 'Tot: '; break;
        case 'avg': label = 'Prom: '; break;
        case 'min': label = 'Min: '; break;
        case 'max': label = 'Max: '; break;
        case 'count': label = 'Cant: '; break;
        case 'countTrue': label = 'Cant Sí: '; break;
    }

    return (
        <Box sx={{
            px: 0,
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: 'text.primary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'right'
        }}>
            {label}{formattedValue}
        </Box>
    );
}

export const actionsColumnSummaryCellRenderer = (_props: RenderSummaryCellProps<FilaDeResumen, FilaDeDatos>) => null

export const detailColumnCellSummaryRenderer = (_props: RenderSummaryCellProps<FilaDeResumen, FilaDeDatos>) => null