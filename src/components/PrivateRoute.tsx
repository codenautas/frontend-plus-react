// src/components/PrivateRoute.tsx
import React, { useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useClientContextStatus } from '../store'; // Importa useDispatch, useClientContextStatus
import { setRedirectPath } from '../store/routerSlice'; // Importa la acción para guardar la ruta de redirección
import { PrivateRouteProps } from '../types';

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const clientContextStatus = useClientContextStatus(); // Obtiene el estado de Redux

    const isAuthenticated = clientContextStatus === 'succeeded';
    const isLoadingAuth = clientContextStatus === 'loading';

    console.log(`[PrivateRoute] Render: Path=${location.pathname}, AuthStatus=${clientContextStatus}, IsAuthenticated=${isAuthenticated}, IsLoadingAuth=${isLoadingAuth}`);

    useEffect(() => {
        console.log(`[PrivateRoute] Effect: Path=${location.pathname}, AuthStatus=${clientContextStatus}, IsAuthenticated=${isAuthenticated}, IsLoadingAuth=${isLoadingAuth}`);
        // Condición para guardar la URL:
        // 1. El usuario NO está autenticado.
        // 2. NO estamos en el proceso de carga de autenticación (ya sabemos que no está autenticado).
        // 3. NO estamos ya en la página de login (para evitar guardar /login).
        if (!isAuthenticated && !isLoadingAuth && location.pathname !== '/login') {
            const path = location.pathname + location.search;
            console.log(`[PrivateRoute] ACTION: Dispatching setRedirectPath(${path})`);
            dispatch(setRedirectPath(path));
        } else if (isAuthenticated) {
            console.log(`[PrivateRoute] User is authenticated, no redirectPath set.`);
        } else if (isLoadingAuth) {
            console.log(`[PrivateRoute] Still loading authentication.`);
        } else if (location.pathname === '/login') {
            console.log(`[PrivateRoute] Currently on /login, not setting redirectPath.`);
        }
    }, [isAuthenticated, isLoadingAuth, location, dispatch, clientContextStatus]); // Añadir clientContextStatus a las dependencias del efecto

    if (isLoadingAuth) {
        console.log(`[PrivateRoute] Returning loading state...`);
        return <p>Verificando autenticación...</p>;
    }

    if (!isAuthenticated) {
        console.log(`[PrivateRoute] User not authenticated, navigating to /login`);
        return <Navigate to="/login" replace />;
    }

    console.log(`[PrivateRoute] User authenticated, rendering children.`);
    return <>{children}</>;
};

export default PrivateRoute;