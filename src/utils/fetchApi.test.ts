import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JSON4all from 'json4all';
import { ProcedureDef } from 'backend-plus';
import { codificarParametros, executeBackendProcedure, registrarFuenteDeProcedimientos } from './fetchApi';
import { envConfig } from '../env';

/** Definición mínima de un procedimiento, como la manda el servidor en client-setup */
function procedimiento(action: string, parameters: ProcedureDef['parameters'], method: 'get' | 'post' = 'post'): ProcedureDef {
    return { action, parameters, method, coreFunction: async () => null };
}

const definiciones: Record<string, ProcedureDef> = {
    table_data: procedimiento('table_data', [
        { name: 'table', encoding: 'plain' },
        { name: 'fixedFields', defaultValue: [] },
        { name: 'paramfun', defaultValue: {} },
    ]),
    eco: procedimiento('eco', [{ name: 'texto' }, { name: 'fecha' }]),
    en_json: procedimiento('en_json', [{ name: 'dato', encoding: 'JSON' }]),
    por_get: procedimiento('por_get', [{ name: 'q', encoding: 'plain' }], 'get'),
};

describe('codificarParametros', () => {
    beforeEach(() => registrarFuenteDeProcedimientos(() => definiciones));
    afterEach(() => registrarFuenteDeProcedimientos(() => undefined));

    it('manda los parámetros plain tal cual y el resto con JSON4all (como my-ajax.js)', () => {
        const { codificados, method } = codificarParametros('table_data', {
            table: 'personas',
            fixedFields: [{ fieldName: 'persona', value: 7 }],
        });
        expect(method).toBe('post');
        expect(codificados.table).toBe('personas');
        expect(JSON4all.parse(codificados.fixedFields)).toEqual([{ fieldName: 'persona', value: 7 }]);
    });

    it('conserva las fechas: el servidor las decodifica con JSON4all', () => {
        const fecha = new Date(2026, 0, 2);
        const { codificados } = codificarParametros('eco', { texto: 'hola', fecha });
        const recibida = JSON4all.parse(codificados.fecha);
        expect(recibida).toBeInstanceOf(Date);
        expect((recibida as Date).getTime()).toBe(fecha.getTime());
    });

    it('un texto con forma de fecha o de número sigue siendo un texto', () => {
        const { codificados } = codificarParametros('eco', { texto: '2026-01-02', fecha: '5' });
        expect(JSON4all.parse(codificados.texto)).toBe('2026-01-02');
        expect(JSON4all.parse(codificados.fecha)).toBe('5');
    });

    it('un parámetro plain no admite objetos', () => {
        expect(() => codificarParametros('table_data', { table: { a: 1 } })).toThrow(/plain/);
    });

    it('respeta el encoding JSON', () => {
        const { codificados } = codificarParametros('en_json', { dato: { a: [1, 2] } });
        expect(codificados.dato).toBe('{"a":[1,2]}');
    });

    it('no manda los parámetros que no vienen (el servidor usa su defaultValue)', () => {
        const { codificados } = codificarParametros('table_data', { table: 'personas' });
        expect(Object.keys(codificados)).toEqual(['table']);
    });

    it('no manda los parámetros que el procedimiento no declara', () => {
        const advertir = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { codificados } = codificarParametros('table_data', { table: 'personas', sobrante: 1 });
        expect(codificados.sobrante).toBeUndefined();
        expect(advertir).toHaveBeenCalled();
        advertir.mockRestore();
    });

    it('respeta el método get del procedimiento', () => {
        expect(codificarParametros('por_get', { q: 'x' }).method).toBe('get');
    });

    it('sin la definición del procedimiento usa la codificación anterior: primitivos tal cual y objetos con JSON4all', () => {
        const { codificados, method } = codificarParametros('desconocido', { a: 'x', n: 3, o: { b: new Date(0) }, nada: undefined });
        expect(method).toBe('post');
        expect(codificados.a).toBe('x');
        expect(codificados.n).toBe('3');
        expect(JSON4all.parse(codificados.o)).toEqual({ b: new Date(0) });
        expect('nada' in codificados).toBe(false);
    });
});

describe('executeBackendProcedure', () => {
    beforeEach(() => registrarFuenteDeProcedimientos(() => definiciones));
    afterEach(() => {
        registrarFuenteDeProcedimientos(() => undefined);
        vi.unstubAllGlobals();
    });

    function respuesta(texto: string, ok = true): Response {
        return new Response(texto, { status: ok ? 200 : 500 });
    }

    it('manda un POST con los parámetros codificados y devuelve el resultado decodificado', async () => {
        const pedir = vi.fn().mockResolvedValue(respuesta(JSON4all.stringify({ fecha: new Date(0) })));
        vi.stubGlobal('fetch', pedir);
        const resultado = await executeBackendProcedure<{ fecha: Date }>('table_data', { table: 'personas' });
        expect(resultado?.fecha).toEqual(new Date(0));
        const [url, opciones] = pedir.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(`${envConfig.backendUrl}/table_data`);
        expect(opciones.method).toBe('POST');
        expect(String(opciones.body)).toBe('table=personas');
    });

    it('un procedimiento get manda los parámetros en la URL y sin cuerpo', async () => {
        const pedir = vi.fn().mockResolvedValue(respuesta('{}'));
        vi.stubGlobal('fetch', pedir);
        await executeBackendProcedure('por_get', { q: 'abc' });
        const [url, opciones] = pedir.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(`${envConfig.backendUrl}/por_get?q=abc`);
        expect(opciones.method).toBe('GET');
        expect(opciones.body).toBeUndefined();
    });

    it('si el servidor informa un error lo lanza con su mensaje', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(JSON.stringify({ error: { message: 'Edad imposible' } }))));
        await expect(executeBackendProcedure('table_data', { table: 'personas' })).rejects.toThrow('Edad imposible');
    });

    it('ignora las líneas de progreso que preceden al resultado', async () => {
        const texto = ['{"progress":{"message":"leyendo"}}', '--', '{"uploaded":{"inserted":3}}'].join('\n');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(texto)));
        const resultado = await executeBackendProcedure<{ uploaded: { inserted: number } }>('table_data', { table: 'personas' });
        expect(resultado?.uploaded.inserted).toBe(3);
    });

    it('una respuesta HTTP con error se informa con el nombre del procedimiento', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta('falló', false)));
        await expect(executeBackendProcedure('table_data', { table: 'personas' })).rejects.toThrow(/table_data.*500/);
    });
});
