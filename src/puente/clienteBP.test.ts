import { afterEach, describe, expect, it, vi } from 'vitest';
import { esperarCargaDeVentana, extraerRecursos, sinEscuchasDeVentana } from './clienteBP';

describe('esperarCargaDeVentana', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('con la ventana ya cargada no espera', async () => {
        await expect(esperarCargaDeVentana()).resolves.toBeUndefined();
    });

    it('con la ventana cargándose espera al evento load (si no, el load de backend-plus ejecuta showPage y deja un cartel de error que corre la página)', async () => {
        vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
        let terminada = false;
        const espera = esperarCargaDeVentana().then(() => { terminada = true; });
        await Promise.resolve();
        expect(terminada).toBe(false);
        window.dispatchEvent(new Event('load'));
        await espera;
        expect(terminada).toBe(true);
    });
});

describe('extraerRecursos', () => {
    it('devuelve los scripts y las hojas de estilo de la página de backend-plus en el orden en que están', () => {
        const html = `<html><head>
            <link href='css/my-things.css' rel=stylesheet>
            <link href='img/logo.png' rel=icon>
            <link href='css/my-tables.css' rel=stylesheet>
        </head><body>
            <script src='lib/react.production.min.js'></script>
            <script>var enLinea = 1;</script>
            <script src='./my-ajax.js'></script>
            <script src='lib/my-tables.js'></script>
        </body></html>`;
        expect(extraerRecursos(html)).toEqual({
            hojasDeEstilo: ['css/my-things.css', 'css/my-tables.css'],
            scripts: ['lib/react.production.min.js', './my-ajax.js', 'lib/my-tables.js'],
        });
    });

    it('una página sin recursos (por ejemplo la del login) da listas vacías', () => {
        expect(extraerRecursos('<html><body>hola</body></html>')).toEqual({ hojasDeEstilo: [], scripts: [] });
    });
});

describe('sinEscuchasDeVentana', () => {
    it('lo que se carga adentro no puede escuchar esos eventos de la ventana (backend-plus escucha popstate y ata la aplicación a /react), pero sí los demás', async () => {
        const popstate = vi.fn();
        const resize = vi.fn();
        await sinEscuchasDeVentana(['popstate'], async () => {
            window.addEventListener('popstate', popstate);
            window.addEventListener('resize', resize);
        });
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.dispatchEvent(new Event('resize'));
        expect(popstate).not.toHaveBeenCalled();
        expect(resize).toHaveBeenCalledTimes(1);
        window.removeEventListener('resize', resize);
    });

    it('al terminar (también si falla) la ventana vuelve a aceptar esas escuchas', async () => {
        await expect(sinEscuchasDeVentana(['popstate'], async () => { throw new Error('falló la carga'); })).rejects.toThrow('falló la carga');
        const popstate = vi.fn();
        window.addEventListener('popstate', popstate);
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(popstate).toHaveBeenCalledTimes(1);
        window.removeEventListener('popstate', popstate);
    });
});
