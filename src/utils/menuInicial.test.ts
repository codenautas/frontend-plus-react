import { describe, expect, it } from 'vitest';
import { MenuInfoBase } from 'backend-plus';
import { itemInicial, rutaDeItemDeMenu } from './menuInicial';
import { extendWScreens } from '../pages/WScreens';

describe('itemInicial', () => {
    it('es el ítem de primer nivel con selectedByDefault (en dmencu, el tablero «inicio»)', () => {
        const menu: MenuInfoBase[] = [
            { menuType: 'tablero', name: 'tablero', label: 'inicio', selectedByDefault: true },
            { menuType: 'table', name: 'personas' },
        ];
        expect(itemInicial(menu)?.name).toBe('tablero');
    });

    it('si el elegido es un grupo, baja al que declara selectedByDefault adentro', () => {
        const menu: MenuInfoBase[] = [
            { menuType: 'menu', name: 'datos', selectedByDefault: true, menuContent: [{ menuType: 'table', name: 'a' }, { menuType: 'table', name: 'b', selectedByDefault: true }] },
        ];
        expect(itemInicial(menu)?.name).toBe('b');
    });

    it('sin selectedByDefault, o con un grupo elegido que no tiene uno por omisión, no hay pantalla de inicio (como en backend-plus)', () => {
        expect(itemInicial([{ menuType: 'table', name: 'a' }])).toBeUndefined();
        expect(itemInicial([{ menuType: 'menu', name: 'g', selectedByDefault: true, menuContent: [{ menuType: 'table', name: 'a' }] }])).toBeUndefined();
        expect(itemInicial([])).toBeUndefined();
    });
});

describe('rutaDeItemDeMenu', () => {
    it('una tabla va a /menu/:nombre, con td y fc en la query string si los tiene', () => {
        expect(rutaDeItemDeMenu({ menuType: 'table', name: 'personas' })).toBe('/menu/personas');
        expect(rutaDeItemDeMenu({ menuType: 'table', name: 'personas', fc: [{ fieldName: 'x', operator: '=', value: 1 }] }))
            .toBe(`/menu/personas?fc=${encodeURIComponent('[{"fieldName":"x","operator":"=","value":1}]')}`);
    });

    it('un procedimiento va a /procedures/:nombre', () => {
        expect(rutaDeItemDeMenu({ menuType: 'proc', name: 'importar' })).toBe('/procedures/importar');
    });

    it('lo demás son wScreens: la registrada va a /wScreens/:tipo y la que no está, al respaldo', () => {
        extendWScreens({ miPantalla: () => null });
        expect(rutaDeItemDeMenu({ menuType: 'miPantalla', name: 'x' })).toBe('/wScreens/miPantalla');
        expect(rutaDeItemDeMenu({ menuType: 'tablero', name: 'tablero' })).toBe('/wScreens-fallback/tablero');
    });
});
