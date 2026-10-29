// src/components/InitialRedirectHandler.tsx
import React, { useEffect, useRef } from 'react';
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

    // Después de navegar a la ruta guardada, el efecto de abajo se vuelve a ejecutar (redirectPath pasó a null) mientras
    // la ruta todavía figura como /login: sin esta marca caería en "ir a la pantalla de inicio por defecto" y se perdería el destino.
    const navegandoRef = useRef(false);
    useEffect(() => {
        navegandoRef.current = false;
    }, [location.pathname]);

    // Efecto para manejar la redirección inicial (después de login o recarga si ya estaba logueado)
    useEffect(() => {
        // Asegúrate de que el clientContext esté cargado/autenticado antes de intentar redirigir
        if (clientContextStatus === 'succeeded') {
            if (redirectPath && redirectPath !== '/login') { // Evita redirigir a /login
                console.log('Redirigiendo a la ruta guardada:', redirectPath);
                navegandoRef.current = true;
                navigate(redirectPath);
                dispatch(setRedirectPath(null)); // Limpia la ruta guardada después de usarla
            } else if (!navegandoRef.current && location.pathname === '/login') {
                // Si el usuario está en /login y ya está autenticado y no hay ruta de redirección
                // lo mandamos a / (PantallaInicial lo lleva a la pantalla de inicio que declara el backend).
                console.log('Usuario autenticado, redirigiendo a la pantalla de inicio.');
                navigate('/');
            }
        }
    }, [clientContextStatus, redirectPath, location.pathname, navigate, dispatch]);

    return null; // No renderiza nada
};

export default InitialRedirectHandler;