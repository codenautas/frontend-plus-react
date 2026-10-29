import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import PantallaInicial from './PantallaInicial';

const { contexto } = vi.hoisted(() => ({ contexto: { clientContext: { menu: [] as unknown[] } } }));
vi.mock('../contexts/AppContext', () => ({ useApp: () => contexto }));

function Ubicacion() {
    return <span data-testid="ruta">{useLocation().pathname}</span>;
}

function renderizar() {
    return render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<PantallaInicial />} />
                <Route path="*" element={<Ubicacion />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('PantallaInicial', () => {
    it('va al ítem de menú que el backend declara por omisión', () => {
        contexto.clientContext.menu = [{ menuType: 'table', name: 'personas' }, { menuType: 'proc', name: 'resumen', selectedByDefault: true }];
        expect(renderizar().getByTestId('ruta').textContent).toBe('/procedures/resumen');
    });

    it('si el backend no declara una, queda vacía (no hay pantalla de inicio propia de la librería)', () => {
        contexto.clientContext.menu = [{ menuType: 'table', name: 'personas' }];
        expect(renderizar().container.textContent).toBe('');
    });
});
