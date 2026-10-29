import React, { useEffect } from 'react';
import { Box } from '@mui/material';

/** Lo que tardan en llegar las dos llamadas de backend-plus por un mismo error (en la misma tarea): más que eso es otro error igual */
const MARGEN_DE_REPETIDO_MS = 1000;

/**
 * backend-plus registra algunos errores dos veces: el de una llamada ajax lo registra `my-ajax.js` y el `catch` de «proceder»
 * (`my-menu.js`) lo vuelve a registrar. Si ya hay un aviso con ese texto que llegó recién, el repetido se descarta.
 */
export function descartarRepetidos(consola: HTMLElement, agregados: Node[], ahora: number): void {
    for (const nodo of agregados) {
        if (!(nodo instanceof HTMLElement)) continue;
        const repetido = Array.from(consola.children).find(
            (otro): otro is HTMLElement => otro instanceof HTMLElement && otro !== nodo && otro.className === nodo.className && otro.textContent === nodo.textContent
                && ahora - Number(otro.dataset.instante) < MARGEN_DE_REPETIDO_MS
        );
        if (repetido) nodo.remove();
        else nodo.dataset.instante = String(ahora);
    }
}

/**
 * Los mensajes y errores de backend-plus (`myOwn.log`): los escribe en todos los `#mini-console` que haya y, si no hay ninguno,
 * al principio del `body`, donde empujan toda la aplicación hacia abajo. Acá flotan en la esquina de arriba a la derecha,
 * debajo de la barra, como avisos, y él mismo los retira (los errores a los 30 segundos, los mensajes a los 3).
 * Las hojas de estilo de backend-plus y de las aplicaciones también le dan estilo a `#mini-console` (por id y con
 * `width`, `max-height`, `top`...): `&#mini-console` (clase + id) les gana y se reponen esos valores.
 */
export const ConsolaBP: React.FC = () => {
    useEffect(() => {
        const consola = document.getElementById('mini-console');
        if (!consola) return;
        const observador = new MutationObserver(registros =>
            descartarRepetidos(consola, registros.flatMap(registro => Array.from(registro.addedNodes)), Date.now())
        );
        observador.observe(consola, { childList: true });
        return () => observador.disconnect();
    }, []);
    return (
        <Box
            id="mini-console"
            sx={(tema) => ({
                '&#mini-console': {
                    position: 'fixed',
                    top: { xs: 64, sm: 72 },
                    left: 'auto',
                    right: 16,
                    bottom: 'auto',
                    float: 'none',
                    zIndex: tema.zIndex.snackbar,
                    width: 'auto',
                    minWidth: 0,
                    maxWidth: 'min(480px, calc(100vw - 32px))',
                    minHeight: 0,
                    maxHeight: 'none',
                    overflow: 'visible',
                    padding: 0,
                    border: 'none',
                    borderRadius: 0,
                    boxShadow: 'none',
                    backgroundColor: 'transparent',
                    fontSize: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                },
                '&#mini-console:not(:empty)': { display: 'flex' },
                '&#mini-console:empty': { display: 'none' },
                '& > div': {
                    p: '6px 12px',
                    borderRadius: 1,
                    boxShadow: tema.shadows[3],
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    backgroundColor: tema.palette.grey[800],
                    color: tema.palette.common.white,
                },
                '& > .status-error': {
                    backgroundColor: tema.palette.error.main,
                    color: tema.palette.error.contrastText,
                },
            })}
        />
    );
};
