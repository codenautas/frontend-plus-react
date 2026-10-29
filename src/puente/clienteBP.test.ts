import { afterEach, describe, expect, it, vi } from 'vitest';
import { esperarCargaDeVentana, extraerRecursos } from './clienteBP';

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
