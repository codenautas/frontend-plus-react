// src/hooks/grid/useGridColumns.ts
import React, { useMemo } from 'react';
import { RenderCellProps, RenderHeaderCellProps, RenderSummaryCellProps, Column } from 'react-data-grid';
import { cambiarGuionesBajosPorEspacios } from '../../utils/functions';
import { FieldDefinition, FixedField, TableDefinition, Ancestor, CellFeedback } from '../../types';
import { CustomColumn, DefaultColumn, DetailColumn, ActionColumn } from '../../components/grid/GenericDataGrid';
import { actionsColumnHeaderCellRenderer, defaultColumnHeaderCellRenderer, detailColumnCellHeaderRenderer } from '../../components/grid/renderers/headerCellRenderers';
import { actionsColumnSummaryCellRenderer, defaultColumnSummaryCellRenderer, detailColumnCellSummaryRenderer } from '../../components/grid/renderers/summaryCellRenderers';
import { allColumnsCellRenderer } from '../../components/grid/renderers/cellRenderers';
import { allColumnsEditCellRenderer } from '../../components/grid/renderers/editCellRenderers';

// @ts-ignore
import typeStore from 'type-store';

interface UseGridColumnsProps {
    tableDefinition: TableDefinition | null;
    tableData: any[];
    fixedFields?: FixedField[];
    isFilterRowVisible: boolean;
    sortColumns: readonly { columnKey: string; direction: 'ASC' | 'DESC' }[];
    primaryKey: string[];
    localCellChanges: Map<string, Set<string>>;
    cellFeedbackMap: Map<string, CellFeedback>;
    setCellFeedbackMap: React.Dispatch<React.SetStateAction<Map<string, CellFeedback>>>;
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    setLocalCellChanges: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>;
    handleKeyPressInEditor: (rowIndex: number, columnKey: string, event: React.KeyboardEvent, currentColumns: Column<any>[], handleCommit: (currentValue: any, closeEditor: boolean, focusNextCell: boolean) => Promise<void>) => void;
    handleDeleteRow: (row: any) => void;
    handleAddRow: (row?: any) => void;
    handleVerticalEditRow: (row: any) => void;
    toggleFilterVisibility: () => void;
    setDataGridOptionsAnchorEl: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
    setOpenDataGridOptions: React.Dispatch<React.SetStateAction<boolean>>;
    onOpenDetail?: (tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => void;
    ancestors: Ancestor[];
}

export const useGridColumns = ({
    tableDefinition,
    tableData,
    fixedFields,
    isFilterRowVisible,
    sortColumns,
    primaryKey,
    localCellChanges,
    cellFeedbackMap,
    setCellFeedbackMap,
    setTableData,
    setLocalCellChanges,
    handleKeyPressInEditor,
    handleDeleteRow,
    handleAddRow,
    handleVerticalEditRow,
    toggleFilterVisibility,
    setDataGridOptionsAnchorEl,
    setOpenDataGridOptions,
    onOpenDetail,
    ancestors,
}: UseGridColumnsProps) => {

    const columns: CustomColumn<any>[] = useMemo(() => {
        if (!tableDefinition) return [];
        const fieldsToShow = tableDefinition.fields.filter((field: FieldDefinition) => {
            const isFixedField = fixedFields?.some(f => f.fieldName === field.name);
            return !isFixedField && field.visible !== false;
        });

        const estimateTextWidth = (text: string): number => text.length * 8 + 16;

        const getColumnWidthFromData = (fieldDef: FieldDefinition): number => {
            const headerLabel = fieldDef.label || fieldDef.name;
            const type = fieldDef.typeName?.toLowerCase() || '';
            let typeMinWidth = 60;
            if (type.includes('boolean') || type.includes('checkbox')) typeMinWidth = 60;
            else if (type.includes('date') || type.includes('timestamp')) typeMinWidth = 110;
            else if (type.includes('integer') || type.includes('numeric')) typeMinWidth = 80;

            const headerWidth = estimateTextWidth(headerLabel) + 20;
            const sampleRows = tableData.slice(0, 50);
            const maxDataWidth = sampleRows.reduce((maxW, row) => {
                const typer = typeStore.typerFrom(fieldDef);
                const cellValue = row[fieldDef.name] !== null && typer.toLocalString(row[fieldDef.name]);
                if (cellValue === null || cellValue === undefined) return maxW;
                return Math.max(maxW, estimateTextWidth(String(cellValue)));
            }, 0);
            return Math.min(Math.max(headerWidth, maxDataWidth, typeMinWidth), 500);
        };

        const defaultColumns: CustomColumn<any>[] = fieldsToShow.map((fieldDef: FieldDefinition) => {
            const isFixedField = fixedFields?.some(f => f.fieldName === fieldDef.name);
            const isFieldEditable = fieldDef.editable !== false && !isFixedField;
            const colWidth = getColumnWidthFromData(fieldDef);
            return {
                key: fieldDef.name,
                customType: 'default',
                tableDefinition,
                fieldDef,
                cellFeedbackMap,
                setCellFeedbackMap,
                primaryKey,
                fixedFields,
                localCellChanges,
                setLocalCellChanges,
                setTableData,
                name: fieldDef.label || cambiarGuionesBajosPorEspacios(fieldDef.name),
                resizable: true,
                sortable: true,
                editable: isFieldEditable,
                handleKeyPressInEditor,
                width: colWidth,
                minWidth: colWidth,
                renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => defaultColumnHeaderCellRenderer({ ...props, sortColumns }, fieldDef),
                renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => defaultColumnSummaryCellRenderer(props, fixedFields, isFilterRowVisible),
            } as DefaultColumn<any>;
        });

        const availableActions = [
            tableDefinition.allow?.insert,
            tableDefinition.allow?.delete,
            tableDefinition.allow?.['vertical-edit']
        ].filter(Boolean).length;
        const actionColumnWidth = 60 + (availableActions * 10);

        const actionsColumn: CustomColumn<any> = {
            key: 'actionsColumn',
            customType: 'action',
            tableDefinition,
            handleDeleteRow,
            handleAddRow,
            handleVerticalEditRow,
            name: 'filterCol',
            width: actionColumnWidth,
            editable: false,
            resizable: false,
            sortable: false,
            renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => actionsColumnHeaderCellRenderer(
                props, isFilterRowVisible, toggleFilterVisibility,
                (e: React.MouseEvent<HTMLElement>) => {
                    setDataGridOptionsAnchorEl(e.currentTarget);
                    setOpenDataGridOptions(true);
                },
                handleAddRow, tableDefinition.allow?.insert
            ),
            renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => actionsColumnSummaryCellRenderer(props),
        } as ActionColumn<any>;

        const detailColumns: CustomColumn<any>[] = [];
        if (tableDefinition.detailTables && tableDefinition.detailTables.length > 0) {
            tableDefinition.detailTables.forEach(detailTable => {
                const detailKey = `detail_${detailTable.abr}`;
                detailColumns.push({
                    key: detailKey,
                    customType: 'detail',
                    tableDefinition,
                    detailTable,
                    primaryKey,
                    tableData,
                    setTableData,
                    detailKey,
                    name: detailTable.label || `Detalle ${detailTable.abr}`,
                    resizable: false,
                    sortable: false,
                    editable: false,
                    width: 30,
                    minWidth: 30,
                    renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => detailColumnCellHeaderRenderer(props, detailTable),
                    renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => detailColumnCellSummaryRenderer(props),
                } as DetailColumn<any>);
            });
        }

        const allColumns = [actionsColumn, ...detailColumns, ...defaultColumns];
        return allColumns.map(col => ({
            ...col,
            editorOptions: { closeOnExternalRowChange: false },
            renderEditCell: (props: any) => allColumnsEditCellRenderer(props, allColumns),
            renderCell: (props: RenderCellProps<any, unknown>) => allColumnsCellRenderer(props, onOpenDetail, ancestors, fixedFields),
        }));

    }, [tableDefinition, fixedFields, isFilterRowVisible, primaryKey, localCellChanges, handleKeyPressInEditor, handleDeleteRow, handleAddRow, handleVerticalEditRow, toggleFilterVisibility, tableData, cellFeedbackMap, sortColumns, setDataGridOptionsAnchorEl, setOpenDataGridOptions]);

    return { columns };
};
