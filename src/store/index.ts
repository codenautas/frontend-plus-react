// src/store/index.ts
// ... tus imports existentes (incluyendo routerReducer) ...
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import clientContextReducer from './clientContextSlice';
import routerReducer from './routerSlice';
import menuUiReducer from './menuUiSlice';

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { ClientContextState, MenuUiState } from '../types';

const rootReducer = combineReducers({
    clientContext: clientContextReducer,
    router: routerReducer,
    menuUi: menuUiReducer,
    // ...otros slices
});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['clientContext', 'router', 'menuUi'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Hooks selectores personalizados existentes
export const useClientContext = (): ClientContextState => {
    return useAppSelector(state => state.clientContext);
};

export const useClientContextStatus = (): ClientContextState['status'] => {
    return useAppSelector(state => state.clientContext.status);
};

export const useClientContextError = (): ClientContextState['error'] => {
    return useAppSelector(state => state.clientContext.error);
};

export const useCurrentPath = (): string => {
    return useAppSelector(state => state.router.currentPath);
};

export const usePreviousPath = (): string | null => {
    return useAppSelector(state => state.router.previousPath);
};

// Selectores para menuUi
export const useMenuUi = (): MenuUiState => {
    return useAppSelector(state => state.menuUi);
};

export const useIsDrawerOpen = (): boolean => {
    return useAppSelector(state => state.menuUi.isDrawerOpen);
};

export const useSubMenuOpenState = (menuName: string): boolean => {
    return useAppSelector(state => state.menuUi.subMenuOpenStates[menuName] || false);
};

export const useRedirectPath = (): string | null => {
    return useAppSelector(state => state.router.redirectPath);
};