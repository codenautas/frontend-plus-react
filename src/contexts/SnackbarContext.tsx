// src/contexts/SnackbarContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { SnackbarContextType, SnackbarProviderProps, SnackbarState } from '../types';

// Definir el tipo de las props para el Alert en el Snackbar
const SnackbarAlert = React.forwardRef<HTMLDivElement, AlertProps>(function SnackbarAlert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// Crear el contexto
const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

// Valores por defecto para la duración (en milisegundos)
const DEFAULT_SUCCESS_DURATION = 3000; 
const DEFAULT_ERROR_DURATION = 5000;   

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'info',
        duration: DEFAULT_SUCCESS_DURATION, // Valor inicial
    });

    const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning', duration?: number | null) => {
        // Determina la duración final
        const finalDuration = duration !== undefined && duration !== null
            ? duration
            : (severity === 'error' ? DEFAULT_ERROR_DURATION : DEFAULT_SUCCESS_DURATION);

        setSnackbar({
            open: true,
            message,
            severity,
            duration: finalDuration,
        });
    }, []);

    // Adapta los métodos de conveniencia para aceptar la duración opcional
    const showSuccess = useCallback((message: string, duration?: number | null) => showSnackbar(message, 'success', duration), [showSnackbar]);
    const showError = useCallback((message: string, duration?: number | null) => showSnackbar(message, 'error', duration), [showSnackbar]);
    const showWarning = useCallback((message: string, duration?: number | null) => showSnackbar(message, 'warning', duration), [showSnackbar]);
    const showInfo = useCallback((message: string, duration?: number | null) => showSnackbar(message, 'info', duration), [showSnackbar]);

    const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <SnackbarContext.Provider value={{ showSnackbar, showSuccess, showError, showWarning, showInfo }}>
            {children}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={snackbar.duration} // Usa la duración del estado
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <SnackbarAlert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </SnackbarAlert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};

// Hook personalizado para consumir el contexto
export const useSnackbar = () => {
    const context = useContext(SnackbarContext);
    if (context === undefined) {
        throw new Error('useSnackbar must be used within a SnackbarProvider');
    }
    return context;
};