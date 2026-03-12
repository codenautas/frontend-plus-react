import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControlLabel,
    Checkbox,
    Box,
    Typography,
    Stack,
    Divider
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';

interface ImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImport: (file: File, options: ImportOptions) => Promise<void>;
    loading: boolean;
}

export interface ImportOptions {
    skipUnknownFieldsAtImport: boolean;
    simplificateSpaces: boolean;
    replaceNewLineWithSpace: boolean;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onImport, loading }) => {
    const [file, setFile] = useState<File | null>(null);
    const [options, setOptions] = useState<ImportOptions>({
        skipUnknownFieldsAtImport: true,
        simplificateSpaces: true,
        replaceNewLineWithSpace: true
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleOptionChange = (name: keyof ImportOptions) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setOptions(prev => ({ ...prev, [name]: e.target.checked }));
    };

    const handleConfirm = async () => {
        if (file) {
            await onImport(file, options);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileUploadIcon color="primary" />
                Importar datos desde archivo
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            Seleccionar archivo (.xlsx / .tab)
                        </Typography>
                        <Box
                            sx={{
                                border: '1px dashed',
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 2,
                                textAlign: 'center',
                                bgcolor: 'action.hover',
                                position: 'relative'
                            }}
                        >
                            <input
                                type="file"
                                accept=".xlsx, .xls, .tab"
                                onChange={handleFileChange}
                                style={{
                                    opacity: 0,
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    cursor: 'pointer'
                                }}
                            />
                            <Typography variant="body2" color={file ? "textPrimary" : "textSecondary"}>
                                {file ? file.name : "Haz clic aquí para seleccionar un archivo"}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            Opciones de importación
                        </Typography>
                        <Stack>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={options.skipUnknownFieldsAtImport}
                                        onChange={handleOptionChange('skipUnknownFieldsAtImport')}
                                        size="small"
                                    />
                                }
                                label={<Typography variant="body2">Omitir campos desconocidos al importar</Typography>}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={options.simplificateSpaces}
                                        onChange={handleOptionChange('simplificateSpaces')}
                                        size="small"
                                    />
                                }
                                label={<Typography variant="body2">Simplificar espacios</Typography>}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={options.replaceNewLineWithSpace}
                                        onChange={handleOptionChange('replaceNewLineWithSpace')}
                                        size="small"
                                    />
                                }
                                label={<Typography variant="body2">Reemplazar saltos de línea con espacios</Typography>}
                            />
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!file || loading}
                    startIcon={<FileUploadIcon />}
                >
                    {loading ? 'Procesando...' : 'Confirmar Importación'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
