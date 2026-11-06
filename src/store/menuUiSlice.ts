// src/store/menuUiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MenuUiState } from '../types';

const initialState: MenuUiState = {
    isDrawerOpen: false,
    subMenuOpenStates: {},
};

const menuUiSlice = createSlice({
    name: 'menuUi',
    initialState,
    reducers: {
        setDrawerOpen: (state, action: PayloadAction<boolean>) => {
            state.isDrawerOpen = action.payload;
        },
        toggleDrawer: (state) => {
            state.isDrawerOpen = !state.isDrawerOpen;
        },
        setSubMenuOpen: (state, action: PayloadAction<{ menuName: string; isOpen: boolean }>) => {
            state.subMenuOpenStates[action.payload.menuName] = action.payload.isOpen;
        },
        toggleSubMenu: (state, action: PayloadAction<string>) => {
            state.subMenuOpenStates[action.payload] = !state.subMenuOpenStates[action.payload];
        },
        /** Acordeón: abre un grupo y cierra a sus hermanos (con todo lo que tienen adentro). */
        abrirGrupo: (state, action: PayloadAction<{ clave: string; hermanos: string[] }>) => {
            for (const clave of Object.keys(state.subMenuOpenStates)) {
                if (action.payload.hermanos.some(hermano => clave === hermano || clave.startsWith(hermano + '/'))) {
                    state.subMenuOpenStates[clave] = false;
                }
            }
            state.subMenuOpenStates[action.payload.clave] = true;
        },
        /** Deja abiertos solo los grupos de este camino (el del ítem que se está mostrando). */
        abrirCamino: (state, action: PayloadAction<string[]>) => {
            for (const clave of Object.keys(state.subMenuOpenStates)) {
                state.subMenuOpenStates[clave] = action.payload.includes(clave);
            }
            for (const clave of action.payload) {
                state.subMenuOpenStates[clave] = true;
            }
        },
        resetMenuUiState: (state) => {
            Object.assign(state, initialState);
        },
    },
});

export const {
    setDrawerOpen,
    toggleDrawer,
    setSubMenuOpen,
    toggleSubMenu,
    abrirGrupo,
    abrirCamino,
    resetMenuUiState,
} = menuUiSlice.actions;

export default menuUiSlice.reducer;