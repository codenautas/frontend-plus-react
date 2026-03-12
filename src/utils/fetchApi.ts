import { FetchApiOptions } from "../types";
import { envConfig } from '../env'; // Ajusta la ruta según donde lo hayas guardado

/**
 * Función genérica para realizar peticiones a la API.
 * Configurada para enviar cookies por defecto.
 *
 * @param endPoint La URL a la que se realizará la petición.
 * @param options Opciones de la petición fetch (método, headers, body, etc.).
 * @returns La respuesta de la petición.
 * @throws Error si la petición no es exitosa (response.ok es false).
 */
export async function fetchApi(endPoint: string, options: FetchApiOptions): Promise<Response> {
const BACKEND_URL = envConfig.backendUrl;
    const defaultHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    const config: RequestInit = {
        ...options,
        headers: {
            ...(options?.headers && 'Content-Type' in options.headers && options.headers['Content-Type'] === undefined 
                ? {} 
                : { 'Content-Type': 'application/x-www-form-urlencoded' }),
            ...options?.headers,
        },
        credentials: 'include',
    };
    
    // Si el Content-Type es undefined, lo removemos para que el navegador lo asigne (ej: FormData)
    if (config.headers && (config.headers as any)['Content-Type'] === undefined) {
        delete (config.headers as any)['Content-Type'];
    }
    if (config.method === 'GET' || config.method === 'HEAD') {
        delete config.body;
    }
    return await fetch(BACKEND_URL+endPoint, config);
}
export const executeBackendProcedure = async<T=any>(procedureName:string, params:Record<string, any>):Promise<T | null> => {
    function stringifyObjectsAndArraysInParams(params: Record<string, any>): Record<string, any> {
        const newParams: Record<string, any> = {};
    
        for (const key in params) {
            // Asegúrate de que la propiedad pertenece al objeto y no a su prototipo
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                const value = params[key];
    
                // Condición: Si el valor es un objeto Y NO es null
                // Tanto los objetos planos como los arrays pasarán esta condición.
                if (typeof value === 'object' && value !== null) {
                    try {
                        newParams[key] = JSON.stringify(value);
                    } catch (e) {
                        // Manejo de errores si el objeto/array no es serializable (ej. referencias circulares)
                        console.warn(`Warning: Could not stringify value for key '${key}'. Keeping original value. Error:`, e);
                        newParams[key] = value; // Mantén el valor original si no se puede stringificar
                    }
                } else {
                    // Para todos los demás tipos (primitivos, null, undefined), mantenemos el valor original
                    newParams[key] = value;
                }
            }
        }
        return newParams;
    }

    const body = new URLSearchParams(stringifyObjectsAndArraysInParams(params));
    const response = await fetchApi(`/${procedureName}`, {body, method:'POST'})
    if (response.ok) {
        const rawResponseText = await response.text();
        const result = parseBackendResponse(rawResponseText);
        if(result.error){
            throw new Error(result.error.message)
        }else{
            return result;
        }
    } else {
        const errorTextDefinition = await response.text();
        throw new Error(`Error al ejecutar procedure '${procedureName}': ${response.status} - ${errorTextDefinition}`);
    }    
}

function parseBackendResponse(text: string): any {
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
        return JSON.parse(finalPart.trim());
    } catch (e: any) {
        // Si falla el parseo de la parte final, intentamos parsear la última línea que sea un JSON válido
        // Esto es un último recurso si el formato del separador varía
        const lines = trimmedText.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line && line.startsWith('{') && line.endsWith('}')) {
                try {
                    return JSON.parse(line);
                } catch (innerE) {
                    continue;
                }
            }
        }
        throw new Error(`No se pudo parsear la respuesta del servidor: ${e.message}`);
    }
}

export const executeBackendUpload = async<T=any>(procedureName:string, file:File, params:Record<string, any>):Promise<T | null> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Añadimos el resto de parámetros al formData
    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            const value = params[key];
            if (typeof value === 'object' && value !== null) {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, value);
            }
        }
    }

    // Al usar FormData, fetchApi NO debe poner Content-Type: application/x-www-form-urlencoded
    // Pero fetchApi pone Content-Type por defecto. Necesitamos que fetchApi sea más flexible.
    const response = await fetchApi(`/${procedureName}`, {
        body: formData, 
        method:'POST',
        headers: {
            'Content-Type': undefined as any // Dejamos que el navegador establezca el boundary
        }
    })
    
    if (response.ok) {
        const rawResponseText = await response.text();
        const result = parseBackendResponse(rawResponseText);
        if(result.error){
            throw new Error(result.error.message)
        }else{
            return result;
        }
    } else {
        const errorTextDefinition = await response.text();
        throw new Error(`Error al ejecutar upload '${procedureName}': ${response.status} - ${errorTextDefinition}`);
    }
}
