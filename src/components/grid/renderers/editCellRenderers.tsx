import { Column, RenderEditCellProps } from "react-data-grid";
import { CellFeedback, FieldDefinition, FixedField, TableDefinition } from "../../../types";
import InputRenderer from "../InputRenderer";

export const defaultColumnEditCellRenderer = (
    props: RenderEditCellProps<any, any>, 
    tableDefinition:TableDefinition, 
    fixedFields: FixedField[] | undefined,
    primaryKey: string[],
    setCellFeedback: React.Dispatch<React.SetStateAction<CellFeedback | null>>,
    setTableData: React.Dispatch<React.SetStateAction<any[]>>,
    localCellChanges: Map<string, Set<string>>,
    setLocalCellChanges: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>,
    handleEnterKeyPressInEditor: Function,
    allColumns:Column<any>[]
) => {
    const {column} = props;
    if (column.editable) { // la columna sabe que es editable porque se setea en la definicion de defaultColumns
        const fieldDefinition = tableDefinition.fields.find(f => f.name === column.key);
        // Busca si el campo es fijo en el array fixedFields
        const isFixedField = fixedFields?.some(f => f.fieldName === column.key);
        const isFieldEditableByUI = fieldDefinition?.editable !== false && !isFixedField; // No editable si es fijo

        if (!isFieldEditableByUI) {
            // Si el campo no es editable por UI (ej. por ser fijo), no renderizamos el editor
            return undefined
        }

        return <InputRenderer
            {...props}
            tableDefinition={tableDefinition}
            setCellFeedback={setCellFeedback}
            onEnterPress={(rowIndex, columnKey) => handleEnterKeyPressInEditor(rowIndex, columnKey, allColumns)}
            setTableData={setTableData}
            setLocalCellChanges={setLocalCellChanges}
            localCellChanges={localCellChanges}
            primaryKey={primaryKey}
        />
    }
}

export const actionsColumnEditCellRenderer = (props: RenderEditCellProps<any, unknown>) => null

export const detailColumnCellEditRenderer = (props: RenderEditCellProps<any, unknown>) => null