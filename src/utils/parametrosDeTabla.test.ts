import { describe, expect, it, vi } from 'vitest';
import JSON4all from 'json4all';
import { aFiltrosIniciales, aFixedFields, fusionar, parametrosDeDireccion, parametrosDeTabla } from './parametrosDeTabla';

describe('parametrosDeDireccion (como UriSearchToObject de backend-plus)', () => {
    it('lee los parámetros del hash o de la query y decodifica ff, fc, td y pf con json4all', () => {
        const ff = encodeURIComponent(JSON4all.toUrl({ rol: 'admin' }));
        const fc = encodeURIComponent(JSON4all.toUrl([{ column: 'activo', operator: '=', value: true }]));
        expect(parametrosDeDireccion(`#table=usuarios&ff=${ff}&fc=${fc}&label=Mis%20usuarios`)).toEqual({
            table: 'usuarios',
            ff: { rol: 'admin' },
            fc: [{ column: 'activo', operator: '=', value: true }],
            label: 'Mis usuarios',
        });
        expect(parametrosDeDireccion('?table=usuarios')).toEqual({ table: 'usuarios' });
    });

    it('un + es un +, no un espacio (URLSearchParams lo cambiaría)', () => {
        expect(parametrosDeDireccion('?label=a+b')).toEqual({ label: 'a+b' });
    });

    it('acepta también json común en los parámetros codificados', () => {
        const ff = encodeURIComponent('[{"fieldName":"rol","value":"admin"}]');
        expect(parametrosDeDireccion(`#ff=${ff}`)).toEqual({ ff: [{ fieldName: 'rol', value: 'admin' }] });
    });

    it('lo que no se puede interpretar se ignora (con un aviso) y no rompe el resto', () => {
        const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parametrosDeDireccion('#a=%E0%A4%A&table=usuarios')).toEqual({ table: 'usuarios' });
        expect(aviso).toHaveBeenCalled();
        aviso.mockRestore();
    });
});

describe('aFixedFields', () => {
    it('acepta el arreglo de backend-plus y el objeto {campo: valor} (lo que usa dmencu)', () => {
        expect(aFixedFields([{ fieldName: 'rol', value: 'admin' }])).toEqual([{ fieldName: 'rol', value: 'admin' }]);
        expect(aFixedFields({ rol: 'admin', activo: true })).toEqual([{ fieldName: 'rol', value: 'admin' }, { fieldName: 'activo', value: true }]);
    });

    it('conserva until, range y show y descarta lo que no tiene forma de fixedField', () => {
        expect(aFixedFields([{ fieldName: 'f', value: 1, until: 5, range: true, show: false }, { value: 1 }, 'x', null]))
            .toEqual([{ fieldName: 'f', value: 1, until: 5, range: true, show: false }]);
        expect(aFixedFields(undefined)).toEqual([]);
        expect(aFixedFields('texto')).toEqual([]);
    });
});

describe('aFiltrosIniciales', () => {
    it('un arreglo de condiciones es una fila de filtros; un arreglo de arreglos son varias (alternativas)', () => {
        const a = { column: 'rol', operator: '=', value: 'admin' };
        const b = { column: 'activo', operator: '=', value: true };
        expect(aFiltrosIniciales([a, b])).toEqual([[a, b]]);
        expect(aFiltrosIniciales([[a], [b]])).toEqual([[a], [b]]);
    });

    it('acepta fieldName como otro nombre de column (así lo dice el .d.ts de MenuInfoTable)', () => {
        expect(aFiltrosIniciales([{ fieldName: 'rol', operator: '=', value: 'admin' }])).toEqual([[{ column: 'rol', operator: '=', value: 'admin' }]]);
    });

    it('una condición sin columna o sin operador no filtra nada y se descarta', () => {
        expect(aFiltrosIniciales([{ column: 'rol', value: 'x' }, { operator: '=', value: 'x' }, { column: 'rol', operator: '~', value: 'x' }]))
            .toEqual([[{ column: 'rol', operator: '~', value: 'x' }]]);
        expect(aFiltrosIniciales([])).toEqual([]);
        expect(aFiltrosIniciales(undefined)).toEqual([]);
    });
});

describe('parametrosDeTabla', () => {
    it('toma lo del ítem de menú y la dirección lo pisa', () => {
        const item = { ff: { rol: 'admin' }, fc: [{ column: 'activo', operator: '=', value: true }], label: 'Del menú' };
        const ff = encodeURIComponent(JSON4all.toUrl({ rol: 'coor_campo' }));
        expect(parametrosDeTabla(item, `?ff=${ff}&label=De%20la%20URL&pick=usuario`)).toEqual({
            fixedFields: [{ fieldName: 'rol', value: 'coor_campo' }],
            filterColumns: [[{ column: 'activo', operator: '=', value: true }]],
            label: 'De la URL',
            pick: 'usuario',
        });
    });

    it('sin nada devuelve un objeto vacío', () => {
        expect(parametrosDeTabla(undefined, '')).toEqual({});
    });

    it('td y pf se pasan como objetos', () => {
        const td = encodeURIComponent(JSON4all.toUrl({ title: 'Otro título', allow: { insert: false } }));
        expect(parametrosDeTabla(undefined, `#td=${td}`).tableDef).toEqual({ title: 'Otro título', allow: { insert: false } });
    });
});

describe('fusionar (como changing de best-globals)', () => {
    it('mezcla los objetos en profundidad y reemplaza los arreglos y los valores simples', () => {
        const base = { title: 'a', allow: { insert: true, delete: true }, fields: [1, 2] };
        expect(fusionar(base, { title: 'b', allow: { insert: false }, fields: [3] }))
            .toEqual({ title: 'b', allow: { insert: false, delete: true }, fields: [3] });
    });

    it('no modifica la base', () => {
        const base = { allow: { insert: true } };
        fusionar(base, { allow: { insert: false } });
        expect(base).toEqual({ allow: { insert: true } });
    });
});
