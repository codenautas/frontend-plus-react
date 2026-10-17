// src/hooks/grid/useGridColumns.ts
import React, { useMemo } from 'react';
import { RenderCellProps, RenderHeaderCellProps, RenderSummaryCellProps, RenderEditCellProps, Column, ColSpanArgs } from 'react-data-grid';
import { cambiarGuionesBajosPorEspacios } from '../../utils/functions';
import { FieldDefinition, FixedField, TableDefinition } from '../../types';
import { CustomColumn, DefaultColumn, DetailColumn, ActionColumn } from '../../components/grid/GenericDataGrid';
import { ActionsColumnHeaderCell, defaultColumnHeaderCellRenderer, detailColumnCellHeaderRenderer } from '../../components/grid/renderers/headerCellRenderers';
import { actionsColumnSummaryCellRenderer, defaultColumnSummaryCellRenderer, detailColumnCellSummaryRenderer } from '../../components/grid/renderers/summaryCellRenderers';
import { allColumnsCellRenderer } from '../../components/grid/renderers/cellRenderers';
import { allColumnsEditCellRenderer } from '../../components/grid/renderers/editCellRenderers';
import { isNumericType, typerFrom } from '../../components/grid/utils/helpers';
import { esFilaDetalle } from '../../components/grid/detalles';

const estimateTextWidth = (text: string): number => text.length * 8 + 16;

/**
 * Calcula el ancho de cada columna a partir del título y de una muestra de filas.
 * Se llama una sola vez por carga de datos (no en cada render).
 */
export const calcularAnchosDeColumnas = (tableDefinition: TableDefinition, filas: Record<string, unknown>[]): Map<string, number> => {
    const anchos = new Map<string, number>();
    const muestra = filas.slice(0, 50);
    tableDefinition.fields.forEach((fieldDef: FieldDefinition) => {
        const headerLabel = fieldDef.label || fieldDef.name;
        const type = fieldDef.typeName?.toLowerCase() || '';
        let typeMinWidth = 60;
        if (type.includes('boolean') || type.includes('checkbox')) typeMinWidth = 60;
        else if (type.includes('date') || type.includes('timestamp')) typeMinWidth = 110;
        else if (type.includes('integer') || type.includes('numeric')) typeMinWidth = 80;

        const headerWidth = estimateTextWidth(headerLabel) + 20;
        const typer = typerFrom(fieldDef);
        const maxDataWidth = muestra.reduce((maxW, row) => {
            const valor = row[fieldDef.name];
            if (valor === null || valor === undefined) return maxW;
            let texto: string;
            try { texto = typer.toLocalString(valor); }
            catch { texto = String(valor); }
            return Math.max(maxW, estimateTextWidth(texto));
        }, 0);
        anchos.set(fieldDef.name, Math.min(Math.max(headerWidth, maxDataWidth, typeMinWidth), 500));
    });
    return anchos;
};

interface UseGridColumnsProps {
    tableDefinition: TableDefinition | null;
    anchosCalculados: Map<string, number>;
    fixedFields?: FixedField[];
    primaryKey: string[];
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    handleKeyPressInEditor: DefaultColumn<any>['handleKeyPressInEditor'];
    handleDeleteRow: (row: any) => void;
    handleAddRow: (row?: any) => void;
    handleVerticalEditRow: (row: any) => void;
    toggleFilterVisibility: () => void;
    abrirOpcionesDeGrilla: (anchorEl: HTMLElement) => void;
}

/**
 * Arma las columnas de la grilla.
 * Las dependencias son solo las que cambian la estructura (definición, campos fijos, anchos calculados
 * y callbacks estables). Los datos, el feedback por celda, el orden y la fila de filtros NO están acá:
 * si estuvieran, cada edición recrearía todas las columnas y react-data-grid redibujaría toda la grilla.
 */
export const useGridColumns = ({
    tableDefinition,
    anchosCalculados,
    fixedFields,
    primaryKey,
    setTableData,
    handleKeyPressInEditor,
    handleDeleteRow,
    handleAddRow,
    handleVerticalEditRow,
    toggleFilterVisibility,
    abrirOpcionesDeGrilla,
}: UseGridColumnsProps) => {

    const columns: CustomColumn<any>[] = useMemo(() => {
        if (!tableDefinition) return [];
        const fieldsToShow = tableDefinition.fields.filter((field: FieldDefinition) => {
            const isFixedField = fixedFields?.some(f => f.fieldName === field.name);
            return !isFixedField && field.visible !== false;
        });

        const defaultColumns: CustomColumn<any>[] = fieldsToShow.map((fieldDef: FieldDefinition) => {
            const isFixedField = fixedFields?.some(f => f.fieldName === fieldDef.name);
            const isFieldEditable = fieldDef.editable !== false && !isFixedField;
            const colWidth = anchosCalculados.get(fieldDef.name) ?? estimateTextWidth(fieldDef.label || fieldDef.name) + 20;
            const column: DefaultColumn<any> = {
                key: fieldDef.name,
                customType: 'default',
                tableDefinition,
                fieldDef,
                typer: typerFrom(fieldDef),
                isMandatory: tableDefinition.primaryKey.includes(fieldDef.name) || fieldDef.nullable === false,
                isNumeric: isNumericType(fieldDef.typeName),
                primaryKey,
                fixedFields,
                setTableData,
                name: fieldDef.label || cambiarGuionesBajosPorEspacios(fieldDef.name),
                resizable: true,
                sortable: true,
                editable: isFieldEditable,
                handleKeyPressInEditor,
                width: colWidth,
                minWidth: 40,
                renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => defaultColumnHeaderCellRenderer(props, fieldDef),
                renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => defaultColumnSummaryCellRenderer(props, fixedFields),
            };
            return column;
        });

        const availableActions = [
            tableDefinition.allow?.insert,
            tableDefinition.allow?.delete,
            tableDefinition.allow?.['vertical-edit']
        ].filter(Boolean).length;
        const actionColumnWidth = 60 + (availableActions * 10);

        const actionsColumn: ActionColumn<any> = {
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
            renderHeaderCell: () => React.createElement(ActionsColumnHeaderCell, {
                toggleFilterVisibility,
                handleDataGridOptions: (e: React.MouseEvent<HTMLElement>) => abrirOpcionesDeGrilla(e.currentTarget),
                handleAddRow,
                allowInsert: tableDefinition.allow?.insert,
            }),
            renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => actionsColumnSummaryCellRenderer(props),
        };

        const detailColumns: CustomColumn<any>[] = (tableDefinition.detailTables ?? []).map(detailTable => {
            const detailKey = `detail_${detailTable.abr}`;
            const column: DetailColumn<any> = {
                key: detailKey,
                customType: 'detail',
                tableDefinition,
                detailTable,
                primaryKey,
                detailKey,
                name: detailTable.label || `Detalle ${detailTable.abr}`,
                resizable: false,
                sortable: false,
                editable: false,
                width: 30,
                minWidth: 30,
                renderHeaderCell: (props: RenderHeaderCellProps<any, unknown>) => detailColumnCellHeaderRenderer(props, detailTable),
                renderSummaryCell: (props: RenderSummaryCellProps<any, unknown>) => detailColumnCellSummaryRenderer(props),
            };
            return column;
        });

        const allColumns: CustomColumn<any>[] = [actionsColumn, ...detailColumns, ...defaultColumns];
        const cantidadDeColumnas = allColumns.length;
        // En una fila de detalle la columna de acciones ocupa todo el ancho y muestra la grilla anidada
        const colSpanDetalle = (args: ColSpanArgs<any, unknown>) => args.type === 'ROW' && esFilaDetalle(args.row) ? cantidadDeColumnas : undefined;
        return allColumns.map(col => ({
            ...col,
            colSpan: col.customType === 'action' ? colSpanDetalle : col.colSpan,
            editorOptions: { closeOnExternalRowChange: false },
            renderEditCell: (props: RenderEditCellProps<any, unknown>) => allColumnsEditCellRenderer(props, allColumns as Column<any>[]),
            renderCell: (props: RenderCellProps<any, unknown>) => allColumnsCellRenderer(props),
        }));

    }, [tableDefinition, anchosCalculados, fixedFields, primaryKey, setTableData, handleKeyPressInEditor, handleDeleteRow, handleAddRow, handleVerticalEditRow, toggleFilterVisibility, abrirOpcionesDeGrilla]);

    return { columns };
};
