import { RenderCellProps } from 'react-data-grid';
import { Box, Button, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import GenericDataGrid, { getPrimaryKeyValues, NEW_ROW_INDICATOR, DETAIL_ROW_INDICATOR } from '../GenericDataGrid';
import { CustomColumn, DefaultColumn, DetailColumn, ActionColumn } from '../GenericDataGrid';
import { FixedField } from '../../../types';
import { clientSides } from '../clientSides';
import FallbackClientSideRenderer from '../FallbackClientSideRenderer';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { SvgIconTypeMap } from '@mui/material/SvgIcon';

type ActionButtonDefinition = {
    action: 'insert' | 'delete' | 'vertical-edit'
    handler: (row: any) => void
    title: string
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">> & { muiName: string }
    color: 'success' | 'error' | 'primary'
    condition: (tableDefinition: any) => boolean
}

function renderizarBotonAccion(actionDef: ActionButtonDefinition, row: any) {
    if (!actionDef.condition) return null;
    
    return (
        <Button 
            key={actionDef.action}
            variant="outlined" 
            color={actionDef.color} 
            size="small" 
            onClick={() => actionDef.handler(row)} 
            title={actionDef.title} 
            sx={{ minWidth: 19, height: 19, '& .MuiButton-startIcon': { m: 0 } }}
        >
            <actionDef.icon sx={{ fontSize: 18 }} />
        </Button>
    );
}

export const allColumnsCellRenderer = (props: RenderCellProps<any, unknown>) => {
    const theme = useTheme();
    const column = props.column as unknown as CustomColumn<any, unknown>;
    const { row, rowIdx } = props;

    // Lógica para la fila de detalle
    if (row[DETAIL_ROW_INDICATOR]) {
        const detailTableAbr = row[DETAIL_ROW_INDICATOR];
        const detailColumn = column as DetailColumn<any, unknown>;
        
        // Verifica que la columna actual sea la de detalle para esa fila
        if (column.customType === 'detail' && detailColumn.detailTable.abr === detailTableAbr) {
            const detailTable = detailColumn.tableDefinition.detailTables!.find((dt) => dt.abr === detailTableAbr)!;
            
            let fixedFields: FixedField[] = [];
            detailTable.fields.forEach((field: any) => {
                if (typeof field === "string") {
                    fixedFields.push({ fieldName: field, value: row[field] });
                } else {
                    fixedFields.push({ fieldName: field.target, value: row[field.source] });
                }
            });

            return (
                <Box sx={{
                    // Se eliminó el padding para que la sub-grilla se extienda por completo
                    minHeight: '200px',
                    width: '100%',
                    height: '100%',
                    //display: 'flex',
                    //flexDirection: 'column',
                    boxSizing: 'border-box'
                }}
                    onMouseDown={(e) => e.stopPropagation()} 
                    onClick={(e) => e.stopPropagation()} 
                    onKeyDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                >
                    <GenericDataGrid tableName={detailTable.table!} fixedFields={fixedFields} />
                </Box>
                
            );
        }
        
        // Si la fila es de detalle, pero no es la columna correcta, devuelve null
        return undefined;
    }

    // Lógica para renderizar una celda normal
    switch (column.customType) {
        case 'default': {
            const defaultColumn = column as DefaultColumn<any, unknown>;
            const { fieldDef, tableDefinition, primaryKey, cellFeedback, fixedFields, localCellChanges } = defaultColumn;
            const rowId = getPrimaryKeyValues(row, primaryKey);

            if (fieldDef?.clientSide) {
                const ClientSideComponent = clientSides[fieldDef.clientSide];
                if (ClientSideComponent) {
                    return <ClientSideComponent {...props} fieldDefinition={fieldDef} tableDefinition={tableDefinition} primaryKey={primaryKey} />;
                }
                return <FallbackClientSideRenderer {...props} fieldDefinition={fieldDef} tableDefinition={tableDefinition} primaryKey={primaryKey} />;
            }

            let cellBackgroundColor = 'transparent';
            if (cellFeedback && cellFeedback.rowId === rowId && cellFeedback.columnKey === props.column.key) {
                cellBackgroundColor = cellFeedback.type === 'error' ? theme.palette.error.light : theme.palette.success.light;
            } else {
                const isNewRowLocalCheck = row[NEW_ROW_INDICATOR];
                const isMandatory = tableDefinition.primaryKey.includes(props.column.key) || (tableDefinition.fields.find(f => f.name === props.column.key)?.nullable === false);
                const hasValue = row[props.column.key] !== null && row[props.column.key] !== undefined && String(row[props.column.key]).trim() !== '';
                const isFixedFieldCurrent = fixedFields?.some(f => f.fieldName === props.column.key);

                if (isFixedFieldCurrent) {
                    cellBackgroundColor = theme.palette.action.selected;
                } else if ((isNewRowLocalCheck && isMandatory && !hasValue) || (localCellChanges.has(rowId) && localCellChanges.get(rowId)?.has(props.column.key))) {
                    cellBackgroundColor = theme.palette.info.light;
                }
            }
            

            //  TODO: Capturar valor fecha
            const value = row[props.column.key];
            return (
                <Tooltip title={cellFeedback && cellFeedback.rowId === rowId && cellFeedback.columnKey === props.column.key?cellFeedback?.message:''}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: cellBackgroundColor, transition: 'background-color 0.3s ease-in-out', display: 'flex', alignItems: 'center', paddingLeft: '8px', boxSizing: 'border-box' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                            {value === null || value === undefined ? '' : String(value)}
                        </Typography>
                    </Box>
                </Tooltip>
            );
        }
        
        case 'detail': {
            const detailColumn = column as DetailColumn<any, unknown>;
            const { detailTable, primaryKey, tableData, setTableData, detailKey } = detailColumn;
            
            const isExpanded = tableData.some(r => 
                r[DETAIL_ROW_INDICATOR] === detailTable.abr && 
                getPrimaryKeyValues(r, primaryKey) === getPrimaryKeyValues({...row,[DETAIL_ROW_INDICATOR]: detailTable.abr}, primaryKey)
            );

            return (
                <Tooltip title={detailTable.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <IconButton
                            onClick={(event) => {
                                let rows = [...tableData];
                                const rowId = getPrimaryKeyValues({...row,[DETAIL_ROW_INDICATOR]: detailTable.abr}, primaryKey);
                                
                                if (isExpanded) {
                                    setTableData(rows.filter((r) => 
                                        !(r[DETAIL_ROW_INDICATOR] === detailTable.abr && 
                                          getPrimaryKeyValues(r, primaryKey) === rowId)
                                    ));
                                } else {
                                    const parentRowIndex = rowIdx;
                                    rows.splice(parentRowIndex + 1, 0, {
                                        ...row,
                                        [DETAIL_ROW_INDICATOR]: detailTable.abr,
                                    });
                                    setTableData(rows);
                                }
                                event.stopPropagation();
                            }}
                            
                        >
                            {isExpanded ? <KeyboardArrowUpIcon sx={{ fontSize: 20 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />}
                        </IconButton>
                    </Box>
                </Tooltip>
            );
        }

        case 'action': {
            const actionColumn = column as ActionColumn<any, unknown>;
            const { tableDefinition, handleDeleteRow, handleAddRow } = actionColumn;
            
            const gridActionButtons: ActionButtonDefinition[] = [
                {
                    action: 'insert',
                    handler: handleAddRow,
                    icon: AddIcon,
                    title: 'Agregar registro',
                    color: 'success',
                    condition: (td) => td.allow?.insert
                },
                {
                    action: 'delete',
                    handler: handleDeleteRow,
                    icon: DeleteIcon,
                    title: 'Eliminar registro',
                    color: 'error',
                    condition: (td) => td.allow?.delete
                },
                {
                    action: 'vertical-edit',
                    handler: () => {}, // implementar funcion
                    icon: ViewHeadlineIcon,
                    title: 'Editar registro en forma de ficha',
                    color: 'primary',
                    condition: (td) => td.allow?.['vertical-edit']
                }
            ];

            const botones = gridActionButtons
                .filter(actionDef => actionDef.condition(tableDefinition))
                .map(actionDef => renderizarBotonAccion(actionDef, row));

            if (botones.length === 0) return undefined;

            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 0.5 }}>
                    {botones}
                </Box>
            );
        }

        default:
            return undefined;
    }
};