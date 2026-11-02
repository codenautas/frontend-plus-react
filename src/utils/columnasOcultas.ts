import { FieldDefinition, TableDefinition } from '../types';

/**
 * Las columnas que una grilla muestra ocultas al abrirse: las `hiddenColumns` de la definición (el servidor suma ahí los
 * campos `isName: 'known'`). Después el usuario las muestra u oculta (Alt+clic en el encabezado o «ocultar o mostrar columnas»).
 */
export function columnasOcultasIniciales(tableDefinition: TableDefinition): string[] {
    return Array.from(new Set(tableDefinition.hiddenColumns ?? []));
}

/**
 * Un campo con `visible: false` viaja en la definición pero no se dibuja nunca: no es una columna oculta que el usuario
 * pueda mostrar, así que no está en el diálogo de columnas ni se exporta.
 */
export function campoDibujable(field: FieldDefinition): boolean {
    return field.visible !== false;
}
