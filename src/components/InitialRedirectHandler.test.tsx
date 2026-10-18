import { describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import InitialRedirectHandler from './InitialRedirectHandler';
import clientContextReducer from '../store/clientContextSlice';
import routerReducer from '../store/routerSlice';
import menuUiReducer from '../store/menuUiSlice';
import { ClientContextState, RouterState } from '../types';

function Ubicacion() {
    return <span data-testid="ruta">{useLocation().pathname}</span>;
}

function renderizar(rutaInicial: string, estado: ClientContextState['status'], redirectPath: string | null) {
    const clientContext = clientContextReducer(undefined, { type: 'inicio' });
    const router: RouterState = { currentPath: rutaInicial, previousPath: null, redirectPath };
    const store = configureStore({
        reducer: { clientContext: clientContextReducer, router: routerReducer, menuUi: menuUiReducer },
        preloadedState: { clientContext: { ...clientContext, status: estado }, router, menuUi: menuUiReducer(undefined, { type: 'inicio' }) },
    });
    return {
        store,
        ...render(
            <Provider store={store}>
                <MemoryRouter initialEntries={[rutaInicial]}>
                    <InitialRedirectHandler />
                    <Routes><Route path="*" element={<Ubicacion />} /></Routes>
                </MemoryRouter>
            </Provider>
        ),
    };
}

describe('InitialRedirectHandler', () => {
    it('con la sesión cargada vuelve a la ruta que se pidió y NO se desvía a /home', async () => {
        // arranque en frío: PrivateRoute mandó a /login guardando la ruta pedida; después la sesión resultó válida
        const { getByTestId, store } = renderizar('/login', 'succeeded', '/table/casilleros');
        await waitFor(() => expect(getByTestId('ruta').textContent).toBe('/table/casilleros'));
        // y se queda ahí aunque el efecto se vuelva a ejecutar al limpiarse la ruta guardada
        await new Promise(resolver => setTimeout(resolver, 50));
        expect(getByTestId('ruta').textContent).toBe('/table/casilleros');
        expect(store.getState().router.redirectPath).toBeNull();
    });

    it('sin ruta guardada, una sesión válida en /login va a /home', async () => {
        const { getByTestId } = renderizar('/login', 'succeeded', null);
        await waitFor(() => expect(getByTestId('ruta').textContent).toBe('/home'));
    });

    it('sin sesión no mueve a nadie de /login', async () => {
        const { getByTestId } = renderizar('/login', 'idle', null);
        await new Promise(resolver => setTimeout(resolver, 50));
        expect(getByTestId('ruta').textContent).toBe('/login');
    });

    it('con la sesión cargada no toca una ruta que no es /login ni /', async () => {
        const { getByTestId } = renderizar('/table/personas', 'succeeded', null);
        await new Promise(resolver => setTimeout(resolver, 50));
        expect(getByTestId('ruta').textContent).toBe('/table/personas');
    });
});
