// src/components/grid/condiciones.ts
// Condiciones de los detalles (`condition` de un DetailTable): funciones de la aplicación que deciden, fila por fila,
// si el botón del detalle se muestra. Es el equivalente de `my.conditions` de backend-plus.
import { CondicionDeDetalle, CondicionesMap, FilaDeDatos } from '../../types';

export let condiciones: CondicionesMap = {};

export const extendConditions = (nuevas: CondicionesMap) => {
    condiciones = { ...condiciones, ...nuevas };
};

const avisadas = new Set<string>();

/**
 * ¿Se muestra el detalle para esta fila? Sin `condition` siempre se muestra.
 * Si la condición no está registrada se avisa una vez por consola y se muestra: ocultar el detalle por un error
 * de configuración escondería datos sin dejar rastro.
 */
export function cumpleCondicion(nombre: string | undefined, fila: FilaDeDatos): boolean {
    if (!nombre) return true;
    const condicion: CondicionDeDetalle | undefined = condiciones[nombre];
    if (!condicion) {
        if (!avisadas.has(nombre)) {
            avisadas.add(nombre);
            console.warn(`La condición '${nombre}' de un detalle no está registrada (extendConditions / myConditions): se muestra el detalle.`);
        }
        return true;
    }
    return condicion(fila);
}
