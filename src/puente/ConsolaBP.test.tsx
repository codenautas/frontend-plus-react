import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { requerido } from '../utils/errores';
import { ConsolaBP } from './ConsolaBP';

// como `myOwn.log`: un div con la clase de la severidad, al principio del contenedor
function avisarComoBP(consola: HTMLElement, severidad: string, mensaje: string): void {
    const aviso = document.createElement('div');
    aviso.className = `status-${severidad}`;
    aviso.textContent = mensaje;
    consola.insertBefore(aviso, consola.firstChild);
}

describe('ConsolaBP', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('ofrece el #mini-console donde backend-plus escribe sus mensajes (si no existe los pone al principio del body y corren la página)', () => {
        const { container } = render(<ConsolaBP />);
        const consola = document.getElementById('mini-console');
        expect(consola).not.toBeNull();
        expect(container.contains(consola)).toBe(true);
    });

    it('el error que backend-plus registra dos veces (my-ajax.js y el catch de proceder) se muestra una sola', async () => {
        render(<ConsolaBP />);
        const consola = requerido(document.getElementById('mini-console'), '#mini-console');
        avisarComoBP(consola, 'error', 'Falló algo');
        avisarComoBP(consola, 'error', 'Falló algo');
        await waitFor(() => expect(consola.children).toHaveLength(1));
        expect(consola.firstElementChild?.hasAttribute('data-veces')).toBe(false);
    });

    it('el mismo error que vuelve a ocurrir más tarde es otro aviso', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        render(<ConsolaBP />);
        const consola = requerido(document.getElementById('mini-console'), '#mini-console');
        avisarComoBP(consola, 'error', 'Falló algo');
        await waitFor(() => expect(consola.children[0]?.getAttribute('data-instante')).not.toBeNull());
        vi.setSystemTime(Date.now() + 5000);
        avisarComoBP(consola, 'error', 'Falló algo');
        await waitFor(() => expect(consola.children[0]?.getAttribute('data-instante')).not.toBeNull());
        expect(consola.children).toHaveLength(2);
    });

    it('mensajes distintos (o de otra severidad) se conservan todos', async () => {
        render(<ConsolaBP />);
        const consola = requerido(document.getElementById('mini-console'), '#mini-console');
        avisarComoBP(consola, 'error', 'Uno');
        avisarComoBP(consola, 'error', 'Otro');
        avisarComoBP(consola, 'log', 'Uno');
        await waitFor(() => expect(consola.children).toHaveLength(3));
    });
});
