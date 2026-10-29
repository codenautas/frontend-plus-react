import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { envConfig } from '../env';
import { FixedField } from '../types';
import { mensajeDeError } from '../utils/errores';
import { cargarClienteBP } from './clienteBP';
import { ConsolaBP } from './ConsolaBP';

interface GrillaBPProps {
    tabla: string;
    fixedFields?: FixedField[];
}

/** La grilla de backend-plus (`myOwn.tableGrid`) dentro de una página React: conserva todo lo que ya hace esa grilla */
export const GrillaBP: React.FC<GrillaBPProps> = ({ tabla, fixedFields }) => {
    const contenedor = useRef<HTMLDivElement>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // los fixedFields llegan como arreglo nuevo en cada render: la grilla solo se rearma si cambia su contenido
    const clave = JSON.stringify(fixedFields ?? []);

    useEffect(() => {
        const elemento = contenedor.current;
        if (!elemento) return;
        let vigente = true;
        setError(null);
        setCargando(true);
        cargarClienteBP(envConfig.backendUrl)
            .then(myOwn => {
                if (!vigente) return;
                setCargando(false);
                elemento.replaceChildren();
                myOwn.tableGrid(tabla, elemento, { fixedFields: JSON.parse(clave) as FixedField[] });
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
    }, [tabla, clave]);

    return (
        // el indicador de carga flota: si ocupara lugar, el contenido de backend-plus empezaría más abajo mientras carga y subiría al terminar
        <Box sx={{ position: 'relative' }}>
            {cargando && <CircularProgress size={24} sx={{ position: 'absolute', top: 16, left: 16 }} />}
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            <div ref={contenedor} />
            <ConsolaBP />
        </Box>
    );
};

/** Ruta `/bp/table/:tableName`: una tabla con la grilla de backend-plus, para compararla con la de esta librería */
export const PaginaGrillaBP: React.FC = () => {
    const { tableName = '' } = useParams<{ tableName: string }>();
    return <GrillaBP key={tableName} tabla={tableName} />;
};
