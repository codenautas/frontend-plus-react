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
import { isNumericType, isDateTimeType } from '../grid/utils/helpers';
import { useRef } from 'react';

interface TypedFieldProps {
    fieldDef: FieldDefinition;
    value: any;
    onChange: (fieldName: string, newValue: any, isValid: boolean) => void;
    onCommit?: (fieldName: string, newValue: any, isValid: boolean) => void;
    disabled?: boolean;
    isFilterMode?: boolean; // Para usarse en los headers de filtro (más compacto)
    feedback?: 'success' | 'error'; // Indicador de éxito/error proveniente del evento save
}

export const TypedField: React.FC<TypedFieldProps> = ({ fieldDef, value, onChange, onCommit, disabled, isFilterMode = false, feedback }) => {


    const theme = useTheme();


    const typer = useMemo(() => typeStore.typerFrom(fieldDef), [fieldDef]);
    const isBoolean = fieldDef.typeName === 'boolean';

    // Para campos de texto/números/fechas mantenemos un valor en string (local config)
    const [localString, setLocalString] = useState<string>(() => {
        if (isBoolean) return '';
        if (isFilterMode) return value !== null && value !== undefined ? String(value) : '';
        try {
            return value !== null ? typer.toLocalString(value) : '';
        } catch (e) {
            return value === null || value === undefined ? '' : String(value);
        }
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const lastValueRef = useRef<any>(value);

    // Inicializar el valor visual desde el valor tipado (solo si cambia externamente)
    useEffect(() => {
        if (!isBoolean) {
            // Solo actualizamos localString si el value real cambió desde fuera (no por nuestro propio tipeo)
            if (value !== lastValueRef.current) {
                lastValueRef.current = value;
                if (isFilterMode) {
                    setLocalString(value !== null && value !== undefined ? String(value) : '');
                } else {
                    try {
                        setLocalString(value !== null ? typer.toLocalString(value) : '');
                    } catch (e) {
                        setLocalString(value === null || value === undefined ? '' : String(value));
                    }
                }
                setErrorMsg(null);
            }
        }
    }, [value, typer, isBoolean, isFilterMode]);

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
        lastValueRef.current = parsedValue; // Seteamos el ref para que el useEffect no lo pise al re-renderizar
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

    // Determinar el input type nativo en base a las 3 categorias del helper
    let inputType = 'text';
    if (isNumericType(fieldDef.typeName) && !isFilterMode) {
        inputType = 'number';
    } 
    // Las fechas/tiempos y LOS FILTROS se mantienen como "text" por ahora para facilitar filtro parcial
    // sin pickers nativos y sin bloqueo de entrada de caracteres no numéricos parciales.



    // Feedback styling matching GenericDataGrid 
    const cellBackgroundColor = feedback === 'error' ? theme.palette.error.light : feedback === 'success' ? theme.palette.success.light : undefined;
    const transitionStyle = 'background-color 0.3s ease-in-out';

    return (
        <TextField
            fullWidth
            type={inputType}
            label={isFilterMode ? undefined : fieldDef.name}
            variant="outlined"
            size="small"
            margin={isFilterMode ? "none" : "dense"}
            value={localString}
            onChange={handleTextChange}
            disabled={isDisabled}
            error={!!errorMsg && !isFilterMode}
            helperText={!isFilterMode ? (errorMsg || (fieldDef.nullable === false ? 'Obligatorio' : '')) : undefined}
            InputLabelProps={!isFilterMode ? { shrink: true } : undefined}
            inputProps={{
                style: {
                    textAlign: isNumericType(fieldDef.typeName) ? 'right' : 'left',
                }
            }}
            sx={isFilterMode
                ? { 
                    '& .MuiOutlinedInput-root': { 
                        backgroundColor: 'background.paper',
                        height: 30, // Altura fija para alineación
                        fontSize: '0.8rem',
                        padding: '0 8px'
                    } 
                }
                : { '& .MuiOutlinedInput-root': { backgroundColor: cellBackgroundColor, transition: transitionStyle } }}
            onBlur={handleTextCommit}
            onKeyDown={handleTextKeyDown}
        />
    );



};
