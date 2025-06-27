// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { fetchApi } from '../utils/fetchApi';
import { useNavigate } from 'react-router-dom';

// Importa los hooks de Redux y las acciones de tu slice
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store'; // Asegúrate de que la ruta sea correcta
import { fetchClientContext, clearClientContext } from '../store/clientContextSlice'; // Importa el thunk y la acción
import { AppContextType, AppProviderProps } from '../types';

// Crea el contexto con un valor por defecto que se sobrescribirá
const AuthContext = createContext<AppContextType | undefined>(undefined);

// Hook personalizado para usar el contexto de autenticación
export const useApp = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    // Si quieres que 'useApp' siga devolviendo 'clientContext', lo obtendrías aquí de Redux:
    const clientContext = useSelector((state: RootState) => state.clientContext);
    return { ...context, clientContext };
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    console.log("AppProvider rendered/re-rendered");

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showSessionExpiredMessage, setShowSessionExpiredMessage] = useState(false);

    // Obtener 'dispatch' para despachar acciones de Redux
    const dispatch = useDispatch<AppDispatch>();
    // Obtener 'clientContext' del store de Redux
    const clientContext = useSelector((state: RootState) => state.clientContext);

    const navigate = useNavigate();

    // Memoizamos checkSession. Ahora despachará acciones de Redux.
    const checkSession = useCallback(async () => {
        try {
            const response = await fetchApi('/keep-alive.json', { method: 'GET' });
            if (response.ok) {
                setIsLoggedIn(true);
                setShowSessionExpiredMessage(false);

                // Si clientContext no está cargado o si hubo un error previo,
                // despachamos el thunk para cargarlo.
                // Con redux-persist, si ya estaba en localStorage, 'clientContext.status' será 'succeeded'.
                if (clientContext.status === 'idle' || clientContext.status === 'failed') {
                    console.log("Client context needs loading/reloading, dispatching fetchClientContext thunk...");
                    try {
                        // .unwrap() para que el 'catch' capture los errores del thunk
                        await dispatch(fetchClientContext()).unwrap();
                        console.log("Client context data loaded successfully by Redux.");
                    } catch (loadError: any) {
                        console.error("Error loading client context data during session check:", loadError);
                        // No es necesario lanzar el error, el estado de Redux ya lo manejará
                    }
                }
            } else {
                // Si la sesión no es válida, limpiamos el estado de autenticación y el clientContext en Redux
                setIsLoggedIn(false);
                dispatch(clearClientContext()); // Disparar la acción para limpiar el clientContext en Redux

                if (!showSessionExpiredMessage && window.location.pathname !== '/login') {
                    setShowSessionExpiredMessage(true);
                }
            }
        } catch (error: any) {
            console.error("Error checking session:", error);
            setIsLoggedIn(false);
            dispatch(clearClientContext()); // Limpiar clientContext en Redux
            if (!showSessionExpiredMessage && window.location.pathname !== '/login') {
                setShowSessionExpiredMessage(true);
            }
        }
    }, [dispatch, clientContext.status, showSessionExpiredMessage]); // Dependencias: dispatch (estable), y el estado de carga del clientContext

    useEffect(() => {
        checkSession();

        const intervalId = setInterval(checkSession, 15 * 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [checkSession]); // Se ejecuta una vez al montar, y se re-ejecuta si checkSession cambia (no debería si useCallback está bien)

    // ¡La CLAVE! Memoizamos el objeto de contexto.
    // clientContext y setClientContext ya NO van aquí, se acceden directamente vía Redux.
    const authContextValue = useMemo(() => ({
        isLoggedIn,
        setIsLoggedIn,
        checkSession,
        showSessionExpiredMessage,
        setShowSessionExpiredMessage,
    }), [
        isLoggedIn,
        setIsLoggedIn,
        checkSession,
        showSessionExpiredMessage,
        setShowSessionExpiredMessage,
    ]);

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};