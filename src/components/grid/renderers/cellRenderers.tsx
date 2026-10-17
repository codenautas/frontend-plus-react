import React from 'react';
import { RenderCellProps } from 'react-data-grid';
import { Box, Button, IconButton, Tooltip, useTheme } from '@mui/material';
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
import { getPrimaryKeyValues } from '../utils/helpers';
import { cambiarGuionesBajosPorEspacios } from '../../../utils/functions';
import { useCeldaPendiente, useFeedbackCelda } from '../estadoGrilla';


type ActionButtonDefinition = {
    action: 'insert' | 'delete' | 'vertical-edit'
    handler: (row?: any) => void
    title: string
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">> & { muiName: string }
    color: 'success' | 'error' | 'primary'
}

interface CeldaDatoProps {
    row: Record<string, any>;
    columnKey: string;
    defaultColumn: DefaultColumn<any, unknown>;
}

/**
 * Celda de datos. Es un componente memorizado: solo se redibuja cuando cambia su fila
 * o el feedback/pendiente de esta celda (que lee del EstadoGrilla, no de la columna).
 * Se usan elementos y clases simples en lugar de Box/Typography/Tooltip de MUI
 * porque hay una por cada celda visible.
 */
const CeldaDato = React.memo(function CeldaDato({ row, columnKey, defaultColumn }: CeldaDatoProps) {
    const theme = useTheme();
    const { primaryKey, fixedFields, typer, isMandatory, isNumeric } = defaultColumn;
    const rowId = getPrimaryKeyValues(row, primaryKey);
    const currentCellFeedback = useFeedbackCelda(`${rowId}-${columnKey}`);
    const pendiente = useCeldaPendiente(rowId, columnKey);

    const value = row[columnKey];
    const hasValue = value !== null && value !== undefined && String(value).trim() !== '';

    let cellBackgroundColor = 'transparent';
    if (currentCellFeedback) {
        cellBackgroundColor = currentCellFeedback.type === 'error' ? theme.palette.error.light : theme.palette.success.light;
    } else if (fixedFields?.some(f => f.fieldName === columnKey)) {
        cellBackgroundColor = theme.palette.action.selected;
    } else if ((isMandatory && !hasValue) || pendiente) {
        cellBackgroundColor = '#e3f2fd'; // Celeste premium suave
    }

    //  TODO: Capturar valor fecha
    // Usamos TypeStore para el formateo de visualización
    let displayValue: string = value !== null && value !== undefined ? typer.toLocalString(value) : '';
    if (!hasValue && isMandatory) {
        displayValue = '* ' + displayValue; // Agrega el asterisco si está vacío y es requerido
    }

    const signal = displayValue === '--' ? 'typed-controls-signal-no-data' : displayValue === '//' ? 'typed-controls-signal-unknown-data' : '';
    const celda = (
        <div
            className={`fpr-celda ${isNumeric ? 'fpr-celda-numerica' : ''} ${signal} ${row[NEW_ROW_INDICATOR] ? 'new-row-cell-animation' : ''}`}
            style={{ backgroundColor: cellBackgroundColor }}
        >
            {displayValue}
        </div>
    );
    // El Tooltip de MUI solo se arma cuando hay un mensaje que mostrar
    return currentCellFeedback?.message
        ? <Tooltip title={currentCellFeedback.message}>{celda}</Tooltip>
        : celda;
});

export const allColumnsCellRenderer = (
    props: RenderCellProps<any, unknown>,
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => void,
    ancestors: Ancestor[] = [],
    currentFixedFields: FixedField[] = []
) => {
    const column = props.column as unknown as CustomColumn<any, unknown>;
    const { row } = props;

    // Lógica para renderizar una celda normal
    switch (column.customType) {
        case 'default': {
            const defaultColumn = column as DefaultColumn<any, unknown>;
            const { fieldDef, tableDefinition, primaryKey } = defaultColumn;

            if (fieldDef?.clientSide) {
                const ClientSideComponent = clientSides[fieldDef.clientSide];
                if (ClientSideComponent) {
                    return <ClientSideComponent {...props} fieldDefinition={fieldDef} tableDefinition={tableDefinition} primaryKey={primaryKey} />;
                }
                return <FallbackClientSideRenderer {...props} fieldDefinition={fieldDef} tableDefinition={tableDefinition} primaryKey={primaryKey} />;
            }

            return <CeldaDato row={row} columnKey={props.column.key} defaultColumn={defaultColumn} />;
        }

        case 'detail': {
            const detailColumn = column as DetailColumn<any, unknown>;
            const { detailTable, tableDefinition } = detailColumn;

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
            const { tableDefinition, handleDeleteRow, handleAddRow, handleVerticalEditRow } = actionColumn;


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
                    handler: handleVerticalEditRow,

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