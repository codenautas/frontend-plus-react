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
            ...defaultHeaders,
            ...options?.headers,
        },
        credentials: 'include',
    };
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
        const rawResponseTextDefinition = await response.text();
        const result =  JSON.parse(rawResponseTextDefinition.replace(/^--\n/, ''));
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
