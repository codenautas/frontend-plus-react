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

    it('window.open con la ruta de la grilla actual + #w=... (los botones «abrir» de dmencu) abre la pantalla en /bp/menu', () => {
        dejarDeCapturar();
        const abrir = vi.fn();
        window.open = abrir;
        dejarDeCapturar = capturarNavegacionBP('/ggs2026', vi.fn());
        const up = '{"operativo":"GGS_2026","tarea":"encu","enc":100021}';
        window.open(`${window.location.origin}/menu/asignacion/encuestador#w=abrir_encuesta&up=${up}&autoproced=true`, '_abrir');
        // el navegador (y URL) codifican las comillas del hash; la pantalla las decodifica al leerlo
        expect(abrir).toHaveBeenCalledWith(`${window.location.origin}/bp/menu#w=abrir_encuesta&up=${up.replace(/"/g, '%22')}&autoproced=true`, '_abrir', undefined);
    });

    it('window.open con cualquier otra dirección no se toca', () => {
        dejarDeCapturar();
        const abrir = vi.fn();
        window.open = abrir;
        dejarDeCapturar = capturarNavegacionBP('/ggs2026', vi.fn());
        window.open('https://ejemplo.com/pagina#w=algo', '_blank');
        window.open('/menu/usuarios', '_blank');
        expect(abrir).toHaveBeenNthCalledWith(1, 'https://ejemplo.com/pagina#w=algo', '_blank', undefined);
        expect(abrir).toHaveBeenNthCalledWith(2, '/menu/usuarios', '_blank', undefined);
    });

    it('al dejar de capturar se restaura history.replaceState', () => {
        const capturando = history.replaceState;
        dejarDeCapturar();
        expect(history.replaceState).not.toBe(capturando);
        dejarDeCapturar = capturarNavegacionBP('/ggs2026', vi.fn());
    });
});
