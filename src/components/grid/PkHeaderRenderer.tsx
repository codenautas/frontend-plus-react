
import { Box, Typography } from '@mui/material';
import { CustomHeaderCellProps } from '../../types';

function PkHeaderRenderer<R, SR>(props: CustomHeaderCellProps<R, SR>) {
    const { column } = props;
    const isPrimaryKey = column.isPK;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '4px',
                boxSizing: 'border-box',
                height: '100%',
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 'bold',
                    textDecoration: isPrimaryKey ? 'underline' : 'none',
                    fontSize: '0.875rem', // Puedes ajustar el tamaño si es necesario
                }}
            >
                {column.name}
            </Typography>
        </Box>
    );
}

export default PkHeaderRenderer;