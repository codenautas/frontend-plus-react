import { useState, useCallback } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import { executeBackendProcedure as baseExecuteBackendProcedure, executeBackendUpload as baseExecuteBackendUpload } from '../utils/fetchApi';
import { UseApiCallResult, CallApiOptions, ParametrosDeProcedimiento } from '../types';
import { mensajeDeError } from '../utils/errores';

/** Lo que se atrapó en un catch, como Error (puede venir cualquier cosa) */
const comoError = (err: unknown): Error => err instanceof Error ? err : new Error(mensajeDeError(err));

export const useApiCall = (): UseApiCallResult => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const callApi = useCallback(async <R = unknown>(
        procedureName: string,
        params: ParametrosDeProcedimiento,
        opts: CallApiOptions = { isCritical: true }
    ): Promise<R | undefined> => {
        setLoading(true);
        if (opts.isCritical) setError(null);
        try {
            const result = await baseExecuteBackendProcedure<R>(procedureName, params);
            return result === null ? undefined : result;
        } catch (err) {
            if (opts.isCritical) setError(comoError(err));
            let snackbarMessage = `Error inesperado al ejecutar '${procedureName}'.`;
            if (err instanceof TypeError) {
                snackbarMessage = `Problema de conexión: ${err.message}. Por favor, revisa tu internet o intenta de nuevo.`;
            } else if (err instanceof Error) {
                snackbarMessage = err.message;
            }
            showSnackbar(snackbarMessage, 'error');
            throw err
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    const callApiUpload = useCallback(async <R = unknown>(
        procedureName: string,
        file: File,
        params: ParametrosDeProcedimiento,
        opts: CallApiOptions = { isCritical: true }
    ): Promise<R | undefined> => {
        setLoading(true);
        if (opts.isCritical) setError(null);
        try {
            const result = await baseExecuteBackendUpload<R>(procedureName, file, params);
            return result === null ? undefined : result;
        } catch (err) {
            if (opts.isCritical) setError(comoError(err));
            let snackbarMessage = `Error inesperado al subir archivo en '${procedureName}'.`;
            if (err instanceof TypeError) {
                snackbarMessage = `Problema de conexión: ${err.message}. Por favor, revisa tu internet o intenta de nuevo.`;
            } else if (err instanceof Error) {
                snackbarMessage = err.message;
            }
            showSnackbar(snackbarMessage, 'error');
            throw err
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    return { callApi, callApiUpload, loading, error };
};

export const useApiCallWithoutSnackbar = (): UseApiCallResult => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const callApi = useCallback(async <R = unknown>(
        procedureName: string,
        params: ParametrosDeProcedimiento,
        _opts: CallApiOptions = { isCritical: true }
    ): Promise<R | undefined> => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await baseExecuteBackendProcedure<R>(procedureName, params);
            return result === null ? undefined : result;
        } catch (err) {
            // Manejamos el error internamente (opcionalmente logueando) pero NO usamos el Snackbar.
            setError(comoError(err)); 
            console.error(`Error en la llamada API (WithoutSnackbar) para ${procedureName}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const callApiUpload = useCallback(async <R = unknown>(
        procedureName: string,
        file: File,
        params: ParametrosDeProcedimiento,
        _opts: CallApiOptions = { isCritical: true }
    ): Promise<R | undefined> => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await baseExecuteBackendUpload<R>(procedureName, file, params);
            return result === null ? undefined : result;
        } catch (err) {
            setError(comoError(err)); 
            console.error(`Error en la subida API (WithoutSnackbar) para ${procedureName}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { callApi, callApiUpload, loading, error };
};