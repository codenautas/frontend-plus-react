import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Column } from "react-data-grid";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { useApiCall } from "../../hooks/useApiCall";
import { useTableRecordSave } from "../../hooks/useTableRecordSave";
import { mensajeDeError, requerido } from "../../utils/errores";
import InputBase from "@mui/material/InputBase";
// Importamos CellFeedbackMap junto con InputRendererProps
import { InputRendererProps, CellFeedback, FilaDeDatos } from "../../types";
// getCellKey deben provenir de tu archivo GenericDataGrid
import { NEW_ROW_INDICATOR } from "./GenericDataGrid";
import { Tooltip, useTheme } from "@mui/material";
import { useEstadoGrilla, useFeedbackCelda } from "./estadoGrilla";
import { getPrimaryKeyValues, getCellKey, isNumericType, sameValue } from "./utils/helpers";
import { caracterRechazado, textoPegadoRechazado, tiparEntrada } from "./utils/typedControls";
import { MenuDeOpciones } from "./MenuDeOpciones";
import { SelectorDeFecha } from "./SelectorDeFecha";
import { VentanaDeTexto } from "./VentanaDeTexto";
import { cargarReferencia, esCampoConReferencia, opcionesDeReferencia, OpcionDeReferencia } from "../../utils/referencias";
import { fechaDeValor, opcionesDeBooleano, opcionesDeEnumerado, tipoDeExpander } from "../../utils/expanders";
import typeStore from 'type-store';


function findChangedValues(oldRowData: FilaDeDatos, newRowData: FilaDeDatos, isNewRow: boolean) {
    let changes: string[] = [];
    for (const key in newRowData) {
        // Si la propiedad existe en ambos Y el valor es diferente, O es una nueva fila
        if (Object.prototype.hasOwnProperty.call(oldRowData, key) && oldRowData[key] !== newRowData[key] || isNewRow) {
            changes.push(key);
        }
    }
    return changes;
}

function InputRenderer<R extends FilaDeDatos, S>({
    column,
    row,
    rowIdx,
    tableDefinition,
    onRowChange,
    onClose,
    onKeyPress,
    registrarEditor,
    setTableData,
    primaryKey
}: InputRendererProps<R, S>) {
    const estadoGrilla = useEstadoGrilla();
    const setCellFeedbackMap = estadoGrilla.setFeedback;
    const setLocalCellChanges = estadoGrilla.setCambiosLocales;
    // el editor solo se abre para columnas de campos de la tabla
    const fieldDefinition = requerido(tableDefinition.fields.find(f => f.name === column.key), `el campo '${column.key}'`);
    const typer = useMemo(() => typeStore.typerFrom(fieldDefinition), [fieldDefinition]);
    const [editingValue, setEditingValue] = useState<unknown>(() => row[column.key] !== null ? isNumericType(fieldDefinition?.typeName) ? row[column.key] : typer.toLocalString(row[column.key]) : null);
    const isCommitInProgress = React.useRef(false);
    // el expander del tipo (F9): mientras está abierto el editor pierde el foco y no por eso se guarda
    const [expansion, setExpansion] = useState<{ tipo: 'opciones', opciones: OpcionDeReferencia[], busqueda: string } | { tipo: 'fecha' } | { tipo: 'texto' } | null>(null);
    const menuAbierto = React.useRef(false);
    const entradaRef = React.useRef<HTMLInputElement | null>(null);

    const theme = useTheme();
    const { showSuccess, showError } = useSnackbar();
    const { saveRecord } = useTableRecordSave();


    // Generamos la clave única para la celda manualmente usando el formato esperado
    const rowId = getPrimaryKeyValues(row, primaryKey);
    const cellKey = `${rowId}-${column.key}`;

    const currentCellFeedback = useFeedbackCelda(cellKey);
    // ------------------------

    const isMandatory = tableDefinition.primaryKey.includes(column.key) || (fieldDefinition?.nullable === false);
    const isEmpty = editingValue === null || editingValue === undefined || String(editingValue).trim() === '';

    let cellBackgroundColor;
    let cellBorderColor = '#ccc';

    if (currentCellFeedback) {
        cellBackgroundColor = currentCellFeedback.type === 'error' ? theme.palette.error.light : theme.palette.success.light;
        cellBorderColor = currentCellFeedback.type === 'error' ? theme.palette.error.main : theme.palette.success.main;
    }

    const initialRowId = useMemo(() => getPrimaryKeyValues(row, primaryKey), [row, primaryKey]);

    const handleCommit = useCallback(async (currentValue: unknown, closeEditor: boolean, focusNextCell: boolean) => {
        if (isCommitInProgress.current) return;
        isCommitInProgress.current = true;

        let processedNewValue: unknown;
        try {
            // Usamos la lógica de BestControls portada de TypedControls.js (tiparEntrada avisa si lo escrito no es un valor del tipo)
            processedNewValue = tiparEntrada(currentValue, typer);
            // Validamos contra el esquema del typer
            typer.validateTypedData(processedNewValue);
        } catch (err) {
            showError(mensajeDeError(err));
            // y la celda queda marcada con el error (antes un valor que no era del tipo no se guardaba y no se veía nada)
            const claveDeLaCelda = `${getPrimaryKeyValues(row, tableDefinition.primaryKey)}-${column.key}`;
            setCellFeedbackMap(prev => new Map(prev).set(claveDeLaCelda, { rowId: getPrimaryKeyValues(row, tableDefinition.primaryKey), columnKey: column.key, type: 'error', message: mensajeDeError(err) } satisfies CellFeedback));
            isCommitInProgress.current = false;
            return; // Detenemos el commit ante errores
        }


        const potentialUpdatedRow: FilaDeDatos = { ...row, [column.key]: processedNewValue };

        const arePKValuesFilled = tableDefinition.primaryKey.every(key =>
            potentialUpdatedRow[key] !== undefined && potentialUpdatedRow[key] !== null && String(potentialUpdatedRow[key]).trim() !== ''
        );
        const isNewRow = !arePKValuesFilled || !!potentialUpdatedRow[NEW_ROW_INDICATOR];

        const isMandatoryField = tableDefinition.primaryKey.includes(column.key) || (tableDefinition.fields.find(f => f.name === column.key)?.nullable === false);
        const isMandatoryFieldEmpty = isNewRow && isMandatoryField && (processedNewValue === null || processedNewValue === undefined || String(processedNewValue).trim() === '');

        // Usamos sameValue para una comparación robusta (Dates, nulls, etc)
        if (sameValue(processedNewValue, row[column.key]) && !isNewRow && !isMandatoryFieldEmpty) {
            console.log("No se guardó: el valor no cambió.");
            isCommitInProgress.current = false;
            return;
        }

        const oldRowData = { ...row };
        const primaryKeyValuesForBackend = tableDefinition.primaryKey.map(key => potentialUpdatedRow[key]);
        const currentRowIdBeforeUpdate = getPrimaryKeyValues(oldRowData, tableDefinition.primaryKey);

        onRowChange({ ...row, [column.key]: processedNewValue }, true);

        if (isNewRow) {
            const areAllMandatoryFieldsFilled = tableDefinition.fields.every(fieldDef => {
                const isMandatory = (fieldDef.nullable === false || fieldDef.isPk);
                const fieldValue = potentialUpdatedRow[fieldDef.name];
                return !isMandatory || (fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== '');
            });

            if (!areAllMandatoryFieldsFilled) {
                console.log("Nueva fila: Faltan campos obligatorios. No se guarda en el backend todavía.");
                setLocalCellChanges(prev => {
                    const newMap = new Map(prev);
                    const currentColumnsInRow = newMap.get(initialRowId) || new Set();

                    tableDefinition.fields.forEach(fieldDef => {
                        const isMandatory = (fieldDef.nullable === false || fieldDef.isPk);
                        const isEditable = fieldDef.editable !== false;
                        const fieldValue = potentialUpdatedRow[fieldDef.name];
                        if (isMandatory && isEditable && (fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '')) {
                            currentColumnsInRow.add(fieldDef.name);
                        } else {
                            currentColumnsInRow.delete(fieldDef.name);
                        }
                    });
                    newMap.set(initialRowId, currentColumnsInRow);
                    return newMap;
                });
                isCommitInProgress.current = false;
                return;
            } else {
                console.log("Nueva fila: Todos los campos obligatorios están llenos. Procediendo a guardar.");
                setLocalCellChanges(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(initialRowId);
                    return newMap;
                });
            }
        }

        try {
            const response = await saveRecord({
                tableDefinition,
                isNewRow,
                formData: potentialUpdatedRow,
                initialData: oldRowData,
                targetFieldName: column.key
            });


            // si el servidor no devolvió la fila se sigue con la que se mandó
            const responseRow: FilaDeDatos = response.row ?? potentialUpdatedRow;

            let finalRowIdForFeedback: string;
            let persistedRowData: FilaDeDatos;

            if (response.row && isNewRow) {
                persistedRowData = { ...responseRow };
                setTableData(prevData => {
                    const newData = [...prevData];
                    const originalRowId = getPrimaryKeyValues(oldRowData, tableDefinition.primaryKey);
                    const rowIndex = newData.findIndex(r => getPrimaryKeyValues(r, tableDefinition.primaryKey) === originalRowId);
                    if (rowIndex !== -1) {
                        newData[rowIndex] = persistedRowData;
                    } else {
                        const newPrimaryKeyId = getPrimaryKeyValues(persistedRowData, tableDefinition.primaryKey);
                        const newRowIndex = newData.findIndex(r => getPrimaryKeyValues(r, tableDefinition.primaryKey) === newPrimaryKeyId);
                        if (newRowIndex !== -1) {
                            newData[newRowIndex] = persistedRowData;
                        }
                    }
                    return newData;
                });
                finalRowIdForFeedback = getPrimaryKeyValues(persistedRowData, tableDefinition.primaryKey);
            } else {
                persistedRowData = responseRow;
                const isPrimaryKeyColumn = tableDefinition.primaryKey.includes(column.key);
                finalRowIdForFeedback = isPrimaryKeyColumn
                    ? getPrimaryKeyValues(potentialUpdatedRow, tableDefinition.primaryKey)
                    : currentRowIdBeforeUpdate;
                // La fila que devolvió el servidor (con lo que calcularon triggers y defaults) reemplaza a la que tenemos.
                // Se hace sobre los datos y no con onRowChange del editor: para cuando llega la respuesta el editor ya se cerró
                // y el foco puede estar en otra celda; onRowChange(fila, true) cerraría el editor de esa otra celda.
                const mismaFila = (fila: FilaDeDatos) => tableDefinition.primaryKey.every(k => fila[k] === potentialUpdatedRow[k]);
                setTableData(prevData => prevData.map(fila => mismaFila(fila) ? { ...fila, ...responseRow } : fila));
            }

            // --- MULTI-FEEDBACK DE ÉXITO ---
            const changes = findChangedValues(oldRowData, responseRow, isNewRow);
            setCellFeedbackMap(prevFeedback => {
                // Siempre usamos new Map(prevFeedback) para garantizar inmutabilidad
                const newFeedback = new Map(prevFeedback);

                changes.forEach((key) => {
                    // Creamos la clave única de forma más robusta (idealmente usando getCellKey)
                    const keyForMap = `${finalRowIdForFeedback}-${key}`;
                    newFeedback.set(keyForMap, { rowId: finalRowIdForFeedback, columnKey: key, type: 'success' } as CellFeedback);
                });

                return newFeedback;
            });
            // -------------------------------

        } catch (err) {
            console.error('Error al guardar el registro:', err);

            // --- MULTI-FEEDBACK DE ERROR ---
            const keyForMap = `${currentRowIdBeforeUpdate}-${column.key}`;
            setCellFeedbackMap(prevFeedback => {
                // Siempre usamos new Map(prevFeedback) para garantizar inmutabilidad
                const newFeedback = new Map(prevFeedback);
                newFeedback.set(keyForMap, {
                    rowId: currentRowIdBeforeUpdate,
                    columnKey: column.key,
                    type: 'error',
                    message: mensajeDeError(err)
                } satisfies CellFeedback);
                return newFeedback;
            });
            // -------------------------------
        } finally {
            if (!closeEditor) {
                isCommitInProgress.current = false;
            }
        }
    }, [
        column, row, onRowChange, tableDefinition.primaryKey,
        tableDefinition.fields, showSuccess, showError, setCellFeedbackMap, onClose,
        setTableData, setLocalCellChanges, initialRowId, typer
    ]);


    // los expanders de backend-plus (F9 o Alt+↓): según el tipo del campo, un menú (referencias, booleano, options), un calendario (fecha) o
    // una ventana de texto; escribir en una referencia un carácter que el tipo rechaza (una letra en un entero) abre el menú ya filtrado
    const tipoExpander = tipoDeExpander(fieldDefinition, fieldDefinition.editable !== false);
    const abrirExpander = useCallback(async (busqueda: string) => {
        if (tipoExpander === null || tipoExpander === 'json' || menuAbierto.current) return;
        menuAbierto.current = true;
        const admiteNulo = fieldDefinition.nullable !== false;
        try {
            if (tipoExpander === 'referencia' && esCampoConReferencia(fieldDefinition)) {
                const { definicion, filas } = await cargarReferencia(fieldDefinition.references);
                setExpansion({ tipo: 'opciones', opciones: opcionesDeReferencia(fieldDefinition, definicion, filas, row, admiteNulo), busqueda });
            } else if (tipoExpander === 'booleano') {
                setExpansion({ tipo: 'opciones', opciones: opcionesDeBooleano(admiteNulo), busqueda });
            } else if (tipoExpander === 'opciones') {
                setExpansion({ tipo: 'opciones', opciones: opcionesDeEnumerado(fieldDefinition.options ?? [], admiteNulo), busqueda });
            } else {
                setExpansion({ tipo: tipoExpander === 'fecha' ? 'fecha' : 'texto' });
            }
        } catch (err) {
            menuAbierto.current = false;
            showError(mensajeDeError(err));
        }
    }, [tipoExpander, fieldDefinition, row, showError]);

    const cerrarExpansion = useCallback(() => {
        menuAbierto.current = false;
        setExpansion(null);
        // el menú es un modal que retiene el foco hasta que se desmonta
        setTimeout(() => entradaRef.current?.focus(), 0);
    }, []);

    // lo que se elige se escribe en la celda y se guarda
    const confirmarEnExpansion = useCallback((nuevo: unknown) => {
        setEditingValue(nuevo);
        cerrarExpansion();
        void handleCommit(nuevo, true, false);
    }, [cerrarExpansion, handleCommit]);
    // una opción (de un menú) es un valor tipado: un número o un lógico tal cual, lo demás como el texto que se escribiría
    const elegirOpcion = useCallback((valor: unknown) => {
        confirmarEnExpansion(valor === null || valor === undefined ? null : typeof valor === 'boolean' || isNumericType(fieldDefinition.typeName) ? valor : typer.toLocalString(valor));
    }, [fieldDefinition.typeName, typer, confirmarEnExpansion]);

    const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
        if (tipoExpander !== null && (event.key === 'F9' && !event.shiftKey && !event.ctrlKey && !event.altKey || event.key === 'ArrowDown' && event.altKey && !event.shiftKey && !event.ctrlKey)) {
            event.preventDefault();
            void abrirExpander('');
            return;
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey && caracterRechazado(event.key, typer)) {
            // como backend-plus (rejectedChar): lo que el tipo no admite no se escribe (una letra en un entero); en una referencia abre el menú filtrado
            event.preventDefault();
            if (tipoExpander === 'referencia') void abrirExpander(event.key);
            return;
        }
        if (event.key === 'F4') {
            event.preventDefault();
            if (onKeyPress) {
                onKeyPress(rowIdx, column.key, event, handleCommit, editingValue);
            }
            return;
        }

        // Con cada tecla (la grilla lleva la cuenta de la anterior): ella decide si deja la celda (Enter, Tab, flechas; ver
        // direccionDeSalida) y, si la deja, guarda y pasa el foco. Una flecha que solo mueve el cursor dentro del texto no guarda.
        // Lo que resuelve la grilla no puede hacer además lo suyo: el Tab nativo mandaría el foco a otro lado.
        if (onKeyPress?.(rowIdx, column.key, event, handleCommit, editingValue)) {
            event.preventDefault();
        }
    }, [handleCommit, editingValue, column.key, rowIdx, onKeyPress, tipoExpander, abrirExpander, typer]);

    // Teclas (F4) que caen en la celda antes de que este editor tenga el foco (o antes de que exista):
    // el grid se las pasa a través de registrarEditor; siempre se usa la versión más reciente del manejador
    const procesarTecla = React.useRef<(key: string) => void>(() => {});
    procesarTecla.current = (key: string) => {
        if (key === 'F9') {
            void abrirExpander('');
        } else if (key === 'F4' && onKeyPress) {
            onKeyPress(rowIdx, column.key, { key, target: document.activeElement ?? document.body }, handleCommit, editingValue);
        }
    };
    useEffect(() => registrarEditor?.((key) => procesarTecla.current(key)), []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleBlur = useCallback(() => {
        if (menuAbierto.current) return;
        handleCommit(editingValue, true, false);
    }, [handleCommit, editingValue]);

    const isFieldEditable = fieldDefinition?.editable !== false;

    const isNumeric = isNumericType(fieldDefinition?.typeName);

    const editor = (
        <InputBase
            autoFocus
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={(e: React.ClipboardEvent) => {
                const pegado = e.clipboardData.getData('text');
                if (textoPegadoRechazado(pegado, typer)) {
                    e.preventDefault();
                    showError(`«${pegado}» no es un valor válido para este campo (${typer.typeName})`);
                }
            }}
            onBlur={handleBlur}
            inputRef={entradaRef}
            placeholder={isMandatory ? '*' : ''}
            className={editingValue === '--' ? 'typed-controls-signal-no-data' : editingValue === '//' ? 'typed-controls-signal-unknown-data' : ''}
            sx={{
                width: '100%',
                margin: '0',
                border: `1px solid ${cellBorderColor}`,
                borderRadius: '4px',
                padding: '2px 4px',
                fontSize: '0.8rem',
                boxSizing: 'border-box',
                backgroundColor: cellBackgroundColor,
                input: {
                    textAlign: isNumeric ? 'right' : 'left',
                }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={!isFieldEditable}
        />

    );
    const conMenu = (
        <>
            {editor}
            {expansion && entradaRef.current && (expansion.tipo === 'opciones' ? (
                <MenuDeOpciones
                    anclaje={entradaRef.current}
                    opciones={expansion.opciones}
                    busquedaInicial={expansion.busqueda}
                    onElegir={elegirOpcion}
                    onCerrar={cerrarExpansion}
                />
            ) : expansion.tipo === 'fecha' ? (
                <SelectorDeFecha
                    anclaje={entradaRef.current}
                    fechaActual={fechaDeValor(row[column.key])}
                    admiteNulo={fieldDefinition.nullable !== false}
                    onElegir={confirmarEnExpansion}
                    onCerrar={cerrarExpansion}
                />
            ) : (
                <VentanaDeTexto
                    anclaje={entradaRef.current}
                    texto={editingValue === null || editingValue === undefined ? '' : String(editingValue)}
                    editable
                    onAceptar={confirmarEnExpansion}
                    onCerrar={cerrarExpansion}
                />
            ))}
        </>
    );
    return currentCellFeedback?.message
        ? <Tooltip title={currentCellFeedback.message}><div style={{ width: '100%' }}>{conMenu}</div></Tooltip>
        : conMenu;
}

export default InputRenderer;