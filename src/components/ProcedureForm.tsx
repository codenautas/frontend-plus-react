import React, { useState, FormEvent, ChangeEvent, useCallback, useMemo } from 'react';
import { ProcedureDef, ProcedureParameter } from "backend-plus";
import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

import { useApiCall } from '../hooks/useApiCall';

import {
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    FormHelperText,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Divider,
    Paper
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { cambiarGuionesBajosPorEspacios } from '../utils/functions';

// Importamos el mapa de componentes de resultado
import { resultsOk } from '../pages/procedure-results/resultsOk';

const ProcedureForm: React.FC = () => {
    const { procedureName } = useParams<{ procedureName: string }>();
    const { clientContext } = useApp();

    const { callApi, loading: apiLoading, error: apiError } = useApiCall<any>();

    const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [executionLog, setExecutionLog] = useState<string[]>([]);
    const [procedureResultData, setProcedureResultData] = useState<any>(null);

    const procedure: ProcedureDef | undefined = useMemo(() => {
        if (procedureName && clientContext?.procedure) {
            return clientContext.procedure[procedureName];
        }
        return undefined;
    }, [procedureName, clientContext]);

    const [formValues, setFormValues] = useState<Record<string, any>>(() => {
        if (!procedure) return {};
        const initialValues: Record<string, any> = {};
        procedure.parameters.forEach(param => {
            if (param.defaultValue !== undefined) {
                initialValues[param.name] = param.defaultValue;
            } else if (param.specialDefaultValue) {
                switch (param.specialDefaultValue) {
                    case 'current_date':
                        initialValues[param.name] = new Date().toISOString().split('T')[0];
                        break;
                    case 'current_datetime':
                        const now = new Date();
                        initialValues[param.name] = now.toISOString().substring(0, 16);
                        break;
                    default:
                        initialValues[param.name] = param.specialDefaultValue;
                        break;
                }
            } else {
                initialValues[param.name] = '';
            }
        });
        return initialValues;
    });

    React.useEffect(() => {
        if (procedure) {
            setValidationErrors({});
            setSuccessMessage(null);
            setProcedureResultData(null);
            const newInitialValues: Record<string, any> = {};
            procedure.parameters.forEach(param => {
                if (param.defaultValue !== undefined) {
                    newInitialValues[param.name] = param.defaultValue;
                } else if (param.specialDefaultValue) {
                    switch (param.specialDefaultValue) {
                        case 'current_date':
                            newInitialValues[param.name] = new Date().toISOString().split('T')[0];
                            break;
                        case 'current_datetime':
                            const now = new Date();
                            newInitialValues[param.name] = now.toISOString().substring(0, 16);
                            break;
                        default:
                            newInitialValues[param.name] = param.specialDefaultValue;
                            break;
                    }
                } else {
                    newInitialValues[param.name] = '';
                }
            });
            setFormValues(newInitialValues);
            setExecutionLog([]);
        }
    }, [procedure]);

    const addLogMessage = useCallback((message: string, isError: boolean = false) => {
        const timestamp = new Date().toLocaleTimeString('es-AR');
        setExecutionLog(prev => [...prev, `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}`]);
    }, []);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>, child?: React.ReactNode) => {
        const { name, value } = e.target;
        let newValue: any = value;

        if ((e.target as HTMLInputElement).type === 'checkbox') {
            newValue = (e.target as HTMLInputElement).checked;
        }

        setFormValues(prevValues => ({
            ...prevValues,
            [name]: newValue,
        }));
        setValidationErrors(prev => ({ ...prev, [name]: null }));
        setSuccessMessage(null);
        setProcedureResultData(null);
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setValidationErrors({});
        setSuccessMessage(null);
        setExecutionLog([]);
        setProcedureResultData(null);

        if (!procedure) {
            addLogMessage('Error: La definición del procedimiento no está disponible.', true);
            return;
        }

        addLogMessage(`Iniciando ejecución del procedimiento: ${procedure.action}...`);

        const paramsToSend: Record<string, any> = {};
        let currentValidationErrors: Record<string, string | null> = {};
        let hasOverallError = false;

        for (const param of procedure.parameters) {
            let value = formValues[param.name];
            let processedValue: any = value;
            let paramError: string | null = null;

            switch (param.typeName) {
                case 'decimal':
                case 'double':
                    if (value === '' || value === null) {
                        processedValue = null;
                    } else {
                        processedValue = parseFloat(value);
                        if (isNaN(processedValue)) {
                            paramError = `El valor para "${param.label || param.name}" no es un número válido.`;
                        }
                    }
                    break;
                case 'integer':
                case 'bigint':
                    if (value === '' || value === null) {
                        processedValue = null;
                    } else {
                        processedValue = parseInt(value, 10);
                        if (isNaN(processedValue)) {
                            paramError = `El valor para "${param.label || param.name}" no es un entero válido.`;
                        }
                    }
                    break;
                case 'boolean':
                    processedValue = !!value;
                    break;
                case 'jsonb':
                case 'jsona':
                    if (value === '' || value === null) {
                        processedValue = null;
                    } else {
                        try {
                            processedValue = JSON.parse(value);
                        } catch (jsonError: any) {
                            paramError = `Error en el formato JSON para "${param.label || param.name}": ${jsonError.message}`;
                        }
                    }
                    break;
                case 'bytea':
                    processedValue = value instanceof File ? value : (value === '' ? null : value);
                    break;
                case 'text':
                case 'date':
                case 'timestamp':
                case 'time':
                case 'interval':
                case 'tsrange':
                case 'time_range':
                case 'daterange':
                default:
                    processedValue = value === '' ? null : value;
                    break;
            }

            const hasDefaultValue = param.defaultValue !== undefined || param.specialDefaultValue !== undefined;
            const isEmpty = processedValue === null || processedValue === undefined || (typeof processedValue === 'string' && processedValue.trim() === '');
            
            if (!hasDefaultValue && isEmpty) {
                paramError = `El campo "${param.label || param.name}" es obligatorio y no puede estar vacío.`;
            }

            if (paramError) {
                currentValidationErrors[param.name] = paramError;
                hasOverallError = true;
                addLogMessage(`Error de validación para "${param.label || param.name}": ${paramError}`, true);
            }

            paramsToSend[param.name] = processedValue;
        }

        if (hasOverallError) {
            setValidationErrors(currentValidationErrors);
            addLogMessage('No se puede ejecutar el procedimiento debido a errores de validación en el formulario.', true);
            return;
        }

        addLogMessage(`Parámetros a enviar: ${JSON.stringify(paramsToSend, null, 2)}`);

        try {
            addLogMessage('Invocando procedimiento a través de useApiCall...');
            const result = await callApi(procedure.action, paramsToSend);
            
            if (result !== undefined) {
                setSuccessMessage(procedure.resultOk || 'Procedimiento ejecutado con éxito.');
                addLogMessage('Procedimiento ejecutado con éxito.');
                addLogMessage(`Resultado: ${JSON.stringify(result, null, 2)}`);
                setProcedureResultData(result);
                console.log('Resultado del procedimiento:', result);
            } else {
                addLogMessage('Procedimiento finalizado con errores.', true);
            }
        } catch (err: any) {
            console.error('Error al ejecutar el procedimiento (capturado en ProcedureForm):', err);
            addLogMessage(`Error en la ejecución: ${err.message || 'Error desconocido.'}`, true);
        } finally {
            addLogMessage('Ejecución finalizada.');
        }
    };

    const renderInputField = useCallback((param: ProcedureParameter) => {
        const hasError = !!validationErrors[param.name];
        const errorMessage = validationErrors[param.name];

        const commonProps: any = {
            id: param.name,
            name: param.name,
            label: param.label || param.name,
            variant: "outlined" as "outlined",
            fullWidth: true,
            margin: "dense" as "dense",
            required: !(param.defaultValue !== undefined || param.specialDefaultValue !== undefined),
            size: "small" as "small",
            helperText: errorMessage || param.description,
            error: hasError,
            disabled: apiLoading,
            onChange: handleChange,
            sx: { fontSize: '0.8rem' }
        };

        if (param.options && param.options.length > 0) {
            return (
                <FormControl fullWidth margin="dense" size="small" error={hasError} required={commonProps.required}>
                    <InputLabel id={`${param.name}-label`} sx={{ fontSize: '0.8rem' }}>{param.label || param.name}</InputLabel>
                    <Select
                        labelId={`${param.name}-label`}
                        value={formValues[param.name] === undefined ? '' : formValues[param.name]}
                        onChange={handleChange}
                        name={param.name}
                        id={param.name}
                        label={param.label || param.name}
                        disabled={apiLoading}
                        sx={{ fontSize: '0.8rem' }}
                        renderValue={(selected) => (
                            <Typography sx={{ fontSize: '0.8rem' }}>{selected as string}</Typography>
                        )}
                    >
                        {(!commonProps.required || formValues[param.name] === '') && <MenuItem value="" sx={{ fontSize: '0.8rem' }}><em>Seleccione...</em></MenuItem>}
                        {param.options.map(option => (
                            <MenuItem key={option} value={option} sx={{ fontSize: '0.8rem' }}>
                                {option}
                            </MenuItem>
                        ))}
                    </Select>
                    {(param.description || errorMessage) && <FormHelperText sx={{ fontSize: '0.7rem' }}>{errorMessage || param.description}</FormHelperText>}
                </FormControl>
            );
        }

        switch (param.typeName) {
            case 'text':
            case 'interval':
            case 'tsrange':
            case 'time_range':
            case 'daterange':
                return <TextField type="text" value={formValues[param.name] || ''} {...commonProps} />;
            case 'decimal':
            case 'double':
                return <TextField type="number" inputProps={{ step: "any", style: { fontSize: '0.8rem' } }} value={formValues[param.name] || ''} {...commonProps} />;
            case 'integer':
            case 'bigint':
                return <TextField type="number" inputProps={{ step: "1", style: { fontSize: '0.8rem' } }} value={formValues[param.name] || ''} {...commonProps} />;
            case 'boolean':
                return (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!formValues[param.name]}
                                onChange={handleChange}
                                name={param.name}
                                id={param.name}
                                disabled={apiLoading}
                                size="small"
                            />
                        }
                        label={<Typography sx={{ fontSize: '0.8rem', color: hasError ? 'error.main' : 'inherit' }}>{param.label || param.name}</Typography>}
                        sx={{ mt: 1, mb: 0 }}
                    />
                );
            case 'date':
            case 'timestamp':
            case 'time':
                return <TextField type={param.typeName === 'date' ? 'date' : param.typeName === 'timestamp' ? 'datetime-local' : 'time'} value={formValues[param.name] || ''} {...commonProps} InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }} />;
            case 'jsonb':
            case 'jsona':
                return <TextField multiline rows={5} value={formValues[param.name] || ''} {...commonProps} InputProps={{ sx: { fontSize: '0.8rem' } }} />;
            case 'bytea':
                return (
                    <FormControl fullWidth margin="dense" error={hasError} required={commonProps.required}>
                        <Typography variant="body2" color="textSecondary" component="label" htmlFor={param.name} sx={{ fontSize: '0.8rem', color: hasError ? 'error.main' : 'text.secondary' }}>
                            {param.label || param.name}
                        </Typography>
                        <input
                            type="file"
                            id={param.name}
                            name={param.name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const files = e.target.files;
                                setFormValues(prev => ({ ...prev, [param.name]: files && files.length > 0 ? files[0] : undefined }));
                            }}
                            disabled={apiLoading}
                            style={{ padding: '6px 0', fontSize: '0.8rem' }}
                        />
                        {(param.description || errorMessage) && <FormHelperText sx={{ fontSize: '0.7rem' }}>{errorMessage || param.description}</FormHelperText>}
                    </FormControl>
                );
            default:
                return <TextField type="text" value={formValues[param.name] || ''} {...commonProps} />;
        }
    }, [formValues, handleChange, apiLoading, validationErrors]);

    // Contenido a renderizar dentro de la sección de resultado
    const ResultDisplayContent = useMemo(() => {
        if (!procedureResultData || !procedure?.resultOk) return null;

        const ComponentToRender = resultsOk[procedure.resultOk];

        if (ComponentToRender) {
            return <ComponentToRender data={procedureResultData} />;
        } else {
            return (
                <Paper elevation={2} sx={{ p: 2, mt: 0, bgcolor: 'warning.light' }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
                        el componente para resolver el resultOk: '{procedure.resultOk}' definido en el procedure no existe o no está mapeado.
                    </Typography>
                    <Box sx={{ 
                        bgcolor: 'warning.dark', 
                        p: 1, 
                        borderRadius: 1, 
                    }}>
                        <pre style={{ margin: 0, fontSize: '0.75rem', color: 'white' }}>
                            {JSON.stringify(procedureResultData, null, 2)}
                        </pre>
                    </Box>
                </Paper>
            );
        }
    }, [procedureResultData, procedure]);


    if (!procedure) {
        return (
            <Box sx={{
                p: 2,
                width: '100%',
                boxSizing: 'border-box',
                mt: 0,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 3,
                textAlign: 'center'
            }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    Cargando procedimiento o no encontrado...
                </Typography>
            </Box>
        );
    }

    return (
        // Esta es la Box más externa que ahora controlará el scroll
        <Box sx={{
            p: 2,
            ml: 1,
            mt: 2,
            mr: 1,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3,
            fontSize: '0.8rem',
            maxHeight: 'calc(100vh - 100px)', // Ajusta esta altura máxima según el espacio disponible en tu layout
            overflowY: 'auto', // Habilita el scroll vertical para todo el contenido de esta Box
            overflowX: 'hidden' // Oculta el scroll horizontal si no es necesario para el contenedor principal
        }}>
            <Typography variant="h5" component="h2" gutterBottom align="left">
                {cambiarGuionesBajosPorEspacios(procedure.proceedLabel || procedure.action)}
            </Typography>

            {Object.values(validationErrors).some(err => err !== null) && (
                <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>
                    Por favor, corrige los errores en el formulario antes de enviar.
                    <ul>
                        {Object.values(validationErrors).map((err, idx) => err && <li key={idx}>{err}</li>)}
                    </ul>
                </Alert>
            )}
            {!Object.values(validationErrors).some(err => err !== null) && apiError && <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>{apiError.message}</Alert>}
            {!Object.values(validationErrors).some(err => err !== null) && !apiError && successMessage && <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }}>{successMessage}</Alert>}

            <form onSubmit={handleSubmit}>
                {procedure.parameters.map(param => (
                    <div key={param.name}>
                        {renderInputField(param)}
                    </div>
                ))}

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={apiLoading || Object.values(validationErrors).some(err => err !== null)}
                    sx={{ mt: 2 }}
                    size="medium"
                    startIcon={apiLoading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    {apiLoading ? 'Ejecutando...' : (procedure.proceedLabel || 'Ejecutar')}
                </Button>
            </form>

            {/* Renderizamos el contenido del resultado, sin scroll propio aquí */}
            {ResultDisplayContent && (
                <Box sx={{ mt: 2 }}> {/* Margen superior para separar del botón */}
                    {ResultDisplayContent}
                </Box>
            )}
            
            {/* Área para el registro de ejecución del procedimiento */}
            {executionLog.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '0.9rem' }}>
                        Registro de Ejecución
                    </Typography>
                    <Box
                        sx={{
                            bgcolor: 'grey.100',
                            p: 2,
                            borderRadius: 1,
                            maxHeight: '200px', // Este log puede tener su propio scroll interno si es muy largo
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {executionLog.map((log, index) => (
                            <Typography
                                key={index}
                                component="pre"
                                sx={{
                                    margin: 0,
                                    color: log.includes('ERROR:') ? 'error.main' : 'text.primary',
                                    fontSize: 'inherit'
                                }}
                            >
                                {log}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default ProcedureForm;