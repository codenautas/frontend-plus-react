import { RenderEditCellProps } from "react-data-grid";
import InputRenderer from "../InputRenderer";
import { ColumnaDeGrilla, esColumnaPropia } from "../GenericDataGrid";
import { FilaDeDatos, FilaDeResumen } from "../../../types";

export const allColumnsEditCellRenderer = (
    props: RenderEditCellProps<FilaDeDatos, FilaDeResumen>, 
    allColumns: ColumnaDeGrilla[]
) => {
    const column = props.column;
    if (!esColumnaPropia(column)) return undefined;
    switch (column.customType) {
        case 'default': {
            const defaultColumn = column;
            const {
                tableDefinition,
                fixedFields,
                primaryKey,
                setTableData,
                handleKeyPressInEditor,
                registrarEditor
            } = defaultColumn
            
            if (column.editable) { 
                const fieldDefinition = tableDefinition.fields.find(f => f.name === column.key);
                
                // Busca si el campo es fijo en el array fixedFields
                const isFixedField = fixedFields?.some(f => f.fieldName === column.key);
                const isFieldEditableByUI = fieldDefinition?.editable !== false && !isFixedField; // No editable si es fijo
                
                if (!isFieldEditableByUI) {
                    // Si el campo no es editable por UI (ej. por ser fijo), no renderizamos el editor
                    return undefined
                }
                
                // El feedback (color y mensaje) lo lee InputRenderer del EstadoGrilla
                return (
                    <InputRenderer
                        {...props}
                        tableDefinition={tableDefinition}
                        onKeyPress={(rowIndex, columnKey, event, handleCommit) => handleKeyPressInEditor(rowIndex, columnKey, event, allColumns, handleCommit)}
                        registrarEditor={registrarEditor}
                        setTableData={setTableData}
                        primaryKey={primaryKey}
                    />
                )
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