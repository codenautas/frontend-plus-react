import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SelectorDeFecha } from './SelectorDeFecha';
import { VentanaDeTexto } from './VentanaDeTexto';
import { MenuDeOpciones } from './MenuDeOpciones';
import { opcionesDeBooleano } from '../../utils/expanders';

// jsdom no implementa scrollIntoView (el menú lo usa para mantener a la vista la opción elegida)
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

/** El elemento bajo el que se abren los expanders (el editor de la celda) */
const anclaje = (): HTMLElement => document.body.appendChild(document.createElement('div'));

describe('SelectorDeFecha', () => {
    const abrir = (fechaActual: { anio: number, mes: number, dia: number } | null = { anio: 2026, mes: 2, dia: 7 }, admiteNulo = false) => {
        const onElegir = vi.fn();
        const onCerrar = vi.fn();
        render(<SelectorDeFecha anclaje={anclaje()} fechaActual={fechaActual} admiteNulo={admiteNulo} onElegir={onElegir} onCerrar={onCerrar} />);
        return { onElegir, onCerrar, calendario: screen.getByLabelText('calendario') };
    };

    it('muestra el mes de la fecha de la celda y Enter elige la fecha del cursor (AAAA-MM-DD)', () => {
        const { onElegir, calendario } = abrir();
        expect(screen.getByText('marzo 2026')).toBeTruthy();
        fireEvent.keyDown(calendario, { key: 'Enter' });
        expect(onElegir).toHaveBeenCalledWith('2026-03-07');
    });

    it('las flechas mueven el cursor de a un día y de a una semana; Re Pág y Av Pág, de a un mes', () => {
        const { onElegir, calendario } = abrir();
        fireEvent.keyDown(calendario, { key: 'ArrowRight' });
        fireEvent.keyDown(calendario, { key: 'ArrowDown' });
        fireEvent.keyDown(calendario, { key: 'Enter' });
        expect(onElegir).toHaveBeenLastCalledWith('2026-03-15');
        fireEvent.keyDown(calendario, { key: 'PageDown' });
        expect(screen.getByText('abril 2026')).toBeTruthy();
        fireEvent.keyDown(calendario, { key: 'PageUp' });
        fireEvent.keyDown(calendario, { key: 'PageUp' });
        expect(screen.getByText('febrero 2026')).toBeTruthy();
    });

    it('un día de otro mes elige esa fecha; un clic en un día la elige', () => {
        const { onElegir } = abrir();
        fireEvent.click(screen.getAllByRole('button', { name: '20' })[0]);
        expect(onElegir).toHaveBeenCalledWith('2026-03-20');
    });

    it('Escape cierra sin elegir; el botón vacío solo está si el campo admite nulo y elige null', () => {
        const { onElegir, onCerrar, calendario } = abrir();
        expect(screen.queryByRole('button', { name: 'vacío' })).toBeNull();
        fireEvent.keyDown(calendario, { key: 'Escape' });
        expect(onCerrar).toHaveBeenCalled();
        expect(onElegir).not.toHaveBeenCalled();
        cleanup();
        const conNulo = abrir(null, true);
        fireEvent.click(screen.getByRole('button', { name: 'vacío' }));
        expect(conNulo.onElegir).toHaveBeenCalledWith(null);
    });
});

describe('VentanaDeTexto', () => {
    it('editable: Ctrl+Enter o aceptar devuelven el texto editado; Escape cierra sin guardar', () => {
        const onAceptar = vi.fn();
        const onCerrar = vi.fn();
        render(<VentanaDeTexto anclaje={anclaje()} texto="hola" editable onAceptar={onAceptar} onCerrar={onCerrar} />);
        const area = screen.getByLabelText('contenido de la celda');
        fireEvent.change(area, { target: { value: 'hola\nmundo' } });
        fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true });
        expect(onAceptar).toHaveBeenCalledWith('hola\nmundo');
        fireEvent.keyDown(area, { key: 'Escape' });
        expect(onCerrar).toHaveBeenCalled();
    });

    it('de solo lectura muestra el contenido sin botones y Ctrl+Enter no devuelve nada', () => {
        const onAceptar = vi.fn();
        render(<VentanaDeTexto anclaje={anclaje()} texto={'{\n  "a": 1\n}'} editable={false} onAceptar={onAceptar} onCerrar={() => {}} />);
        const area = screen.getByLabelText('contenido de la celda');
        expect((area as HTMLTextAreaElement).readOnly).toBe(true);
        expect(screen.queryByRole('button', { name: 'aceptar' })).toBeNull();
        fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true });
        expect(onAceptar).not.toHaveBeenCalled();
    });
});

describe('MenuDeOpciones', () => {
    it('el menú del booleano: ↓ y Enter eligen No; escribir filtra; un clic elige', () => {
        const onElegir = vi.fn();
        render(<MenuDeOpciones anclaje={anclaje()} opciones={opcionesDeBooleano(true)} busquedaInicial="" onElegir={onElegir} onCerrar={() => {}} />);
        const buscar = screen.getByLabelText('buscar');
        fireEvent.keyDown(buscar, { key: 'ArrowDown' });
        fireEvent.keyDown(buscar, { key: 'Enter' });
        expect(onElegir).toHaveBeenLastCalledWith(false);
        fireEvent.change(buscar, { target: { value: 'si' } });
        expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Sí', '(vacío)']);
        fireEvent.click(screen.getByRole('option', { name: 'Sí' }));
        expect(onElegir).toHaveBeenLastCalledWith(true);
    });

    it('con una búsqueda inicial (lo que se escribió para abrirlo) ya viene filtrado', () => {
        render(<MenuDeOpciones anclaje={anclaje()} opciones={opcionesDeBooleano(false)} busquedaInicial="no" onElegir={() => {}} onCerrar={() => {}} />);
        expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['No']);
    });
});
