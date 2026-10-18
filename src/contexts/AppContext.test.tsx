import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import clientContextReducer from '../store/clientContextSlice';
import routerReducer from '../store/routerSlice';
import menuUiReducer from '../store/menuUiSlice';
import { ClientContextState } from '../types';

vi.mock('../utils/fetchApi', () => ({ fetchApi: vi.fn() }));
import { fetchApi } from '../utils/fetchApi';

const respuesta = (ok: boolean, status: number): Response => new Response('{}', { status: ok ? 200 : status });

function Estado() {
    const { showSessionExpiredMessage, isLoggedIn } = useApp();
    return <span data-testid="estado">{`${isLoggedIn ? 'con sesión' : 'sin sesión'} | cartel: ${showSessionExpiredMessage}`}</span>;
}

function renderizar(ruta: string, estadoGuardado: ClientContextState['status'], publicPaths: string[] = ['/login']) {
    const inicial = clientContextReducer(undefined, { type: 'inicio' });
    const store = configureStore({
        reducer: { clientContext: clientContextReducer, router: routerReducer, menuUi: menuUiReducer },
        preloadedState: { clientContext: { ...inicial, status: estadoGuardado }, router: routerReducer(undefined, { type: 'inicio' }), menuUi: menuUiReducer(undefined, { type: 'inicio' }) },
    });
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[ruta]}>
                <AppProvider publicPaths={publicPaths}><Estado /></AppProvider>
            </MemoryRouter>
        </Provider>
    );
}

describe('AppProvider: cartel de sesión expirada', () => {
    beforeEach(() => vi.mocked(fetchApi).mockReset());

    it('en la primera visita sin sesión NO dice que la sesión expiró', async () => {
        vi.mocked(fetchApi).mockResolvedValue(respuesta(false, 401));
        const { getByTestId } = renderizar('/table/usuarios', 'idle');
        await waitFor(() => expect(fetchApi).toHaveBeenCalled());
        await new Promise(resolver => setTimeout(resolver, 50));
        expect(getByTestId('estado').textContent).toBe('sin sesión | cartel: false');
    });

    it('si lo guardado decía que había sesión y el servidor ya no la reconoce, avisa que expiró', async () => {
        vi.mocked(fetchApi).mockResolvedValue(respuesta(false, 401));
        const { getByTestId } = renderizar('/table/usuarios', 'succeeded');
        await waitFor(() => expect(getByTestId('estado').textContent).toBe('sin sesión | cartel: true'));
    });

    it('si la sesión andaba y se vence mientras se usa la app, avisa que expiró', async () => {
        vi.mocked(fetchApi).mockResolvedValueOnce(respuesta(true, 200)).mockResolvedValue(respuesta(false, 401));
        // cada 15 segundos se vuelve a chequear: se acelera el reloj
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            const { getByTestId } = renderizar('/table/usuarios', 'succeeded');
            await waitFor(() => expect(getByTestId('estado').textContent).toContain('con sesión'));
            await vi.advanceTimersByTimeAsync(16000);
            await waitFor(() => expect(getByTestId('estado').textContent).toBe('sin sesión | cartel: true'));
        } finally {
            vi.useRealTimers();
        }
    });

    it('en una ruta pública nunca muestra el cartel', async () => {
        vi.mocked(fetchApi).mockResolvedValue(respuesta(false, 401));
        const { getByTestId } = renderizar('/login', 'succeeded');
        await waitFor(() => expect(fetchApi).toHaveBeenCalled());
        await new Promise(resolver => setTimeout(resolver, 50));
        expect(getByTestId('estado').textContent).toBe('sin sesión | cartel: false');
    });
});
