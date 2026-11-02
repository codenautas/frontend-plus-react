import React, { useState } from 'react';
import { Button, InputBase, Popover } from '@mui/material';

interface VentanaDeTextoProps {
    anclaje: HTMLElement;
    texto: string;
    /** Si se puede editar: con Aceptar (o Ctrl+Enter) devuelve el texto; si no, solo muestra el contenido completo (JSON o texto largo) */
    editable: boolean;
    onAceptar: (texto: string) => void;
    onCerrar: () => void;
}

/** La ventana de texto de backend-plus (`promptPromise` / `alertPromise` del expander de texto): ver o editar el contenido completo de una celda */
export function VentanaDeTexto({ anclaje, texto, editable, onAceptar, onCerrar }: VentanaDeTextoProps) {
    const [valor, setValor] = useState(texto);
    const alApretar = (evento: React.KeyboardEvent) => {
        if (evento.key === 'Escape' || evento.key === 'F9') {
            onCerrar();
        } else if (evento.key === 'Enter' && evento.ctrlKey && editable) {
            onAceptar(valor);
        } else {
            return;
        }
        evento.preventDefault();
        evento.stopPropagation();
    };
    return (
        <Popover open anchorEl={anclaje} onClose={onCerrar} disableRestoreFocus anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
            <div style={{ padding: 8, minWidth: 320, maxWidth: 640 }}>
                <InputBase
                    autoFocus
                    multiline
                    fullWidth
                    readOnly={!editable}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onKeyDown={alApretar}
                    minRows={2}
                    maxRows={16}
                    sx={{ fontFamily: 'monospace', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px', p: 0.5 }}
                    inputProps={{ 'aria-label': 'contenido de la celda' }}
                />
                {editable && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                        <Button size="small" onClick={onCerrar}>cancelar</Button>
                        <Button size="small" variant="contained" onClick={() => onAceptar(valor)}>aceptar</Button>
                    </div>
                )}
            </div>
        </Popover>
    );
}
