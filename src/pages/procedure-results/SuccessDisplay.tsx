import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { ResultOkProps } from './resultsOk'; 

const SuccessDisplay: React.FC<ResultOkProps> = ({ data }) => {
    return (
        <Paper elevation={2} sx={{ p: 2, mt: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
                ¡Operación Exitosa!
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                Detalles del resultado:
            </Typography>
            <Box sx={{ bgcolor: 'success.dark', p: 1, borderRadius: 1, mt: 1, overflowX: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', color: 'white' }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </Box>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mt: 1 }}>
                Puedes revisar los detalles anteriores o cerrar este mensaje.
            </Typography>
        </Paper>
    );
};

export default SuccessDisplay;