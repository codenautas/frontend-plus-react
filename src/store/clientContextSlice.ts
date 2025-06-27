// src/store/clientContextSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MenuInfoBase, ProcedureDef, AppConfigClientSetup } from "backend-plus";
import { Details } from 'express-useragent'; // Asumiendo que 'Details' viene de aquí
import { fetchApi } from '../utils/fetchApi'; // Tu utilidad fetchApi
import { ClientContextState } from '../types';

// Estado inicial para el slice de clientContext
const initialState: ClientContextState = {
    menu: [],
    procedure: {},
    procedures: [],
    config: {} as AppConfigClientSetup, // Inicializa con un objeto vacío o valores por defecto adecuados
    useragent: {} as Details,           // Igual aquí
    username: '',
    status: 'idle', // Por defecto, sin carga
    error: null,    // Sin error
};

// **Thunk asíncrono para cargar los datos del clientContext**
// Esto reemplaza tu función 'loadClientContextData'
export const fetchClientContext = createAsyncThunk(
    'clientContext/fetchClientContext',
    async (_, { rejectWithValue }) => {
        try {
            const setupResponse = await fetchApi('/client-setup', { method: 'GET' });
            if (!setupResponse.ok) {
                const errorData = await setupResponse.text();
                throw new Error(errorData || 'Error al obtener configuración del cliente');
            }
            const clientSetup = await setupResponse.json();

            // Retorna los datos cargados. El 'status' y 'error' se manejan automáticamente
            // en los 'extraReducers'.
            return clientSetup as Omit<ClientContextState, 'status' | 'error'>;
        } catch (error: any) {
            // Usa rejectWithValue para pasar el mensaje de error al estado 'failed'
            return rejectWithValue(error.message || 'Error desconocido al cargar el contexto');
        }
    }
);

// Creación del slice de Redux para clientContext
const clientContextSlice = createSlice({
    name: 'clientContext',
    initialState,
    reducers: {
        // Un reducer para limpiar el contexto del cliente (ej. al cerrar sesión)
        clearClientContext: (state) => {
            // Restablece el estado a su valor inicial
            Object.assign(state, initialState);
        },
        // Puedes añadir otros reducers aquí si necesitas modificar partes del clientContext directamente
        // pero el thunk es la forma preferida para la carga inicial.
    },
    // **extraReducers maneja las acciones del thunk asíncrono**
    extraReducers: (builder) => {
        builder
            // Cuando la petición está pendiente (cargando)
            .addCase(fetchClientContext.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            // Cuando la petición se completa con éxito
            .addCase(fetchClientContext.fulfilled, (state, action: PayloadAction<Omit<ClientContextState, 'status' | 'error'>>) => {
                state.status = 'succeeded';
                // Asigna los datos recibidos al estado
                state.menu = action.payload.menu;
                state.procedure = action.payload.procedure;
                state.procedures = action.payload.procedures;
                state.config = action.payload.config;
                state.useragent = action.payload.useragent;
                state.username = action.payload.username;
                state.error = null;
            })
            // Cuando la petición falla
            .addCase(fetchClientContext.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string || 'Fallo al cargar el contexto del cliente';
                // Puedes optar por limpiar el resto del estado o mantener el último valor si el error no es crítico
                // Object.assign(state, initialState); // Si quieres limpiar todo en caso de error
            });
    },
});

export const { clearClientContext } = clientContextSlice.actions; // Exporta la acción generada
export default clientContextSlice.reducer; // Exporta el reducer