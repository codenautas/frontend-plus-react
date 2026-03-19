// frontend-plus-react/src/App.tsx (modificado en tu librería)

import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import SessionExpiredMessage from './components/SessionExpiredMessage';
import { AppProvider } from './contexts/AppContext';
import HomePage from './pages/HomePage';
import LogoutPage from './pages/LogoutPage';
import LoginPage from './pages/LoginPage';
import ProcedureForm from './components/ProcedureForm';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';

import PrivateRoute from './components/PrivateRoute';
import InitialRedirectHandler from './components/InitialRedirectHandler';
import { useAppDispatch } from './store';
import { setCurrentPath } from './store/routerSlice';

import { SnackbarProvider } from './contexts/SnackbarContext';
import GenericDataGridPage from './pages/GenericDataGridPage';
import MenuTablePage from './pages/MenuTablePage';

import { wScreens, FallbackWScreen, extendWScreens } from './pages/WScreens';
import { extendClientSides } from './components/grid/clientSides';
import { extendResultsOk } from './pages/procedure-results/resultsOk';
import { Box } from '@mui/material';
// @ts-ignore
import typeStore from 'type-store';

import { 
    extractPathsFromRoutes, 
    AppProps, 
    WScreenMap, 
    ClientSidesMap, 
    ResultsOksMap,
    WScreenProps,
    ClientSideProps,
    ResultOkProps
} from './types';


import { envConfig } from './env';

const LocationTracker: React.FC = () => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    useEffect(() => {
        dispatch(setCurrentPath(location.pathname + location.search));
    }, [location, dispatch]);
    return null;
};

interface RoutesProps {
    myRoutes?: React.ReactNode;
    myUnloggedRoutes?: React.ReactNode;
    layout?: React.ComponentType;
    unloggedLayout?: React.ComponentType;
}

export function FrontendPlusReactRoutes({ myRoutes, myUnloggedRoutes, layout: Layout = MainLayout, unloggedLayout: UnloggedLayout }: RoutesProps) {
    return (
        <Routes>
            <Route element={UnloggedLayout ? <UnloggedLayout /> : <Outlet />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/logout" element={<LogoutPage />} />
                {myUnloggedRoutes}
            </Route>

            <Route element={
                <PrivateRoute>
                    <InitialRedirectHandler />
                    <Layout />
                </PrivateRoute>
            }>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/table/:tableName" element={<GenericDataGridPage />} />
                <Route path="/menu/:menuName" element={<MenuTablePage />} />
                <Route path="/procedures/:procedureName" element={<ProcedureForm />} />
                {Object.keys(wScreens).map((screenName) => (
                    <Route
                        key={screenName}
                        path={`/wScreens/${screenName}`}
                        element={React.createElement(
                            Box,
                            {
                                sx: { pt: 3, pl: 4 },
                            },
                            React.createElement(wScreens[screenName], ({ screenName } as WScreenProps))

                        )}
                    />
                ))}
                <Route
                    path="/wScreens-fallback/:screenName"
                    element={<Box sx={{ p: 3 }}><FallbackWScreen screenName=":screenName" /></Box>}
                />

                {myRoutes}

                <Route path="*" element={<div style={{ marginTop: '20px', marginLeft: "10px" }}>404 - Recurso No Encontrado</div>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}


// Los tipos WScreenMap, ClientSidesMap, ResultsOksMap y AppProps ahora se importan de ./types


export const FrontendPlusProviders: React.FC<{ children: React.ReactNode, publicPaths: string[] }> = ({ children, publicPaths }) => {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <BrowserRouter>
                    <LocationTracker /> {/* El tracker necesita estar dentro del Router */}
                    <AppProvider publicPaths={publicPaths}>
                        <SnackbarProvider>
                            {children}
                            <SessionExpiredMessage />
                        </SnackbarProvider>
                    </AppProvider>
                </BrowserRouter>
            </PersistGate>
        </Provider>
    );
};

const App = ({
    myRoutes,
    myUnloggedRoutes,
    unloggedLayout,
    myWScreens,
    myClientSides,
    myResultsOk
}: AppProps) => {
    useEffect(() => {
        // --- DINAMICO: Configuración de TypeStore en español ---
        typeStore.messages = typeStore.i18n.messages.es;
        typeStore.locale = typeStore.i18n.locale.es;

        if (myClientSides) {

            extendClientSides(myClientSides);
        }
        if (myResultsOk) {
            extendResultsOk(myResultsOk);
        }
        if (myWScreens) {
            extendWScreens(myWScreens);
        }

        // --- DINAMICO: Favicon desde el Backend ---
        const link = (document.querySelector("link[rel*='icon']") || document.createElement('link')) as HTMLLinkElement;
        link.type = 'image/png';
        link.rel = 'shortcut icon';
        link.href = `${envConfig.backendUrl}/img/logo-128.png`;
        document.getElementsByTagName('head')[0].appendChild(link);
    }, [myClientSides, myResultsOk, myWScreens]);

    const safePaths = React.useMemo(() => {
        const extracted = extractPathsFromRoutes(myUnloggedRoutes);
        // Siempre añadimos login y logout como rutas base seguras
        return ['/login', '/logout', ...extracted];
    }, [myUnloggedRoutes]);
    return (
        <FrontendPlusProviders publicPaths={safePaths}>
            <FrontendPlusReactRoutes
                myRoutes={myRoutes}
                myUnloggedRoutes={myUnloggedRoutes}
                unloggedLayout={unloggedLayout} // Pasamos el layout
            />
        </FrontendPlusProviders>
    );
}

export default App;