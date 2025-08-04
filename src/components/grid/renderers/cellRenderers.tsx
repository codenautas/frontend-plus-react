import { RenderCellProps } from "react-data-grid"
import GenericDataGrid, { ActionColumn, CustomColumn, DefaultColumn, DETAIL_ROW_INDICATOR, DetailColumn, getPrimaryKeyValues, NEW_ROW_INDICATOR } from "../GenericDataGrid";
import { CellFeedback, FixedField, GenericDataGridProps, TableDefinition } from "../../../types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import { DetailTable } from "backend-plus";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { clientSides } from "../clientSides";
import FallbackClientSideRenderer from "../FallbackClientSideRenderer";
import { useState } from "react";

export const allColumnsCellRenderer = (props: RenderCellProps<any, unknown>) => {
    const column = props.column as unknown as CustomColumn<any, unknown>;
    switch (column.customType) {
    case 'default':
        return defaultColumnCellRenderer(props);
    case 'detail':
        return detailColumnCellRenderer(props);
    case 'action':
        return actionsColumnCellRenderer(props);
    default:
        return <>{String(props.row[props.column.key])}</>;
  }
}

export const defaultColumnCellRenderer = (
    props: RenderCellProps<any, unknown>
) => {
    const theme = useTheme();
    const column = props.column as unknown as DefaultColumn<any, unknown>;
    const {tableDefinition, primaryKey, cellFeedback, fixedFields, localCellChanges} = column;
    if(props.row[DETAIL_ROW_INDICATOR]){
        let detailTable = tableDefinition.detailTables!.find((detailTable)=>detailTable.abr == props.row[DETAIL_ROW_INDICATOR])!;
        let fixedFields:FixedField[] = [];
        detailTable.fields.forEach((field)=>{
            if(typeof field === "string"){
                fixedFields.push({fieldName:field, value:props.row[field]})
            }else{
                //@ts-ignore existe el source
                fixedFields.push({fieldName:field.target,value:props.row[field.source]})
            }
        })
        return <GenericDataGrid tableName={detailTable.table!} fixedFields={fixedFields} />
    };
    const rowId = getPrimaryKeyValues(props.row, primaryKey);
    const fieldDefinition = tableDefinition.fields.find(f => f.name === props.column.key);

    // Lógica para renderizado clientSide
    if (fieldDefinition?.clientSide) {
        const ClientSideComponent = clientSides[fieldDefinition.clientSide];
        if (ClientSideComponent) {
            return (
                <ClientSideComponent
                    {...props}
                    fieldDefinition={fieldDefinition}
                    tableDefinition={tableDefinition}
                    primaryKey={primaryKey}
                />
            );
        } else {
            return (
                <FallbackClientSideRenderer
                    {...props}
                    fieldDefinition={fieldDefinition}
                    tableDefinition={tableDefinition}
                    primaryKey={primaryKey}
                />
            );
        }
    }

    // Lógica para resaltar celdas con feedback o cambios locales
    let cellBackgroundColor = 'transparent';
    if (cellFeedback && cellFeedback.rowId === rowId && cellFeedback.columnKey === props.column.key) {
        cellBackgroundColor = cellFeedback.type === 'error' ? theme.palette.error.light : theme.palette.success.light;
    } else {
        const isNewRowLocalCheck = props.row[NEW_ROW_INDICATOR];
        const isMandatory = tableDefinition.primaryKey.includes(props.column.key) || (tableDefinition.fields.find(f => f.name === props.column.key)?.nullable === false);
        const hasValue = props.row[props.column.key] !== null && props.row[props.column.key] !== undefined && String(props.row[props.column.key]).trim() !== '';

        // Determinar si es un campo fijo para el resaltado
        const isFixedFieldCurrent = fixedFields?.some(f => f.fieldName === props.column.key);

        // Resalta campos fijos con un color diferente para distinguirlos
        if (isFixedFieldCurrent) {
            cellBackgroundColor = theme.palette.action.selected; // Un gris claro o similar
        } else if ((isNewRowLocalCheck && isMandatory && !hasValue) || (localCellChanges.has(rowId) && localCellChanges.get(rowId)?.has(props.column.key))) {
            cellBackgroundColor = theme.palette.info.light;
        }
    }
    const value = props.row[props.column.key];
    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: cellBackgroundColor,
                transition: 'background-color 0.3s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '8px',
                boxSizing: 'border-box',
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    //fontWeight: isPrimaryKey ? 'bold' : 'normal',
                    fontSize: '0.875rem', // Ajusta el tamaño si es necesario
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                }}
            >
                {value === null || value === undefined ? '' : String(value)}
            </Typography>
        </Box>
    );
}

export const actionsColumnCellRenderer = (props: RenderCellProps<any, unknown>) => {
    let {row} = props;
    const column = props.column as unknown as ActionColumn<any, unknown>;
    const {tableDefinition, handleDeleteRow} = column;
    if(row[DETAIL_ROW_INDICATOR]) return undefined;
    if (!tableDefinition.allow?.delete) {
        return null;
    }
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleDeleteRow(row)}
                title="Eliminar fila"
                sx={{
                    minWidth: 35,
                    height: 30,
                    p: 0.5,
                    '& .MuiButton-startIcon': { m: 0 }
                }}
            >
                <DeleteIcon sx={{ fontSize: 18 }} />
            </Button>
        </Box>
    );

}

//TODO: terminar, revisar key duplicada
export const detailColumnCellRenderer = (props: RenderCellProps<any, unknown>) => {
    let {row, rowIdx} = props;
    const column = props.column as unknown as DetailColumn<any, unknown>;
    const {detailTable, primaryKey, tableData, setTableData} = column;
    if(row[DETAIL_ROW_INDICATOR])return undefined
    const rowId = getPrimaryKeyValues(row, primaryKey);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    return (
        <Tooltip title={detailTable.label}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <IconButton
                    size="small"
                    onClick={(event) => {
                        let rows = [...tableData]
                        if(isExpanded){
                            setTableData(rows.filter((row) => row[DETAIL_ROW_INDICATOR]!=detailTable.abr))
                        }else{
                            rows.splice(rowIdx+1,0,{
                                ...row,
                                [DETAIL_ROW_INDICATOR]: detailTable.abr,
                            });
                            setTableData(rows)
                        }
                        setIsExpanded((previous)=>!previous)                      
                        event.stopPropagation();
                    }}
                    title={isExpanded ? 'Contraer detalle' : 'Expandir detalle'}
                    sx={{ p: 0.5 }}
                >
                    {isExpanded ? <KeyboardArrowUpIcon sx={{ fontSize: 20 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />}
                </IconButton>
            </Box>
        </Tooltip>
    );
}