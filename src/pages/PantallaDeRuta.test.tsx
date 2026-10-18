import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PantallaDeRuta } from './PantallaDeRuta';
import { extendWScreens } from './WScreens';
import { WScreenProps } from '../types';

describe('PantallaDeRuta', () => {
    it('le pasa a la wScreen los parámetros de la query string (así se abre un detalle wScreen en otra pestaña)', () => {
        const Ticket = ({ params }: WScreenProps) => <span data-testid="pantalla">{JSON.stringify(params)}</span>;
        extendWScreens({ ticketDeRuta: Ticket });
        const { getByTestId } = render(
            <MemoryRouter initialEntries={['/wScreens/ticketDeRuta?proyecto=p1&ticket=7']}>
                <Routes><Route path="/wScreens/ticketDeRuta" element={<PantallaDeRuta screenName="ticketDeRuta" />} /></Routes>
            </MemoryRouter>
        );
        expect(getByTestId('pantalla').textContent).toBe('{"proyecto":"p1","ticket":"7"}');
    });

    it('sin query string los params son un objeto vacío', () => {
        const Vacia = ({ params }: WScreenProps) => <span data-testid="pantalla">{JSON.stringify(params)}</span>;
        extendWScreens({ vacia: Vacia });
        const { getByTestId } = render(
            <MemoryRouter initialEntries={['/wScreens/vacia']}>
                <Routes><Route path="/wScreens/vacia" element={<PantallaDeRuta screenName="vacia" />} /></Routes>
            </MemoryRouter>
        );
        expect(getByTestId('pantalla').textContent).toBe('{}');
    });
});
