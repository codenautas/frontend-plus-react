import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import WarningAmberIcon from '@mui/icons-material/WarningAmber'; // Asegúrate de importar el icono de advertencia

export interface WScreenProps {
    screenName: string; // Renombramos de pageName a screenName
}

// Ejemplo de un componente de wScreen personalizado
const MyCustomDashboard: React.FC<WScreenProps> = ({ screenName }) => {
    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 600 }}>
                <Typography variant="h5" component="h1" gutterBottom>
                    ¡Bienvenido a tu WScreen: {screenName}!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Esta es una pantalla de interfaz de usuario personalizada.
                </Typography>
                <Box sx={{ mt: 3 }}>
                    <ConstructionIcon sx={{ fontSize: 80, color: 'primary.main' }} />
                </Box>
            </Paper>
        </Box>
    );
};

export const FallbackWScreen: React.FC<WScreenProps> = ({ screenName }) => {
    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 600, backgroundColor: 'warning.light', border: '1px solid orange' }}>
                <Typography variant="h5" component="h1" gutterBottom color="warning.dark">
                    WScreen No Implementada
                </Typography>
                <Typography variant="body1" color="warning.dark">
                    No se encontró un componente implementado para la **WScreen**: **`"${screenName}"`**.
                    Por favor, verifica el `menuType` en la definición del menú o asegúrate de que el componente esté correctamente importado y mapeado en el frontend.
                </Typography>
                <Box sx={{ mt: 3 }}>
                    <WarningAmberIcon sx={{ fontSize: 80, color: 'warning.dark' }} />
                </Box>
            </Paper>
        </Box>
    );
};

// Mapeo de nombres de wScreens a sus componentes
export let wScreens: Record<string, React.FC<WScreenProps>> = {
    'MyCustomDashboard': MyCustomDashboard,
    // Agrega más componentes de wScreen aquí:
    // 'AnotherWScreen': AnotherWScreenComponent,
};

export const extendWScreens = (newWScreens: Record<string, React.FC<WScreenProps>>) => {
    wScreens = { ...wScreens, ...newWScreens };
    console.log('wScreens extendidos:', wScreens);
};