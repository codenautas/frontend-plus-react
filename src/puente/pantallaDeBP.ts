// Cómo se ejecuta una wScreen de backend-plus, igual que `showPage` de my-menu.js
import type { DefinicionPantallaBP, MyOwnBP, PantallaBP } from './clienteBP';

export interface PantallaResuelta {
    definicion: DefinicionPantallaBP;
    ejecutar: PantallaBP;
}

/** La función que dibuja la pantalla, o null si backend-plus no la tiene (o no tiene cómo dibujarla) */
export function resolverPantallaBP(myOwn: MyOwnBP, nombre: string, contenedor: HTMLElement): PantallaResuelta | null {
    const registrada = myOwn.wScreens[nombre];
    if (!registrada) return null;
    if (typeof registrada === 'function') {
        return { definicion: { mainFunction: registrada }, ejecutar: registrada };
    }
    if (registrada.mainFunction) {
        return { definicion: registrada, ejecutar: registrada.mainFunction };
    }
    const { parameters, mainAction, resultClass, proceedLabel } = registrada;
    const procAux = myOwn.wScreens.procAux;
    const mostrarParametros = typeof procAux === 'object' ? procAux.showParams : undefined;
    if (parameters && mostrarParametros) {
        return {
            definicion: registrada,
            ejecutar: parametros => mostrarParametros({ parameters, resultClass, proceedLabel }, contenedor, parametros, mainAction),
        };
    }
    return null;
}
