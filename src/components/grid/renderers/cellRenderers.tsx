import { RenderCellProps } from 'react-data-grid';
import { Box, Button, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { ActionColumn, CustomColumn, DefaultColumn, DetailColumn, NEW_ROW_INDICATOR } from '../GenericDataGrid';
import { Ancestor, FixedField } from '../../../types';
import { clientSides } from '../clientSides';
import FallbackClientSideRenderer from '../FallbackClientSideRenderer';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { SvgIconTypeMap } from '@mui/material/SvgIcon';
import { getPrimaryKeyValues, isNumericType } from '../utils/helpers';
import { cambiarGuionesBajosPorEspacios } from '../../../utils/functions';
// @ts-ignore
import typeStore from 'type-store';


type ActionButtonDefinition = {
    action: 'insert' | 'delete' | 'vertical-edit'
    handler: (row?: any) => void
    title: string
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">> & { muiName: string }
    color: 'success' | 'error' | 'primary'
}

export const allColumnsCellRenderer = (
    props: RenderCellProps<any, unknown>,
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => void,
    ancestors: Ancestor[] = [],
    currentFixedFields: FixedField[] = []
) => {
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
            const currentCellFeedback = cellFeedbackMap.get(cellKey);

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
            // Usamos TypeStore para el formateo de visualización
            const value = row[props.column.key];
            const typer = typeStore.typerFrom(fieldDef);
            const safeToPlain = (val: any): string => {
                try {
                    return typer.toPlainJson(val);
                } catch (e) {
                    return 'ERR: ' + JSON.stringify(val)
                }
            };
            const displayValue = value ? safeToPlain(value) : '';
            const isNumeric = isNumericType(fieldDef?.typeName);


            return (
                <Tooltip title={currentCellFeedback?.message || ''}>
                    <Box
                        className={displayValue === '--' ? 'typed-controls-signal-no-data' : displayValue === '//' ? 'typed-controls-signal-unknown-data' : ''}
                        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: cellBackgroundColor, transition: 'background-color 0.3s ease-in-out', display: 'flex', alignItems: 'center', justifyContent: isNumeric ? 'flex-end' : 'flex-start', paddingLeft: '8px', paddingRight: '12px', boxSizing: 'border-box' }}
                    >
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {displayValue}
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
                            onClick={() => {
                                if (detailTable && onOpenDetail) {
                                    // 1. Calculamos los filtros específicos de este detalle
                                    const detailFixedFields: FixedField[] = detailTable.fields.map(f => {
                                        if (typeof f === 'string') return { fieldName: f, value: row[f] };
                                        if ('source' in f) return { fieldName: f.target, value: row[f.source] };
                                        return { fieldName: f.target as string, value: f.value };
                                    });

                                    // 2. Acumulamos con los filtros que ya tiene la grilla actual (heredados de arriba)
                                    // Deduplicamos por nombre de campo para evitar redundancia en el título y filtros
                                    const rawFixedFields: FixedField[] = [...currentFixedFields, ...detailFixedFields];
                                    const deduplicatedMap = new Map<string, FixedField>();
                                    rawFixedFields.forEach(ff => deduplicatedMap.set(ff.fieldName, ff));
                                    const allFixedFields = Array.from(deduplicatedMap.values());

                                    // 3. Generamos el título descriptivo (acumulativo)
                                    const filterDescription = allFixedFields
                                        .map(ff => `${cambiarGuionesBajosPorEspacios(ff.fieldName)}: ${ff.value}`)
                                        .join(', ');

                                    const label = `${cambiarGuionesBajosPorEspacios(detailTable.table!).toUpperCase()} (${filterDescription})`;

                                    // 4. Creamos la nueva cadena de ancestros, guardando estos filtros para el hijo
                                    const newAncestors: Ancestor[] = [...ancestors, {
                                        tableName: tableDefinition.name,
                                        row,
                                        tableDefinition,
                                        fixedFields: allFixedFields
                                    }];

                                    onOpenDetail(detailTable.table!, allFixedFields, label, newAncestors);
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
                    handler: () => { }, // implementar funcion
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
                            sx={{ width: 22, minWidth: 22, height: 22, '& .MuiButton-startIcon': { m: 0 } }}
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