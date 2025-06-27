// src/pages/LogoutPage.tsx
import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import useLogout from '../hooks/useLogout';

const LogoutPage: React.FC = () => {
    const logout = useLogout(); 

    useEffect(() => {
        // Llama a la función de logout del hook cuando el componente se monta
        logout();
    }, [logout]); // Dependencia: la función 'logout' en sí misma

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            textAlign: 'center'
        }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>Cerrando sesión...</Typography>
        </Box>
    );
};

export default LogoutPage;