import React from 'react';
import { Box, Typography } from '@mui/material';
import { ClientSideProps } from './clientSides';

const ExampleClientSideComponent: React.FC<ClientSideProps> = ({ row, column, fieldDefinition }) => {
    // Accede al valor de la celda:
    const value = row[column.key];

    // Accede a la definición del campo si necesitas propiedades específicas
    // const customProperty = fieldDefinition?.customProp;

    return (
        <Box sx={{
            padding: 0.5,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: value === 'Special' ? 'lightblue' : 'transparent'
        }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {value ? `CS: ${value}` : 'N/A'}
            </Typography>
            {/* Puedes añadir lógica o UI más compleja aquí */}
        </Box>
    );
};

export default ExampleClientSideComponent;