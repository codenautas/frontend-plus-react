import { FieldDefinition } from '../types';
import { esCampoConReferencia, OpcionDeReferencia } from './referencias';

/**
 * Los «expanders» de backend-plus (`TypedControls.Expanders`, que se abren con F9 o Alt+↓ en una celda): según el tipo del campo,
 * un menú, un calendario o una ventana para ver o editar el contenido. Acá se decide cuál corresponde y se arman sus datos.
 */
export type TipoDeExpander = 'referencia' | 'booleano' | 'opciones' | 'fecha' | 'texto' | 'json';

/**
 * Cuál es el expander del campo, en el orden en que backend-plus los prueba: JSON de solo lectura, referencias, booleano, `options`, fecha
 * y, para cualquier campo que no sea clientSide, la ventana de texto. En una celda que no se puede editar solo valen el JSON y el texto
 * (`whenReadOnly`): sirven para ver el contenido completo.
 * Un jsonb editable usa la ventana de texto: el expander de JSON de backend-plus intenta editarlo con una variable sin definir.
 */
export const tipoDeExpander = (campo: FieldDefinition, editable: boolean): TipoDeExpander | null => {
    if (campo.typeName === 'jsonb' && !editable) return 'json';
    if (editable) {
        if (esCampoConReferencia(campo)) return 'referencia';
        if (campo.typeName === 'boolean') return 'booleano';
        if (campo.options && campo.options.length > 0) return 'opciones';
        if (campo.typeName === 'date') return 'fecha';
    }
    return campo.clientSide ? null : 'texto';
};

const SI_NO_VACIO = { si: 'Sí', no: 'No', vacio: '(vacío)' };

/** Sí, No y, si el campo admite nulo, vacío (el menú del expander de booleanos) */
export const opcionesDeBooleano = (admiteNulo: boolean): OpcionDeReferencia[] => {
    const opciones: OpcionDeReferencia[] = [
        { valor: true, etiquetas: [SI_NO_VACIO.si], texto: SI_NO_VACIO.si },
        { valor: false, etiquetas: [SI_NO_VACIO.no], texto: SI_NO_VACIO.no },
    ];
    if (admiteNulo) opciones.push({ valor: null, etiquetas: ['', SI_NO_VACIO.vacio], texto: '' });
    return opciones;
};

/** El menú del expander de `options`: cada opción con su valor y, si la tiene, su etiqueta; sin ordenar (en el orden que declaró el backend) */
export const opcionesDeEnumerado = (opciones: NonNullable<FieldDefinition['options']>, admiteNulo: boolean): OpcionDeReferencia[] => {
    const resultado: OpcionDeReferencia[] = opciones.map(opcion => typeof opcion === 'string'
        ? { valor: opcion, etiquetas: [opcion], texto: opcion }
        : { valor: opcion.option, etiquetas: [String(opcion.option), opcion.label], texto: `${opcion.option} ${opcion.label}` });
    if (admiteNulo) resultado.push({ valor: null, etiquetas: ['', SI_NO_VACIO.vacio], texto: '' });
    return resultado;
};

export type DiaDelCalendario = { anio: number, mes: number, dia: number, delMesMostrado: boolean };

/** Año, mes (0 a 11) y día */
export type FechaSimple = { anio: number, mes: number, dia: number };

/** Lo que vale como fecha en una celda (un `Date` o un texto `AAAA-MM-DD`); null si no es una fecha */
export const fechaDeValor = (valor: unknown): FechaSimple | null => {
    if (valor instanceof Date && !isNaN(valor.getTime())) return { anio: valor.getFullYear(), mes: valor.getMonth(), dia: valor.getDate() };
    if (typeof valor === 'string') {
        const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
        if (partes) return { anio: Number(partes[1]), mes: Number(partes[2]) - 1, dia: Number(partes[3]) };
    }
    return null;
};

/** La fecha como la entiende el editor de la celda (`AAAA-MM-DD`) */
export const fechaATexto = ({ anio, mes, dia }: FechaSimple): string =>
    `${String(anio).padStart(4, '0')}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/** Las semanas (lunes a domingo) que muestra el calendario de un mes: completas, con los días del mes anterior y del siguiente que las rellenan */
export const semanasDelMes = (anio: number, mes: number): DiaDelCalendario[][] => {
    const primero = new Date(anio, mes, 1);
    const desfase = (primero.getDay() + 6) % 7; // lunes = 0
    const diasDelMes = new Date(anio, mes + 1, 0).getDate();
    const semanas: DiaDelCalendario[][] = [];
    for (let celda = 0; celda < Math.ceil((desfase + diasDelMes) / 7) * 7; celda++) {
        const fecha = new Date(anio, mes, 1 - desfase + celda);
        const dia: DiaDelCalendario = { anio: fecha.getFullYear(), mes: fecha.getMonth(), dia: fecha.getDate(), delMesMostrado: fecha.getMonth() === mes };
        if (celda % 7 === 0) semanas.push([]);
        semanas[semanas.length - 1].push(dia);
    }
    return semanas;
};

/** Lo que se muestra de un valor en la ventana de solo lectura: un JSON con sangría, o el texto tal cual */
export const textoParaVer = (valor: unknown): string => {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'object' && !(valor instanceof Date)) return JSON.stringify(valor, null, 2);
    return String(valor);
};
