import { FetchApiOptions, ParametrosDeProcedimiento } from "../types";
import { mensajeDeError } from "./errores";
import { envConfig } from '../env'; // Ajusta la ruta según donde lo hayas guardado
import JSON4all from 'json4all';
import { ProcedureDef } from 'backend-plus';

type DefinicionesDeProcedimientos = Record<string, ProcedureDef>;

/**
 * Fuente de las definiciones de procedimientos que manda el servidor en client-setup.
 * La registra el store para que este módulo no lo importe (evita la dependencia circular).
 */
let obtenerDefinicionesDeProcedimientos: () => DefinicionesDeProcedimientos | undefined = () => undefined;

export function registrarFuenteDeProcedimientos(fuente: () => DefinicionesDeProcedimientos | undefined) {
    obtenerDefinicionesDeProcedimientos = fuente;
}

/** Codifica un valor igual que lo hace my-ajax.js (myAjax.encoders), que es como lo decodifica el servidor */
function codificarParametro(valor: unknown, encoding: string | undefined, procedureName: string, paramName: string): string {
    switch (encoding ?? 'JSON4all') {
        case 'plain':
            if (typeof valor === 'object' && valor !== null) {
                throw new Error(`El parámetro '${paramName}' de '${procedureName}' es plain y no admite objetos`);
            }
            return String(valor);
        case 'JSON':
            return JSON.stringify(valor);
        case 'JSON4all':
            return JSON4all.stringify(valor);
        default:
            throw new Error(`Encoding '${encoding}' no soportado para el parámetro '${paramName}' de '${procedureName}'`);
    }
}

/**
 * Arma los parámetros codificados según la definición del procedimiento.
 * Si el procedimiento no se conoce todavía (por ejemplo antes de cargar client-setup)
 * se usa la codificación anterior: primitivos tal cual y objetos con JSON4all.
 */
export function codificarParametros(procedureName: string, params: Record<string, unknown>): { codificados: Record<string, string>, method: 'get' | 'post' } {
    const definicion = obtenerDefinicionesDeProcedimientos()?.[procedureName];
    const codificados: Record<string, string> = {};
    if (!definicion) {
        for (const [nombre, valor] of Object.entries(params)) {
            if (valor === undefined) continue;
            codificados[nombre] = typeof valor === 'object' && valor !== null ? JSON4all.stringify(valor) : String(valor);
        }
        return { codificados, method: 'post' };
    }
    const declarados = new Set(definicion.parameters.map(p => p.name));
    for (const nombre of Object.keys(params)) {
        if (!declarados.has(nombre)) {
            console.warn(`El parámetro '${nombre}' no está declarado en el procedimiento '${procedureName}' y no se envía`);
        }
    }
    for (const paramDef of definicion.parameters) {
        const valor = params[paramDef.name];
        // si no viene, el servidor usa el defaultValue (o informa que falta)
        if (valor === undefined) continue;
        codificados[paramDef.name] = codificarParametro(valor, paramDef.encoding, procedureName, paramDef.name);
    }
    return { codificados, method: definicion.method ?? 'post' };
}


/**
 * Función genérica para realizar peticiones a la API.
 * Configurada para enviar cookies por defecto.
 *
 * @param endPoint La URL a la que se realizará la petición.
 * @param options Opciones de la petición fetch (método, headers, body, etc.).
 * @returns La respuesta de la petición.
 */
export async function fetchApi(endPoint: string, options: FetchApiOptions): Promise<Response> {
    const BACKEND_URL = envConfig.backendUrl;
    // sinContentType: el navegador arma el Content-Type solo (FormData lleva su boundary)
    const { sinContentType, ...opcionesDeFetch } = options;
    const headers = new Headers(opcionesDeFetch.headers);
    if (!sinContentType && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
    }
    const config: RequestInit = {
        ...opcionesDeFetch,
        headers,
        credentials: 'include',
    };
    if (config.method === 'GET' || config.method === 'HEAD') {
        delete config.body;
    }
    return await fetch(BACKEND_URL + endPoint, config);
}

/** El servidor informa un error de un procedimiento con { error: { message } } */
function esRespuestaConError(resultado: unknown): resultado is { error: { message: string } } {
    if (typeof resultado !== 'object' || resultado === null || !('error' in resultado)) return false;
    const { error } = resultado;
    return typeof error === 'object' && error !== null && 'message' in error;
}

/**
 * Interpreta la respuesta de un procedimiento y la devuelve con la forma que declara quien llama (T).
 * Es el único lugar donde se afirma esa forma: el servidor manda JSON4all y su estructura la define cada procedimiento.
 */
function resultadoDeProcedimiento<T>(texto: string): T {
    const resultado: unknown = parseBackendResponse(texto);
    if (esRespuestaConError(resultado)) {
        throw new Error(resultado.error.message);
    }
    return resultado as T;
}

async function ejecutar<T>(descripcion: string, procedureName: string, pedido: Promise<Response>): Promise<T | null> {
    const response = await pedido;
    if (response.ok) {
        return resultadoDeProcedimiento<T>(await response.text());
    }
    const errorTextDefinition = await response.text();
    throw new Error(`Error al ejecutar ${descripcion} '${procedureName}': ${response.status} - ${errorTextDefinition}`);
}

export const executeBackendProcedure = async <T = unknown>(procedureName: string, params: ParametrosDeProcedimiento): Promise<T | null> => {
    const { codificados, method } = codificarParametros(procedureName, params);
    const query = new URLSearchParams(codificados);
    return ejecutar<T>('procedure', procedureName, method === 'get'
        ? fetchApi(`/${procedureName}?${query}`, { method: 'GET' })
        : fetchApi(`/${procedureName}`, { body: query, method: 'POST' }));
}

function parseBackendResponse(text: string): unknown {
    const trimmedText = text.trim();

    // El backend puede enviar múltiples líneas de progreso (JSONs por línea) 
    // seguidas de un separador '--' y finalmente el resultado JSON.
    // Ejemplo:
    // {"progress":{}}
    // --
    // {"uploaded":{...}}

    // Buscamos el separador '--' que esté en una línea sola o después de un salto de línea
    const separatorMatch = trimmedText.match(/\n--\n/);
    let finalPart = trimmedText;

    if (separatorMatch) {
        // Si encontramos el separador, tomamos todo lo que está después del último separador
        const parts = trimmedText.split(/\n--\n/);
        finalPart = parts[parts.length - 1];
    } else {
        // Fallback: buscar '--' al principio o después de un salto de línea simple
        const parts = trimmedText.split(/\n--/);
        if (parts.length > 1) {
            finalPart = parts[parts.length - 1];
        } else if (trimmedText.startsWith('--')) {
            finalPart = trimmedText.replace(/^--\s*/, '');
        }
    }

    try {
        return JSON4all.parse(finalPart.trim());
    } catch (e) {
        // Si falla el parseo de la parte final, intentamos parsear la última línea que sea un JSON válido
        // Esto es un último recurso si el formato del separador varía
        const lines = trimmedText.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line && line.startsWith('{') && line.endsWith('}')) {
                try {
                    return JSON4all.parse(line);
                } catch (innerE) {
                    continue;
                }
            }
        }
        throw new Error(`No se pudo parsear la respuesta del servidor: ${mensajeDeError(e)}`);
    }
}

export const executeBackendUpload = async <T = unknown>(procedureName: string, file: File, params: ParametrosDeProcedimiento): Promise<T | null> => {
    const formData = new FormData();
    formData.append('file', file);

    // Añadimos el resto de parámetros al formData (los multipart no admiten encoding plain)
    const { codificados } = codificarParametros(procedureName, params);
    for (const [key, value] of Object.entries(codificados)) {
        formData.append(key, value);
    }

    return ejecutar<T>('upload', procedureName, fetchApi(`/${procedureName}`, { body: formData, method: 'POST', sinContentType: true }));
}
