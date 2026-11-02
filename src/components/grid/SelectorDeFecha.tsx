import React, { useState } from 'react';
import { Button, IconButton, Popover, Typography } from '@mui/material';
import { fechaATexto, FechaSimple, semanasDelMes } from '../../utils/expanders';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

interface SelectorDeFechaProps {
    anclaje: HTMLElement;
    /** La fecha que tiene la celda (la que se muestra elegida y desde donde se parte); si no hay, hoy */
    fechaActual: FechaSimple | null;
    admiteNulo: boolean;
    /** La fecha elegida como AAAA-MM-DD, o null para dejarla vacía */
    onElegir: (fecha: string | null) => void;
    onCerrar: () => void;
}

const mismaFecha = (a: FechaSimple, b: FechaSimple | null) => b !== null && a.anio === b.anio && a.mes === b.mes && a.dia === b.dia;

const MOVIMIENTOS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [-7, 0], ArrowDown: [7, 0], PageUp: [0, -1], PageDown: [0, 1],
};

/** Calendario para elegir una fecha, como el `pickDate` (Pikaday) de typed-controls: clic o flechas y Enter; Re Pág y Av Pág cambian de mes */
export function SelectorDeFecha({ anclaje, fechaActual, admiteNulo, onElegir, onCerrar }: SelectorDeFechaProps) {
    const hoy = new Date();
    const fechaDeHoy: FechaSimple = { anio: hoy.getFullYear(), mes: hoy.getMonth(), dia: hoy.getDate() };
    const [cursor, setCursor] = useState<FechaSimple>(fechaActual ?? fechaDeHoy);

    const mover = (dias: number, meses: number) => {
        const nueva = new Date(cursor.anio, cursor.mes + meses, cursor.dia + dias);
        setCursor({ anio: nueva.getFullYear(), mes: nueva.getMonth(), dia: nueva.getDate() });
    };

    const alApretar = (evento: React.KeyboardEvent) => {
        if (evento.key in MOVIMIENTOS) {
            mover(...MOVIMIENTOS[evento.key]);
        } else if (evento.key === 'Enter') {
            onElegir(fechaATexto(cursor));
        } else if (evento.key === 'F9' || evento.key === 'Escape') {
            onCerrar();
        } else {
            return;
        }
        evento.preventDefault();
        evento.stopPropagation();
    };

    return (
        <Popover open anchorEl={anclaje} onClose={onCerrar} disableRestoreFocus anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
            <div tabIndex={0} ref={(el) => el?.focus()} onKeyDown={alApretar} style={{ padding: 8, outline: 'none', width: 252 }} aria-label="calendario">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconButton size="small" aria-label="mes anterior" onClick={() => mover(0, -1)}>‹</IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{MESES[cursor.mes]} {cursor.anio}</Typography>
                    <IconButton size="small" aria-label="mes siguiente" onClick={() => mover(0, 1)}>›</IconButton>
                </div>
                <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center', fontSize: '0.8rem' }}>
                    <thead><tr>{DIAS.map(d => <th key={d} style={{ fontWeight: 400, color: '#777' }}>{d}</th>)}</tr></thead>
                    <tbody>
                        {semanasDelMes(cursor.anio, cursor.mes).map((semana, i) => (
                            <tr key={i}>
                                {semana.map(dia => {
                                    const elegido = mismaFecha(dia, fechaActual);
                                    const enCursor = mismaFecha(dia, cursor);
                                    return (
                                        <td key={`${dia.mes}-${dia.dia}`} style={{ padding: 1 }}>
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => onElegir(fechaATexto(dia))}
                                                style={{
                                                    width: 32, height: 26, border: enCursor ? '1px solid #1976d2' : '1px solid transparent', borderRadius: 4, cursor: 'pointer',
                                                    background: elegido ? '#1976d2' : 'transparent', color: elegido ? '#fff' : dia.delMesMostrado ? '#000' : '#aaa',
                                                }}
                                            >{dia.dia}</button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Button size="small" onClick={() => onElegir(fechaATexto(fechaDeHoy))}>hoy</Button>
                    {admiteNulo && <Button size="small" onClick={() => onElegir(null)}>vacío</Button>}
                </div>
            </div>
        </Popover>
    );
}
