import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { capturarNavegacionBP } from './capturaDeNavegacion';

describe('capturarNavegacionBP: history.replaceState', () => {
    let base: HTMLBaseElement;
    let dejarDeCapturar: () => void;

    beforeEach(() => {
        // como el puente: las direcciones relativas de backend-plus se arman contra la base-url del backend
        base = document.createElement('base');
        base.href = `${window.location.origin}/ggs2026/`;
        document.head.prepend(base);
        dejarDeCapturar = capturarNavegacionBP('/ggs2026', vi.fn());
    });

    afterEach(() => {
        dejarDeCapturar();
        base.remove();
    });

    it('al editar un parámetro backend-plus reescribe la dirección a <base-url>/menu#...: se deja dentro de la aplicación (/bp/menu)', () => {
        history.replaceState(null, '', 'menu#w=abrir_encuesta&up=,operativo:GGS_2026,enc:5&autoproced=true');
        expect(window.location.pathname).toBe('/bp/menu');
        expect(window.location.hash).toBe('#w=abrir_encuesta&up=,operativo:GGS_2026,enc:5&autoproced=true');
    });

    it('las demás direcciones (las del propio router, por ejemplo) no se tocan', () => {
        history.replaceState(null, '', '/menu/usuarios?td=1');
        expect(window.location.pathname + window.location.search).toBe('/menu/usuarios?td=1');
    });

    it('al dejar de capturar se restaura history.replaceState', () => {
        const capturando = history.replaceState;
        dejarDeCapturar();
        expect(history.replaceState).not.toBe(capturando);
        dejarDeCapturar = capturarNavegacionBP('/ggs2026', vi.fn());
    });
});
