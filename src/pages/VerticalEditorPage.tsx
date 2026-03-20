import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
    Box,
    CircularProgress
} from '@mui/material';
import { TableDefinition, FixedField } from '../types';
import { TypedField } from '../components/forms/TypedField';
import { useTableRecordSave } from '../hooks/useTableRecordSave';
import { getPrimaryKeyValues } from '../components/grid/utils/helpers';

// @ts-ignore
import typeStore from 'type-store';

export interface VerticalEditorPageProps {
    tableName: string;
    tableDefinition: TableDefinition;
    initialData: Record<string, any>; // Puede tener nulos
    fixedFields?: FixedField[];
    isNewRow?: boolean;
    onSaveSuccess: (savedRow: any, isNewRow: boolean) => void;
    onClose: () => void;
}

export const VerticalEditorPage: React.FC<VerticalEditorPageProps> = ({
    tableName,
    tableDefinition,
    initialData,
    fixedFields,
    isNewRow = false,
    onSaveSuccess,
    onClose: onClose
}) => {
    const { saveRecord } = useTableRecordSave();

    // Convertimos isNewRow y formData en referencias dinámicas para permitir múltiples auto-saves
    const [internalIsNewRow, setInternalIsNewRow] = useState(isNewRow);

    // Estado principal del formulario
    const [formData, setFormData] = useState<Record<string, any>>(initialData);

    // Rastreamos el último estado guardado en backend para evitar tráfico redundante
    const [lastSavedData, setLastSavedData] = useState<Record<string, any>>(initialData);

    // Rastreamos validez de campos individualmente
    const [validityMap, setValidityMap] = useState<Record<string, boolean>>({});

    const [globalError, setGlobalError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [fieldFeedback, setFieldFeedback] = useState<Record<string, 'success' | 'error'>>({});
    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleFieldChange = useCallback((fieldName: string, newValue: any, isValid: boolean) => {
        setFormData(prev => ({ ...prev, [fieldName]: newValue }));

        setValidityMap(prev => ({ ...prev, [fieldName]: isValid }));
        setGlobalError(null);
    }, []);

    const isFormValid = useMemo(() => {
        // Un campo es inválido si explícitamente está marcado como false por DynamicField
        for (const key in validityMap) {
            if (validityMap[key] === false) return false;
        }

        // Además, verificar campos no nulos (isPk o nullable===false)
        for (const field of tableDefinition.fields) {
            const isMandatory = field.nullable === false || field.isPk;
            const val = formData[field.name];
            if (isMandatory && (val === null || val === undefined || String(val).trim() === '')) {
                // Hay fixed fields? Si es fixed field e inicializa como nulo (raro), igual no es válido.
                // Usualmente el initialData ya trae los fixedFields poblados
                return false;
            }
        }

        return true;
    }, [formData, validityMap, tableDefinition.fields]);

    const handleCommit = useCallback(async (fieldName: string, newValue: any, isValid: boolean) => {
        // En un autosave, si el campo es inválido localmente, no enviamos
        if (!isValid) return;

        // Diff check: si el valor tipeado/seleccionado es el mismo que está guardado en backend, ignoramos.
        // Hacemos una comparación simple; para objetos más complejos podría requerir deep equal,
        // pero para Date/Numbers/Strings que pasan por DynamicField, el === contra el primitive suele bastar 
        // o si es string vs number (ej '0' vs 0) forzamos a localString? typer normaliza los valores
        if (newValue === lastSavedData[fieldName]) {
            return;
        }

        const potentialUpdatedRow = { ...formData, [fieldName]: newValue };

        let areAllMandatoryFieldsFilled = true;
        for (const field of tableDefinition.fields) {
            const isMandatory = field.nullable === false || field.isPk;
            const val = potentialUpdatedRow[field.name];
            if (isMandatory && (val === null || val === undefined || String(val).trim() === '')) {
                areAllMandatoryFieldsFilled = false;
                break;
            }
        }

        if (internalIsNewRow && !areAllMandatoryFieldsFilled) {
            // Faltan campos para poder insertar la fila nueva, no guardamos en el backend todavía
            return;
        }

        setIsSaving(true);
        setGlobalError(null);

        try {
            const response = await saveRecord({
                tableName,
                tableDefinition,
                isNewRow: internalIsNewRow,
                formData: potentialUpdatedRow,
                initialData,
                targetFieldName: fieldName
            });

            const responseRow = { ...response.row };

            // Actualizamos la data interna y nuestro "último guardado" con lo devuelto por el servidor
            setFormData(prev => ({ ...prev, ...responseRow }));
            setLastSavedData(prev => ({ ...prev, ...responseRow }));


            // Si la logramos crear, ya no es "nueva"
            const wasNewItem = internalIsNewRow;
            if (internalIsNewRow) {
                setInternalIsNewRow(false);
            }

            // Exito multi-feedback
            setFieldFeedback(prev => ({ ...prev, [fieldName]: 'success' }));
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setFieldFeedback({}), 3000);

            onSaveSuccess(responseRow, wasNewItem);

        } catch (err: any) {
            setGlobalError(err.message || 'Error desconocido al guardar.');
            // Error multi-feedback
            setFieldFeedback(prev => ({ ...prev, [fieldName]: 'error' }));
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setFieldFeedback({}), 5000);

        } finally {
            setIsSaving(false);
        }
    }, [
        saveRecord, formData, initialData, internalIsNewRow,
        tableName, tableDefinition, onSaveSuccess
    ]);




    // Campos a mostrar: todos menos los audit o sistemáticos (opcional, por ahora todos los fields expuestos en la UI)
    // También consideramos ocultar los fixed fields o mostrarlos deshabilitados
    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <DialogTitle sx={{ px: 0, pt: 0 }}>
                {isNewRow ? 'Nuevo Registro' : 'Editar Registro'} - {tableDefinition.title || tableName}
            </DialogTitle>

            <DialogContent dividers sx={{ px: 2, flexGrow: 1, py: 1 }}>
                {globalError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {globalError}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {tableDefinition.fields.map(field => {
                        const isFixed = fixedFields?.some(ff => ff.fieldName === field.name);
                        return (
                            <Box key={field.name} sx={{ width: '100%', maxWidth: 500 }}>
                                <TypedField
                                    fieldDef={field}
                                    value={formData[field.name]}
                                    onChange={handleFieldChange}
                                    onCommit={handleCommit}
                                    disabled={isFixed || field.editable === false}
                                    feedback={fieldFeedback[field.name]}
                                />
                            </Box>

                        );
                    })}
                </Box>

            </DialogContent>

            <DialogActions sx={{ px: 0, pb: 0, pt: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    {isSaving && <CircularProgress size={20} sx={{ ml: 2 }} />}
                    <span style={{ marginLeft: 10, fontSize: '0.8rem', color: '#666' }}>
                        {isSaving ? 'Guardando...' : 'Cambios auto-guardados'}
                    </span>
                </Box>
                <Button variant="outlined" onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Box>
    );
};

