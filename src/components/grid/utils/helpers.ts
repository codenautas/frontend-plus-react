// src/components/grid/utils/helpers.ts

/**
 * Indicadores especiales para filas
 */
export const NEW_ROW_INDICATOR = '$new';

/**
 * Obtiene los valores de la clave primaria de una fila concatenados en un string único
 * @param row - Fila de datos
 * @param primaryKey - Array con los nombres de las columnas que forman la PK
 * @returns String único que identifica la fila
 */
export const getPrimaryKeyValues = (row: Record<string, any>, primaryKey: string[]): string => {
    return primaryKey.map(key => {
        return row[key] !== undefined && row[key] !== null
            ? String(row[key])
            : 'NULL_OR_UNDEFINED';
    }).join('|');
};
