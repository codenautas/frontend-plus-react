import React, { useCallback, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import { FieldDefinition, FilaDeDatos } from '../../types';
import { MenuDeOpciones } from '../../components/grid/MenuDeOpciones';
import { SelectorDeFecha } from '../../components/grid/SelectorDeFecha';
import { VentanaDeTexto } from '../../components/grid/VentanaDeTexto';
import { cargarReferencia, esCampoConReferencia, opcionesDeReferencia, OpcionDeReferencia } from '../../utils/referencias';
import { fechaDeValor, opcionesDeBooleano, opcionesDeEnumerado, tipoDeExpander, TipoDeExpander } from '../../utils/expanders';
import { mensajeDeError } from '../../utils/errores';

type Expansion = { tipo: 'opciones', opciones: OpcionDeReferencia[], busqueda: string } | { tipo: 'fecha' } | { tipo: 'texto' };

interface UsoDeExpanderParams {
    campo: FieldDefinition;
    /** Si el valor se puede escribir (si no, solo valen los que muestran el contenido) */
    editable: boolean;
    /** La fila de la celda: en una FK compuesta el menú ofrece solo las filas que coinciden con ella. En un filtro, null */
    fila: FilaDeDatos | null;
    /** Si el menú ofrece también la opción vacía */
    admiteNulo: boolean;
    /** Limita cuáles expanders se usan (la fila de filtros no usa el booleano, que ya es una lista, ni la ventana de texto) */
    tipos?: TipoDeExpander[];
    /** El elemento bajo el que se abre y al que vuelve el foco al cerrar */
    anclaje: React.RefObject<HTMLElement | null>;
    /** El texto que tiene el campo ahora (la ventana de texto parte de él) */
    textoActual: string;
    /** El valor de la celda (el calendario parte de su fecha) */
    valorActual: unknown;
    /** Se eligió una opción de un menú: el valor tipado (el booleano, el de `options` o el de la referencia), o null */
    alElegirValor: (valor: unknown) => void;
    /** Se eligió una fecha (AAAA-MM-DD, o null) o se aceptó el texto de la ventana */
    alConfirmarTexto: (texto: string | null) => void;
    alFallar: (mensaje: string) => void;
}

/**
 * Los expanders de backend-plus (F9 o Alt+↓, y la lupa junto al campo): un menú, un calendario o una ventana de texto según el tipo del campo.
 * Lo usan el editor de la celda y la fila de filtros; cada uno dice qué hacer con lo que se elige.
 */
export const useExpander = ({ campo, editable, fila, admiteNulo, tipos, anclaje, textoActual, valorActual, alElegirValor, alConfirmarTexto, alFallar }: UsoDeExpanderParams) => {
    const [expansion, setExpansion] = useState<Expansion | null>(null);
    // mientras está abierto el campo pierde el foco y no por eso se guarda
    const abierto = React.useRef(false);

    const tipoDelCampo = tipoDeExpander(campo, editable);
    const tipo = tipoDelCampo === null || tipoDelCampo === 'json' || (tipos && !tipos.includes(tipoDelCampo)) ? null : tipoDelCampo;

    const abrir = useCallback(async (busqueda: string) => {
        if (tipo === null || abierto.current) return;
        abierto.current = true;
        try {
            if (tipo === 'referencia' && esCampoConReferencia(campo)) {
                const { definicion, filas } = await cargarReferencia(campo.references);
                setExpansion({ tipo: 'opciones', opciones: opcionesDeReferencia(campo, definicion, filas, fila, admiteNulo), busqueda });
            } else if (tipo === 'booleano') {
                setExpansion({ tipo: 'opciones', opciones: opcionesDeBooleano(admiteNulo), busqueda });
            } else if (tipo === 'opciones') {
                setExpansion({ tipo: 'opciones', opciones: opcionesDeEnumerado(campo.options ?? [], admiteNulo), busqueda });
            } else {
                setExpansion({ tipo: tipo === 'fecha' ? 'fecha' : 'texto' });
            }
        } catch (err) {
            abierto.current = false;
            alFallar(mensajeDeError(err));
        }
    }, [tipo, campo, fila, admiteNulo, alFallar]);

    const cerrar = useCallback(() => {
        abierto.current = false;
        setExpansion(null);
        // el menú es un modal que retiene el foco hasta que se desmonta
        setTimeout(() => anclaje.current?.focus(), 0);
    }, [anclaje]);

    const elegirValor = useCallback((valor: unknown) => {
        cerrar();
        alElegirValor(valor);
    }, [cerrar, alElegirValor]);

    const confirmarTexto = useCallback((texto: string | null) => {
        cerrar();
        alConfirmarTexto(texto);
    }, [cerrar, alConfirmarTexto]);

    /** F9 o Alt+↓: abre el expander; devuelve si la tecla era esa */
    const manejarTecla = useCallback((event: React.KeyboardEvent): boolean => {
        const esExpander = event.key === 'F9' && !event.shiftKey && !event.ctrlKey && !event.altKey ||
            event.key === 'ArrowDown' && event.altKey && !event.shiftKey && !event.ctrlKey;
        if (tipo === null || !esExpander) return false;
        event.preventDefault();
        void abrir('');
        return true;
    }, [tipo, abrir]);

    const titulo = tipo === 'fecha' ? 'elegir fecha (F9)' : tipo === 'texto' ? 'ver el contenido completo (F9)' : 'elegir un valor (F9)';
    /** La lupa de backend-plus: un icono según el expander que lo abre con un clic. El clic no le saca el foco al campo (perderlo lo guardaría) */
    const lupa = tipo === null ? null : (
        <IconButton
            size="small"
            tabIndex={-1}
            aria-label={titulo.replace(' (F9)', '')}
            title={titulo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); void abrir(''); }}
            sx={{ p: 0, ml: 0.25, color: 'primary.main', '&:hover': { backgroundColor: 'action.hover' } }}
        >
            {tipo === 'fecha' ? <CalendarMonthIcon sx={{ fontSize: 16 }} /> : tipo === 'texto' ? <SearchIcon sx={{ fontSize: 16 }} /> : <ArrowDropDownIcon sx={{ fontSize: 20 }} />}
        </IconButton>
    );

    const base = anclaje.current;
    const ventana = !expansion || !base ? null : expansion.tipo === 'opciones' ? (
        <MenuDeOpciones anclaje={base} opciones={expansion.opciones} busquedaInicial={expansion.busqueda} onElegir={elegirValor} onCerrar={cerrar} />
    ) : expansion.tipo === 'fecha' ? (
        <SelectorDeFecha anclaje={base} fechaActual={fechaDeValor(valorActual)} admiteNulo={admiteNulo} onElegir={confirmarTexto} onCerrar={cerrar} />
    ) : (
        <VentanaDeTexto anclaje={base} texto={textoActual} editable onAceptar={confirmarTexto} onCerrar={cerrar} />
    );

    return { tipo, abierto, abrir, manejarTecla, lupa, ventana };
};
