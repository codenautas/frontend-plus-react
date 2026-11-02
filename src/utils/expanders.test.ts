import { describe, expect, it } from 'vitest';
import { FieldDefinition } from '../types';
import { fechaATexto, fechaDeValor, opcionesDeBooleano, opcionesDeEnumerado, semanasDelMes, textoParaVer, tipoDeExpander } from './expanders';

type Rasgos = { typeName?: 'text' | 'boolean' | 'date' | 'integer' | 'jsonb', references?: string, options?: (string | { option: string | number, label: string })[], clientSide?: string };
const campo = (rasgos: Rasgos): FieldDefinition => ({ name: 'x', typeName: rasgos.typeName ?? 'text', references: rasgos.references, options: rasgos.options, clientSide: rasgos.clientSide });

describe('tipoDeExpander', () => {
    it('cada tipo de campo editable tiene el suyo: referencia, booleano, options, fecha y, si no, la ventana de texto', () => {
        expect(tipoDeExpander(campo({ references: 'provincias' }), true)).toBe('referencia');
        expect(tipoDeExpander(campo({ typeName: 'boolean' }), true)).toBe('booleano');
        expect(tipoDeExpander(campo({ options: ['a', 'b'] }), true)).toBe('opciones');
        expect(tipoDeExpander(campo({ typeName: 'date' }), true)).toBe('fecha');
        expect(tipoDeExpander(campo({ typeName: 'integer' }), true)).toBe('texto');
    });

    it('con varios criterios gana el primero en el orden de backend-plus: referencias antes que options', () => {
        expect(tipoDeExpander(campo({ references: 'x', options: ['a'] }), true)).toBe('referencia');
        expect(tipoDeExpander(campo({ typeName: 'boolean', options: ['a'] }), true)).toBe('booleano');
    });

    it('en una celda que no se edita solo valen el JSON y el texto, para ver el contenido', () => {
        expect(tipoDeExpander(campo({ typeName: 'jsonb' }), false)).toBe('json');
        expect(tipoDeExpander(campo({ typeName: 'boolean' }), false)).toBe('texto');
        expect(tipoDeExpander(campo({ references: 'x' }), false)).toBe('texto');
    });

    it('un jsonb editable usa la ventana de texto', () => {
        expect(tipoDeExpander(campo({ typeName: 'jsonb' }), true)).toBe('texto');
    });

    it('un campo clientSide no tiene la ventana de texto', () => {
        expect(tipoDeExpander(campo({ clientSide: 'calculo' }), true)).toBeNull();
        expect(tipoDeExpander(campo({ clientSide: 'calculo', typeName: 'boolean' }), true)).toBe('booleano');
    });
});

describe('opciones de los menús', () => {
    it('el booleano ofrece Sí y No, y vacío solo si admite nulo', () => {
        expect(opcionesDeBooleano(false).map(o => o.valor)).toEqual([true, false]);
        expect(opcionesDeBooleano(true).map(o => o.valor)).toEqual([true, false, null]);
    });

    it('options acepta textos y {option, label}, en el orden declarado', () => {
        const opciones = opcionesDeEnumerado(['b', { option: 1, label: 'uno' }, 'a'], true);
        expect(opciones.map(o => o.valor)).toEqual(['b', 1, 'a', null]);
        expect(opciones[1].etiquetas).toEqual(['1', 'uno']);
    });
});

describe('fechas', () => {
    it('entiende un Date y un texto AAAA-MM-DD; lo demás no es fecha', () => {
        expect(fechaDeValor(new Date(2026, 2, 7))).toEqual({ anio: 2026, mes: 2, dia: 7 });
        expect(fechaDeValor('2026-03-07')).toEqual({ anio: 2026, mes: 2, dia: 7 });
        expect(fechaDeValor(null)).toBeNull();
        expect(fechaDeValor('hoy')).toBeNull();
        expect(fechaDeValor(new Date('x'))).toBeNull();
    });

    it('la fecha vuelve como AAAA-MM-DD, que el editor de la celda entiende', () => {
        expect(fechaATexto({ anio: 2026, mes: 2, dia: 7 })).toBe('2026-03-07');
    });

    it('el calendario de un mes tiene semanas completas de lunes a domingo, con los días vecinos marcados', () => {
        const semanas = semanasDelMes(2026, 1); // febrero de 2026: empieza en domingo
        expect(semanas.every(s => s.length === 7)).toBe(true);
        expect(semanas[0][0]).toEqual({ anio: 2026, mes: 0, dia: 26, delMesMostrado: false });
        expect(semanas[0][6]).toEqual({ anio: 2026, mes: 1, dia: 1, delMesMostrado: true });
        expect(semanas.flat().filter(d => d.delMesMostrado)).toHaveLength(28);
        const ultima = semanas[semanas.length - 1];
        expect(ultima[6].delMesMostrado).toBe(false);
    });
});

describe('textoParaVer', () => {
    it('un objeto se muestra como JSON con sangría; lo demás, como texto', () => {
        expect(textoParaVer({ a: 1 })).toBe('{\n  "a": 1\n}');
        expect(textoParaVer(12)).toBe('12');
        expect(textoParaVer(null)).toBe('');
    });
});
