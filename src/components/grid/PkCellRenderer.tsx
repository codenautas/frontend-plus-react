import { Typography } from '@mui/material';
import { CustomCellProps } from '../../types';

// La función debe usar R extends Record<string, any>
function PkCellRenderer<R extends Record<string, any>, SR>(props: CustomCellProps<R, SR>) {
    const { column, row } = props;
    const isPrimaryKey = column.isPK;

    // Casting explícito de 'row' a 'Record<string, any>' justo antes de indexar.
    // Esto le dice a TypeScript: "Confío en que 'row' es un objeto que puedo indexar con una cadena."
    const rowAsRecord = row as Record<string, any>;
    const value = rowAsRecord[column.key];

    return (
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
    );
}

export default PkCellRenderer;