// src/components/GenericDataGrid.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  DataGrid,
  Column,
  DataGridHandle,
  SelectCellOptions,
  CellMouseArgs,
  RenderCellProps,
  RenderHeaderCellProps,
  RenderSummaryCellProps,
  ColSpanArgs,
  CellKeyDownArgs,
  CellPasteArgs,
  CellSelectArgs,
  CellMouseEvent,
  CellKeyboardEvent,
  DataGridProps,
} from "react-data-grid";
import "react-data-grid/lib/styles.css";

import { useApiCall } from "../../hooks/useApiCall";
import {
  CircularProgress,
  Typography,
  Box,
  Alert,
  useTheme,
  Button,
} from "@mui/material";
import { cambiarGuionesBajosPorEspacios } from "../../utils/functions";

import AddIcon from "@mui/icons-material/Add";

import { useSnackbar } from "../../contexts/SnackbarContext";

import {
  CellFeedback,
  FieldDefinition,
  FixedField,
  TableDefinition,
} from "../../types";

import { ConfirmDialog } from "../ConfirmDialog";

import {
  actionsColumnHeaderCellRenderer,
  defaultColumnHeaderCellRenderer,
  detailColumnCellHeaderRenderer,
} from "./renderers/headerCellRenderers";
import {
  actionsColumnSummaryCellRenderer,
  defaultColumnSummaryCellRenderer,
  detailColumnCellSummaryRenderer,
} from "./renderers/summaryCellRenderers";
import { allColumnsCellRenderer } from "./renderers/cellRenderers";
import { defaultColumnEditCellRenderer } from "./renderers/editCellRenderers";
import { DetailTable } from "backend-plus";
import { EmptyRowsRenderer } from "./renderers/emptyRowRenderer";
interface GenericDataGridProps {
  tableName: string;
  fixedFields?: FixedField[];
}

export const getPrimaryKeyValues = (
  row: Record<string, any>,
  primaryKey: string[]
): string => {
  return primaryKey
    .concat(DETAIL_ROW_INDICATOR)
    .map((key) => {
      return row[key] !== undefined && row[key] !== null
        ? String(row[key])
        : "NULL_OR_UNDEFINED";
    })
    .join("|");
};

export const NEW_ROW_INDICATOR = "$new";
export const DETAIL_ROW_INDICATOR = "$detail";

interface BaseCustomColumn<TRow, TSummaryRow = unknown>
  extends Column<TRow, TSummaryRow> {
  customType: "default" | "detail" | "action";
  tableDefinition: TableDefinition;
}

export interface DefaultColumn<TRow, TSummaryRow = unknown>
  extends BaseCustomColumn<TRow, TSummaryRow> {
  customType: "default";
  fieldDef: FieldDefinition;
  cellFeedback: CellFeedback | null;
  primaryKey: string[];
  fixedFields: FixedField[] | undefined;
  localCellChanges: Map<string, Set<string>>;
}

export interface DetailColumn<TRow, TSummaryRow = unknown>
  extends BaseCustomColumn<TRow, TSummaryRow> {
  customType: "detail";
  detailTable: DetailTable;
  primaryKey: string[];
  tableData: any[];
  setTableData: React.Dispatch<React.SetStateAction<any[]>>;
  detailKey: string;
}

export interface ActionColumn<TRow, TSummaryRow = unknown>
  extends BaseCustomColumn<TRow, TSummaryRow> {
  customType: "action";
  handleDeleteRow: Function;
}

export type CustomColumn<TRow, TSummaryRow = unknown> =
  | DefaultColumn<TRow, TSummaryRow>
  | DetailColumn<TRow, TSummaryRow>
  | ActionColumn<TRow, TSummaryRow>;

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
  tableName,
  fixedFields,
}) => {
  const [tableDefinition, setTableDefinition] =
    useState<TableDefinition | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isFilterRowVisible, setIsFilterRowVisible] = useState<boolean>(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState(
    (): ReadonlySet<string> => new Set()
  );
  const [selectedCell, setSelectedCell] = useState<
    CellSelectArgs<any, NoInfer<{ id: string }>> | undefined
  >(undefined);

  const [cellFeedback, setCellFeedback] = useState<CellFeedback | null>(null);
  const [localCellChanges, setLocalCellChanges] = useState<
    Map<string, Set<string>>
  >(new Map());
  const theme = useTheme();

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [exitingRowIds, setExitingRowIds] = useState<Set<string>>(new Set());

  const { showSuccess, showError, showWarning, showInfo } = useSnackbar();

  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dataGridRef = useRef<DataGridHandle>(null);
  const { callApi, loading, error } = useApiCall();

  const getRowCount = () =>
    tableData.filter((row) => !row[DETAIL_ROW_INDICATOR]).length;
  const getFilteredRowCount = () =>
    filteredRows.filter((row) => !row[DETAIL_ROW_INDICATOR]).length;
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
        const definition: TableDefinition = await callApi("table_structure", {
          table: tableName,
        });
        setTableDefinition(definition);
        const data = await callApi("table_data", {
          table: tableName,
          fixedFields: fixedFields,
        });
        setTableData(data);
      } catch (err: any) {
        setTableDefinition(null);
        setTableData([]);
        showError(
          `Error al cargar datos para la tabla '${tableName}': ${
            err.message || "Error desconocido"
          }`
        );
      } finally {
      }
    };
    fetchDataAndDefinition();
  }, [tableName, /*fixedFields,*/ showError]);

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
    if (!tableDefinition) return ["id"];
    return tableDefinition.primaryKey && tableDefinition.primaryKey.length > 0
      ? tableDefinition.primaryKey
      : ["id"];
  }, [tableDefinition]);

  const toggleFilterVisibility = useCallback(() => {
    setIsFilterRowVisible((prev) => {
      if (prev) {
        setFilters({});
      }
      return !prev;
    });
  }, []);

  const handleAddRow = useCallback(() => {
    if (!tableDefinition) {
      showWarning(
        "No se puede agregar una fila sin la definición de la tabla."
      );
      return;
    }
    const newRow: Record<string, any> = {};
    tableDefinition.fields.forEach((field) => {
      newRow[field.name] = null;
    });
    newRow[NEW_ROW_INDICATOR] = true;

    if (fixedFields) {
      fixedFields.forEach((fixedField) => {
        newRow[fixedField.fieldName] = fixedField.value;
      });
    }

    setTableData((prevData) => [newRow, ...prevData]);
    setSelectedRows(new Set());

    const tempRowId = getPrimaryKeyValues(newRow, primaryKey);
    setLocalCellChanges((prev) => {
      const newMap = new Map(prev);
      const mandatoryEditableColumns = new Set<string>();

      tableDefinition.fields.forEach((field) => {
        const isMandatory = field.nullable === false || field.isPk;
        const isEditable = field.editable !== false;

        if (isMandatory && isEditable) {
          mandatoryEditableColumns.add(field.name);
        }
      });
      newMap.set(tempRowId, mandatoryEditableColumns);
      return newMap;
    });
  }, [tableDefinition, showWarning, primaryKey, fixedFields]);

  const handleDeleteRow = useCallback(async (row: any) => {
    setRowToDelete(row);
    setOpenConfirmDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(
    async (confirm: boolean) => {
      setOpenConfirmDialog(false);
      if (!confirm || !rowToDelete) {
        showWarning("Eliminación cancelada por el usuario.");
        setRowToDelete(null);
        return;
      }

      if (!tableDefinition || !tableName) {
        showError(
          "No se puede eliminar la fila sin la definición de la tabla o el nombre de la tabla."
        );
        setRowToDelete(null);
        return;
      }

      const rowId = getPrimaryKeyValues(rowToDelete, primaryKey);

      setExitingRowIds((prev) => new Set(prev).add(rowId));

      setTimeout(async () => {
        if (rowToDelete[NEW_ROW_INDICATOR]) {
          setTimeout(() => {
            setTableData((prevData) =>
              prevData.filter(
                (row) => getPrimaryKeyValues(row, primaryKey) !== rowId
              )
            );
            setLocalCellChanges((prev) => {
              const newMap = new Map(prev);
              newMap.delete(rowId);
              return newMap;
            });
            setSelectedRows((prev) => {
              const newSet = new Set(prev);
              newSet.delete(rowId);
              return newSet;
            });
            setExitingRowIds((prev) => {
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
          const primaryKeyValues = tableDefinition.primaryKey.map(
            (key) => rowToDelete[key]
          );
          await callApi("table_record_delete", {
            table: tableName,
            primaryKeyValues: primaryKeyValues,
          });

          console.log(
            `Fila con ID ${rowId} eliminada exitosamente del backend.`
          );
          setTimeout(() => {
            setTableData((prevData) =>
              prevData.filter(
                (row) => getPrimaryKeyValues(row, primaryKey) !== rowId
              )
            );
            setLocalCellChanges((prev) => {
              const newMap = new Map(prev);
              newMap.delete(rowId);
              return newMap;
            });
            setSelectedRows((prev) => {
              const newSet = new Set(prev);
              newSet.delete(rowId);
              return newSet;
            });
            setExitingRowIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(rowId);
              return newSet;
            });
            showSuccess(`Fila '${rowId}' eliminada exitosamente.`);
            setRowToDelete(null);
          }, 500);
        } catch (err: any) {
          console.error(`Error al eliminar la fila '${rowId}':`, err);
          showError(
            `Error al eliminar la fila '${rowId}': ${
              err.message || "Error desconocido"
            }`
          );
          setExitingRowIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(rowId);
            return newSet;
          });
          setRowToDelete(null);
        }
      }, 10);
    },
    [
      rowToDelete,
      tableDefinition,
      tableName,
      primaryKey,
      showInfo,
      showSuccess,
      showError,
      showWarning,
      setTableData,
      setLocalCellChanges,
      setSelectedRows,
    ]
  );

  const filteredRows = useMemo(() => {
    let rows = tableData;
    if (isFilterRowVisible) {
      Object.keys(filters).forEach((key) => {
        const filterValue = filters[key].toLowerCase();
        if (filterValue) {
          rows = rows.filter((row) => {
            const cellValue = String(row[key] || "").toLowerCase();
            return cellValue.includes(filterValue);
          });
        }
      });
    }
    return rows;
  }, [tableData, filters, isFilterRowVisible]);

  const handleEnterKeyPressInEditor = useCallback(
    (rowIndex: number, columnKey: string, currentColumns: Column<any>[]) => {
      if (dataGridRef.current && tableDefinition) {
        const currentColumnIndex = currentColumns.findIndex(
          (col: Column<any>) => col.key === columnKey
        );
        const editableColumns = currentColumns.filter((col) => {
          const fieldDefinition = tableDefinition.fields.find(
            (f) => f.name === col.key
          );
          return (
            col.key !== "filterToggle" &&
            col.key !== "deleteAction" &&
            fieldDefinition?.editable !== false &&
            !fieldDefinition?.clientSide
          );
        });

        if (currentColumnIndex !== -1 && editableColumns.length > 0) {
          const editableColumnKeys = editableColumns.map((col) => col.key);
          let currentEditableColumnIndex =
            editableColumnKeys.indexOf(columnKey);

          if (currentEditableColumnIndex !== -1) {
            let nextEditableColumnIndex = currentEditableColumnIndex + 1;
            let nextRowIndex = rowIndex;

            if (nextEditableColumnIndex >= editableColumns.length) {
              nextEditableColumnIndex = 0;
              nextRowIndex++;
              if (nextRowIndex >= filteredRows.length) {
                nextRowIndex = 0;
              }
            }

            const nextColumnKey = editableColumnKeys[nextEditableColumnIndex];
            const nextColumnIndex = currentColumns.findIndex(
              (col) => col.key === nextColumnKey
            );

            dataGridRef.current.selectCell(
              { rowIdx: nextRowIndex, idx: nextColumnIndex },
              {
                enableEditor: false,
                shouldFocusCell: true,
              } as SelectCellOptions
            );
          }
        }
      }
    },
    [filteredRows, tableDefinition]
  );

  const handleSelectedCellChange = useCallback(
    (args: CellSelectArgs<any, NoInfer<{ id: string }>> | undefined) => {
      setSelectedCell(args);
    },
    []
  );

  const columns: CustomColumn<any>[] = useMemo(() => {
    if (!tableDefinition) return [];
    const fieldsToShow = tableDefinition.fields.filter(
      (field: FieldDefinition) => {
        const fixedFieldEntry = fixedFields?.find(
          (f) => f.fieldName === field.name
        );
        return !(fixedFieldEntry && fixedFieldEntry.until === undefined);
      }
    );

    const defaultColumns: CustomColumn<any>[] = fieldsToShow.map(
      (fieldDef: FieldDefinition) => {
        const isFixedField = fixedFields?.some(
          (f) => f.fieldName === fieldDef.name
        );
        const isFieldEditable = fieldDef.editable !== false && !isFixedField;

        return {
          key: fieldDef.name,
          customType: "default",
          tableDefinition,
          fieldDef,
          cellFeedback,
          primaryKey,
          fixedFields,
          localCellChanges,
          name: fieldDef.label || cambiarGuionesBajosPorEspacios(fieldDef.name),
          resizable: true,
          sortable: true,
          editable: isFieldEditable,
          flexGrow: 1,
          minWidth: 60,
          renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) =>
            defaultColumnHeaderCellRenderer(props, fieldDef),
          renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) =>
            defaultColumnSummaryCellRenderer(
              props,
              fixedFields,
              isFilterRowVisible,
              filters,
              setFilters
            ),
        };
      }
    );

    const actionsColumn: CustomColumn<any> = {
      key: "filterToggle",
      customType: "action",
      tableDefinition,
      handleDeleteRow,
      name: "filterCol",
      width: 50,
      resizable: false,
      sortable: false,
      renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) =>
        actionsColumnHeaderCellRenderer(
          props,
          isFilterRowVisible,
          toggleFilterVisibility
        ),
      renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) =>
        actionsColumnSummaryCellRenderer(props),
    };

    const detailColumns: CustomColumn<any>[] = [];
    if (
      tableDefinition.detailTables &&
      tableDefinition.detailTables.length > 0
    ) {
      tableDefinition.detailTables.forEach((detailTable) => {
        const detailKey = `detail_${detailTable.abr}`;
        detailColumns.push({
          key: detailKey,
          customType: "detail",
          tableDefinition,
          detailTable,
          primaryKey,
          tableData,
          setTableData,
          detailKey,
          name: detailTable.label || `Detalle ${detailTable.abr}`,
          resizable: false,
          sortable: false,
          width: 50,
          renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) =>
            detailColumnCellHeaderRenderer(props, detailTable),
          renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) =>
            detailColumnCellSummaryRenderer(props),
        });
      });
    }

    const allColumns = [actionsColumn, ...detailColumns, ...defaultColumns];

    return allColumns.map((col) => ({
      ...col,
      colSpan: (args: ColSpanArgs<any, unknown>) => {
        if (args.type === "ROW") {
          const detailTableAbr = args.row[DETAIL_ROW_INDICATOR];
          if (col.key === `detail_${detailTableAbr}`) {
            return allColumns.length;
          }
        }
        return undefined;
      },
      renderEditCell: (props) =>
        defaultColumnEditCellRenderer(
          props,
          tableDefinition,
          fixedFields,
          primaryKey,
          setCellFeedback,
          setTableData,
          localCellChanges,
          setLocalCellChanges,
          handleEnterKeyPressInEditor,
          allColumns
        ),
      renderCell: (props: RenderCellProps<any, unknown>) =>
        allColumnsCellRenderer(props),
    }));
  }, [
    tableDefinition,
    isFilterRowVisible,
    filters,
    toggleFilterVisibility,
    cellFeedback,
    primaryKey,
    theme.palette.success.light,
    theme.palette.error.light,
    theme.palette.info.light,
    theme.palette.action.selected,
    handleEnterKeyPressInEditor,
    setTableData,
    localCellChanges,
    handleDeleteRow,
    fixedFields,
    tableData,
  ]);

  const handleRowsChange = useCallback((updatedRows: any[]) => {
    setTableData(updatedRows);
  }, []);

  //TODO: mejorar esto, por ahora no encontré una forma programática
  const deselectAllOtherGrids = (
    currentGridElement: HTMLDivElement | undefined | null
  ) => {
    const allSelectedCells = document.querySelectorAll(
      "div[aria-selected='true']"
    );
    allSelectedCells.forEach((cell) => {
      const parentGrid = cell.closest(".rdg");
      if (parentGrid && parentGrid !== currentGridElement) {
        cell.setAttribute("aria-selected", "false");
      }
    });
  };

  const handleCellClick = useCallback(
    (args: CellMouseArgs<any, { id: string }>) => {
      deselectAllOtherGrids(dataGridRef.current?.element);
      args.selectCell(true);
      const fieldDefinition = tableDefinition?.fields.find(
        (f) => f.name === args.column.key
      );
      const isFixedField = fixedFields?.some(
        (f) => f.fieldName === args.column.key
      );
      const isEditable = fieldDefinition?.editable !== false && !isFixedField;

      console.log("Clicked column index:", args.column.idx);
      console.log("Clicked row index:", args.rowIdx);
      console.log("Is editable:", isEditable);
    },
    [tableDefinition, fixedFields]
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Cargando tabla...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  if (!tableDefinition) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Alert severity="warning">
          No se pudo cargar la definición de la tabla.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        pt: 2,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
      }}
    >
      {tableDefinition.allow?.insert && (
        <Box sx={{ display: "flex", px: 2, pb: 1 }}>
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
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          padding: theme.spacing(1),
          textAlign: "left",
          fontWeight: "bold",
          borderBottom: `1px solid ${theme.palette.divider}`,
          borderTopLeftRadius: theme.shape.borderRadius,
          borderTopRightRadius: theme.shape.borderRadius,
          ml: 2,
          mr: 2,
        }}
      >
        <Typography variant="subtitle1" component="div">
          {cambiarGuionesBajosPorEspacios(
            tableDefinition.title || tableDefinition.name
          )}{" "}
          - mostrando{" "}
          {getFilteredRowCount() === getRowCount()
            ? `${getRowCount()} registros`
            : `${getFilteredRowCount()} registros filtrados`}
        </Typography>
      </Box>
      <Box
        sx={
          {
            height: "auto",
            maxHeight: "70vh",
            boxSizing: "border-box",
            position: "relative",
            overflowX: "auto",
            overflowY: "auto",
            px: 2,
            pb: 2,
            // Configurar tema nativo de react-data-grid
            "--rdg-color-scheme": "light", // Forzar tema claro
            // Forzar colores de texto
            "& .rdg": {
              color: "#333333 !important",
            },
            "& .rdg-cell": {
              color: "#333333 !important",
            },
            "& .rdg-row": {
              color: "#333333 !important",
            },
          } as any
        }
        className="rdg-light" // Clase nativa para forzar tema claro
      >
        <DataGrid
          ref={dataGridRef}
          //@ts-ignore TODO: arreglar este tipo
          columns={columns}
          rows={filteredRows.map((row) => ({
            ...row,
            style: exitingRowIds.has(getPrimaryKeyValues(row, primaryKey))
              ? { maxHeight: 0, opacity: 0, overflow: "hidden" }
              : { maxHeight: "35px", opacity: 1 },
          }))}
          enableVirtualization={true}
          rowKeyGetter={(row: any) => getPrimaryKeyValues(row, primaryKey)}
          onSelectedRowsChange={setSelectedRows}
          onSelectedCellChange={handleSelectedCellChange}
          onRowsChange={handleRowsChange}
          selectedRows={selectedRows}
          rowHeight={(row) => (row[DETAIL_ROW_INDICATOR] ? 400 : 35)}
          style={
            {
              height: "100%",
              width: "100%",
              boxSizing: "border-box",
              // Variables CSS nativas de react-data-grid para personalización
              "--rdg-background-color": "#FFFFFF",
              "--rdg-border-color": "#e0e0e0",
              "--rdg-header-background-color": "#f5f5f5",
              "--rdg-header-color": "#333333",
              "--rdg-row-background-color": "#FFFFFF",
              "--rdg-row-hover-background-color": "#f8f9fa",
              "--rdg-row-selected-background-color":
                theme.palette.primary.light + "20",
              "--rdg-cell-color": "#333333",
              "--rdg-color": "#333333",
              color: "#333333",
            } as React.CSSProperties
          }
          headerRowHeight={35}
          topSummaryRows={
            isFilterRowVisible ? [{ id: "filterRow" }] : undefined
          }
          summaryRowHeight={isFilterRowVisible ? 35 : 0}
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
          onCellClick={handleCellClick}
        />
      </Box>
      <ConfirmDialog
        open={openConfirmDialog}
        onClose={handleConfirmDelete}
        title="Confirmar Eliminación"
        message={
          rowToDelete && rowToDelete[NEW_ROW_INDICATOR]
            ? `¿Estás seguro de que quieres eliminar esta nueva fila (ID: ${getPrimaryKeyValues(
                rowToDelete,
                primaryKey
              )}) localmente?`
            : rowToDelete
            ? `¿Estás seguro de que quieres eliminar la fila con ID: ${getPrimaryKeyValues(
                rowToDelete,
                primaryKey
              )} de la base de datos? Esta acción es irreversible.`
            : "¿Estás seguro de que quieres eliminar este registro? Esta acción es irreversible."
        }
      />
    </Box>
  );
};
export default GenericDataGrid;
