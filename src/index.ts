export { default as GenericDataGrid } from './components/grid/GenericDataGrid';
export { clientSides, extendClientSides } from './components/grid/clientSides';
export { extendConditions } from './components/grid/condiciones';
export { ConfirmDialog } from './components/ConfirmDialog';

// Componente de rutas genérico
export { FrontendPlusReactRoutes, FrontendPlusProviders, default as App } from './App';
export type { WScreenMap, ResultsOksMap, ClientSidesMap, AppProps, CondicionDeDetalle, CondicionesMap, FilaDeDatos } from './types';

export { default as MainLayout } from './components/MainLayout';

// Contextos
export { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
export { AppProvider, useApp } from './contexts/AppContext';

// Hooks
export { useApiCall, useApiCallWithoutSnackbar } from './hooks/useApiCall';
export { default as useLogout } from './hooks/useLogout';

// Tipos
export * from './types'; // Exporta todas las interfaces y tipos

// Utilidades
export { cambiarGuionesBajosPorEspacios } from './utils/functions';

//pages
export { wScreens, extendWScreens } from './pages/WScreens';
export { resultsOk as resultComponents, extendResultsOk } from './pages/procedure-results/resultsOk';

// Puente con el cliente de backend-plus (grilla y wScreens que todavía no están en React)
export { GrillaBP } from './puente/GrillaBP';
export { habilitarPuenteBP } from './puente/habilitacion';

export type { WScreenProps } from './types/index';
export type { ResultOkProps } from './types/index';
export type { ClientSideProps } from './types/index';
