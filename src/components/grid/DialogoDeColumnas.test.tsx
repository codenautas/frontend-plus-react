import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, within } from '@testing-library/react';
import { DialogoDeColumnas } from './DialogoDeColumnas';

function renderizar(ocultas: string[], alternarColumna = vi.fn()) {
    const resultado = render(
        <DialogoDeColumnas open onClose={() => undefined} columnas={['id', 'nombre', 'saldo']} ocultas={new Set(ocultas)} alternarColumna={alternarColumna} />
    );
    return { ...resultado, alternarColumna };
}

describe('DialogoDeColumnas', () => {
    it('muestra a la izquierda las columnas que se ven y a la derecha las ocultas, en el orden de la tabla', () => {
        const { getByTestId } = renderizar(['nombre']);
        expect(within(getByTestId('columnas-mostradas')).getAllByRole('button').map(b => b.textContent)).toEqual(['id', 'saldo']);
        expect(within(getByTestId('columnas-ocultas')).getAllByRole('button').map(b => b.textContent)).toEqual(['nombre']);
    });

    it('un clic en una columna la cambia de lado, esté a la vista u oculta', () => {
        const { getByText, alternarColumna } = renderizar(['nombre']);
        fireEvent.click(getByText('saldo'));
        fireEvent.click(getByText('nombre'));
        expect(alternarColumna.mock.calls).toEqual([['saldo'], ['nombre']]);
    });
});
