// src/store/routerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RouterState } from '../types';

const initialState: RouterState = {
    currentPath: '/',
    previousPath: null,
    redirectPath: null, // <--- Inicializamos en null
    redirectUsername: null,
};

const routerSlice = createSlice({
    name: 'router',
    initialState,
    reducers: {
        setCurrentPath: (state, action: PayloadAction<string>) => {
            state.previousPath = state.currentPath;
            state.currentPath = action.payload;
        },
        setRedirectPath: (state, action: PayloadAction<string | null>) => { // <--- Nuevo reducer
            state.redirectPath = action.payload;
            if (action.payload === null) state.redirectUsername = null;
        },
        setRedirectUsername: (state, action: PayloadAction<string | null>) => {
            state.redirectUsername = action.payload;
        },
        resetRouterState: (state) => {
            state.currentPath = '/';
            state.previousPath = null;
            state.redirectPath = null; // <--- Asegúrate de resetearlo también
            state.redirectUsername = null;
        },
    },
});

export const { setCurrentPath, setRedirectPath, setRedirectUsername, resetRouterState } = routerSlice.actions; // <--- Exporta el nuevo action
export default routerSlice.reducer;