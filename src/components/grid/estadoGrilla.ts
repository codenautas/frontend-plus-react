// src/components/grid/estadoGrilla.ts
import { createContext, useContext, useSyncExternalStore } from 'react';
import { CellFeedback } from '../../types';

export type MapaFeedback = Map<string, CellFeedback>;
export type MapaCambiosLocales = Map<string, Set<string>>;

type Actualizacion<T> = T | ((anterior: T) => T);

/**
 * Estado de una grilla que cambia celda por celda (feedback de guardado y campos pendientes).
 * Vive fuera de React para que un cambio en una celda no obligue a recrear las columnas
 * ni a redibujar toda la grilla: cada celda se suscribe solo a lo suyo.
 */
export interface EstadoGrilla {
    obtenerFeedback(): MapaFeedback;
    obtenerCambiosLocales(): MapaCambiosLocales;
    setFeedback(actualizacion: Actualizacion<MapaFeedback>): void;
    setCambiosLocales(actualizacion: Actualizacion<MapaCambiosLocales>): void;
    suscribir(alCambiar: () => void): () => void;
}

export function crearEstadoGrilla(): EstadoGrilla {
    let feedback: MapaFeedback = new Map();
    let cambiosLocales: MapaCambiosLocales = new Map();
    const suscriptores = new Set<() => void>();
    const avisar = () => suscriptores.forEach(alCambiar => alCambiar());
    return {
        obtenerFeedback: () => feedback,
        obtenerCambiosLocales: () => cambiosLocales,
        setFeedback(actualizacion) {
            const nuevo = typeof actualizacion === 'function' ? actualizacion(feedback) : actualizacion;
            if (nuevo !== feedback) {
                feedback = nuevo;
                avisar();
            }
        },
        setCambiosLocales(actualizacion) {
            const nuevo = typeof actualizacion === 'function' ? actualizacion(cambiosLocales) : actualizacion;
            if (nuevo !== cambiosLocales) {
                cambiosLocales = nuevo;
                avisar();
            }
        },
        suscribir(alCambiar) {
            suscriptores.add(alCambiar);
            return () => { suscriptores.delete(alCambiar); };
        },
    };
}

export const EstadoGrillaContext = createContext<EstadoGrilla | null>(null);

export function useEstadoGrilla(): EstadoGrilla {
    const estado = useContext(EstadoGrillaContext);
    if (!estado) {
        throw new Error('useEstadoGrilla debe usarse dentro de EstadoGrillaContext.Provider');
    }
    return estado;
}

/** Feedback de una celda; solo redibuja cuando cambia el de esa celda */
export function useFeedbackCelda(cellKey: string): CellFeedback | undefined {
    const estado = useEstadoGrilla();
    return useSyncExternalStore(estado.suscribir, () => estado.obtenerFeedback().get(cellKey));
}

/** Si la celda está marcada como pendiente de completar (fila nueva sin grabar) */
export function useCeldaPendiente(rowId: string, columnKey: string): boolean {
    const estado = useEstadoGrilla();
    return useSyncExternalStore(estado.suscribir, () => estado.obtenerCambiosLocales().get(rowId)?.has(columnKey) ?? false);
}

/** Estado de la vista que necesitan algunos encabezados (sin pasar por las columnas) */
export interface VistaGrilla {
    isFilterRowVisible: boolean;
}

export const VistaGrillaContext = createContext<VistaGrilla>({ isFilterRowVisible: false });

export const useVistaGrilla = () => useContext(VistaGrillaContext);

export type { Actualizacion };
