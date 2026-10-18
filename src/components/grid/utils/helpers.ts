// src/components/grid/utils/helpers.ts
import typeStore, { Typer } from 'type-store';
import { DOM_TEMP_ID, FieldDefinition, FilaDeDatos } from '../../../types';

export type { Typer };

export const typerFrom = (fieldDef: FieldDefinition): Typer => typeStore.typerFrom(fieldDef);

/**
 * Indicadores especiales para filas
 */
export const NEW_ROW_INDICATOR = '$new';
export { DOM_TEMP_ID };

/**
 * Obtiene los valores de la clave primaria de una fila concatenados en un string único
 * @param row - Fila de datos
 * @param primaryKey - Array con los nombres de las columnas que forman la PK
 * @returns String único que identifica la fila
 */
export const getPrimaryKeyValues = (row: FilaDeDatos, primaryKey: string[]): string => {
    // Si la fila tiene un ID de DOM explícito (Symbol), lo usamos
    if (row[DOM_TEMP_ID]) return String(row[DOM_TEMP_ID]);

    return primaryKey.map(key => {
        return row[key] !== undefined && row[key] !== null
            ? String(row[key])
            : 'NULL_OR_UNDEFINED';
    }).join('|');
};

/**
 * Compara dos valores de forma robusta, manejando Fechas y nulos.
 * Basado en sameValue de best-globals/backend-plus.
 */
export const sameValue = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    
    // Tratamos null y undefined como equivalentes para el propósito de "valor vacío" 
    // en celdas de grilla si uno de ellos está presente y el otro no.
    const isAEmpty = a === null || a === undefined;
    const isBEmpty = b === null || b === undefined;
    if (isAEmpty && isBEmpty) return true;

    return false;
};


/**
 * Obtiene la clave única para una celda.
 * @param row La fila actual.
 * @param columnKey La clave de la columna.
 * @param primaryKey La clave primaria de la tabla.
 * @returns Clave única de la celda (ej: "pkValue1|pkValue2|columnKey").
 */
export const getCellKey = (row: FilaDeDatos, columnKey: string, primaryKey: string[]): string => {
    return `${getPrimaryKeyValues(row, primaryKey)}|${columnKey}`;
};

/**
 * Checks if a given database field type name corresponds to a numeric field.
 * @param typeName - The string representing the database field type
 * @returns boolean
 */
export const isNumericType = (typeName?: string): boolean => {
    return ['integer', 'bigint', 'decimal', 'double', 'float', 'number'].includes(typeName || '');
};

/**
 * Checks if a given database field type name corresponds to a date or time field.
 * @param typeName - The string representing the database field type
 * @returns boolean
 */
export const isDateTimeType = (typeName?: string): boolean => {
    const t = typeName?.toLowerCase() || '';
    return ['date', 'time', 'timestamp', 'interval', 'tsrange', 'time_range', 'daterange'].some(type => t.includes(type));
};

/**
 * Compara dos valores del mismo tipo (números, fechas, textos, bigint). Un número contra un texto numérico se compara
 * como número (el valor de un filtro que no se pudo tipar sigue siendo un texto). null si no son comparables.
 */
export const compararValores = (a: unknown, b: unknown): number | null => {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
    if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0;
    const esNumerico = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v));
    if (typeof a === 'number' && esNumerico(b)) return a - Number(b);
    if (esNumerico(a) && typeof b === 'number') return Number(a) - b;
    return null;
};

export const filterOperators = [
    { value: '=', label: '=' },
    { value: '~', label: '~' },
    { value: '!~', label: '!~' },
    { value: '\u2205', label: '∅' }, // vacío
    { value: '!=\u2205', label: '!=∅' }, // no vacío
    { value: '>', label: '>' },
    { value: '>=', label: '>=' },
    { value: '<', label: '<' },
    { value: '<=', label: '<=' },
    { value: '!=', label: '!=' }
];

export const getDefaultOperatorForType = (typeName?: string): string => {
    const isText = ['text', 'varchar', 'char'].some(t => typeName?.toLowerCase().includes(t)) 
                 || (!isNumericType(typeName) && !isDateTimeType(typeName) && typeName?.toLowerCase() !== 'boolean');
    return isText ? '~' : '=';
};