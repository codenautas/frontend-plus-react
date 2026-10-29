// La pantalla de inicio la define el backend, como en backend-plus: es el ítem de menú con `selectedByDefault`.
import { MenuInfoBase, MenuInfoMenu } from 'backend-plus';
import { wScreens } from '../pages/WScreens';

/**
 * La ruta que muestra un ítem de menú: las tablas van a `/menu/:nombre` (con `td` y `fc` en la query string; los
 * `fixedFields` los toma la página del propio menú), los procedimientos a `/procedures/:nombre` y lo demás son wScreens.
 */
export function rutaDeItemDeMenu(item: MenuInfoBase): string {
    if (item.menuType === 'table') {
        const consulta = new URLSearchParams();
        if (item.td) consulta.append('td', JSON.stringify(item.td));
        if (item.fc) consulta.append('fc', JSON.stringify(item.fc));
        return `/menu/${item.name}${consulta.size ? `?${consulta.toString()}` : ''}`;
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
