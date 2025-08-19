import { useState, useCallback } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import { executeBackendProcedure as baseExecuteBackendProcedure } from '../utils/fetchApi';
import { UseApiCallResult } from '../types';

export const useApiCall = <T = any>(): UseApiCallResult<T> => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const callApi = useCallback(async (
        procedureName: string,
        params: Record<string, any>,
        opts?:{
            reportOnSnackbar:boolean
        }
    ): Promise<T | undefined> => {
        setLoading(true);
        setError(null);
        const defaultOpts = {...{
            reportOnSnackbar: true
        }, ...opts}
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
            if(defaultOpts.reportOnSnackbar){
                showSnackbar(snackbarMessage, 'error');
            }
            throw err
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    return { callApi, loading, error };
};