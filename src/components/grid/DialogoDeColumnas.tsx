import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Typography } from '@mui/material';

interface DialogoDeColumnasProps {
    open: boolean;
    onClose: () => void;
    /** Los nombres de las columnas que se pueden mostrar u ocultar, en el orden de la tabla */
    columnas: string[];
    ocultas: ReadonlySet<string>;
    /** Muestra la columna si estaba oculta y la oculta si estaba a la vista */
    alternarColumna: (columna: string) => void;
}

/** «Ocultar o mostrar columnas», como el diálogo de backend-plus: a la izquierda las que se ven y a la derecha las ocultas; un clic cambia la columna de lado */
export const DialogoDeColumnas: React.FC<DialogoDeColumnasProps> = ({ open, onClose, columnas, ocultas, alternarColumna }) => {
    const lista = (titulo: string, nombres: string[], idDeLista: string) => (
        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{titulo}</Typography>
            <List dense data-testid={idDeLista} sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                {nombres.map(nombre => (
                    <ListItemButton key={nombre} onClick={() => alternarColumna(nombre)}>
                        <ListItemText primary={nombre} />
                    </ListItemButton>
                ))}
            </List>
        </Box>
    );
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Ocultar o mostrar columnas</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                    {lista('Columnas mostradas', columnas.filter(nombre => !ocultas.has(nombre)), 'columnas-mostradas')}
                    {lista('Columnas ocultas', columnas.filter(nombre => ocultas.has(nombre)), 'columnas-ocultas')}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
