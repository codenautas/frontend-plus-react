import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CapturaBP } from './CapturaBP';

vi.mock('../env', () => ({ envConfig: { backendUrl: '/ggs2026' } }));

function Ubicacion() {
    const { pathname, hash } = useLocation();
    return <span data-testid="ruta">{pathname + hash}</span>;
}

describe('CapturaBP', () => {
    let base: HTMLBaseElement;

    beforeEach(() => {
        base = document.createElement('base');
        base.href = `${window.location.origin}/ggs2026/`;
        document.head.prepend(base);
    });

    afterEach(() => {
        base.remove();
    });

    it('un enlace de backend-plus al login (el aviso «Iniciar sesión» de my-inform-net-status.js, que queda en el body aunque la pantalla ya sea de React) va al login de la aplicación', () => {
        const { getByTestId } = render(
            <MemoryRouter initialEntries={['/menu/usuarios']}>
                <CapturaBP />
                <Routes><Route path="*" element={<Ubicacion />} /></Routes>
            </MemoryRouter>
        );
        // no hay ninguna pantalla de backend-plus montada: el aviso lo puso backend-plus fuera de React
        const aviso = document.createElement('a');
        aviso.setAttribute('href', 'login');
        aviso.textContent = 'Iniciar sesión';
        document.body.appendChild(aviso);
        fireEvent.click(aviso);
        aviso.remove();
        expect(getByTestId('ruta').textContent).toBe('/login');
    });
});
