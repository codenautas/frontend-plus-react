import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { RenderHeaderCellProps } from 'react-data-grid';
import { FieldDefinition, FilaDeDatos, FilaDeResumen } from '../../../types';
import { defaultColumnHeaderCellRenderer } from './headerCellRenderers';

type PropsDeEncabezado = RenderHeaderCellProps<FilaDeDatos, FilaDeResumen>;

// doble de lo que react-data-grid le pasa al encabezado: el renderer solo lee el nombre, el orden y su prioridad
function propsDeEncabezado(name: string): PropsDeEncabezado {
    return { column: { name }, sortDirection: undefined, priority: undefined } as PropsDeEncabezado;
}

const campo: FieldDefinition = { name: 'saldo', typeName: 'decimal' };

describe('encabezado de columna', () => {
    it('Alt+clic oculta la columna y el clic de react-data-grid (que ordena) no llega a pasar', () => {
        const ocultarColumna = vi.fn();
        const alOrdenar = vi.fn();
        const { getByText } = render(<div onClick={alOrdenar}>{defaultColumnHeaderCellRenderer(propsDeEncabezado('Saldo'), campo, ocultarColumna)}</div>);
        fireEvent.click(getByText('Saldo'), { altKey: true });
        expect(ocultarColumna).toHaveBeenCalledWith('saldo');
        expect(alOrdenar).not.toHaveBeenCalled();
    });

    it('el clic común no oculta: sigue siendo del orden', () => {
        const ocultarColumna = vi.fn();
        const alOrdenar = vi.fn();
        const { getByText } = render(<div onClick={alOrdenar}>{defaultColumnHeaderCellRenderer(propsDeEncabezado('Saldo'), campo, ocultarColumna)}</div>);
        fireEvent.click(getByText('Saldo'));
        expect(ocultarColumna).not.toHaveBeenCalled();
        expect(alOrdenar).toHaveBeenCalledTimes(1);
    });
});
