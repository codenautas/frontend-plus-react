import { describe, it, expect } from 'vitest';
import { MenuInfoBase } from 'backend-plus';
import { buscarEnMenu, hojasDeMenu } from './busquedaDeMenu';

// Como el menú de dmencu: el mismo nombre en dos grupos
const menu = [
    { menuType: 'menu', name: 'asignacion', label: 'Asignación', menuContent: [
        { menuType: 'table', name: 'encuestador', label: 'Encuestadores' },
        { menuType: 'table', name: 'supervisor' },
    ] },
    { menuType: 'menu', name: 'recepcion', menuContent: [
        { menuType: 'table', name: 'encuestador' },
    ] },
    { menuType: 'proc', name: 'importar_datos' },
] as MenuInfoBase[];

describe('búsqueda en el menú', () => {
    const hojas = hojasDeMenu(menu);

    it('las hojas llevan su camino y no incluyen los grupos', () => {
        expect(hojas.map(hoja => hoja.clave)).toEqual(['asignacion/encuestador', 'asignacion/supervisor', 'recepcion/encuestador', 'importar_datos']);
    });

    it('sin tildes, sin mayúsculas y con guiones bajos como espacios', () => {
        expect(buscarEnMenu(hojas, 'IMPORTAR datos').map(hoja => hoja.clave)).toEqual(['importar_datos']);
        expect(buscarEnMenu(hojas, 'asignacion').map(hoja => hoja.clave)).toEqual(['asignacion/encuestador', 'asignacion/supervisor']);
    });

    it('el nombre repetido se distingue por el grupo', () => {
        expect(buscarEnMenu(hojas, 'recepcion encuestador').map(hoja => hoja.clave)).toEqual(['recepcion/encuestador']);
        expect(buscarEnMenu(hojas, 'encuestador')).toHaveLength(2);
    });

    it('una consulta vacía no devuelve nada', () => {
        expect(buscarEnMenu(hojas, '   ')).toEqual([]);
    });
});
