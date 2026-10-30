import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { MenuInfoBase, MenuInfoMenu } from 'backend-plus';
import { envConfig } from '../env';
import { useApp } from '../contexts/AppContext';
import { FallbackWScreen } from '../pages/WScreens';
import { mensajeDeError } from '../utils/errores';
import { cargarClienteBP } from './clienteBP';
import { ConsolaBP } from './ConsolaBP';
import { resolverPantallaBP, rutaDePantallaBP } from './pantallaDeBP';
import { puenteBPHabilitado } from './habilitacion';

function buscarItemDeMenu(items: MenuInfoBase[], tipo: string): MenuInfoBase | undefined {
    for (const item of items) {
        if (item.menuType === tipo) return item;
        if (item.menuType === 'menu') {
            const encontrado = buscarItemDeMenu((item as MenuInfoMenu).menuContent, tipo);
            if (encontrado) return encontrado;
        }
    }
    return undefined;
}

interface PantallaBPProps {
    nombre: string;
    /** Los parámetros en el formato de dirección de backend-plus: `#w=...&up=...` (o con `?`) */
    direccion: string;
}

/** Una wScreen de backend-plus (la de la propia aplicación o una de las del framework) dibujada en su `#main_layout` */
export const PantallaBP: React.FC<PantallaBPProps> = ({ nombre, direccion }) => {
    const { clientContext } = useApp();
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [noExiste, setNoExiste] = useState<boolean>(false);
    const contenedor = useRef<HTMLDivElement>(null);
    const menu = clientContext.menu;

    useEffect(() => {
        const elemento = contenedor.current;
        if (!elemento) return;
        let vigente = true;
        setError(null);
        setNoExiste(false);
        setCargando(true);
        cargarClienteBP(envConfig.backendUrl)
            .then(myOwn => {
                if (!vigente) return;
                setCargando(false);
                const pantalla = resolverPantallaBP(myOwn, nombre, elemento);
                if (!pantalla) {
                    setNoExiste(true);
                    return;
                }
                elemento.replaceChildren();
                // como en backend-plus: lo que declara el ítem de menú, pisado por la dirección (leída con su propio decodificador:
                // `up`, `ff`, `detailing` llegan como objetos), y la pantalla se ejecuta con myOwn como `this`
                const item = menu ? buscarItemDeMenu(menu, nombre) : undefined;
                const desdeLaDireccion = myOwn.UriSearchToObject?.(direccion) ?? Object.fromEntries(new URLSearchParams(direccion.replace(/^[#?]/, '')).entries());
                const parametros: Record<string, unknown> = { ...item, ...desdeLaDireccion };
                myOwn.preDisplayPage?.(parametros, pantalla.definicion, nombre);
                pantalla.ejecutar.call(myOwn, parametros);
            })
            .catch((err: unknown) => {
                if (!vigente) return;
                setCargando(false);
                setError(mensajeDeError(err));
            });
        return () => {
            vigente = false;
            elemento.replaceChildren();
        };
    }, [nombre, direccion, menu]);

    if (noExiste) return <FallbackWScreen screenName={nombre} />;
    return (
        // el indicador de carga flota: si ocupara lugar, el contenido de backend-plus empezaría más abajo mientras carga y subiría al terminar
        <Box sx={{ position: 'relative' }}>
            {cargando && <CircularProgress size={24} sx={{ position: 'absolute', top: 16, left: 16 }} />}
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            {/* backend-plus dibuja sus pantallas en el elemento con este id */}
            <div id="main_layout" ref={contenedor} />
            <ConsolaBP />
        </Box>
    );
};

/** Ruta de las wScreens que la aplicación no registró: con el puente encendido se pasan a la ruta de las pantallas de backend-plus */
export const PantallaDeRespaldo: React.FC = () => {
    const { screenName = '' } = useParams<{ screenName: string }>();
    const { search } = useLocation();
    if (!puenteBPHabilitado()) {
        return <Box sx={{ p: 3 }}><FallbackWScreen screenName={screenName} /></Box>;
    }
    return <Navigate to={rutaDePantallaBP(screenName, search)} replace />;
};

/**
 * La página de backend-plus dentro de la aplicación: `/bp/menu#w=<pantalla>&...`. Se parece a `<base-url>/menu` a propósito:
 * el código de backend-plus y de las aplicaciones arma direcciones a partir de la ubicación (`location.pathname + '/../menu#...'`,
 * `location.pathname + '#w=...'` para abrir en otra pestaña) y así caen en esta misma ruta, que lee los parámetros como BP
 * (del hash, o de la query).
 */
export const PaginaBP: React.FC = () => {
    const { hash, search } = useLocation();
    const direccion = hash || search;
    const nombre = new URLSearchParams(direccion.replace(/^[#?]/, '')).get('w');
    if (!puenteBPHabilitado()) return <Navigate to="/" replace />;
    if (!nombre) return <Box sx={{ p: 3 }}><Alert severity="warning">Falta la pantalla de backend-plus (<code>#w=...</code>).</Alert></Box>;
    return <PantallaBP key={nombre} nombre={nombre} direccion={direccion} />;
};
