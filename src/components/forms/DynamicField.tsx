import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    useTheme
} from '@mui/material';
import { FieldDefinition } from '../../types';
// @ts-ignore
import typeStore from 'type-store';
import { isNumericType } from '../grid/utils/helpers';

interface DynamicFieldProps {
    fieldDef: FieldDefinition;
    value: any;
    onChange: (fieldName: string, newValue: any, isValid: boolean) => void;
    onCommit?: (fieldName: string, newValue: any, isValid: boolean) => void;
    disabled?: boolean;
    isFilterMode?: boolean; // Para usarse en los headers de filtro (más compacto)
    feedback?: 'success' | 'error'; // Indicador de éxito/error proveniente del evento save
}

export const DynamicField: React.FC<DynamicFieldProps> = ({ fieldDef, value, onChange, onCommit, disabled, isFilterMode = false, feedback }) => {

    const theme = useTheme();


    const typer = useMemo(() => typeStore.typerFrom(fieldDef), [fieldDef]);
    const isBoolean = fieldDef.typeName === 'boolean';

    // Para campos de texto/números/fechas mantenemos un valor en string (local config)
    const [localString, setLocalString] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Inicializar el valor visual desde el valor tipado (cuando cambia desde arriba)
    useEffect(() => {
        if (!isBoolean) {
            try {
                setLocalString(value !== null ? typer.toLocalString(value) : '');
                setErrorMsg(null);
            } catch (e) {
                console.warn(`Error inicializando campo ${fieldDef.name}:`, e);
                setLocalString(value === null || value === undefined ? '' : String(value));
            }
        }
    }, [value, typer, isBoolean, fieldDef.name]);

    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValueString = e.target.value;
        setLocalString(newValueString);
        let parsedValue = null;
        let isValid = true;
        let pErrorMsg: string | null = null;

        if (isFilterMode) {
            // En modo filtro devolvemos el crudo para permitir "includes()" y tipeo parcial
            parsedValue = newValueString;
        } else {
            try {
                parsedValue = typer.fromLocalString(newValueString);
                typer.validateTypedData(parsedValue);
            } catch (err: any) {
                isValid = false;
                pErrorMsg = err.message;
            }
        }

        setErrorMsg(pErrorMsg);
        // Enviamos el parsedValue siempre, pero marcamos si es válido o no
        onChange(fieldDef.name, parsedValue, isValid);

    }, [typer, onChange, fieldDef.name, isFilterMode]);

    const handleTextCommit = useCallback(() => {
        if (!onCommit) return;
        let parsedValue = null;
        let isValid = true;

        if (isFilterMode) {
            parsedValue = localString;
        } else {
            try {
                parsedValue = typer.fromLocalString(localString);
                typer.validateTypedData(parsedValue);
            } catch (err: any) {
                isValid = false;
            }
        }
        onCommit(fieldDef.name, parsedValue, isValid);
    }, [onCommit, fieldDef.name, localString, isFilterMode, typer]);

    const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTextCommit();
            // Optionally, we could unfocus the target here: e.currentTarget.blur()
        }
    }, [handleTextCommit]);

    const handleBooleanChange = useCallback((e: any) => {
        const val = e.target.value;
        let finalValue: boolean | null = null;
        if (val === 'true') finalValue = true;
        if (val === 'false') finalValue = false;

        let isValid = true;
        let pErrorMsg: string | null = null;

        if (finalValue === null && fieldDef.nullable === false) {
            isValid = false;
            pErrorMsg = 'Este campo no puede ser nulo.';
        }

        onChange(fieldDef.name, finalValue, isValid);
        if (onCommit) {
            onCommit(fieldDef.name, finalValue, isValid);
        }
    }, [onChange, onCommit, fieldDef]);

    const isDisabled = isFilterMode ? false : disabled || fieldDef.editable === false;

    if (isBoolean) {
        let boolVal = '';
        if (value === true) boolVal = 'true';
        else if (value === false) boolVal = 'false';

        // Feedback styling matching GenericDataGrid
        const cellBackgroundColor = feedback === 'error' ? theme.palette.error.light : feedback === 'success' ? theme.palette.success.light : undefined;
        const transitionStyle = 'background-color 0.3s ease-in-out';

        return (
            <FormControl fullWidth error={!!errorMsg && !isFilterMode} disabled={isDisabled} size="small" margin="dense">
                {!isFilterMode && <InputLabel>{fieldDef.name}</InputLabel>}
                <Select
                    value={boolVal}
                    label={!isFilterMode ? fieldDef.name : undefined}
                    onChange={handleBooleanChange}
                    sx={isFilterMode
                        ? { height: 25, fontSize: '0.8rem', backgroundColor: 'background.paper' }
                        : { backgroundColor: cellBackgroundColor, transition: transitionStyle }}
                >

                    {fieldDef.nullable !== false && (
                        <MenuItem value=""><em>Nulo / Sin Especificar</em></MenuItem>
                    )}
                    <MenuItem value="true">Sí (Verdadero)</MenuItem>
                    <MenuItem value="false">No (Falso)</MenuItem>
                </Select>
                {errorMsg && !isFilterMode && <FormHelperText>{errorMsg}</FormHelperText>}
            </FormControl>
        );

    }

    // Por defecto renderizamos TextField para el resto (numeros, strings, fechas via texto format local)
    // El typer localString espera el input en formato local, así que usaremos input type="text".
    // Si queremos usar type="date" nativo de html, deberíamos transformar a YYYY-MM-DD.
    // Por simplicidad e integración con TypeStore mantendremos type="text" para mantener paridad con el InputRenderer.

    // Feedback styling matching GenericDataGrid 
    const cellBackgroundColor = feedback === 'error' ? theme.palette.error.light : feedback === 'success' ? theme.palette.success.light : undefined;
    const transitionStyle = 'background-color 0.3s ease-in-out';

    return (
        <TextField
            fullWidth
            label={isFilterMode ? undefined : fieldDef.name}
            variant="outlined"
            size="small"
            margin="dense"
            value={localString}

            onChange={handleTextChange}
            disabled={isDisabled}
            error={!!errorMsg && !isFilterMode}
            helperText={!isFilterMode ? (errorMsg || (fieldDef.nullable === false ? 'Obligatorio' : '')) : undefined}
            InputLabelProps={!isFilterMode ? { shrink: true } : undefined}
            inputProps={{
                style: {
                    textAlign: isNumericType(fieldDef.typeName) ? 'right' : 'left',
                    //padding: isFilterMode ? '2px 4px' : undefined,
                    //height: isFilterMode ? 21 : undefined, // 25px total aprox con borders
                    //fontSize: isFilterMode ? '0.8rem' : undefined
                }
            }}
            sx={isFilterMode
                ? { '& .MuiOutlinedInput-root': { backgroundColor: 'background.paper' } }
                : { '& .MuiOutlinedInput-root': { backgroundColor: cellBackgroundColor, transition: transitionStyle } }}
            onBlur={handleTextCommit}
            onKeyDown={handleTextKeyDown}
        />
    );



};
