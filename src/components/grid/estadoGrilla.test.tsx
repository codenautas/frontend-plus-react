import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { crearEstadoGrilla, EstadoGrillaContext, useCeldaPendiente, useFeedbackCelda } from './estadoGrilla';
import { CellFeedback } from '../../types';

const exito: CellFeedback = { rowId: '1', columnKey: 'edad', type: 'success' };

describe('estadoGrilla', () => {
    it('avisa a los suscriptores cuando cambia el feedback y no cuando se pone el mismo mapa', () => {
        const estado = crearEstadoGrilla();
        const avisar = vi.fn();
        estado.suscribir(avisar);
        estado.setFeedback(new Map([['1-edad', exito]]));
        expect(avisar).toHaveBeenCalledTimes(1);
        const mismo = estado.obtenerFeedback();
        estado.setFeedback(mismo);
        estado.setFeedback(anterior => anterior);
        expect(avisar).toHaveBeenCalledTimes(1);
    });

    it('darse de baja corta los avisos', () => {
        const estado = crearEstadoGrilla();
        const avisar = vi.fn();
        const baja = estado.suscribir(avisar);
        baja();
        estado.setCambiosLocales(new Map([['1', new Set(['edad'])]]));
        expect(avisar).not.toHaveBeenCalled();
    });

    it('una celda solo se redibuja cuando cambia lo suyo', () => {
        const estado = crearEstadoGrilla();
        let dibujos = 0;
        function Celda({ clave }: { clave: string }) {
            const feedback = useFeedbackCelda(clave);
            dibujos++;
            return <span data-testid="celda">{feedback?.type ?? 'nada'}</span>;
        }
        const { getByTestId } = render(
            <EstadoGrillaContext.Provider value={estado}>
                <Celda clave="1-edad" />
            </EstadoGrillaContext.Provider>
        );
        expect(getByTestId('celda').textContent).toBe('nada');
        const antes = dibujos;

        // cambia el feedback de OTRA celda: esta no se redibuja
        act(() => estado.setFeedback(new Map([['2-edad', { ...exito, rowId: '2' }]])));
        expect(dibujos).toBe(antes);

        act(() => estado.setFeedback(new Map([['1-edad', exito]])));
        expect(getByTestId('celda').textContent).toBe('success');
    });

    it('useCeldaPendiente marca solo las columnas pendientes de su fila', () => {
        const estado = crearEstadoGrilla();
        function Celda({ fila, columna }: { fila: string, columna: string }) {
            return <span data-testid={`${fila}-${columna}`}>{String(useCeldaPendiente(fila, columna))}</span>;
        }
        const { getByTestId } = render(
            <EstadoGrillaContext.Provider value={estado}>
                <Celda fila="n1" columna="nombre" />
                <Celda fila="n1" columna="edad" />
            </EstadoGrillaContext.Provider>
        );
        act(() => estado.setCambiosLocales(new Map([['n1', new Set(['nombre'])]])));
        expect(getByTestId('n1-nombre').textContent).toBe('true');
        expect(getByTestId('n1-edad').textContent).toBe('false');
    });
});
