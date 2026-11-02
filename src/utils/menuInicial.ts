// La pantalla de inicio la define el backend, como en backend-plus: es el ítem de menú con `selectedByDefault`.
import { MenuInfoBase, MenuInfoMenu, MenuInfoTable } from 'backend-plus';
import { wScreens } from '../pages/WScreens';

/**
 * La ruta de una tabla de menú: `/menu/<grupo>/.../<nombre>`. Los nombres de los ítems se repiten entre grupos (en dmencu
 * «encuestador» está en asignación y en recepción, con tablas distintas): lo que identifica al ítem es el camino completo.
 */
export function rutaDeTablaDeMenu(camino: string[]): string {
    return `/menu/${camino.map(encodeURIComponent).join('/')}`;
}

/** Los grupos (de afuera hacia adentro) que contienen a un ítem del menú; `undefined` si el ítem no está en el menú. */
export function gruposDeItem(menu: MenuInfoBase[], item: MenuInfoBase): string[] | undefined {
    for (const candidato of menu) {
        if (candidato === item) return [];
        if (candidato.menuType === 'menu') {
            const grupos = gruposDeItem((candidato as MenuInfoMenu).menuContent, item);
            if (grupos) return [candidato.name, ...grupos];
        }
    }
    return undefined;
}

function itemDeCamino(menu: MenuInfoBase[], camino: string[]): MenuInfoBase | undefined {
    const [nombre, ...resto] = camino;
    const item = menu.find(candidato => candidato.name === nombre && candidato.menuType === (resto.length ? 'menu' : 'table'));
    return item && resto.length ? itemDeCamino((item as MenuInfoMenu).menuContent, resto) : item;
}

function primeraTablaConNombre(menu: MenuInfoBase[], nombre: string): MenuInfoBase | undefined {
    for (const item of menu) {
        if (item.menuType === 'table' && item.name === nombre) return item;
        const encontrado = item.menuType === 'menu' ? primeraTablaConNombre((item as MenuInfoMenu).menuContent, nombre) : undefined;
        if (encontrado) return encontrado;
    }
    return undefined;
}

/**
 * El ítem de tabla que nombra un camino de `rutaDeTablaDeMenu`. Si el camino no existe se toma la primera tabla que se
 * llame como su último tramo: así siguen andando las direcciones viejas, `/menu/<nombre>`.
 */
export function itemDeRuta(menu: MenuInfoBase[], camino: string[]): MenuInfoTable | undefined {
    if (camino.length === 0) return undefined;
    const item = itemDeCamino(menu, camino) ?? primeraTablaConNombre(menu, camino[camino.length - 1]);
    return item as MenuInfoTable | undefined;
}

/**
 * La ruta que muestra un ítem de menú: las tablas van a `/menu/<grupos>/<nombre>` (con `td` y `fc` en la query string; los
 * `fixedFields` los toma la página del propio menú), los procedimientos a `/procedures/:nombre` y lo demás son wScreens.
 * `grupos` son los grupos de menú que contienen al ítem (`gruposDeItem`).
 */
export function rutaDeItemDeMenu(item: MenuInfoBase, grupos: string[] = []): string {
    if (item.menuType === 'table') {
        const consulta = new URLSearchParams();
        if (item.td) consulta.append('td', JSON.stringify(item.td));
        if (item.fc) consulta.append('fc', JSON.stringify(item.fc));
        return `${rutaDeTablaDeMenu([...grupos, item.name])}${consulta.size ? `?${consulta.toString()}` : ''}`;
    }
    if (item.menuType === 'proc') return `/procedures/${item.name}`;
    if (wScreens[item.menuType] !== undefined) return `/wScreens/${item.menuType}`;
    console.warn(`Menu type '${item.menuType}' no reconocido o WScreen no mapeada.`);
    return `/wScreens-fallback/${item.menuType}`;
}

/**
 * El ítem que se muestra al entrar: como `my-menu.js`, el que declara `selectedByDefault` y, si es un grupo, el que
 * declare así adentro. Si el backend no declara ninguno (o el grupo no tiene uno por omisión) no hay pantalla de inicio.
 */
export function itemInicial(menu: MenuInfoBase[]): MenuInfoBase | undefined {
    const elegido = menu.find(item => item.selectedByDefault);
    if (!elegido) return undefined;
    return elegido.menuType === 'menu' ? itemInicial((elegido as MenuInfoMenu).menuContent) : elegido;
}
