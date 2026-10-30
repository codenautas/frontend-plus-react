// Los parámetros con los que backend-plus abre una tabla (`wScreens.table` de my-menu.js): vienen de la dirección
// (`#table=usuarios&ff=...&fc=...&td=...`) y del ítem de menú; los de la dirección pisan a los del ítem.
import JSON4all from 'json4all';
import { FixedField } from '../types';

/** Una condición de la fila de filtros: `operator` es uno de los de backend-plus (=, ~, !~, >, >=, <, <=, !=, ∅, !=∅, /R/i) */
export interface FiltroInicial {
    column: string;
    operator: string;
    value: unknown;
}

export interface ParametrosDeTabla {
    fixedFields?: FixedField[];
    /** Las filas de filtros que se muestran al abrir (cada fila es una alternativa; las condiciones de una fila se cumplen todas) */
    filterColumns?: FiltroInicial[][];
    /** Lo que se le cambia a la definición de la tabla que manda el servidor (se mezcla en profundidad) */
    tableDef?: Record<string, unknown>;
    parameterFunctions?: Record<string, unknown>;
    pick?: string;
    label?: string;
}

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && !(valor instanceof Date);
}

/** Los parámetros que en la dirección van codificados con json4all (UriSearchToObjectParams de my-ajax.js) */
const CODIFICADOS = ['ff', 'fc', 'td', 'pf'];

/**
 * Lee una dirección de backend-plus (`#a=1&b=...` o `?a=1&b=...`) como lo hace `UriSearchToObject`: se parte por `&` y por el
 * primer `=`, se decodifica con decodeURIComponent (no con URLSearchParams: ahí `+` sería un espacio) y los parámetros que
 * van en json4all se interpretan. Un valor que no se puede interpretar se ignora.
 */
export function parametrosDeDireccion(direccion: string): Registro {
    const resultado: Registro = {};
    direccion.split('&').forEach(par => {
        const sinMarca = par.replace(/^[#?]/, '');
        const igual = sinMarca.indexOf('=');
        if (igual === -1) return;
        const nombre = sinMarca.slice(0, igual);
        try {
            const texto = decodeURIComponent(sinMarca.slice(igual + 1));
            resultado[nombre] = CODIFICADOS.includes(nombre) ? JSON4all.parse(texto) : texto;
        } catch (err) {
            console.warn(`No se pudo interpretar el parámetro '${nombre}' de la dirección:`, err);
        }
    });
    return resultado;
}

/**
 * Los fixedFields: backend-plus admite un arreglo [{fieldName, value, ...}] o un objeto {campo: valor}
 * (`wScreens.table` de my-menu.js). Lo que no tiene forma de fixedField se descarta.
 */
export function aFixedFields(valor: unknown): FixedField[] {
    if (Array.isArray(valor)) {
        return valor.flatMap((par: unknown): FixedField[] => {
            if (!esRegistro(par) || typeof par.fieldName !== 'string') return [];
            const fixedField: FixedField = { fieldName: par.fieldName, value: par.value };
            if (par.until !== undefined) fixedField.until = par.until;
            if (typeof par.range === 'boolean') fixedField.range = par.range;
            if (typeof par.show === 'boolean') fixedField.show = par.show;
            return [fixedField];
        });
    }
    if (esRegistro(valor)) return Object.entries(valor).map(([fieldName, value]) => ({ fieldName, value }));
    return [];
}

/**
 * Las filas de filtros de `filterColumns`: un arreglo de condiciones (una fila) o un arreglo de arreglos (varias filas, que
 * son alternativas), como `createRowFilter` de my-tables.js. Una condición sin columna o sin operador no filtra nada.
 * El cliente de backend-plus llama `column` a la columna (el .d.ts de MenuInfoTable dice `fieldName` para el `fc` del menú,
 * pero my-menu.js se lo pasa tal cual a `filterColumns`): se aceptan las dos.
 */
export function aFiltrosIniciales(valor: unknown): FiltroInicial[][] {
    if (!Array.isArray(valor) || valor.length === 0) return [];
    const filas: unknown[] = Array.isArray(valor[0]) ? valor : [valor];
    return filas
        .map((fila: unknown): FiltroInicial[] => Array.isArray(fila)
            ? fila.flatMap((condicion: unknown): FiltroInicial[] => {
                if (!esRegistro(condicion) || typeof condicion.operator !== 'string') return [];
                const columna = condicion.column ?? condicion.fieldName;
                return typeof columna === 'string' ? [{ column: columna, operator: condicion.operator, value: condicion.value }] : [];
            })
            : [])
        .filter(fila => fila.length > 0);
}

/** Los parámetros de una tabla a partir de lo que declara el ítem de menú y de la dirección (esta última manda) */
export function parametrosDeTabla(item: Registro | undefined, direccion: string): ParametrosDeTabla {
    const origen: Registro = { ...item, ...parametrosDeDireccion(direccion) };
    const parametros: ParametrosDeTabla = {};
    const fixedFields = aFixedFields(origen.ff ?? origen.fixedFields);
    if (fixedFields.length > 0) parametros.fixedFields = fixedFields;
    const filterColumns = aFiltrosIniciales(origen.fc);
    if (filterColumns.length > 0) parametros.filterColumns = filterColumns;
    if (esRegistro(origen.td)) parametros.tableDef = origen.td;
    if (esRegistro(origen.pf)) parametros.parameterFunctions = origen.pf;
    if (typeof origen.pick === 'string') parametros.pick = origen.pick;
    if (typeof origen.label === 'string') parametros.label = origen.label;
    return parametros;
}

/** Mezcla en profundidad (como `changing` de best-globals): los objetos se mezclan, todo lo demás (arreglos incluidos) se reemplaza */
export function fusionar<T extends object>(base: T, cambios: Registro): T {
    const resultado = { ...base };
    for (const [clave, valor] of Object.entries(cambios)) {
        const actual: unknown = Reflect.get(resultado, clave);
        Reflect.set(resultado, clave, esRegistro(actual) && esRegistro(valor) ? fusionar(actual, valor) : valor);
    }
    return resultado;
}
