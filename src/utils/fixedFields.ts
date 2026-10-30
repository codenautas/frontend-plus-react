// Qué hace un fixedField con su columna, igual que `TableConnector` de backend-plus (my-tables.js): un fixedField con
// `range` o con `until` no fija el valor (la columna sigue siendo una columna común y se puede filtrar); uno que fija el
// valor oculta su columna, salvo que declare `show`.
import { FixedField } from '../types';

/** ¿El fixedField fija el valor de su columna? (los de `range` y `until` son un rango: no) */
export function fijaElValor(fixedField: FixedField): boolean {
    return !fixedField.range && fixedField.until === undefined;
}

/** El fixedField que fija el valor de la columna, si lo hay */
export function valorFijoDe(fixedFields: FixedField[] | undefined, columna: string): FixedField | undefined {
    return fixedFields?.find(f => f.fieldName === columna && fijaElValor(f));
}

/** ¿La columna tiene un valor fijo y no se muestra? (`show` la deja a la vista) */
export function columnaOcultaPorFixedField(fixedFields: FixedField[] | undefined, columna: string): boolean {
    const fijo = valorFijoDe(fixedFields, columna);
    return fijo !== undefined && !fijo.show;
}
