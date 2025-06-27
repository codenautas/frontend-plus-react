import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, Typography } from '@mui/material'; // Importa Box, Alert, Typography de MUI
import GenericDataGrid from '../components/grid/GenericDataGrid'; // Ajusta la ruta si es necesario

const GenericDataGridPage: React.FC = () => {
    // Usa useParams para obtener el tableName de la URL
    const { tableName } = useParams<{ tableName?: string }>();

    if (!tableName) {
        // Muestra un mensaje de error si tableName no está presente en la URL
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="error">
                    <Typography variant="h6">Error: Nombre de tabla no especificado en la URL.</Typography>
                    <Typography variant="body1">Por favor, asegúrate de que la URL contenga el nombre de la tabla (ej. `/data/users`).</Typography>
                </Alert>
            </Box>
        );
    }

    // Pasa tableName como prop al GenericDataGrid
    return <GenericDataGrid tableName={tableName} fixedFields={[]} />;
};

export default GenericDataGridPage;