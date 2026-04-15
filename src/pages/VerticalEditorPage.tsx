import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { TableDefinition, FixedField } from '../types';
import { TypedField } from '../components/forms/TypedField';
import { useTableRecordSave } from '../hooks/useTableRecordSave';
import { getPrimaryKeyValues, sameValue } from '../components/grid/utils/helpers';

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
    const feedbackTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({}); // timer por campo

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

        // Diff check: si el valor es el mismo que está guardado en backend, no persistimos.
        // Usamos sameValue para comparación robusta (Dates, null/undefined, etc.)
        if (sameValue(newValue, lastSavedData[fieldName])) {
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

            if (wasNewItem) {
                // Primer guardado: pintar todos los campos con valor en la respuesta del servidor
                const feedbackPatch: Record<string, 'success'> = {};
                for (const key of Object.keys(responseRow)) {
                    const val = responseRow[key];
                    if (val !== null && val !== undefined && val !== '') {
                        feedbackPatch[key] = 'success';
                        if (feedbackTimersRef.current[key]) clearTimeout(feedbackTimersRef.current[key]);
                        feedbackTimersRef.current[key] = setTimeout(() =>
                            setFieldFeedback(prev => { const n = { ...prev }; delete n[key]; return n; })
                            , 3000);
                    }
                }
                setFieldFeedback(prev => ({ ...prev, ...feedbackPatch }));
            } else {
                // Guardado parcial: solo el campo modificado
                setFieldFeedback(prev => ({ ...prev, [fieldName]: 'success' }));
                if (feedbackTimersRef.current[fieldName]) clearTimeout(feedbackTimersRef.current[fieldName]);
                feedbackTimersRef.current[fieldName] = setTimeout(() =>
                    setFieldFeedback(prev => { const n = { ...prev }; delete n[fieldName]; return n; })
                    , 3000);
            }

            onSaveSuccess(responseRow, wasNewItem);

        } catch (err: any) {
            setGlobalError(err.message || 'Error desconocido al guardar.');
            // Error multi-feedback: cada campo tiene su propio timer
            setFieldFeedback(prev => ({ ...prev, [fieldName]: 'error' }));
            if (feedbackTimersRef.current[fieldName]) clearTimeout(feedbackTimersRef.current[fieldName]);
            feedbackTimersRef.current[fieldName] = setTimeout(() =>
                setFieldFeedback(prev => { const n = { ...prev }; delete n[fieldName]; return n; })
                , 5000);

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
            <DialogTitle sx={{ px: 0, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography component="div" variant="h6">
                    {isNewRow ? 'Nuevo Registro' : 'Editar Registro'} - {tableDefinition.title || tableName}
                </Typography>
                <IconButton onClick={onClose} size="small" edge="end">
                    <CloseIcon />
                </IconButton>
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
                        const isMandatory = field.nullable === false || tableDefinition.primaryKey.includes(field.name);
                        return (
                            <Box key={field.name} sx={{ width: '100%', maxWidth: '100%' }}>
                                <TypedField
                                    fieldDef={field}
                                    value={formData[field.name]}
                                    onChange={handleFieldChange}
                                    onCommit={handleCommit}
                                    disabled={isFixed || field.editable === false}
                                    feedback={fieldFeedback[field.name]}
                                    isMandatory={isMandatory}
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

