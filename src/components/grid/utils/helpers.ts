// src/components/grid/utils/helpers.ts

/**
 * Indicadores especiales para filas
 */
export const NEW_ROW_INDICATOR = '$new';
export const DETAIL_ROW_INDICATOR = '$detail';

/**
 * Obtiene los valores de la clave primaria de una fila concatenados en un string único
 * @param row - Fila de datos
 * @param primaryKey - Array con los nombres de las columnas que forman la PK
 * @returns String único que identifica la fila
 */
export const getPrimaryKeyValues = (row: Record<string, any>, primaryKey: string[]): string => {
    if (row[DETAIL_ROW_INDICATOR]) {
        primaryKey = primaryKey.concat(DETAIL_ROW_INDICATOR)
    }
    return primaryKey.map(key => {
        return row[key] !== undefined && row[key] !== null
            ? String(row[key])
            : 'NULL_OR_UNDEFINED';
    }).join('|');
};

/**
 * Verifica si una fila es nueva (no guardada en BD)
 * @param row - Fila de datos
 * @returns true si es una fila nueva
 */
export const isNewRow = (row: Record<string, any>): boolean => {
    return row[NEW_ROW_INDICATOR] === true;
};

/**
 * Verifica si una fila es de detalle
 * @param row - Fila de datos
 * @returns true si es una fila de detalle
 */
export const isDetailRow = (row: Record<string, any>): boolean => {
    return row[DETAIL_ROW_INDICATOR] !== undefined;
};
