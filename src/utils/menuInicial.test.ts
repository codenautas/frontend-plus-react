import { describe, expect, it } from 'vitest';
import { MenuInfoBase, MenuInfoTable } from 'backend-plus';
import { gruposDeItem, itemDeRuta, itemInicial, rutaDeItemDeMenu } from './menuInicial';
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

    it('la ruta lleva los grupos que contienen al ítem (los nombres se repiten entre grupos), codificados', () => {
        expect(rutaDeItemDeMenu({ menuType: 'table', name: 'encuestador' }, ['asignacion'])).toBe('/menu/asignacion/encuestador');
        expect(rutaDeItemDeMenu({ menuType: 'table', name: 'área' }, ['control campo'])).toBe('/menu/control%20campo/%C3%A1rea');
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

// como el menú de dmencu: «encuestador» está en asignación y en recepción, con tablas distintas
const encuestadorAsignado: MenuInfoTable = { menuType: 'table', name: 'encuestador', table: 't_encu_areas' };
const encuestadorRecepcion: MenuInfoTable = { menuType: 'table', name: 'encuestador', table: 'encuestadores_asignados' };
const areaRecepcion: MenuInfoTable = { menuType: 'table', name: 'área', table: 'areas' };
const personas: MenuInfoTable = { menuType: 'table', name: 'personas' };
const menuConNombresRepetidos: MenuInfoBase[] = [
    { menuType: 'menu', name: 'asignacion', menuContent: [encuestadorAsignado] },
    { menuType: 'menu', name: 'recepcion', menuContent: [encuestadorRecepcion, areaRecepcion] },
    personas,
];

describe('gruposDeItem', () => {
    it('devuelve los grupos de afuera hacia adentro, y distingue ítems de igual nombre por identidad', () => {
        expect(gruposDeItem(menuConNombresRepetidos, encuestadorAsignado)).toEqual(['asignacion']);
        expect(gruposDeItem(menuConNombresRepetidos, encuestadorRecepcion)).toEqual(['recepcion']);
        expect(gruposDeItem(menuConNombresRepetidos, personas)).toEqual([]);
        expect(gruposDeItem(menuConNombresRepetidos, { menuType: 'table', name: 'otro' })).toBeUndefined();
    });
});

describe('itemDeRuta', () => {
    it('con el camino completo encuentra el ítem del grupo correcto, no el primero que se llame igual', () => {
        expect(itemDeRuta(menuConNombresRepetidos, ['asignacion', 'encuestador'])).toBe(encuestadorAsignado);
        expect(itemDeRuta(menuConNombresRepetidos, ['recepcion', 'encuestador'])).toBe(encuestadorRecepcion);
        expect(itemDeRuta(menuConNombresRepetidos, ['personas'])).toBe(personas);
    });

    it('un camino que no existe cae en la primera tabla con ese nombre (las direcciones viejas eran /menu/:nombre)', () => {
        expect(itemDeRuta(menuConNombresRepetidos, ['encuestador'])).toBe(encuestadorAsignado);
        expect(itemDeRuta(menuConNombresRepetidos, ['recepcion', 'inexistente'])).toBeUndefined();
        expect(itemDeRuta(menuConNombresRepetidos, [])).toBeUndefined();
    });

    it('sigue a rutaDeItemDeMenu: toda ruta armada para un ítem vuelve a ese ítem', () => {
        for (const item of [encuestadorAsignado, encuestadorRecepcion, areaRecepcion, personas]) {
            const ruta = rutaDeItemDeMenu(item, gruposDeItem(menuConNombresRepetidos, item));
            const camino = ruta.replace('/menu/', '').split('/').map(decodeURIComponent);
            expect(itemDeRuta(menuConNombresRepetidos, camino)).toBe(item);
        }
    });
});
