import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ClientSideProps } from './clientSides'; // Asegúrate de importar la interfaz

const FallbackClientSideRenderer: React.FC<ClientSideProps> = ({ column, row, fieldDefinition }) => {
    const clientSideName = fieldDefinition?.clientSide || 'Desconocido';

    return (
        <Tooltip title={`Componente clientSide '${clientSideName}' no implementado. Mostrando valor por defecto.`}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between', // Para espaciar el valor y el icono
                    gap: 1, // Espacio entre elementos
                    width: '100%',
                    height: '100%',
                    paddingLeft: '8px',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)', // Amarillo claro para advertencia
                    border: '1px dashed rgba(255, 193, 7, 0.5)',
                    boxSizing: 'border-box',
                    overflow: 'hidden', // Evita que el contenido se desborde
                }}
            >
                <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                    {clientSideName + ' not found'}
                </Typography>
                <WarningAmberIcon
                    sx={{
                        fontSize: 18,
                        color: 'warning.main',
                        marginRight: '4px' // Pequeño margen a la derecha del icono
                    }}
                />
            </Box>
        </Tooltip>
    );
};

export default FallbackClientSideRenderer;