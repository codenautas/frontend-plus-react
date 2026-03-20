import { InputBase, Box } from "@mui/material";
import { FilterRendererProps } from "../../types";
import { DefaultColumn } from "./GenericDataGrid";
import { TypedField } from "../forms/TypedField";

function FilterInputRenderer<R extends Record<string, any>, S>({
    column,
    filters,
    setFilters
}: FilterRendererProps<R, S>) {

    // Obtenemos el FieldDefinition a partir de nuestra interfaz de columna extendida
    const col = column as unknown as DefaultColumn<any>;
    const fieldDef = col.fieldDef;

    if (fieldDef) {
        return (
            <Box sx={{ mt: 0 }}>
                <TypedField
                    fieldDef={fieldDef}
                    isFilterMode={true}
                    value={filters[column.key] || ''}
                    onChange={(_name, newValue, _isValid) => {
                        // Mapeamos el null (ej. borrar filtro) a string vacio
                        setFilters({
                            ...filters,
                            [column.key]: newValue === null ? '' : newValue
                        });
                    }}
                />
            </Box>
        );
    }

    // Fallback original por si no hay fieldDef
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
                backgroundColor: 'background.paper'
            }}
            onClick={(e) => e.stopPropagation()}
        />
    );
}

export default FilterInputRenderer;
