import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InputBase, List, ListItemButton, Popover, Typography } from '@mui/material';
import { filtrarOpciones, OpcionDeReferencia } from '../../utils/referencias';

interface MenuDeOpcionesProps {
    /** El elemento bajo el que se abre (el editor de la celda) */
    anclaje: HTMLElement;
    opciones: OpcionDeReferencia[];
    /** Lo que se escribió para abrir el menú (una letra en un campo numérico): ya filtra */
    busquedaInicial: string;
    onElegir: (valor: unknown) => void;
    onCerrar: () => void;
}

/**
 * Menú para elegir una opción (una fila de la tabla referenciada, Sí/No, un valor de `options`), como el `miniMenuPromise` de los
 * expanders de backend-plus: se filtra escribiendo, ↑ y ↓ recorren, Enter elige y Escape cierra.
 */
export function MenuDeOpciones({ anclaje, opciones, busquedaInicial, onElegir, onCerrar }: MenuDeOpcionesProps) {
    const [busqueda, setBusqueda] = useState(busquedaInicial);
    const [indice, setIndice] = useState(0);
    const visibles = useMemo(() => filtrarOpciones(opciones, busqueda), [opciones, busqueda]);
    const elegida = useRef<HTMLDivElement | null>(null);
    useEffect(() => { elegida.current?.scrollIntoView({ block: 'nearest' }); }, [indice, visibles]);

    const alApretar = (evento: React.KeyboardEvent) => {
        if (evento.key === 'ArrowDown') {
            setIndice(i => Math.min(i + 1, visibles.length - 1));
        } else if (evento.key === 'ArrowUp') {
            setIndice(i => Math.max(i - 1, 0));
        } else if (evento.key === 'Enter') {
            if (visibles[indice]) onElegir(visibles[indice].valor);
        } else if (evento.key === 'F9' || evento.key === 'Escape') {
            onCerrar();
        } else {
            return;
        }
        evento.preventDefault();
        evento.stopPropagation();
    };

    return (
        <Popover
            open
            anchorEl={anclaje}
            onClose={onCerrar}
            disableRestoreFocus
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{ paper: { sx: { minWidth: 300, maxWidth: 520 } } }}
        >
            <InputBase
                autoFocus
                fullWidth
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setIndice(0); }}
                onKeyDown={alApretar}
                placeholder="buscar"
                sx={{ px: 1, py: 0.5, fontSize: '0.8rem', borderBottom: '1px solid #ccc' }}
                inputProps={{ 'aria-label': 'buscar' }}
            />
            <List dense disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }} role="listbox">
                {visibles.length === 0 && <Typography variant="body2" sx={{ p: 1, color: 'text.secondary' }}>sin coincidencias</Typography>}
                {visibles.map((opcion, i) => (
                    <ListItemButton
                        key={i}
                        ref={i === indice ? elegida : null}
                        selected={i === indice}
                        role="option"
                        onClick={() => onElegir(opcion.valor)}
                        sx={{ gap: 2, py: 0.25, fontSize: '0.8rem' }}
                    >
                        {opcion.etiquetas.map((etiqueta, j) => (
                            <span key={j} style={{ fontWeight: j === 0 ? 600 : 400, minWidth: j === 0 ? 40 : undefined }}>{etiqueta}</span>
                        ))}
                    </ListItemButton>
                ))}
            </List>
        </Popover>
    );
}
