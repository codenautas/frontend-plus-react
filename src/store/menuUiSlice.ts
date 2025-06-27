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
        // --- NUEVO REDUCER: Establecer el estado de todos los submenús ---
        setAllSubMenusOpen: (state, action: PayloadAction<boolean>) => {
            // Itera sobre todas las claves existentes y las establece al valor dado
            for (const menuName in state.subMenuOpenStates) {
                if (Object.prototype.hasOwnProperty.call(state.subMenuOpenStates, menuName)) {
                    state.subMenuOpenStates[menuName] = action.payload;
                }
            }
            // Importante: Si hay nuevos submenús que no están en subMenuOpenStates,
            // no se verán afectados por este bucle.
            // Una estrategia más robusta para casos donde el menú puede cambiar dinámicamente
            // sería obtener todos los nombres de menú recursivamente desde clientContext.menu
            // y actualizar sus estados. Por ahora, asumimos que los que ya están en el estado
            // son los que queremos controlar.
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
    setAllSubMenusOpen, // ¡Exportamos la nueva acción!
    resetMenuUiState,
} = menuUiSlice.actions;

export default menuUiSlice.reducer;