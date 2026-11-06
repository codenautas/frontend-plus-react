import { describe, expect, it, vi } from 'vitest';
import { FieldDefinition, TableDefinition } from '../../types';
import { campoEditableEnCelda, clientSides, clientSidesSinImplementar, extendClientSides, guardadosPropios } from './clientSides';
import ClientSideDisplayUrl from './ClientSideDisplayUrl';

const campo = (rasgos: Partial<FieldDefinition>): FieldDefinition => ({ name: 'c', typeName: 'text', ...rasgos } as FieldDefinition);
const tabla = (campos: Partial<FieldDefinition>[], clientSideDeTabla?: string): TableDefinition =>
    ({ name: 't', fields: campos.map((c, i) => ({ name: `c${i}`, typeName: 'text', ...c })), clientSide: clientSideDeTabla } as TableDefinition);

describe('clientSides de backend-plus', () => {
    it('newPass y displayUrl están implementados', () => {
        expect(clientSides.displayUrl).toBe(ClientSideDisplayUrl);
        expect(guardadosPropios.newPass).toBeTypeOf('function');
        expect(clientSidesSinImplementar(tabla([{ clientSide: 'newPass' }, { clientSide: 'displayUrl' }]))).toEqual([]);
    });

    it('lista los de campos sin componente, sin repetir', () => {
        const def = tabla([{ clientSide: '$lock' }, { clientSide: '$lock' }, { clientSide: 'newPass' }, {}]);
        expect(clientSidesSinImplementar(def)).toEqual(['$lock']);
    });

    it('un campo que no se dibuja no cuenta', () => {
        expect(clientSidesSinImplementar(tabla([{ clientSide: 'propio', visible: false }]))).toEqual([]);
    });

    it('el clientSide de la tabla siempre cuenta como sin implementar', () => {
        expect(clientSidesSinImplementar(tabla([{}], 'newPass'))).toEqual(['newPass']);
    });

    it('lo que registra la aplicación deja de faltar', () => {
        const def = tabla([{ clientSide: 'acciones_de_la_app' }]);
        expect(clientSidesSinImplementar(def)).toEqual(['acciones_de_la_app']);
        extendClientSides({ acciones_de_la_app: ClientSideDisplayUrl });
        expect(clientSidesSinImplementar(def)).toEqual([]);
    });
});

describe('qué celdas clientSide se editan', () => {
    it('un campo común se edita salvo que diga editable: false', () => {
        expect(campoEditableEnCelda(campo({}))).toBe(true);
        expect(campoEditableEnCelda(campo({ editable: false }))).toBe(false);
    });

    it('un clientSide dibujado con un componente no se edita (antes abría el editor y guardaba una columna que no existe)', () => {
        expect(campoEditableEnCelda(campo({ clientSide: 'abrir' }))).toBe(false);
        expect(campoEditableEnCelda(campo({ clientSide: 'displayUrl' }))).toBe(false);
    });

    it('un clientSide con guardado propio (newPass) se edita como cualquier celda', () => {
        expect(campoEditableEnCelda(campo({ clientSide: 'newPass' }))).toBe(true);
    });
});

describe('newPass', () => {
    it('manda la clave nueva a admin_chpass con el último campo de la clave primaria', async () => {
        const callApi = vi.fn().mockResolvedValue(undefined);
        await guardadosPropios.newPass({ fila: { usuario: 'ana' }, primaryKey: ['usuario'], valor: ' secreta ', callApi });
        expect(callApi).toHaveBeenCalledWith('admin_chpass', { user: 'ana', newpass: 'secreta' });
    });

    it('un valor vacío no llama al servidor', async () => {
        const callApi = vi.fn();
        await guardadosPropios.newPass({ fila: { usuario: 'ana' }, primaryKey: ['usuario'], valor: '   ', callApi });
        await guardadosPropios.newPass({ fila: { usuario: 'ana' }, primaryKey: ['usuario'], valor: null, callApi });
        expect(callApi).not.toHaveBeenCalled();
    });
});
