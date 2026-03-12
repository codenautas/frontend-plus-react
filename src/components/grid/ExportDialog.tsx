import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Checkbox,
    FormGroup,
    Box,
    Typography,
    CircularProgress
} from '@mui/material';
import * as XLSX from 'xlsx';
import typeAr from 'like-ar';
// @ts-ignore
import typeStore from 'type-store';
import { FieldDefinition, TableDefinition } from '../../types';

interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
    tableDefinition: TableDefinition;
    tableData: any[];
    filteredRows: any[];
    username?: string;
}

type ExportFormat = 'xlsx' | 'csv' | 'tab';

export const ExportDialog: React.FC<ExportDialogProps> = ({
    open,
    onClose,
    tableDefinition,
    tableData,
    filteredRows,
    username = 'anonymous'
}) => {
    const [format, setFormat] = useState<ExportFormat>('xlsx');
    const [options, setOptions] = useState({
        fromOtherTables: true,
        readOnly: true,
        hiddens: false
    });
    const [isPreparing, setIsPreparing] = useState(false);

    const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setOptions({
            ...options,
            [event.target.name]: event.target.checked
        });
    };

    const handlePrepareExport = () => {
        setIsPreparing(true);
        // Pequeño delay para que se vea el spinner y no bloquee el hilo principal inmediatamente
        setTimeout(async () => {
            try {
                await executeExport();
            } finally {
                setIsPreparing(false);
                onClose();
            }
        }, 100);
    };

    const executeExport = async () => {
        const fieldsDef2Export = tableDefinition.fields.filter((fieldDef: FieldDefinition) => {
            const isVisible = fieldDef.visible !== false;
            // Simplificación de la lógica legada adaptada a FieldDefinition
            return (fieldDef.inTable !== false || options.fromOtherTables)
                && isVisible
                && (fieldDef.editable !== false || options.readOnly || (tableDefinition.primaryKey?.includes(fieldDef.name)))
                // Nota: La lógica de 'hiddens' en la grilla original dependía de 'grid.view.hiddenColumns'.
                // Aquí, si hiddens es false, solo exportamos los visibles.
                && (isVisible || options.hiddens);
        });

        if (format === 'xlsx') {
            await excelExport(fieldsDef2Export);
        } else {
            textExport(fieldsDef2Export);
        }
    };

    const textExport = (fieldsToExport: FieldDefinition[]) => {
        let separator = ',';
        let dotExtension = '.csv';
        let replacer = (txt: string) => {
            return /[\n,"]/.test(txt) ? '"' + txt.replace(/"/g, '""') + '"' : txt;
        };

        if (format === 'tab') {
            separator = '|';
            dotExtension = '.tab';
            const trans: Record<string, string> = {
                '|': '\\x7C',
                '\\': '\\\\',
                '\r': '\\r',
                '\n': '\\n',
            };
            replacer = (txt: string) => {
                return txt.replace(/[|\\\r\n]/g, (char) => trans[char] || char);
            };
        }

        const data: string[][] = [];
        // Cabeceras
        data.push(fieldsToExport.map(f => f.name));

        // Filas
        filteredRows.forEach(row => {
            data.push(fieldsToExport.map(fieldDef => {
                const value = row[fieldDef.name];
                if (value == null) return '';
                // Usamos type-store para formatear a string plano
                return typeStore.typerFrom(fieldDef).toPlainString(value);
            }));
        });

        const content = data.map(line => line.map(replacer).join(separator)).join('\r\n');
        downloadFile(content, `${tableDefinition.name}${dotExtension}`, 'text/plain');
    };

    const excelExport = async (fieldsToExport: FieldDefinition[]) => {
        const wb = XLSX.utils.book_new();
        const ws: any = {};

        const STYLE_HEADER = { font: { bold: true, underline: true } };
        const STYLE_PK = { font: { bold: true } };
        const STYLE_LOOKUP = { font: { color: { rgb: "5588DD" } } };

        // Hoja 1: Datos
        fieldsToExport.forEach((field, iColumn) => {
            ws[XLSX.utils.encode_cell({ c: iColumn, r: 0 })] = { t: 's', v: field.name, s: STYLE_HEADER };
        });

        filteredRows.forEach((row, iRow) => {
            fieldsToExport.forEach((fieldDef, iColumn) => {
                const value = row[fieldDef.name];
                if (value != null) {
                    const typer = typeStore.typerFrom(fieldDef);
                    const excelValue = typer.toExcelValue(value);
                    const excelType = typer.toExcelType(value);
                    const cell: any = { t: excelType, v: excelValue };

                    if (fieldDef.typeName === 'interval') {
                        cell.z = '[h]:mm:ss';
                    }
                    if (tableDefinition.primaryKey?.includes(fieldDef.name)) {
                        cell.s = STYLE_PK;
                    } else if (fieldDef.editable === false) {
                        cell.s = STYLE_LOOKUP;
                    }
                    ws[XLSX.utils.encode_cell({ c: iColumn, r: iRow + 1 })] = cell;
                }
            });
        });

        ws["!ref"] = XLSX.utils.encode_range({
            s: { c: 0, r: 0 },
            e: { c: fieldsToExport.length - 1, r: filteredRows.length }
        });

        // Hoja 2: Metadata
        const metaWs: any = {};
        let metaRow = 0;

        const addMetaRow = (label: string, value: string) => {
            metaWs[XLSX.utils.encode_cell({ c: 0, r: metaRow })] = { t: 's', v: label, s: STYLE_HEADER };
            metaWs[XLSX.utils.encode_cell({ c: 1, r: metaRow })] = { t: 's', v: value };
            metaRow++;
        };

        addMetaRow('table', tableDefinition.name);
        addMetaRow('date', new Date().toISOString());
        addMetaRow('user', username);

        metaWs["!ref"] = XLSX.utils.encode_range({
            s: { c: 0, r: 0 },
            e: { c: 1, r: metaRow - 1 }
        });

        const sheet1name = tableDefinition.name.length > 27 ? tableDefinition.name.slice(0, 27) + '...' : tableDefinition.name;
        const sheet2name = tableDefinition.name !== "metadata" ? "metadata" : "meta-data";

        XLSX.utils.book_append_sheet(wb, ws, sheet1name);
        XLSX.utils.book_append_sheet(wb, metaWs, sheet2name);

        const wbFile = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const buf = new ArrayBuffer(wbFile.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < wbFile.length; i++) view[i] = wbFile.charCodeAt(i) & 0xFF;

        downloadFile(buf, `${tableDefinition.name}.xlsx`, 'application/octet-stream');
    };

    const downloadFile = (content: any, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Exportar Datos</DialogTitle>
            <DialogContent>
                {isPreparing ? (
                    <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Preparando exportación...</Typography>
                    </Box>
                ) : (
                    <Box sx={{ mt: 1 }}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Formato</FormLabel>
                            <RadioGroup
                                value={format}
                                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                            >
                                <FormControlLabel value="xlsx" control={<Radio />} label="Excel (.xlsx)" />
                                <FormControlLabel value="tab" control={<Radio />} label="Tabulado (.tab | )" />
                                <FormControlLabel value="csv" control={<Radio />} label="CSV (.csv , )" />
                            </RadioGroup>
                        </FormControl>

                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" gutterBottom>Opciones de campos:</Typography>
                            <FormGroup>
                                <FormControlLabel
                                    control={<Checkbox checked={options.fromOtherTables} onChange={handleOptionChange} name="fromOtherTables" />}
                                    label="Desde otras tablas"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={options.readOnly} onChange={handleOptionChange} name="readOnly" />}
                                    label="Solo lectura"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={options.hiddens} onChange={handleOptionChange} name="hiddens" />}
                                    label="Ocultos"
                                />
                            </FormGroup>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isPreparing}>Cancelar</Button>
                <Button onClick={handlePrepareExport} variant="contained" disabled={isPreparing}>
                    Descargar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
