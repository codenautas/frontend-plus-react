// Búsqueda en el menú: los ítems hoja con el camino de grupos que los contiene.
import { MenuInfoBase, MenuInfoMenu } from 'backend-plus';

export interface HojaDeMenu {
    item: MenuInfoBase;
    /** Los nombres de los grupos que contienen al ítem (de afuera hacia adentro). */
    grupos: string[];
    /** Las etiquetas de esos grupos, para mostrar. */
    etiquetasDeGrupos: string[];
    /** Identifica al ítem aunque su nombre se repita en otro grupo. */
    clave: string;
}

export function etiquetaDeItem(item: MenuInfoBase): string {
    return item.label || item.name;
}

/** La clave de un grupo (o de un ítem) dentro del árbol: sus nombres separados por «/». */
export function claveDeMenu(camino: string[]): string {
    return camino.join('/');
}

export function hojasDeMenu(menu: MenuInfoBase[], grupos: string[] = [], etiquetasDeGrupos: string[] = []): HojaDeMenu[] {
    return menu.flatMap((item: MenuInfoBase): HojaDeMenu[] =>
        item.menuType === 'menu'
            ? hojasDeMenu((item as MenuInfoMenu).menuContent, [...grupos, item.name], [...etiquetasDeGrupos, etiquetaDeItem(item)])
            : [{ item, grupos, etiquetasDeGrupos, clave: claveDeMenu([...grupos, item.name]) }]
    );
}

/** Minúsculas, sin tildes y con los guiones bajos como espacios: «Asignación_General» se encuentra con «asignacion general». */
export function normalizarParaBuscar(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/_/g, ' ').toLowerCase();
}

/**
 * Las hojas en las que aparecen todas las palabras de la consulta, en la etiqueta del ítem o en la de sus grupos
 * (así «asignacion encuestador» distingue al «encuestador» de asignación del de recepción). Primero las que
 * lo encuentran en la etiqueta del propio ítem.
 */
export function buscarEnMenu(hojas: HojaDeMenu[], consulta: string): HojaDeMenu[] {
    const palabras = normalizarParaBuscar(consulta).split(/\s+/).filter(palabra => palabra !== '');
    if (palabras.length === 0) return [];
    const propias: HojaDeMenu[] = [];
    const porGrupo: HojaDeMenu[] = [];
    for (const hoja of hojas) {
        const propia = normalizarParaBuscar(`${etiquetaDeItem(hoja.item)} ${hoja.item.name}`);
        const completa = `${hoja.etiquetasDeGrupos.map(normalizarParaBuscar).join(' ')} ${propia}`;
        if (!palabras.every(palabra => completa.includes(palabra))) continue;
        (palabras.every(palabra => propia.includes(palabra)) ? propias : porGrupo).push(hoja);
    }
    return [...propias, ...porGrupo];
}
