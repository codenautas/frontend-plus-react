import { InputBase, Box, Select, MenuItem } from "@mui/material";
import { FilterRendererProps } from "../../types";
import { DefaultColumn } from "./GenericDataGrid";
import { TypedField } from "../forms/TypedField";
import { filterOperators, getDefaultOperatorForType } from "./utils/helpers";

function FilterInputRenderer<R extends Record<string, any>, S>({
    column,
    filters,
    setFilters
}: FilterRendererProps<R, S>) {

    // Obtenemos el FieldDefinition a partir de nuestra interfaz de columna extendida
    const col = column as unknown as DefaultColumn<any>;
    const fieldDef = col.fieldDef;

    if (fieldDef) {
        // Determinamos estado de operador y valor
        const currentFilter = filters[column.key];
        let operator = getDefaultOperatorForType(fieldDef.typeName);
        let val = '';
        if (currentFilter && typeof currentFilter === 'object') {
            operator = (currentFilter as any).operator || operator;
            val = (currentFilter as any).value || '';
        } else if (typeof currentFilter === 'string') {
            val = currentFilter;
        }

        const handleFilterChange = (newOp: string, newVal: any) => {
            // Unificamos actualización, si el valor es null va como string vacío
            const formattedVal = newVal === null ? '' : String(newVal);
            setFilters({
                ...filters,
                [column.key]: { operator: newOp, value: formattedVal }
            });
        };

        return (
            <Box sx={{ mt: 0, display: 'flex', alignItems: 'flex-start', gap: 0.5, pr: 1 }}>
                <Select
                    size="small"
                    value={operator}
                    onChange={(e) => handleFilterChange(e.target.value, val)}
                    sx={{
                        height: 25,
                        minWidth: 40,
                        backgroundColor: 'background.paper',
                        fontSize: '0.8rem',
                        '& .MuiSelect-select': { padding: '2px 4px', textAlign: 'center' }
                    }}
                    IconComponent={() => null} // Ocultar mini-flecha para ahorrar espacio vital
                >
                    {filterOperators.map(op => (
                        <MenuItem key={op.value} value={op.value} sx={{ fontSize: '0.8rem', justifyContent: 'center' }}>
                            {op.label}
                        </MenuItem>
                    ))}
                </Select>
                <TypedField
                    fieldDef={fieldDef}
                    isFilterMode={true}
                    value={val}
                    onChange={(_name, newValue, _isValid) => handleFilterChange(operator, newValue)}
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
