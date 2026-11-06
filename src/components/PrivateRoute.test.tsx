import { afterEach, describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import clientContextReducer from '../store/clientContextSlice';
import routerReducer from '../store/routerSlice';
import menuUiReducer from '../store/menuUiSlice';
import { ClientContextState, RouterState } from '../types';
import { marcarCierreVoluntario } from '../utils/cierreVoluntario';

function renderizar(rutaPedida: string, estado: ClientContextState['status']) {
    const clientContext = clientContextReducer(undefined, { type: 'inicio' });
    const router: RouterState = { currentPath: rutaPedida, previousPath: null, redirectPath: null };
    const store = configureStore({
        reducer: { clientContext: clientContextReducer, router: routerReducer, menuUi: menuUiReducer },
        preloadedState: { clientContext: { ...clientContext, status: estado }, router, menuUi: menuUiReducer(undefined, { type: 'inicio' }) },
    });
    render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[rutaPedida]}>
                <Routes>
                    <Route path="/login" element={<span>login</span>} />
                    <Route path="*" element={<PrivateRoute><span>privada</span></PrivateRoute>} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
    return store;
}

describe('PrivateRoute', () => {
    afterEach(() => marcarCierreVoluntario(false));

    it('sin sesión guarda la ruta pedida con su query string y su hash (las pantallas de backend-plus llevan los parámetros en el hash)', async () => {
        const store = renderizar('/bp/menu?x=1#w=tablero&up=a', 'failed');
        await waitFor(() => expect(store.getState().router.redirectPath).toBe('/bp/menu?x=1#w=tablero&up=a'));
    });

    it('si la sesión se cerró a propósito (Salir) no guarda la pantalla donde se estaba', async () => {
        marcarCierreVoluntario(true);
        const store = renderizar('/table/usuarios', 'idle');
        await waitFor(() => expect(document.body.textContent).toBe('login'));
        expect(store.getState().router.redirectPath).toBeNull();
    });
});
