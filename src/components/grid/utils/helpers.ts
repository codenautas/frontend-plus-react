// src/components/grid/utils/helpers.ts
// @ts-ignore
import typeStore from 'type-store';
import { FieldDefinition } from '../../../types';

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


/**
 * Obtiene la clave única para una celda.
 * @param row La fila actual.
 * @param columnKey La clave de la columna.
 * @param primaryKey La clave primaria de la tabla.
 * @returns Clave única de la celda (ej: "pkValue1|pkValue2|columnKey").
 */
export const getCellKey = (row: Record<string, any>, columnKey: string, primaryKey: string[]): string => {
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
 * Convierte una fila plana (tal como viene del backend en JSON) a valores tipados
 * usando type-store. Los campos null/undefined se dejan intactos.
 * @param row - Fila cruda del backend
 * @param fields - Definición de campos de la tabla
 * @returns Nueva fila con valores tipados
 */
export const typifyRow = (row: Record<string, any>, fields: FieldDefinition[]): Record<string, any> => {
    const typedRow = { ...row };
    fields.forEach((field) => {
        if (typedRow[field.name] !== undefined && typedRow[field.name] !== null) {
            const typer = typeStore.typerFrom(field);
            typedRow[field.name] = typer.fromLocalString(typedRow[field.name]);
        }
    });
    return typedRow;
};