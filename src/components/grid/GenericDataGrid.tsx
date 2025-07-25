import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataGrid, Column, DataGridHandle, SelectCellOptions, CellMouseArgs, RenderCellProps, RenderHeaderCellProps, RenderSummaryCellProps} from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

import { useApiCall } from '../../hooks/useApiCall';
import {
    CircularProgress, Typography, Box, Alert, useTheme, Button
} from '@mui/material';
import { cambiarGuionesBajosPorEspacios } from '../../utils/functions';

import AddIcon from '@mui/icons-material/Add';

import { useSnackbar } from '../../contexts/SnackbarContext';

import {
    CellFeedback,
    FieldDefinition,
    FixedField,
    TableDefinition
} from '../../types';

import { ConfirmDialog } from '../ConfirmDialog';

import FilterInputRenderer from './FilterInputRender';
import InputRenderer from './InputRenderer';

import { clientSides } from './clientSides';
import FallbackClientSideRenderer from './FallbackClientSideRenderer';
import { actionsColumnHeaderCellRenderer, defaultColumnHeaderCellRenderer, detailColumnCellHeaderRenderer } from './renderers/headerCellRenderers';
import { actionsColumnSummaryCellRenderer, defaultColumnSummaryCellRenderer, detailColumnCellSummaryRenderer } from './renderers/summaryCellRenderers';
import { actionsColumnCellRenderer, defaultColumnCellRenderer, detailColumnCellRenderer } from './renderers/cellRenderers';
import { defaultColumnEditCellRenderer } from './renderers/editCellRenderers';
interface GenericDataGridProps {
    tableName: string;
    fixedFields?: FixedField[];
}

export const getPrimaryKeyValues = (row: Record<string, any>, primaryKey: string[]): string => {
    return primaryKey
        .map(key => {
            return row[key] !== undefined && row[key] !== null
                ? String(row[key])
                : 'NULL_OR_UNDEFINED';
        })
        .join('|');
};

export const NEW_ROW_INDICATOR = '$new';
export const DETAIL_ROW_INDICATOR = '$detail';

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
    tableName,
    fixedFields
}) => {
    const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [isFilterRowVisible, setIsFilterRowVisible] = useState<boolean>(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<string> => new Set());
    const [cellFeedback, setCellFeedback] = useState<CellFeedback | null>(null);
    const [localCellChanges, setLocalCellChanges] = useState<Map<string, Set<string>>>(new Map());
    const theme = useTheme();

    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<any | null>(null);
    const [exitingRowIds, setExitingRowIds] = useState<Set<string>>(new Set());

    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();

    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dataGridRef = useRef<DataGridHandle>(null);
    const { callApi, loading, error } = useApiCall();

    useEffect(() => {
        setFilters({});
        setIsFilterRowVisible(false);
        setSelectedRows(new Set());
        setTableDefinition(null);
        setTableData([]);
        setCellFeedback(null);
        setLocalCellChanges(new Map());
        setOpenConfirmDialog(false);
        setRowToDelete(null);
        setExitingRowIds(new Set());
        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
        }
    }, [tableName]);

    useEffect(() => {
        const fetchDataAndDefinition = async () => {
            try {
                const definition: TableDefinition = await callApi('table_structure', { table: tableName });
                setTableDefinition(definition);
                const data = await callApi('table_data', {
                    table: tableName,
                    fixedFields: fixedFields
                });
                setTableData(data);
            } catch (err: any) {
                setTableDefinition(null);
                setTableData([]);
                showError(`Error al cargar datos para la tabla '${tableName}': ${err.message || 'Error desconocido'}`);
            } finally { }
        };
        fetchDataAndDefinition();
    }, [tableName, fixedFields, showError]);

    useEffect(() => {
        if (cellFeedback) {
            if (feedbackTimerRef.current) {
                clearTimeout(feedbackTimerRef.current);
            }
            const timerDuration = 3000;
            feedbackTimerRef.current = setTimeout(() => {
                setCellFeedback(null);
            }, timerDuration);
        }
        return () => {
            if (feedbackTimerRef.current) {
                clearTimeout(feedbackTimerRef.current);
            }
        };
    }, [cellFeedback]);

    const primaryKey = useMemo(() => {
        if (!tableDefinition) return ['id'];
        return tableDefinition.primaryKey && tableDefinition.primaryKey.length > 0 ? tableDefinition.primaryKey : ['id'];
    }, [tableDefinition]);

    const toggleFilterVisibility = useCallback(() => {
        setIsFilterRowVisible(prev => {
            if (prev) {
                setFilters({});
            }
            return !prev;
        });
    }, []);

    const handleAddRow = useCallback(() => {
        if (!tableDefinition) {
            showWarning('No se puede agregar una fila sin la definición de la tabla.');
            return;
        }

        const newRow: Record<string, any> = {};
        tableDefinition.fields.forEach(field => {
            newRow[field.name] = null;
        });
        newRow[NEW_ROW_INDICATOR] = true;

        // Si hay fixedFields, los aplica a la nueva fila para que el usuario los vea
        if (fixedFields) {
            fixedFields.forEach(fixedField => {
                newRow[fixedField.fieldName] = fixedField.value;
            });
        }

        setTableData(prevData => [newRow, ...prevData]);
        setSelectedRows(new Set());

        const tempRowId = getPrimaryKeyValues(newRow, primaryKey);
        setLocalCellChanges(prev => {
            const newMap = new Map(prev);
            const mandatoryEditableColumns = new Set<string>();

            tableDefinition.fields.forEach(field => {
                const isMandatory = (field.nullable === false || field.isPk);
                const isEditable = field.editable !== false;

                if (isMandatory && isEditable) {
                    mandatoryEditableColumns.add(field.name);
                }
            });
            newMap.set(tempRowId, mandatoryEditableColumns);
            return newMap;
        });

    }, [tableDefinition, showWarning, primaryKey, fixedFields]); // Añade fixedFields como dependencia

    const handleDeleteRow = useCallback(async (row: any) => {
        setRowToDelete(row);
        setOpenConfirmDialog(true);
    }, []);

    const handleConfirmDelete = useCallback(async (confirm: boolean) => {
        setOpenConfirmDialog(false);
        if (!confirm || !rowToDelete) {
            showWarning('Eliminación cancelada por el usuario.');
            setRowToDelete(null);
            return;
        }

        if (!tableDefinition || !tableName) {
            showError('No se puede eliminar la fila sin la definición de la tabla o el nombre de la tabla.');
            setRowToDelete(null);
            return;
        }

        const rowId = getPrimaryKeyValues(rowToDelete, primaryKey);

        setExitingRowIds(prev => new Set(prev).add(rowId));

        setTimeout(async () => {
            if (rowToDelete[NEW_ROW_INDICATOR]) {
                setTimeout(() => {
                    setTableData(prevData => prevData.filter(row => getPrimaryKeyValues(row, primaryKey) !== rowId));
                    setLocalCellChanges(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(rowId);
                        return newMap;
                    });
                    setSelectedRows(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(rowId);
                        return newSet;
                    });
                    setExitingRowIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(rowId);
                        return newSet;
                    });
                    showInfo(`Fila no guardada '${rowId}' eliminada localmente.`);
                    setRowToDelete(null);
                }, 500);
                return;
            }

            try {
                const primaryKeyValues = tableDefinition.primaryKey.map((key) => rowToDelete[key]);
                await callApi('table_record_delete', {
                    table: tableName,
                    primaryKeyValues: primaryKeyValues
                });

                console.log(`Fila con ID ${rowId} eliminada exitosamente del backend.`);
                setTimeout(() => {
                    setTableData(prevData => prevData.filter(row => getPrimaryKeyValues(row, primaryKey) !== rowId));
                    setLocalCellChanges(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(rowId);
                        return newMap;
                    });
                    setSelectedRows(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(rowId);
                        return newSet;
                    });
                    setExitingRowIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(rowId);
                        return newSet;
                    });
                    showSuccess(`Fila '${rowId}' eliminada exitosamente.`);
                    setRowToDelete(null);
                }, 500);

            } catch (err: any) {
                console.error(`Error al eliminar la fila '${rowId}':`, err);
                showError(`Error al eliminar la fila '${rowId}': ${err.message || 'Error desconocido'}`);
                setExitingRowIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(rowId);
                    return newSet;
                });
                setRowToDelete(null);
            }
        }, 10);
    }, [rowToDelete, tableDefinition, tableName, primaryKey, showInfo, showSuccess, showError, showWarning, setTableData, setLocalCellChanges, setSelectedRows]);


    const filteredRows = useMemo(() => {
        let rows = tableData;
        if (isFilterRowVisible) {
            Object.keys(filters).forEach(key => {
                const filterValue = filters[key].toLowerCase();
                if (filterValue) {
                    rows = rows.filter(row => {
                        const cellValue = String(row[key] || '').toLowerCase();
                        return cellValue.includes(filterValue);
                    });
                }
            });
        }
        return rows;
    }, [tableData, filters, isFilterRowVisible]);

    //TODO: mejorar ingreso de datos
    const handleEnterKeyPressInEditor = useCallback((rowIndex: number, columnKey: string, currentColumns: Column<any>[]) => {
        if (dataGridRef.current && tableDefinition) {
            const currentColumnIndex = currentColumns.findIndex((col: Column<any>) => col.key === columnKey);

            if (currentColumnIndex !== -1) {
                let nextColumnIndex = currentColumnIndex + 1;
                let nextRowIndex = rowIndex;

                let foundNextTarget = false;
                while (!foundNextTarget) {
                    if (nextColumnIndex >= currentColumns.length) {
                        nextColumnIndex = 0;
                        nextRowIndex++;

                        if (nextRowIndex >= filteredRows.length) {
                            nextRowIndex = 0;
                            nextColumnIndex = 0;

                            if (filteredRows.length === 0 || (rowIndex === filteredRows.length - 1 && currentColumnIndex === currentColumns.length - 1)) {
                                foundNextTarget = true;
                                break;
                            }
                        }
                    }

                    const nextColumn = currentColumns[nextColumnIndex];
                    if (nextColumn) {
                        const fieldDefinition = tableDefinition.fields.find(f => f.name === nextColumn.key);
                        const isEditableField = fieldDefinition?.editable !== false;

                        if (nextColumn.key !== 'filterToggle' && nextColumn.key !== 'deleteAction' && isEditableField) {
                            foundNextTarget = true;
                        } else {
                            nextColumnIndex++;
                        }
                    } else {
                        nextColumnIndex++;
                    }
                }

                if (foundNextTarget) {
                    dataGridRef.current.selectCell({ rowIdx: nextRowIndex, idx: nextColumnIndex }, { enableEditor: false, scrollIntoView: true } as SelectCellOptions);
                }
            }
        }
    }, [filteredRows, tableDefinition]);

    //@ts-ignore TODO: arreglar este tipo
    const columns: Column<any>[] = useMemo(() => {
        if (!tableDefinition) return [];

        // Filtra los campos de la definición de la tabla según la lógica de fixedFields
        const fieldsToShow = tableDefinition.fields.filter((field: FieldDefinition) => {
            const fixedFieldEntry = fixedFields?.find(f => f.fieldName === field.name);
            // Si es un fixedField: solo lo mostramos si tiene 'until'
            // Si NO es un fixedField: siempre lo mostramos
            return !(fixedFieldEntry && fixedFieldEntry.until === undefined);
        });

        const defaultColumns: Column<any>[] = fieldsToShow.map((fieldDef: FieldDefinition) => {
            // Determinar si el campo está fijo (en el array fixedFields)
            const isFixedField = fixedFields?.some(f => f.fieldName === fieldDef.name);
            const isFieldEditable = fieldDef.editable !== false && !isFixedField; // Un campo fijo no es editable por el usuario

            return {
                key: fieldDef.name,
                name: fieldDef.label || cambiarGuionesBajosPorEspacios(fieldDef.name),
                resizable: true,
                sortable: true,
                editable: isFieldEditable, // Usar la nueva bandera de editable
                flexGrow: 1,
                minWidth: 60,
                colSpan(args) {
                    return args.type === 'ROW' && args.row[DETAIL_ROW_INDICATOR] ? defaultColumns.length : undefined;
                },
                renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => defaultColumnHeaderCellRenderer(props, fieldDef),
                renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => defaultColumnSummaryCellRenderer(props, fixedFields, isFilterRowVisible, filters, setFilters),
                renderCell: (props: RenderCellProps<any, unknown>) => defaultColumnCellRenderer(props, tableDefinition, cellFeedback, primaryKey, fixedFields, localCellChanges),
            };
        });

        const actionsColumn: Column<any> = {
            key: 'filterToggle',
            name: '',
            width: 50,
            resizable: false,
            sortable: false,
            frozen: true,
            renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => actionsColumnHeaderCellRenderer(props, isFilterRowVisible,toggleFilterVisibility),
            renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => actionsColumnSummaryCellRenderer(props),
            renderCell: (props: RenderCellProps<any, unknown>) => actionsColumnCellRenderer(props, tableDefinition, handleDeleteRow),
        };

        const detailColumns: Column<any>[] = [];
        if (tableDefinition.detailTables && tableDefinition.detailTables.length > 0) {
            tableDefinition.detailTables.forEach(detailTable => {
                const detailKey = `detail_${detailTable.abr}`;
                detailColumns.push({
                    key: detailKey,
                    name: detailTable.label || `Detalle ${detailTable.abr}`,
                    resizable: false,
                    sortable: false,
                    frozen: true,
                    renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => detailColumnCellHeaderRenderer(props, detailTable),
                    renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => detailColumnCellSummaryRenderer(props),
                    renderCell: (props: RenderCellProps<any, unknown>) => detailColumnCellRenderer(props, detailTable, primaryKey, tableData, setTableData),
                });
            });
        }
        const allColumns = [
            actionsColumn,
            ...detailColumns,
            ...defaultColumns,
        ];
       
        return allColumns.map(col => ({
            ...col,
            renderEditCell: (props) => defaultColumnEditCellRenderer(props, tableDefinition, fixedFields, primaryKey, setCellFeedback, setTableData, localCellChanges, setLocalCellChanges, handleEnterKeyPressInEditor, allColumns),
        }))
    }, [
        tableDefinition, isFilterRowVisible, filters, toggleFilterVisibility,
        cellFeedback, primaryKey, theme.palette.success.light, theme.palette.error.light,
        theme.palette.info.light, theme.palette.action.selected, // Añade el color de campos fijos
        handleEnterKeyPressInEditor, setTableData,
        localCellChanges, handleDeleteRow, fixedFields // Añade fixedFields como dependencia
    ]);

    const showNoRowsMessage = filteredRows.length === 0 && !loading && !error;

    const handleRowsChange = useCallback((updatedRows: any[]) => {
        setTableData(updatedRows);
    }, []);

    const handleCellClick = useCallback((args: CellMouseArgs<any, { id: string }>) => {
        const fieldDefinition = tableDefinition?.fields.find(f => f.name === args.column.key);
        // La editabilidad también considera si es un campo fijo (buscando en el array)
        const isFixedField = fixedFields?.some(f => f.fieldName === args.column.key);
        const isEditable = fieldDefinition?.editable !== false && !isFixedField;

        console.log("Clicked column index:", args.column.idx);
        console.log("Clicked row index:", args.rowIdx);
        console.log("Is editable:", isEditable);
    }, [tableDefinition, fixedFields]); // Añade fixedFields como dependencia


    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Cargando tabla...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="error">{error.message}</Alert>
            </Box>
        );
    }

    if (!tableDefinition) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="warning">No se pudo cargar la definición de la tabla.</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            {tableDefinition.allow?.insert && (
                <Box sx={{ display: 'flex', px: 2, pb: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleAddRow}
                        startIcon={<AddIcon />}
                    >
                        Nuevo Registro
                    </Button>
                </Box>
            )}
            <Box
                sx={{
                    flexGrow: showNoRowsMessage ? 0 : 1,
                    height: showNoRowsMessage ? '150px' : '100%',
                    boxSizing: 'border-box',
                    position: 'relative',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    px: 2,
                    pb: 2,
                }}
            >
                <Box
                    sx={{
                        backgroundColor: theme.palette.primary.main, // Color de fondo para el título
                        color: theme.palette.primary.contrastText, // Color del texto
                        padding: theme.spacing(1),
                        textAlign: 'left',
                        fontWeight: 'bold',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        // Si el contenedor tiene border-radius, la parte superior del título también debe tenerlo
                        borderTopLeftRadius: theme.shape.borderRadius,
                        borderTopRightRadius: theme.shape.borderRadius,
                    }}
                >
                    <Typography variant="subtitle1" component="div">
                        {cambiarGuionesBajosPorEspacios(tableDefinition.title || tableDefinition.name)} - 
                        mostrando {filteredRows.length === tableData.length ?`${tableData.length} registros`
                        : `${filteredRows.length} registros filtrados`
                        }
                    </Typography>
                </Box>
            
                <DataGrid
                    ref={dataGridRef}
                    //@ts-ignore TODO: arreglar este tipo
                    columns={columns}
                    rows={filteredRows.map(row => ({
                        ...row,
                        style: exitingRowIds.has(getPrimaryKeyValues(row, primaryKey))
                            ? { maxHeight: 0, opacity: 0, overflow: 'hidden' }
                            : { maxHeight: '35px', opacity: 1 }
                    }))}
                    enableVirtualization={true}
                    rowKeyGetter={(row: any) => getPrimaryKeyValues(row, primaryKey)}
                    onSelectedRowsChange={setSelectedRows}
                    onRowsChange={handleRowsChange}
                    selectedRows={selectedRows}
                    rowHeight={(row) => row[DETAIL_ROW_INDICATOR]?300:35}
                    style={{ height: '100%', width: '100%', boxSizing: 'border-box' }}
                    headerRowHeight={35}
                    topSummaryRows={isFilterRowVisible ? [{ id: 'filterRow' }] : undefined}
                    summaryRowHeight={isFilterRowVisible ? 35 : 0}
                    onCellClick={handleCellClick}
                    //@ts-ignore
                    //renderers={{renderCell: myCellRenderer }}
                />
                {showNoRowsMessage && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: isFilterRowVisible ? '70px' : '36px',
                            left: theme => theme.spacing(2),
                            right: theme => theme.spacing(2),
                            bottom: theme => theme.spacing(2),
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: theme => theme.palette.text.secondary,
                            border: theme => `1px solid ${theme.palette.divider}`,
                            borderRadius: '4px',
                            zIndex: 1,
                        }}
                    >
                        <Typography variant="h6">No hay filas para mostrar.</Typography>
                    </Box>
                )}
            </Box>

            <ConfirmDialog
                open={openConfirmDialog}
                onClose={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={rowToDelete && rowToDelete[NEW_ROW_INDICATOR]
                    ? `¿Estás seguro de que quieres eliminar esta nueva fila (ID: ${getPrimaryKeyValues(rowToDelete, primaryKey)}) localmente?`
                    : rowToDelete
                        ? `¿Estás seguro de que quieres eliminar la fila con ID: ${getPrimaryKeyValues(rowToDelete, primaryKey)} de la base de datos? Esta acción es irreversible.`
                        : '¿Estás seguro de que quieres eliminar este registro? Esta acción es irreversible.'
                }
            />
        </Box>
    );
};
export default GenericDataGrid;