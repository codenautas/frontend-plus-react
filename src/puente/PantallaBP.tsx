import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { MenuInfoBase, MenuInfoMenu } from 'backend-plus';
import { envConfig } from '../env';
import { useApp } from '../contexts/AppContext';
import { FallbackWScreen } from '../pages/WScreens';
import { mensajeDeError } from '../utils/errores';
import { cargarClienteBP } from './clienteBP';
import { resolverPantallaBP, rutaDeEnlaceBP } from './pantallaDeBP';
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
}

/** Una wScreen de backend-plus (la de la propia aplicación o una de las del framework) dibujada en su `#main_layout` */
export const PantallaBP: React.FC<PantallaBPProps> = ({ nombre }) => {
    const { search } = useLocation();
    const navigate = useNavigate();
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
        // «proceder» y los vínculos de backend-plus recargan la página con la pantalla y sus parámetros en la dirección:
        // acá se resuelven navegando dentro de la aplicación (con Ctrl o el botón del medio se abren, como siempre, aparte)
        const alHacerClick = (evento: MouseEvent) => {
            if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
            const enlace = evento.target instanceof Element ? evento.target.closest('a[href]') : null;
            const ruta = enlace && rutaDeEnlaceBP(enlace.getAttribute('href') ?? '', document.baseURI, envConfig.backendUrl);
            if (ruta) {
                evento.preventDefault();
                navigate(ruta);
            }
        };
        elemento.addEventListener('click', alHacerClick);
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
                const desdeLaDireccion = myOwn.UriSearchToObject?.(search) ?? Object.fromEntries(new URLSearchParams(search).entries());
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
            elemento.removeEventListener('click', alHacerClick);
            elemento.replaceChildren();
        };
    }, [nombre, search, menu, navigate]);

    if (noExiste) return <FallbackWScreen screenName={nombre} />;
    return (
        <Box>
            {cargando && <CircularProgress size={24} sx={{ m: 2 }} />}
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            {/* backend-plus dibuja sus pantallas en el elemento con este id */}
            <div id="main_layout" ref={contenedor} />
        </Box>
    );
};

/** Ruta de las wScreens que la aplicación no registró: se piden a backend-plus si el puente está encendido */
export const PantallaDeRespaldo: React.FC = () => {
    const { screenName = '' } = useParams<{ screenName: string }>();
    if (!puenteBPHabilitado()) {
        return <Box sx={{ p: 3 }}><FallbackWScreen screenName={screenName} /></Box>;
    }
    return <PantallaBP key={screenName} nombre={screenName} />;
};
