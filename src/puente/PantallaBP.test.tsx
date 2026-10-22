import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MyOwnBP, PantallaBP as PantallaDeBP } from './clienteBP';
import { PaginaBP, PantallaDeRespaldo } from './PantallaBP';
import { habilitarPuenteBP } from './habilitacion';

const { cargarClienteBP } = vi.hoisted(() => ({ cargarClienteBP: vi.fn() }));
vi.mock('./clienteBP', () => ({ cargarClienteBP }));
// el menú es estable entre renders, como el que viene de Redux
const { contexto } = vi.hoisted(() => ({
    contexto: { clientContext: { menu: [{ menuType: 'menu', name: 'tickets', menuContent: [{ menuType: 'ticket', name: 'nuevo', proyecto: 'p1' }] }] } },
}));
vi.mock('../contexts/AppContext', () => ({ useApp: () => contexto }));

function clienteConPantallas(pantallas: Record<string, PantallaDeBP>): MyOwnBP {
    return { autoSetup: async () => undefined, wScreens: pantallas, tableGrid: vi.fn() };
}

function renderizar(direccion: string) {
    return render(
        <MemoryRouter initialEntries={[direccion]}>
            <Routes>
                <Route path="/wScreens-fallback/:screenName" element={<PantallaDeRespaldo />} />
                <Route path="/bp/menu" element={<PaginaBP />} />
                <Route path="/" element={<span>inicio</span>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('PantallaDeRespaldo', () => {
    beforeEach(() => { cargarClienteBP.mockReset(); });

    it('con el puente apagado avisa que la wScreen no está implementada y no carga nada de backend-plus', () => {
        const { container } = renderizar('/wScreens-fallback/ticket');
        expect(container.textContent).toContain('WScreen No Implementada');
        expect(cargarClienteBP).not.toHaveBeenCalled();
    });

    it('con el puente encendido dibuja la wScreen de backend-plus en #main_layout, con los datos de su ítem de menú y la query string', async () => {
        habilitarPuenteBP();
        const pantalla = vi.fn<PantallaDeBP>((_parametros) => {
            document.getElementById('main_layout')?.append('pantalla de backend-plus');
        });
        cargarClienteBP.mockResolvedValue(clienteConPantallas({ ticket: pantalla }));
        const { container } = renderizar('/wScreens-fallback/ticket?ticket=7');
        await waitFor(() => expect(pantalla).toHaveBeenCalledTimes(1));
        expect(pantalla.mock.calls[0][0]).toMatchObject({ menuType: 'ticket', name: 'nuevo', proyecto: 'p1', ticket: '7' });
        expect(container.querySelector('#main_layout')?.textContent).toBe('pantalla de backend-plus');
    });

    it('con el puente encendido, la ruta de respaldo pasa a /bp/menu#w=... (la dirección que imitan las de backend-plus) y conserva los parámetros', async () => {
        habilitarPuenteBP();
        const pantalla = vi.fn<PantallaDeBP>();
        cargarClienteBP.mockResolvedValue(clienteConPantallas({ ticket: pantalla }));
        renderizar('/wScreens-fallback/ticket?up=a');
        await waitFor(() => expect(pantalla).toHaveBeenCalledTimes(1));
        expect(pantalla.mock.calls[0][0]).toMatchObject({ w: 'ticket', up: 'a' });
    });

    it('/bp/menu sin #w=... avisa que falta la pantalla', () => {
        habilitarPuenteBP();
        const { container } = renderizar('/bp/menu');
        expect(container.textContent).toContain('Falta la pantalla de backend-plus');
        expect(cargarClienteBP).not.toHaveBeenCalled();
    });

    it('si backend-plus tampoco tiene la wScreen, avisa que no está implementada', async () => {
        habilitarPuenteBP();
        cargarClienteBP.mockResolvedValue(clienteConPantallas({}));
        const { container } = renderizar('/wScreens-fallback/inexistente');
        await waitFor(() => expect(container.textContent).toContain('WScreen No Implementada'));
    });

    it('si no se puede cargar el cliente (por ejemplo, sin sesión) muestra el motivo', async () => {
        habilitarPuenteBP();
        cargarClienteBP.mockRejectedValue(new Error('No hay una sesión iniciada en el backend.'));
        const { container } = renderizar('/wScreens-fallback/ticket');
        await waitFor(() => expect(container.textContent).toContain('No hay una sesión iniciada en el backend.'));
    });
});
