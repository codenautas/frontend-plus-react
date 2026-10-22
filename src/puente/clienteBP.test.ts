import { describe, expect, it } from 'vitest';
import { extraerRecursos } from './clienteBP';

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
