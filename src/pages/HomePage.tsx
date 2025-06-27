// src/pages/HomePage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useApp } from '../contexts/AppContext'; // Asegúrate de la ruta correcta

const HomePage: React.FC = () => {
    const { clientContext } = useApp();

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                {`Bienvenido/a ${clientContext?.username}`}
            </Typography>
            <Typography variant="body1">
                Usa el menú lateral para navegar por las diferentes secciones.
            </Typography>
            {/* Puedes añadir más contenido aquí, como un dashboard simple o enlaces rápidos */}
        </Box>
    );
};

export default HomePage;