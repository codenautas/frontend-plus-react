// src/store/routerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RouterState } from '../types';

const initialState: RouterState = {
    currentPath: '/',
    previousPath: null,
    redirectPath: null, // <--- Inicializamos en null
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
        },
        resetRouterState: (state) => {
            state.currentPath = '/';
            state.previousPath = null;
            state.redirectPath = null; // <--- Asegúrate de resetearlo también
        },
    },
});

export const { setCurrentPath, setRedirectPath, resetRouterState } = routerSlice.actions; // <--- Exporta el nuevo action
export default routerSlice.reducer;