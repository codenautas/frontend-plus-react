import { useState, useCallback } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import { executeBackendProcedure as baseExecuteBackendProcedure, executeBackendUpload as baseExecuteBackendUpload } from '../utils/fetchApi';
import { UseApiCallResult } from '../types';

export const useApiCall = <T = any>(): UseApiCallResult<T> => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const callApi = useCallback(async (
        procedureName: string,
        params: Record<string, any>,
    ): Promise<T | undefined> => {
        setLoading(true);
        setError(null);
        try {
            const result = await baseExecuteBackendProcedure<T>(procedureName, params);
            return result === null ? undefined : result;
        } catch (err: any) {
            setError(err);
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

    const callApiUpload = useCallback(async (
        procedureName: string,
        file: File,
        params: Record<string, any>,
    ): Promise<T | undefined> => {
        setLoading(true);
        setError(null);
        try {
            const result = await baseExecuteBackendUpload<T>(procedureName, file, params);
            return result === null ? undefined : result;
        } catch (err: any) {
            setError(err);
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

export const useApiCallWithoutSnackbar = <T = any>(): UseApiCallResult<T> => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const callApi = useCallback(async (
        procedureName: string,
        params: Record<string, any>
    ): Promise<T | undefined> => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await baseExecuteBackendProcedure<T>(procedureName, params);
            return result === null ? undefined : result;
        } catch (err: any) {
            // Manejamos el error internamente (opcionalmente logueando) pero NO usamos el Snackbar.
            setError(err); 
            console.error(`Error en la llamada API (WithoutSnackbar) para ${procedureName}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const callApiUpload = useCallback(async (
        procedureName: string,
        file: File,
        params: Record<string, any>
    ): Promise<T | undefined> => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await baseExecuteBackendUpload<T>(procedureName, file, params);
            return result === null ? undefined : result;
        } catch (err: any) {
            setError(err); 
            console.error(`Error en la subida API (WithoutSnackbar) para ${procedureName}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { callApi, callApiUpload, loading, error };
};