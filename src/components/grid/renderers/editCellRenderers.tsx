import { Column, RenderEditCellProps } from "react-data-grid";
import { CellFeedback, FieldDefinition, FixedField, TableDefinition } from "../../../types";
import InputRenderer from "../InputRenderer";
import { CustomColumn, DefaultColumn, getPrimaryKeyValues } from "../GenericDataGrid";
import { Box, Tooltip } from "@mui/material";

export const allColumnsEditCellRenderer = (
    props: RenderEditCellProps<any, any>, 
    allColumns:Column<any>[]
) => {
    const column = props.column as unknown as CustomColumn<any, unknown>;
    switch (column.customType) {
        case 'default': {
            const defaultColumn = column as DefaultColumn<any, unknown>;
            const {
                tableDefinition, 
                fixedFields, 
                primaryKey, 
                setTableData, 
                cellFeedback, 
                setCellFeedback, 
                handleEnterKeyPressInEditor,
                localCellChanges,
                setLocalCellChanges
            } = defaultColumn
            if (column.editable) { // la columna sabe que es editable porque se setea en la definicion de defaultColumns
                const fieldDefinition = tableDefinition.fields.find(f => f.name === column.key);
                // Busca si el campo es fijo en el array fixedFields
                const isFixedField = fixedFields?.some(f => f.fieldName === column.key);
                const isFieldEditableByUI = fieldDefinition?.editable !== false && !isFixedField; // No editable si es fijo
                if (!isFieldEditableByUI) {
                    // Si el campo no es editable por UI (ej. por ser fijo), no renderizamos el editor
                    return undefined
                }
                const rowId = getPrimaryKeyValues(props.row, primaryKey);
                
                return <Tooltip title={cellFeedback && cellFeedback.rowId === rowId && cellFeedback.columnKey === props.column.key?cellFeedback?.message:''}>
                    <Box>
                        <InputRenderer
                            {...props}
                            tableDefinition={tableDefinition}
                            setCellFeedback={setCellFeedback}
                            cellFeedback={cellFeedback}
                            onEnterPress={(rowIndex, columnKey) => handleEnterKeyPressInEditor(rowIndex, columnKey, allColumns)}
                            setTableData={setTableData}
                            setLocalCellChanges={setLocalCellChanges}
                            localCellChanges={localCellChanges}
                            primaryKey={primaryKey}
                        />
                    </Box>
                </Tooltip> 
            }
            return undefined
        }
        case 'detail': {
            return undefined
        }
        case 'action': {
            return undefined
        }
        default:
            return undefined;
    }

}