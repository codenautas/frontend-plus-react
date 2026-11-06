import { TableDefinition } from 'backend-plus';
import { useCallback, useRef } from 'react';
import { CellMouseArgs, CellKeyDownArgs, CellMouseEvent, CellKeyboardEvent, DataGridHandle, CellSelectArgs, RowsChangeData } from 'react-data-grid';
import { ColumnaDeGrilla, esColumnaPropia } from '../../components/grid/GenericDataGrid';
import { DOM_TEMP_ID, FilaDeDatos, FilaDeResumen, FixedField, TeclaDeEditor } from '../../types';
import { esFilaDetalle } from '../../components/grid/detalles';
import { SortColumn } from './useGridDataView';
import { direccionDeSalida, posicionDelCursor } from './teclasDeCelda';
import { valorFijoDe } from '../../utils/fixedFields';
import { textoParaVer, tipoDeExpander } from '../../utils/expanders';
import { campoEditableEnCelda } from '../../components/grid/clientSides';

interface UseGridEventsProps {
    dataGridRef: React.RefObject<DataGridHandle>
    tableDefinition: TableDefinition | null,
    fixedFields: FixedField[] | undefined
    /** Las filas tal como se muestran: filtradas, ordenadas y con las filas de detalle intercaladas */
    filteredRows: FilaDeDatos[],
    tableData: FilaDeDatos[],
    setSelectedCell: React.Dispatch<React.SetStateAction<CellSelectArgs<FilaDeDatos, FilaDeResumen> | undefined>>,
    setTableData: React.Dispatch<React.SetStateAction<FilaDeDatos[]>>,
    setSortColumns: React.Dispatch<React.SetStateAction<readonly SortColumn[]>>,
    /** F9 en una celda que no se edita (JSON o texto largo): la grilla muestra el contenido completo bajo la celda */
    verContenido?: (anclaje: HTMLElement, texto: string) => void
}

/** Cuánto tiempo (ms) espera una tecla encolada a que se monte el editor (si no, se descarta) */
const VIGENCIA_TECLA_PENDIENTE = 400;

/** Cuánto tiempo (ms) vale el valor que F4 acaba de copiar para la pulsación siguiente */
const VIGENCIA_VALOR_PENDIENTE_F4 = 1000;

export const useGridEvents = ({dataGridRef, tableDefinition, filteredRows, tableData, fixedFields, setSelectedCell, setTableData, setSortColumns, verContenido}: UseGridEventsProps) => {

    // handleKeyPressInEditor viaja dentro de las columnas: tiene que ser estable para no recrearlas
    // en cada cambio de datos, así que lee las filas visibles y la definición a través de refs.
    const filteredRowsRef = useRef(filteredRows);
    filteredRowsRef.current = filteredRows;
    const tableDefinitionRef = useRef(tableDefinition);
    tableDefinitionRef.current = tableDefinition;
    // F4 copia el valor de la fila de arriba: lo que se copió y todavía no llegó a las filas (fila|columna → valor)
    const valoresF4Pendientes = useRef(new Map<string, { valor: unknown, cuando: number }>());

    // F4 apretado manda más teclas por segundo que lo que tarda en abrirse el editor de la celda siguiente:
    // las que llegan en el hueco caen en la celda y no en el editor. Cada editor se registra acá; si hay uno,
    // la tecla se le pasa directo; si no hay (todavía no se montó), se guarda y la toma el próximo que se registre.
    const teclasPendientes = useRef<{ key: string, cuando: number }[]>([]);
    const editorActivo = useRef<((key: string) => void) | null>(null);
    // la última tecla que se apretó en un editor: → solo deja la celda si la anterior también fue → (como backend-plus)
    const teclaAnteriorRef = useRef<string | null>(null);
    const registrarEditor = useCallback((procesar: (key: string) => void): (() => void) => {
        editorActivo.current = procesar;
        const cola = teclasPendientes.current;
        while (cola.length > 0 && Date.now() - cola[0].cuando > VIGENCIA_TECLA_PENDIENTE) cola.shift();
        const pendiente = cola.shift();
        if (pendiente) procesar(pendiente.key);
        return () => { if (editorActivo.current === procesar) editorActivo.current = null; };
    }, []);

    const handleKeyPressInEditor = useCallback((rowIndex: number, columnKey: string, event: TeclaDeEditor, currentColumns: ColumnaDeGrilla[], handleCommit:(currentValue: unknown, closeEditor: boolean, focusNextCell: boolean) => Promise<void>, valorActual: unknown): boolean => {
        // true si la tecla la resolvió la grilla (dejó la celda o no había adónde ir): el editor cancela su efecto nativo (el Tab, por ejemplo)
        let resuelta = false;
        const tableDefinition = tableDefinitionRef.current;
        const filteredRows = filteredRowsRef.current;
        if (dataGridRef.current && tableDefinition) {
            const currentColumnIndex = currentColumns.findIndex(col => col.key === columnKey);
            const editableColumns = currentColumns.filter(col => {
                const fieldDefinition = tableDefinition.fields.find(f => f.name === col.key);
                return col.key !== 'actionsColumn' && !(esColumnaPropia(col) && col.customType === 'detail') && campoEditableEnCelda(fieldDefinition);
            });
            const {key, target} = event;
            // como backend-plus: lo que hace la flecha → depende de la tecla anterior (ver direccionDeSalida)
            const teclaAnterior = teclaAnteriorRef.current;
            teclaAnteriorRef.current = key;
            const direccion = direccionDeSalida(event, posicionDelCursor(target), teclaAnterior);

            if (currentColumnIndex !== -1 && editableColumns.length > 0) {
                const editableColumnKeys = editableColumns.map(col => col.key);
                let currentEditableColumnIndex = editableColumnKeys.indexOf(columnKey);
                
                // Se llama en el mismo tick que el commit de la celda: react-data-grid junta ambos cambios y pasa directo
                // del editor de una celda al de la siguiente. Con un setTimeout en el medio, las teclas que llegan
                // mientras el editor nuevo todavía no existe se pierden (sobre todo con F4 apretado).
                const hacerFoco = ({rowIdx, idx}:{rowIdx:number, idx: number}) =>
                    dataGridRef.current?.selectCell({ rowIdx, idx }, { enableEditor: true, shouldFocusCell: true });
                
                // Índice de la próxima fila de datos en la dirección indicada, salteando las filas de detalle (-1 si no hay)
                const filaDeDatos = (desde: number, paso: 1 | -1) => {
                    let i = desde + paso;
                    while (i >= 0 && i < filteredRows.length && esFilaDetalle(filteredRows[i])) i += paso;
                    return i >= 0 && i < filteredRows.length ? i : -1;
                };

                const calcularColumnaSiguiente = ()=>{
                    let nextEditableColumnIndex = currentEditableColumnIndex + 1;
                    let nextRowIndex = rowIndex;
                    if (nextEditableColumnIndex >= editableColumns.length) {
                        nextEditableColumnIndex = 0;
                        nextRowIndex = filaDeDatos(rowIndex, 1);
                        if (nextRowIndex === -1) {
                            nextRowIndex = filaDeDatos(-1, 1);
                        }
                    }
                    const nextColumnKey = editableColumnKeys[nextEditableColumnIndex];
                    const nextColumnIndex = currentColumns.findIndex(col => col.key === nextColumnKey);
                    return {rowIdx: nextRowIndex, idx:nextColumnIndex}
                }
                
                const indiceDeColumna = (indiceEditable: number) => currentColumns.findIndex(col => col.key === editableColumnKeys[indiceEditable]);
                // Shift+Tab: la celda editable anterior; al pasar la primera, la última de la fila de arriba (null si no hay)
                const calcularColumnaAnteriorConSalto = () => {
                    if (currentEditableColumnIndex > 0) return {rowIdx: rowIndex, idx: indiceDeColumna(currentEditableColumnIndex - 1)};
                    const filaAnterior = filaDeDatos(rowIndex, -1);
                    return filaAnterior === -1 ? null : {rowIdx: filaAnterior, idx: indiceDeColumna(editableColumnKeys.length - 1)};
                }
                // ← y →: la celda editable de al lado en la misma fila (null en los extremos: no saltan de fila)
                const calcularColumnaVecina = (paso: 1 | -1) => {
                    const vecina = currentEditableColumnIndex + paso;
                    return vecina < 0 || vecina >= editableColumnKeys.length ? null : {rowIdx: rowIndex, idx: indiceDeColumna(vecina)};
                }
                // ↑ y ↓: la misma columna en la fila de datos de arriba o de abajo (null si no hay)
                const calcularFilaVecina = (paso: 1 | -1) => {
                    const vecina = filaDeDatos(rowIndex, paso);
                    return vecina === -1 ? null : {rowIdx: vecina, idx: currentColumnIndex};
                }
                
                const calcularFilaSiguiente = ()=>{
                    const nextRowIndex = filaDeDatos(rowIndex, 1);
                    return {rowIdx: nextRowIndex === -1 ? rowIndex : nextRowIndex, idx:currentColumnIndex}
                }

                
                if (currentEditableColumnIndex !== -1) {
                    switch(true){
                        case (direccion !== null): {
                            // la tecla es de la grilla aunque no haya adónde ir (en el borde): no se deja que haga lo suyo
                            resuelta = true;
                            const destino = {
                                siguiente: calcularColumnaSiguiente,
                                anterior: calcularColumnaAnteriorConSalto,
                                izquierda: () => calcularColumnaVecina(-1),
                                derecha: () => calcularColumnaVecina(1),
                                arriba: () => calcularFilaVecina(-1),
                                abajo: () => calcularFilaVecina(1),
                            }[direccion]();
                            if (destino) {
                                // como dejar la celda de cualquier otra forma: se guarda (el cambio de la fila se aplica en el acto
                                // y el guardado sigue en segundo plano) y el foco pasa a la celda de destino
                                void handleCommit(valorActual, true, true);
                                hacerFoco(destino);
                            }
                            break;
                        }
                        case (key === 'F4'): {
                            // no hace falta limpiar el orden: useGridDataView mantiene las filas en su lugar al editar
                            const {rowIdx, idx} = calcularFilaSiguiente();
                            const indiceAnterior = filaDeDatos(rowIndex, -1);
                            const previousRow = indiceAnterior === -1 ? undefined : filteredRows[indiceAnterior]
                            if(previousRow){
                                // El valor de la fila de arriba puede ser uno que acabamos de copiar y que todavía no se
                                // redibujó (con la tecla apretada llegan más pulsaciones que renders): se usa el pendiente.
                                const pendiente = valoresF4Pendientes.current.get(`${indiceAnterior}|${columnKey}`);
                                const valorACopiar = pendiente && Date.now() - pendiente.cuando < VIGENCIA_VALOR_PENDIENTE_F4
                                    ? pendiente.valor
                                    : previousRow[columnKey];
                                valoresF4Pendientes.current.set(`${rowIndex}|${columnKey}`, { valor: valorACopiar, cuando: Date.now() });
                                // El guardado sigue en segundo plano y el foco avanza ya: esperar la respuesta del servidor
                                // antes de pasar a la fila siguiente hacía perder las pulsaciones que llegaban mientras tanto
                                // (el feedback o el error de cada celda igual se muestran cuando llega la respuesta).
                                void handleCommit(valorACopiar, true, true)
                                // este editor se va: las teclas que lleguen hasta que se registre el de la fila siguiente
                                // se guardan (si no, se procesarían otra vez sobre esta fila y no avanzarían)
                                editorActivo.current = null;
                                hacerFoco({rowIdx ,idx})
                            }
                            break;
                        }
                        default: break;
                    }
                }    
            }        
        }
        return resuelta;
    }, [dataGridRef]);

    const handleCellKeyDown = useCallback((args: CellKeyDownArgs<FilaDeDatos, FilaDeResumen>, event: CellKeyboardEvent) => {
        // F9 o Alt+↓ (los expanders de backend-plus) en una celda seleccionada: si se edita, se abre el editor y este abre el menú, el calendario
        // o la ventana de texto; si no se edita, se muestra el contenido completo (JSON o texto largo)
        const esExpander = event.key === 'F9' && !event.shiftKey && !event.ctrlKey && !event.altKey || event.key === 'ArrowDown' && event.altKey && !event.shiftKey && !event.ctrlKey;
        if (esExpander && !(event.target instanceof HTMLInputElement) && !esFilaDetalle(args.row)) {
            const campo = tableDefinitionRef.current?.fields.find(f => f.name === args.column.key);
            const editable = typeof args.column.editable === 'function' ? args.column.editable(args.row) : args.column.editable === true;
            const tipo = campo ? tipoDeExpander(campo, editable) : null;
            if (campo && editable && tipo !== null) {
                teclasPendientes.current.push({ key: 'F9', cuando: Date.now() });
                dataGridRef.current?.selectCell({ rowIdx: args.rowIdx, idx: args.column.idx }, { enableEditor: true, shouldFocusCell: true });
                event.preventGridDefault();
                return;
            }
            if (campo && !editable && (tipo === 'json' || tipo === 'texto') && verContenido && event.target instanceof HTMLElement) {
                verContenido(event.target, textoParaVer(args.row[campo.name]));
                event.preventGridDefault();
                return;
            }
        }
        if (event.key === 'F4' && !(event.target instanceof HTMLInputElement) && !esFilaDetalle(args.row)) {
            const fieldDefinition = tableDefinitionRef.current?.fields.find(f => f.name === args.column.key);
            if (fieldDefinition && fieldDefinition.editable !== false && !fieldDefinition.clientSide) {
                if (editorActivo.current) editorActivo.current(event.key);
                else teclasPendientes.current.push({ key: event.key, cuando: Date.now() });
                event.preventGridDefault();
                return;
            }
        }
        if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp','ArrowRight', 'ArrowLeft'].includes(event.key)) {
            event.preventGridDefault();
        }
    }, [dataGridRef, verContenido]);

    const handleCellMouseDown = useCallback((_args: CellMouseArgs<FilaDeDatos, FilaDeResumen>, event: CellMouseEvent) => {
        event.preventGridDefault();  
    }, []);

    const handleCellDoubleClick = useCallback((_args: CellMouseArgs<FilaDeDatos, FilaDeResumen>, event: CellMouseEvent) => {
        event.preventGridDefault();  
    }, []);

    const handleSelectedCellChange = useCallback((args: CellSelectArgs<FilaDeDatos, FilaDeResumen> | undefined) => {
        setSelectedCell(args);
    }, [setSelectedCell]);

    const handleCellClick = useCallback((args: CellMouseArgs<FilaDeDatos, FilaDeResumen>, _event: CellMouseEvent) => {
        // la fila de detalle contiene otra grilla: los clicks son de esa grilla
        if (esFilaDetalle(args.row)) return;
        const fieldDefinition = tableDefinition?.fields.find(f => f.name === args.column.key);
        const isFixedField = valorFijoDe(fixedFields, args.column.key) !== undefined;
        const isEditable = campoEditableEnCelda(fieldDefinition) && !isFixedField;
        if(isEditable){
            // antes se limpiaba el orden al clickear; ya no hace falta porque al editar
            // las filas no se reordenan hasta que el usuario cambie el orden o los filtros
            args.selectCell(true);
        } else if (fieldDefinition && tipoDeExpander(fieldDefinition, false) !== null) {
            // una celda que no se edita también se selecciona (sin editor): F9 muestra su contenido completo, como en backend-plus
            args.selectCell(false);
        }
    }, [tableDefinition, fixedFields]);

    const handleRowsChange = useCallback((updatedRows: FilaDeDatos[], data: RowsChangeData<FilaDeDatos, FilaDeResumen>) => {
        // updatedRows son las filas visibles (filtradas y ordenadas), no todo tableData:
        // se reemplazan en tableData solo las filas editadas, buscándolas por identidad.
        const reemplazos = new Map<FilaDeDatos, FilaDeDatos>();
        data.indexes.forEach(index => {
            const oldRow = filteredRows[index];
            const newRow = updatedRows[index];
            if (!oldRow || !newRow || esFilaDetalle(oldRow)) return;
            // Preservar la identidad (DOM_TEMP_ID) de las filas editadas
            if (oldRow[DOM_TEMP_ID] && !newRow[DOM_TEMP_ID]) {
                newRow[DOM_TEMP_ID] = oldRow[DOM_TEMP_ID];
            }
            reemplazos.set(oldRow, newRow);
        });
        if (reemplazos.size === 0) return;
        setTableData(prevData => prevData.map(row => reemplazos.get(row) ?? row));
    }, [setTableData, filteredRows]);

    return {
        handleCellMouseDown,
        handleCellDoubleClick,
        handleCellClick,
        handleCellKeyDown,
        handleKeyPressInEditor,
        registrarEditor,
        handleSelectedCellChange,
        handleRowsChange
    };
};