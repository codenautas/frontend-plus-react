import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldDefinition, TableDefinition } from '../types';
import { cargarReferencia, esCampoConReferencia, filtrarOpciones, olvidarReferencias, opcionesDeReferencia, ParDeCampos } from './referencias';

vi.mock('./fetchApi', () => ({ executeBackendProcedure: vi.fn() }));
import { executeBackendProcedure } from './fetchApi';

// lo que backend-plus agrega al campo origen de una FK y que backend-plus.d.ts no declara
type ConReferencias = FieldDefinition & { referencesFields: ParDeCampos[], skipReferenceLookup?: boolean };
const campoSimple: ConReferencias = { name: 'provincia', typeName: 'text', references: 'provincias', referencesFields: [{ source: 'provincia', target: 'provincia' }] };

describe('esCampoConReferencia', () => {
    it('lo es el campo origen de una FK o softFK, que backend-plus marca con references y referencesFields', () => {
        expect(esCampoConReferencia(campoSimple)).toBe(true);
    });
    it('no lo es un campo común', () => {
        expect(esCampoConReferencia({ name: 'nombre', typeName: 'text' })).toBe(false);
    });
    it('lo es también un campo que declara references a mano, sin referencesFields (como las asignaciones de dmencu): el valor es la última columna de la clave', () => {
        const aMano: FieldDefinition = { name: 'personal', typeName: 'text', references: 'provincias' };
        if (!esCampoConReferencia(aMano)) throw new Error('tiene que ser un campo con referencia');
        expect(opcionesDeReferencia(aMano, provincias, filasProvincias, {}, false).map(o => o.valor)).toEqual(['A', 'B', 'C']);
    });
    it('no lo es si la FK pide saltear el lookup (skipReferenceLookup)', () => {
        const salteado: ConReferencias = { ...campoSimple, skipReferenceLookup: true };
        expect(esCampoConReferencia(salteado)).toBe(false);
    });
});

type ConNombres = TableDefinition & { nameFields: string[], activeRecords?: { fieldName: string } };
const provincias: ConNombres = {
    name: 'provincias',
    primaryKey: ['provincia'],
    fields: [
        { name: 'provincia', typeName: 'text' },
        { name: 'nombre', typeName: 'text', isName: true },
        { name: 'activa', typeName: 'boolean' },
    ],
    nameFields: ['nombre'],
};
const filasProvincias = [
    { provincia: 'B', nombre: 'Buenos Aires', activa: true },
    { provincia: 'C', nombre: 'Córdoba', activa: true },
    { provincia: 'A', nombre: 'Ávila', activa: true },
];

describe('opcionesDeReferencia', () => {
    const campo = esCampoConReferencia(campoSimple) ? campoSimple : null;
    if (campo === null) throw new Error('el campo de prueba tiene que ser un campo con referencia');

    it('una opción por fila de la tabla referenciada: valor de la clave y etiquetas con la clave y los campos isName, ordenadas por la etiqueta', () => {
        const opciones = opcionesDeReferencia(campo, provincias, filasProvincias, {}, false);
        expect(opciones.map(o => o.valor)).toEqual(['A', 'B', 'C']);
        expect(opciones[1].etiquetas).toEqual(['B', 'Buenos Aires']);
    });

    it('con lookupFields se nombran las filas con esos campos y no con los isName', () => {
        const opciones = opcionesDeReferencia(campo, { ...provincias, lookupFields: ['activa'] }, filasProvincias, {}, false);
        expect(opciones[0].etiquetas).toEqual(['A', 'true']);
    });

    it('sin campos de nombre la etiqueta es la clave', () => {
        const sinNombres: ConNombres = { ...provincias, nameFields: [] };
        const opciones = opcionesDeReferencia(campo, sinNombres, filasProvincias, {}, false);
        expect(opciones[0].etiquetas).toEqual(['A']);
    });

    it('si el campo admite nulo, la opción vacía va al final', () => {
        const opciones = opcionesDeReferencia(campo, provincias, filasProvincias, {}, true);
        expect(opciones[opciones.length - 1].valor).toBeNull();
        expect(opciones).toHaveLength(4);
    });

    it('no ofrece las filas inactivas (activeRecords)', () => {
        const definicion: ConNombres = { ...provincias, activeRecords: { fieldName: 'activa' } };
        const opciones = opcionesDeReferencia(campo, definicion, [...filasProvincias, { provincia: 'Z', nombre: 'Zeta', activa: false }], {}, false);
        expect(opciones.map(o => o.valor)).toEqual(['A', 'B', 'C']);
    });

    it('en una FK compuesta ofrece solo las filas que coinciden con la fila en las columnas anteriores, y el valor es el de la última', () => {
        const localidades: ConNombres = {
            name: 'localidades', primaryKey: ['provincia', 'localidad'],
            fields: [{ name: 'provincia', typeName: 'text' }, { name: 'localidad', typeName: 'integer' }, { name: 'nombre', typeName: 'text' }],
            nameFields: ['nombre'],
        };
        const compuesto: ConReferencias = { name: 'localidad', typeName: 'integer', references: 'localidades', referencesFields: [{ source: 'provincia', target: 'provincia' }, { source: 'localidad', target: 'localidad' }] };
        if (!esCampoConReferencia(compuesto)) throw new Error('tiene que ser un campo con referencia');
        const opciones = opcionesDeReferencia(compuesto, localidades, [
            { provincia: 'B', localidad: 2, nombre: 'La Plata' },
            { provincia: 'C', localidad: 1, nombre: 'Capital' },
            { provincia: 'B', localidad: 1, nombre: 'Avellaneda' },
        ], { provincia: 'B', localidad: null }, false);
        expect(opciones.map(o => o.valor)).toEqual([1, 2]);
    });
});

describe('filtrarOpciones', () => {
    const campo = esCampoConReferencia(campoSimple) ? campoSimple : null;
    if (campo === null) throw new Error('el campo de prueba tiene que ser un campo con referencia');
    const opciones = opcionesDeReferencia(campo, provincias, filasProvincias, {}, false);

    it('busca sin distinguir mayúsculas ni tildes, en la clave y en los nombres', () => {
        expect(filtrarOpciones(opciones, 'cordoba').map(o => o.valor)).toEqual(['C']);
        expect(filtrarOpciones(opciones, 'AVILA').map(o => o.valor)).toEqual(['A']);
    });
    it('las palabras sueltas se buscan por separado', () => {
        expect(filtrarOpciones(opciones, 'aires b').map(o => o.valor)).toEqual(['B']);
    });
    it('sin búsqueda deja todo', () => {
        expect(filtrarOpciones(opciones, '')).toHaveLength(3);
    });
    it('la opción vacía no se filtra', () => {
        const conNulo = opcionesDeReferencia(campo, provincias, filasProvincias, {}, true);
        expect(filtrarOpciones(conNulo, 'cordoba').map(o => o.valor)).toEqual(['C', null]);
    });
});

describe('cargarReferencia', () => {
    beforeEach(() => {
        olvidarReferencias();
        vi.mocked(executeBackendProcedure).mockReset();
        vi.mocked(executeBackendProcedure).mockImplementation(async (procedimiento: string) => procedimiento === 'table_structure' ? provincias : filasProvincias);
    });

    it('pide la estructura y las filas, y la segunda vez usa lo guardado', async () => {
        const primera = await cargarReferencia('provincias');
        await cargarReferencia('provincias');
        expect(primera.filas).toHaveLength(3);
        expect(executeBackendProcedure).toHaveBeenCalledTimes(2);
    });

    it('si falla, no deja guardado el error: la próxima vez vuelve a pedir', async () => {
        vi.mocked(executeBackendProcedure).mockRejectedValue(new Error('sin red'));
        await expect(cargarReferencia('provincias')).rejects.toThrow('sin red');
        await Promise.resolve();
        vi.mocked(executeBackendProcedure).mockImplementation(async (procedimiento: string) => procedimiento === 'table_structure' ? provincias : filasProvincias);
        await expect(cargarReferencia('provincias')).resolves.toBeDefined();
    });
});
