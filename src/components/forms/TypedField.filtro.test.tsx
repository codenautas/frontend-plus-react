import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FieldDefinition } from '../../types';
import { TypedField } from './TypedField';

// jsdom no implementa scrollIntoView (el menú lo usa para mantener a la vista la opción elegida)
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const conOpciones: FieldDefinition = { name: 'rol', typeName: 'text', options: [{ option: 'admin', label: 'Administración' }, { option: 'campo', label: 'Campo' }] };
const fecha: FieldDefinition = { name: 'nacimiento', typeName: 'date' };
const comun: FieldDefinition = { name: 'nombre', typeName: 'text' };

const filtro = (campo: FieldDefinition) => {
    const onChange = vi.fn();
    render(<TypedField fieldDef={campo} value="" onChange={onChange} isFilterMode />);
    return { onChange, entrada: screen.getByRole('textbox') };
};

describe('los expanders en la fila de filtros', () => {
    it('F9 abre el menú de las options y lo elegido se escribe como texto del filtro', () => {
        const { onChange, entrada } = filtro(conOpciones);
        fireEvent.keyDown(entrada, { key: 'F9' });
        fireEvent.click(screen.getByRole('option', { name: /campo/ }));
        expect(onChange).toHaveBeenLastCalledWith('rol', 'campo', true);
    });

    it('en un filtro no hay opción vacía (para eso está el operador)', () => {
        const { entrada } = filtro(conOpciones);
        fireEvent.keyDown(entrada, { key: 'F9' });
        expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['adminAdministración', 'campoCampo']);
    });

    it('en una fecha F9 abre el calendario y elige AAAA-MM-DD, que el filtro entiende', () => {
        const { onChange, entrada } = filtro(fecha);
        fireEvent.keyDown(entrada, { key: 'F9' });
        const calendario = screen.getByLabelText('calendario');
        fireEvent.keyDown(calendario, { key: 'Enter' });
        const [nombre, texto, valido] = onChange.mock.calls[onChange.mock.calls.length - 1];
        expect(nombre).toBe('nacimiento');
        expect(texto).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(valido).toBe(true);
    });

    it('el booleano en el filtro es un texto como los demás: se escribe, o F9 ofrece Sí y No (sin vacío) y lo elegido se escribe en el filtro', () => {
        const { onChange, entrada } = filtro({ name: 'activo', typeName: 'boolean' });
        fireEvent.change(entrada, { target: { value: 's' } });
        expect(onChange).toHaveBeenLastCalledWith('activo', 's', true);
        fireEvent.keyDown(entrada, { key: 'F9' });
        expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Sí', 'No']);
        fireEvent.click(screen.getByRole('option', { name: 'No' }));
        expect(onChange).toHaveBeenLastCalledWith('activo', 'no', true);
    });

    it('fuera de la fila de filtros el booleano sigue siendo una lista desplegable', () => {
        render(<TypedField fieldDef={{ name: 'activo', typeName: 'boolean' }} value={null} onChange={vi.fn()} />);
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByRole('combobox')).toBeTruthy();
    });

    it('un campo común no tiene expander en el filtro: F9 no abre nada, ni ventana de texto', () => {
        const { entrada } = filtro(comun);
        fireEvent.keyDown(entrada, { key: 'F9' });
        expect(screen.queryByRole('option')).toBeNull();
        expect(screen.queryByLabelText('contenido de la celda')).toBeNull();
    });

    it('la lupa aparece al enfocar el filtro y abre el menú con un clic', () => {
        const { entrada } = filtro(conOpciones);
        expect(screen.queryByRole('button', { name: 'elegir un valor' })).toBeNull();
        fireEvent.focus(entrada);
        fireEvent.click(screen.getByRole('button', { name: 'elegir un valor' }));
        expect(screen.getAllByRole('option')).toHaveLength(2);
    });
});
