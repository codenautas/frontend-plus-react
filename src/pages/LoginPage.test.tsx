import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './LoginPage';
import InitialRedirectHandler from '../components/InitialRedirectHandler';
import clientContextReducer from '../store/clientContextSlice';
import routerReducer from '../store/routerSlice';
import menuUiReducer from '../store/menuUiSlice';
import { RouterState } from '../types';
import { fetchApi } from '../utils/fetchApi';

vi.mock('../utils/fetchApi', async (importarOriginal) => ({ ...(await importarOriginal<typeof import('../utils/fetchApi')>()), fetchApi: vi.fn() }));
vi.mock('../contexts/AppContext', () => ({ useApp: () => ({ setIsLoggedIn: vi.fn(), checkSession: vi.fn() }) }));

const fetchApiSimulado = vi.mocked(fetchApi);

function Ubicacion() {
    const { pathname, hash } = useLocation();
    return <span data-testid="ruta">{pathname + hash}</span>;
}

function respuesta(cuerpo: unknown, url: string): Response {
    const resultado = new Response(JSON.stringify(cuerpo));
    Object.defineProperty(resultado, 'url', { value: url });
    return resultado;
}

function renderizar(redirectPath: string | null) {
    const router: RouterState = { currentPath: '/login', previousPath: null, redirectPath };
    const store = configureStore({
        reducer: { clientContext: clientContextReducer, router: routerReducer, menuUi: menuUiReducer },
        preloadedState: {
            clientContext: clientContextReducer(undefined, { type: 'inicio' }),
            router,
            menuUi: menuUiReducer(undefined, { type: 'inicio' }),
        },
    });
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/login']}>
                <InitialRedirectHandler />
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Ubicacion />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}

async function iniciarSesion(pantalla: ReturnType<typeof renderizar>) {
    fireEvent.change(await pantalla.findByPlaceholderText('Ingresa tu usuario'), { target: { value: 'bob' } });
    fireEvent.change(pantalla.getByPlaceholderText('Ingresa tu contraseña'), { target: { value: 'clave' } });
    fireEvent.click(pantalla.getByRole('button', { name: /iniciar sesi/i }));
}

describe('LoginPage', () => {
    beforeEach(() => {
        fetchApiSimulado.mockReset();
        fetchApiSimulado.mockImplementation(async (endPoint: string) =>
            endPoint === '/login'
                ? respuesta({}, 'http://localhost/menu')
                : respuesta({ menu: [], procedure: {}, procedures: [], config: {}, useragent: {}, username: 'bob' }, 'http://localhost/client-setup')
        );
    });

    it('después del login vuelve a la ruta que se pidió antes (con su hash), no a la pantalla de inicio', async () => {
        const pantalla = renderizar('/bp/menu#w=ayuda');
        await iniciarSesion(pantalla);
        await waitFor(() => expect(pantalla.getByTestId('ruta').textContent).toBe('/bp/menu#w=ayuda'));
        // y se queda ahí: nada pisa la ruta cuando termina de cargarse el contexto
        await new Promise(resolver => setTimeout(resolver, 100));
        expect(pantalla.getByTestId('ruta').textContent).toBe('/bp/menu#w=ayuda');
    });

    it('sin ruta pedida va a la raíz (la pantalla de inicio la resuelve PantallaInicial)', async () => {
        const pantalla = renderizar(null);
        await iniciarSesion(pantalla);
        await waitFor(() => expect(pantalla.getByTestId('ruta').textContent).toBe('/'));
    });
});
