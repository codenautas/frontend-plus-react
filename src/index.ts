export { default as GenericDataGrid } from './components/grid/GenericDataGrid';
export { clientSides, extendClientSides } from './components/grid/clientSides';
export { ConfirmDialog } from './components/ConfirmDialog';

// Componente de rutas genérico
export { FrontendPlusReactRoutes, default as App } from './App';
export { default as MainLayout } from './components/MainLayout';

// Contextos
export { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
export { AppProvider, useApp } from './contexts/AppContext';

// Hooks
export { useApiCall } from './hooks/useApiCall';
export { default as useLogout } from './hooks/useLogout';

// Tipos
export * from './types'; // Exporta todas las interfaces y tipos

// Utilidades
export { cambiarGuionesBajosPorEspacios } from './utils/functions';

//pages
export { wScreens } from './pages/WScreens';
export { resultsOk as resultComponents } from './pages/procedure-results/resultsOk';