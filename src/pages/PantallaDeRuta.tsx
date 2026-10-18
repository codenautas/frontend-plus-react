// src/pages/PantallaDeRuta.tsx
import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { FallbackWScreen, wScreens } from './WScreens';

/** Una wScreen como página: los parámetros vienen de la query string (es como se abre un detalle wScreen en otra pestaña) */
export const PantallaDeRuta: React.FC<{ screenName: string }> = ({ screenName }) => {
    const [busqueda] = useSearchParams();
    const params = useMemo(() => Object.fromEntries(busqueda.entries()), [busqueda]);
    const Pantalla = wScreens[screenName];
    return (
        <Box sx={{ pt: 3, pl: 4 }}>
            {Pantalla
                ? <Pantalla screenName={screenName} params={params} />
                : <FallbackWScreen screenName={screenName} />}
        </Box>
    );
};
