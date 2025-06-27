// src/components/InitialRedirectHandler.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useRedirectPath, useClientContextStatus } from '../store'; // <--- ¡Asegúrate de importar useClientContextStatus de aquí!
import { setCurrentPath, setRedirectPath } from '../store/routerSlice';

const InitialRedirectHandler: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const redirectPath = useRedirectPath();
    const clientContextStatus = useClientContextStatus(); // <--- ¡Ahora lo obtienes de Redux!

    // Efecto para despachar la ruta actual al cambiar
    useEffect(() => {
        dispatch(setCurrentPath(location.pathname + location.search));
    }, [location, dispatch]);

    // Efecto para manejar la redirección inicial (después de login o recarga si ya estaba logueado)
    useEffect(() => {
        // Asegúrate de que el clientContext esté cargado/autenticado antes de intentar redirigir
        if (clientContextStatus === 'succeeded') {
            if (redirectPath && redirectPath !== '/login') { // Evita redirigir a /login
                console.log('Redirigiendo a la ruta guardada:', redirectPath);
                navigate(redirectPath);
                dispatch(setRedirectPath(null)); // Limpia la ruta guardada después de usarla
            } else if (location.pathname === '/login' || location.pathname === '/') {
                // Si el usuario está en /login o / y ya está autenticado y no hay ruta de redirección
                // lo mandamos a /home por defecto.
                console.log('Usuario autenticado, redirigiendo a /home por defecto.');
                navigate('/home');
            }
        }
    }, [clientContextStatus, redirectPath, location.pathname, navigate, dispatch]);

    return null; // No renderiza nada
};

export default InitialRedirectHandler;