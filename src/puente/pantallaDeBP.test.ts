import { describe, expect, it, vi } from 'vitest';
import { DefinicionPantallaBP, MyOwnBP, PantallaBP } from './clienteBP';
import { resolverPantallaBP } from './pantallaDeBP';

function clienteCon(pantallas: Record<string, PantallaBP | DefinicionPantallaBP>): MyOwnBP {
    return { autoSetup: async () => undefined, wScreens: pantallas, tableGrid: vi.fn() };
}

describe('resolverPantallaBP', () => {
    const contenedor = document.createElement('div');

    it('una wScreen que es una función se ejecuta tal cual', () => {
        const pantalla = vi.fn<PantallaBP>();
        const resuelta = resolverPantallaBP(clienteCon({ ayuda: pantalla }), 'ayuda', contenedor);
        resuelta?.ejecutar({ a: 1 });
        expect(pantalla).toHaveBeenCalledWith({ a: 1 });
    });

    it('un objeto con mainFunction usa esa función', () => {
        const mainFunction = vi.fn<PantallaBP>();
        const resuelta = resolverPantallaBP(clienteCon({ otra: { mainFunction } }), 'otra', contenedor);
        resuelta?.ejecutar({ b: 2 });
        expect(mainFunction).toHaveBeenCalledWith({ b: 2 });
    });

    it('un objeto con parameters y mainAction (como abrir_encuesta de dmencu) muestra el formulario de parámetros con procAux.showParams', () => {
        const showParams = vi.fn();
        const mainAction = vi.fn();
        const parameters = [{ name: 'operativo' }, { name: 'enc' }];
        const cliente = clienteCon({ procAux: { showParams }, abrir_encuesta: { parameters, mainAction, proceedLabel: 'abrir' } });
        const resuelta = resolverPantallaBP(cliente, 'abrir_encuesta', contenedor);
        resuelta?.ejecutar({ autoproced: true });
        expect(showParams).toHaveBeenCalledWith({ parameters, resultClass: undefined, proceedLabel: 'abrir' }, contenedor, { autoproced: true }, mainAction);
    });

    it('si backend-plus no tiene la pantalla, o no tiene cómo dibujarla, da null', () => {
        expect(resolverPantallaBP(clienteCon({}), 'ninguna', contenedor)).toBeNull();
        expect(resolverPantallaBP(clienteCon({ vacia: {} }), 'vacia', contenedor)).toBeNull();
    });
});
