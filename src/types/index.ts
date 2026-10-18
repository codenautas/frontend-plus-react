import { AppConfigClientSetup, DetailTable, MenuInfoBase, ProcedureDef, TableDefinition, FieldDefinition } from "backend-plus";
import { Details } from "express-useragent";
import { ReactNode, FC, KeyboardEvent, Dispatch, SetStateAction } from "react";
import { Column, RenderCellProps, RenderHeaderCellProps } from "react-data-grid";

export type { FieldDefinition, TableDefinition };

/**
 * Marca con la que una fila nueva conserva su identidad en la grilla mientras se edita (antes de tener su clave primaria).
 * Es un Symbol: no aparece en Object.keys ni en JSON.stringify, pero el spread de la fila (...fila) la conserva.
 */
export const DOM_TEMP_ID: unique symbol = Symbol('domTempId');

/** Una fila de datos de una tabla: los valores salen del servidor ya decodificados (JSON4all) */
export type FilaDeDatos = Record<string, unknown> & { [DOM_TEMP_ID]?: string };

export interface WScreenProps {
    screenName: string;
    /**
     * Parámetros de la pantalla como objeto plano (en backend-plus, el primer argumento de `mainAction`).
     * Como detalle de una grilla son los fixedFields del detalle; en una ruta, la query string.
     */
    params?: Record<string, unknown>;
}

/** Decide, para una fila, si se muestra el botón de un detalle (`condition` del DetailTable) */
export type CondicionDeDetalle = (fila: FilaDeDatos) => boolean;
export type CondicionesMap = Record<string, CondicionDeDetalle>;

export interface ClientSideProps extends RenderCellProps<FilaDeDatos, FilaDeResumen> {
    fieldDefinition: FieldDefinition;
    tableDefinition: TableDefinition;
    primaryKey: string[];
}

export interface ResultOkProps {
    /** Lo que devolvió el procedimiento (la forma depende de cada procedimiento) */
    data: unknown;
}

export type WScreenMap = Record<string, FC<WScreenProps>>;
export type ClientSidesMap = Record<string, FC<ClientSideProps>>;
export type ResultsOksMap = Record<string, FC<ResultOkProps>>;

export interface AppProps {
    myRoutes?: ReactNode;
    myUnloggedRoutes?: ReactNode;
    unloggedLayout?: React.ComponentType;
    myWScreens?: WScreenMap;
    myClientSides?: ClientSidesMap;
    myResultsOk?: ResultsOksMap;
    /** Condiciones de los detalles, por nombre (la `condition` de un DetailTable) */
    myConditions?: CondicionesMap;
}

export {extractPathsFromRoutes} from "../utils/routeUtils";

// --- MODIFICACIONES DE FEEDBACK ---


export interface CellFeedback {
    rowId: string;
    columnKey: string;
    type: 'success' | 'error';
    message?: string; // Corregido el tipo de 'message' a 'string'
}

// Tipo para el mapa de feedback, usando una clave string (rowId-columnKey)
export type CellFeedbackMap = Map<string, CellFeedback>; 
// Nota: También podrías usar Record<string, CellFeedback> si prefieres objetos.

/** Lo que el manejo de teclas del editor necesita saber de la tecla (sirve para un evento real o uno encolado) */
export type TeclaDeEditor = Pick<React.KeyboardEvent, 'key' | 'target'>;

export interface InputRendererProps<R extends FilaDeDatos, S> {
    column: Column<R, S>,
    row: R,
    rowIdx: number;
    onRowChange: (row: R, commitChanges?: boolean) => void;
    onClose: (commitChanges?: boolean, shouldFocusCell?: boolean) => void;
    tableDefinition: TableDefinition,
    // el feedback y los cambios locales se leen y escriben en el EstadoGrilla (ver estadoGrilla.ts)
    onKeyPress?: (rowIndex: number, columnKey: string, event: TeclaDeEditor, handleCommit:(currentValue: unknown, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => void;
    /** El editor se registra para recibir las teclas (F4) que caen en la celda antes de que él tenga el foco; devuelve la baja */
    registrarEditor?: (procesar: (key: string) => void) => () => void;
    setTableData: React.Dispatch<React.SetStateAction<FilaDeDatos[]>>;
    primaryKey: string[];
}

// ------------------------------------

export interface Ancestor {
    tableName: string;
    row: FilaDeDatos;
    tableDefinition: TableDefinition;
    fixedFields?: FixedField[];
}

export interface GenericDataGridProps {
    tableName: string;
    fixedFields?: FixedField[];
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => void;
    gridStyles?: React.CSSProperties;
    ancestors?: Ancestor[];
}

export interface FixedField {
    fieldName: string;
    value: unknown;
    until?: unknown;
}

export interface ConfirmDialogProps {
    open: boolean;
    onClose: (confirm: boolean) => void;
    title: string;
    message: string;
}

/** El filtro de una columna: un texto (busca que contenga) o un operador con su valor */
export type FiltroDeColumna = string | { operator?: string; value?: string };
export type FiltrosDeGrilla = Record<string, FiltroDeColumna>;

/** Una entrada de la fila de totales: qué se calculó (suma, promedio...) y su valor */
export type EntradaDeTotal = { type: string; value: number };

/** Fila de resumen con los filtros de cada columna (arriba de la grilla, cuando se muestran los filtros) */
export type FilaDeFiltros = {
    id: 'filterRow';
    filters: FiltrosDeGrilla;
    setFilters: React.Dispatch<React.SetStateAction<FiltrosDeGrilla>>;
};

/** Fila de resumen con los totales de las columnas que los tienen (pie de la grilla) */
export type FilaDeTotales = {
    id: 'bottomSummaryRow';
    totales: Record<string, EntradaDeTotal>;
};

/** Las filas de resumen de react-data-grid: filtros o totales */
export type FilaDeResumen = FilaDeFiltros | FilaDeTotales;

export interface FilterRendererProps<R extends FilaDeDatos, S> {
    column: Column<R, S>;
    filters: FiltrosDeGrilla;
    setFilters: React.Dispatch<React.SetStateAction<FiltrosDeGrilla>>;
}

export interface GenericDataGridForDetailProps {
    parentRow: FilaDeDatos; // La fila padre
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

export interface CustomCellProps<R extends FilaDeDatos, SR> extends RenderCellProps<R, SR> {
    column: RenderCellProps<R, SR>['column'] & { isPK?: boolean };
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
    handleExpiredSessionRedirect: () => void;
}

export interface AppProviderProps {
    children: ReactNode;
    publicPaths?: string[];
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

export interface CallApiOptions {
    isCritical?: boolean;
}

/** Los parámetros de un procedimiento por nombre; se codifican según la definición que manda el servidor */
export type ParametrosDeProcedimiento = Record<string, unknown>;

export interface UseApiCallResult {
    /** R es la forma del resultado de ese procedimiento (el servidor puede no devolver nada: undefined) */
    callApi: <R = unknown>(procedureName: string, params: ParametrosDeProcedimiento, opts?: CallApiOptions) => Promise<R | undefined>;
    callApiUpload: <R = unknown>(procedureName: string, file: File, params: ParametrosDeProcedimiento, opts?: CallApiOptions) => Promise<R | undefined>;
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
    /** No poner Content-Type: lo arma el navegador (por ejemplo con un FormData, que lleva su boundary) */
    sinContentType?: boolean;
}

export interface DataGridOption {
    id: string;
    label: string;
    icon: React.ReactNode;
    handler: () => Promise<void>;
    visible?: boolean;
}