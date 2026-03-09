import { RenderCellProps } from 'react-data-grid';
import { Box, Button, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { CustomColumn, DefaultColumn, DetailColumn, ActionColumn, NEW_ROW_INDICATOR } from '../GenericDataGrid';
import { FixedField } from '../../../types';
import { clientSides } from '../clientSides';
import FallbackClientSideRenderer from '../FallbackClientSideRenderer';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { SvgIconTypeMap } from '@mui/material/SvgIcon';
import { getPrimaryKeyValues } from '../utils/helpers';

type ActionButtonDefinition = {
    action: 'insert' | 'delete' | 'vertical-edit'
    handler: (row?: any) => void
    title: string
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">> & { muiName: string }
    color: 'success' | 'error' | 'primary'
}

export const allColumnsCellRenderer = (props: RenderCellProps<any, unknown>,onOpenDetail?: (tableName: string, fixedFields: any[], label: string) => void,) => {
    const theme = useTheme();
    const column = props.column as unknown as CustomColumn<any, unknown>;
    const { row } = props;

    // Lógica para renderizar una celda normal
    switch (column.customType) {
        case 'default': {
            const defaultColumn = column as DefaultColumn<any, unknown>;
            // --- CAMBIO: Cambiamos cellFeedback a cellFeedbackMap ---
            const { fieldDef, tableDefinition, primaryKey, cellFeedbackMap, fixedFields, localCellChanges } = defaultColumn;
            // ---------------------------------------------------------
            const rowId = getPrimaryKeyValues(row, primaryKey);
            const cellKey = `${rowId}-${props.column.key}`; // Clave única para el mapa

            // Obtener el feedback específico para esta celda
            const currentCellFeedback = cellFeedbackMap.get ? cellFeedbackMap.get(cellKey) : cellFeedbackMap[cellKey];

            if (fieldDef?.clientSide) {
                const ClientSideComponent = clientSides[fieldDef.clientSide];
                if (ClientSideComponent) {
                    return <ClientSideComponent {...props} fieldDefinition={fieldDef} tableDefinition={tableDefinition} primaryKey={primaryKey} />;
                }
                return <FallbackClientSideRenderer {...props} fieldDefinition={fieldDef} tableDefinition={tableDefinition} primaryKey={primaryKey} />;
            }

            let cellBackgroundColor = 'transparent';
            
            // --- LÓGICA DE COLOR DE FEEDBACK ADAPTADA ---
            if (currentCellFeedback) {
                cellBackgroundColor = currentCellFeedback.type === 'error' ? theme.palette.error.light : theme.palette.success.light;
            } else {
            // ------------------------------------------
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
            
            //  TODO: Capturar valor fecha
            const value = row[props.column.key];
            return (
                <Tooltip title={currentCellFeedback?.message || ''}>
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
            const { detailTable, primaryKey, tableData, setTableData, detailKey, tableDefinition } = detailColumn;

            return (
                <Tooltip title={detailTable.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <IconButton
                            onClick={(event) => {
                                if (detailTable && onOpenDetail) {
                                    // Calculamos los campos fijos basados en la fila actual
                                    const fixedFields = detailTable.fields.map(f => {
                                        const source = typeof f === 'string' ? f : f.source;
                                        const target = typeof f === 'string' ? f : f.target;
                                        return { fieldName: target, value: row[source] };
                                    });

                                    // Título para la pestaña: "TablaHija (ValorPadre)"
                                    const label = `${detailTable.table} (${row[tableDefinition.primaryKey[0]]})`;
                                    
                                    onOpenDetail(detailTable.table!, fixedFields, label);
                                }
                            }}
                            
                        >
                            <KeyboardArrowRightIcon />
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
                },
                {
                    action: 'delete',
                    handler: handleDeleteRow,
                    icon: DeleteIcon,
                    title: 'Eliminar registro',
                    color: 'error',
                },
                {
                    action: 'vertical-edit',
                    handler: () => {}, // implementar funcion
                    icon: ViewHeadlineIcon,
                    title: 'Editar registro en forma de ficha',
                    color: 'primary',
                }
            ];

            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 0.5 }}>
                    {gridActionButtons.map(actionDef => (
                        tableDefinition.allow![actionDef.action] ? <Button 
                            key={actionDef.action}
                            variant="outlined" 
                            color={actionDef.color} 
                            size="small" 
                            onClick={() => actionDef.handler(row)} 
                            title={actionDef.title} 
                            sx={{ width:22, minWidth: 22, height: 22, '& .MuiButton-startIcon': { m: 0 } }}
                        >
                            <actionDef.icon sx={{ fontSize: 18 }} />
                        </Button> : null
                    ))}
                </Box>
            );
        }

        default:
            return undefined;
    }
};