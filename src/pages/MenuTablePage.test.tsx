import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MenuInfoBase } from 'backend-plus';
import MenuTablePage from './MenuTablePage';

const { contexto } = vi.hoisted(() => ({ contexto: { clientContext: { menu: [] as MenuInfoBase[] } } }));
vi.mock('../contexts/AppContext', () => ({ useApp: () => contexto }));
vi.mock('./GenericDataGridPage', () => ({
    default: ({ initialTableName }: { initialTableName: string }) => <span data-testid="tabla">{initialTableName}</span>,
}));

// como el menú de dmencu: «encuestador» está en asignación y en recepción, con tablas distintas
contexto.clientContext.menu = [
    { menuType: 'menu', name: 'asignacion', menuContent: [{ menuType: 'table', name: 'encuestador', table: 't_encu_areas' }] },
    { menuType: 'menu', name: 'recepcion', menuContent: [{ menuType: 'table', name: 'encuestador', table: 'encuestadores_asignados' }, { menuType: 'table', name: 'área', table: 'areas' }] },
    { menuType: 'table', name: 'personas', table: 'personas_tabla' },
];

function tablaAbiertaEn(ruta: string): string | null {
    const { queryByTestId, unmount } = render(
        <MemoryRouter initialEntries={[ruta]}>
            <Routes><Route path="/menu/*" element={<MenuTablePage />} /></Routes>
        </MemoryRouter>
    );
    const tabla = queryByTestId('tabla')?.textContent ?? null;
    unmount();
    return tabla;
}

describe('MenuTablePage', () => {
    it('abre la tabla del ítem del grupo que dice la ruta, aunque otro grupo tenga un ítem con el mismo nombre', () => {
        expect(tablaAbiertaEn('/menu/asignacion/encuestador')).toBe('t_encu_areas');
        expect(tablaAbiertaEn('/menu/recepcion/encuestador')).toBe('encuestadores_asignados');
    });

    it('un ítem de primer nivel va por su nombre solo, y un nombre con tildes viaja codificado', () => {
        expect(tablaAbiertaEn('/menu/personas')).toBe('personas_tabla');
        expect(tablaAbiertaEn('/menu/recepcion/%C3%A1rea')).toBe('areas');
    });

    it('la dirección vieja, /menu/<nombre> de un ítem que está dentro de un grupo, sigue abriendo la primera tabla con ese nombre', () => {
        expect(tablaAbiertaEn('/menu/encuestador')).toBe('t_encu_areas');
    });
});
