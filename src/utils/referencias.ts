import { executeBackendProcedure } from './fetchApi';
import { requerido } from './errores';
import { FieldDefinition, FilaDeDatos, TableDefinition } from '../types';

/**
 * El «expander» de referencias de backend-plus (F9 o Alt+↓ en una celda con FK o softFK, `myOwn.ExpanderReferences` en my-tables.js):
 * un menú con las filas de la tabla referenciada (su clave y sus campos `isName`) para elegir el valor de la celda.
 */

/** Par origen → destino de una FK (`source` es la columna de esta tabla, `target` la de la referenciada) */
export type ParDeCampos = { source: string, target: string };

/**
 * Un campo con `references`. `tableDefAdapt` (backend-plus) agrega `referencesFields` al campo origen de cada FK y softFK; un campo
 * que declara `references` a mano (como las asignaciones de dmencu) no lo tiene. `backend-plus.d.ts` no declara `referencesFields` ni
 * `skipReferenceLookup`, que el cliente de backend-plus usa.
 */
export type CampoConReferencia = FieldDefinition & { references: string, referencesFields?: ParDeCampos[], skipReferenceLookup?: boolean };

const esParDeCampos = (par: unknown): par is ParDeCampos =>
    typeof par === 'object' && par !== null && 'source' in par && 'target' in par && typeof par.source === 'string' && typeof par.target === 'string';

/** El campo tiene menú de elección (como `ExpanderReferences.whenType`: tiene `references` y no pide saltear el lookup) */
export const esCampoConReferencia = (campo: FieldDefinition): campo is CampoConReferencia =>
    typeof campo.references === 'string' && campo.references !== '' &&
    (!('referencesFields' in campo) || campo.referencesFields === undefined || Array.isArray(campo.referencesFields) && campo.referencesFields.every(esParDeCampos)) &&
    !('skipReferenceLookup' in campo && campo.skipReferenceLookup);

/** Los campos con los que se nombra una fila de la tabla: `lookupFields` si los hay y, si no, los `isName` (`nameFields`) */
export const camposDeNombre = (definicion: TableDefinition): string[] => {
    const comoTextos = (campos: unknown): string[] => Array.isArray(campos) ? campos.filter((c): c is string => typeof c === 'string') : [];
    if (definicion.lookupFields && definicion.lookupFields.length > 0) return definicion.lookupFields;
    return 'nameFields' in definicion ? comoTextos(definicion.nameFields) : [];
};

/** Nombre del campo que dice si la fila está activa (`activeRecords.fieldName`), si la tabla lo declara */
const campoDeActivo = (definicion: TableDefinition): string | null =>
    'activeRecords' in definicion && typeof definicion.activeRecords === 'object' && definicion.activeRecords !== null &&
    'fieldName' in definicion.activeRecords && typeof definicion.activeRecords.fieldName === 'string'
        ? definicion.activeRecords.fieldName : null;

export type OpcionDeReferencia = {
    valor: unknown,
    /** Lo que se muestra de la fila: las columnas de la clave y los campos de nombre */
    etiquetas: string[],
    /** Con qué se ordena y contra qué se busca */
    texto: string,
};

const comoTexto = (valor: unknown): string => valor === null || valor === undefined ? '' : String(valor);

/**
 * Las opciones del menú de un campo con referencia, como `ExpanderReferences.dialogInput` de backend-plus:
 * - sin las filas inactivas (`activeRecords`);
 * - en una FK compuesta, solo las filas que coinciden con los valores de la fila en las columnas anteriores a la última;
 * - con el valor de la última columna de la referencia; la etiqueta lleva la clave y los campos de nombre;
 * - ordenadas por esa etiqueta y, si el campo admite nulo, con la opción vacía al final.
 */
export const opcionesDeReferencia = (campo: CampoConReferencia, definicionReferenciada: TableDefinition, filasReferenciadas: FilaDeDatos[], filaActual: FilaDeDatos, admiteNulo: boolean): OpcionDeReferencia[] => {
    // sin referencesFields (un campo que declara references a mano) el valor es la última columna de la clave, como en backend-plus
    const pares = campo.referencesFields ?? [];
    const columnaDelValor = pares.length > 0 ? pares[pares.length - 1].target : definicionReferenciada.primaryKey[definicionReferenciada.primaryKey.length - 1];
    const anteriores = pares.slice(0, -1);
    const activo = campoDeActivo(definicionReferenciada);
    const nombres = camposDeNombre(definicionReferenciada);
    const columnasDeEtiqueta = nombres.length > 0 ? [...definicionReferenciada.primaryKey, ...nombres] : definicionReferenciada.primaryKey;
    const opciones: OpcionDeReferencia[] = filasReferenciadas
        .filter(fila => (activo === null || !!fila[activo]) && anteriores.every(par => comoTexto(fila[par.target]) === comoTexto(filaActual[par.source])))
        .map(fila => {
            const etiquetas = columnasDeEtiqueta.map(columna => comoTexto(fila[columna]));
            return { valor: fila[columnaDelValor], etiquetas, texto: `${etiquetas.join(', ')}; ${definicionReferenciada.primaryKey.join(', ')}` };
        });
    const ordenar = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
    opciones.sort((a, b) => ordenar.compare(a.texto, b.texto));
    if (admiteNulo) opciones.push({ valor: null, etiquetas: ['', '(vacío)'], texto: '' });
    return opciones;
};

/** Las opciones que contienen lo buscado (sin distinguir mayúsculas ni tildes; las palabras sueltas se buscan por separado). La opción vacía no se filtra */
export const filtrarOpciones = (opciones: OpcionDeReferencia[], busqueda: string): OpcionDeReferencia[] => {
    const simplificar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const palabras = simplificar(busqueda).split(/\s+/).filter(p => p !== '');
    if (palabras.length === 0) return opciones;
    return opciones.filter(opcion => opcion.valor === null || palabras.every(p => simplificar(opcion.etiquetas.join(' ')).includes(p)));
};

export type ReferenciaCargada = { definicion: TableDefinition, filas: FilaDeDatos[] };

const VIGENCIA_DE_REFERENCIA_MS = 2 * 60 * 1000;
const referencias = new Map<string, { cargada: Promise<ReferenciaCargada>, cuando: number }>();

/**
 * La definición y las filas de la tabla referenciada. Se guardan un rato: elegir de a varias celdas seguidas no pide la tabla cada vez
 * (backend-plus las guarda hasta recargar la página; acá vencen, así una tabla que se edita en otra pestaña se ve al rato).
 */
export const cargarReferencia = (tabla: string): Promise<ReferenciaCargada> => {
    const guardada = referencias.get(tabla);
    if (guardada && Date.now() - guardada.cuando < VIGENCIA_DE_REFERENCIA_MS) return guardada.cargada;
    const cargada = (async (): Promise<ReferenciaCargada> => {
        const [definicion, filas] = await Promise.all([
            executeBackendProcedure<TableDefinition>('table_structure', { table: tabla }),
            executeBackendProcedure<FilaDeDatos[]>('table_data', { table: tabla, fixedFields: [] }),
        ]);
        return { definicion: requerido(definicion, `la estructura de '${tabla}'`), filas: requerido(filas, `los datos de '${tabla}'`) };
    })();
    referencias.set(tabla, { cargada, cuando: Date.now() });
    cargada.catch(() => { if (referencias.get(tabla)?.cargada === cargada) referencias.delete(tabla); });
    return cargada;
};

/** Para los tests: olvidar lo guardado */
export const olvidarReferencias = (): void => referencias.clear();
