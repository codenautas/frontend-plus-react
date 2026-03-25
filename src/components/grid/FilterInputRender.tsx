import { InputBase, Box } from "@mui/material";
import React from "react";
import { FilterRendererProps } from "../../types";
import { DefaultColumn, FILTER_ROW_HEIGHT } from "./GenericDataGrid";
import { TypedField } from "../forms/TypedField";
import { filterOperators, getDefaultOperatorForType } from "./utils/helpers";

interface FilterInputRendererProps {
    columnKey: string;
    currentFilter: any;
    setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    fieldDef: any;
}

function FilterInputRenderer({
    columnKey,
    currentFilter,
    setFilters,
    fieldDef
}: FilterInputRendererProps) {

    if (fieldDef) {
        // Determinamos estado de operador y valor
        let operator = getDefaultOperatorForType(fieldDef.typeName);
        let val = '';
        if (currentFilter && typeof currentFilter === 'object') {
            operator = (currentFilter as any).operator || operator;
            val = (currentFilter as any).value || '';
        } else if (typeof currentFilter === 'string') {
            val = currentFilter;
        }

        const handleFilterChange = (newOp: string, newVal: any) => {
            const formattedVal = (newVal === null || newVal === undefined) ? '' : String(newVal);
            setFilters(prev => ({
                ...prev,
                [columnKey]: { operator: newOp, value: formattedVal }
            }));
        };

        return (
            <Box sx={{ mt: 0, display: 'flex', alignItems: 'center', gap: 0.5, pr: 1 }}>
                <select
                    value={operator}
                    onChange={(e) => handleFilterChange(e.target.value, val)}
                    style={{
                        height: FILTER_ROW_HEIGHT - 5,
                        minWidth: 40,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        padding: '0 2px',
                        textAlign: 'center',
                        cursor: 'pointer'
                    }}
                >
                    {filterOperators.map(op => (
                        <option key={op.value} value={op.value}>
                            {op.label}
                        </option>
                    ))}
                </select>
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
            value={currentFilter || ''}
            onChange={(e) =>
                setFilters(prev => ({
                    ...prev,
                    [columnKey]: e.target.value
                }))
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

export default React.memo(FilterInputRenderer);
