import { InputBase } from "@mui/material";
import { FilterRendererProps } from "../../types";

function FilterInputRenderer<R extends Record<string, any>, S>({
    column,
    filters,
    setFilters
}: FilterRendererProps<R, S>) {
    return (
        <InputBase
            value={filters[column.key] || ''}
            onChange={(e) =>
                setFilters({
                    ...filters,
                    [column.key]: e.target.value
                })
            }
            sx={{
                width: '100%',
                height: 25,
                margin: '0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '2px 4px',
                fontSize: '0.8rem',
                boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
        />
    );
}

export default FilterInputRenderer;