import { AppConfigClientSetup, DetailTable, MenuInfoBase, ProcedureDef, TableDefinition } from "backend-plus";
import { Details } from "express-useragent";
import { ReactNode } from "react";
import { Column, RenderCellProps, RenderHeaderCellProps } from "react-data-grid";

export type {FieldDefinition, TableDefinition} from "backend-plus"; 

export interface GenericDataGridProps {
    // tableName: string; // Comentado según tu código original
}
export interface FixedField {
    fieldName: string;
    value: any;
    until?: any;
}

export interface CellFeedback {
    rowId: string;
    columnKey: string;
    type: 'success' | 'error';
    message?: 'string'
}

export interface ConfirmDialogProps {
    open: boolean;
    onClose: (confirm: boolean) => void;
    title: string;
    message: string;
}

export interface InputRendererProps<R extends Record<string, any>, S> {
    column: Column<R, S>,
    row: R,
    rowIdx: number;
    onRowChange: (row: R, commitChanges?: boolean) => void;
    onClose: (commitChanges?: boolean, shouldFocusCell?: boolean) => void;
    tableDefinition: TableDefinition,
    cellFeedback:CellFeedback|null,
    setCellFeedback: (feedback: CellFeedback | null) => void;
    onEnterPress?: (rowIndex: number, columnKey: string, key: string) => void;
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    setLocalCellChanges: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>;
    localCellChanges: Map<string, Set<string>>; // Añadido como prop
    primaryKey: string[];
}

export interface FilterRendererProps<R extends Record<string, any>, S> {
    column: Column<R, S>;
    filters: Record<string, string>;
    setFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export interface GenericDataGridForDetailProps {
    parentRow: any; // El tipo de la fila padre
    detailTableDefinition: DetailTable;
    parentTableName: string; // Añadido: Propiedad parentTableName
}

export interface SideMenuProps {
    onMenuItemClick?: () => void;
}

export interface MenuListItemProps {
    item: MenuInfoBase;
    level: number;
    onMenuItemClick?: () => void;
}

export interface CustomCellProps<R extends Record<string, any>, SR> extends RenderCellProps<R, SR> {
    column: RenderCellProps<R, SR>['column'] & { isPK?: boolean };
    // No necesitamos redefinir 'row: R' aquí porque RenderCellProps ya lo tiene,
    // y la restricción en el genérico <R extends Record<string, any>> ya debería ser suficiente.
    // Si la redefinición causa problemas, es mejor confiar en la restricción.
}

export interface CustomHeaderCellProps<R, SR> extends RenderHeaderCellProps<R, SR> {
    column: RenderHeaderCellProps<R, SR>['column'] & { isPK?: boolean };
}

export interface AppContextType {
    isLoggedIn: boolean;
    setIsLoggedIn: (loggedIn: boolean) => void;
    checkSession: () => Promise<void>;
    showSessionExpiredMessage: boolean;
    setShowSessionExpiredMessage: (show: boolean) => void;
}

export interface AppProviderProps {
    children: ReactNode;
}

export interface PrivateRouteProps {
    children: ReactNode;
}

export interface SnackbarState {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    duration?: number | null; // Añadimos 'duration' opcional (en ms)
}

// Definir el tipo del contexto
export interface SnackbarContextType {
    // showSnackbar ahora acepta una duración opcional
    showSnackbar: (message: string, severity: 'success' | 'error' | 'info' | 'warning', duration?: number | null) => void;
    showSuccess: (message: string, duration?: number | null) => void;
    showError: (message: string, duration?: number | null) => void;
    showWarning: (message: string, duration?: number | null) => void;
    showInfo: (message: string, duration?: number | null) => void;
}

export interface SnackbarProviderProps {
    children: ReactNode;
}

export interface UseApiCallResult<T> {
    callApi: (procedureName: string, params: Record<string, any>, opts?:{reportOnSnackbar:boolean}) => Promise<T | undefined>;
    loading: boolean;
    error: Error | null;
}

export interface ClientContextState {
    menu: MenuInfoBase[];
    procedure: { [key: string]: ProcedureDef };
    procedures: ProcedureDef[];
    config: AppConfigClientSetup;
    useragent: Details;
    username: string;
    status: 'idle' | 'loading' | 'succeeded' | 'failed'; // Estado de la petición
    error: string | null; // Mensaje de error
}

export interface MenuUiState {
    isDrawerOpen: boolean;
    subMenuOpenStates: { [key: string]: boolean }; // Para persistir el estado de los submenús por su 'name'
}

export interface RouterState {
    currentPath: string;
    previousPath: string | null;
    redirectPath: string | null; // <--- ¡Nueva propiedad!
}

export interface FetchApiOptions extends RequestInit {
    // Puedes extender RequestInit para añadir opciones específicas si es necesario
    // Por ejemplo, si siempre envías JSON, podrías tener:
    // body?: Record<string, any>; // Para que el cuerpo sea un objeto que se stringify
  }