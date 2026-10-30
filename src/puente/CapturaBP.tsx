import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { envConfig } from '../env';
import { capturarNavegacionBP } from './capturaDeNavegacion';

/**
 * «proceder», los vínculos, `location.href = ...` y los avisos de backend-plus (el de «Iniciar sesión», por ejemplo) apuntan
 * a páginas del backend: se resuelven dentro de la aplicación. Se monta una sola vez y no depende de que haya una pantalla de
 * backend-plus en la página: su cliente sigue vivo (y sus avisos en el `body`) aunque el usuario ya esté en una pantalla de React.
 */
export const CapturaBP: React.FC = () => {
    const navigate = useNavigate();
    useEffect(() => capturarNavegacionBP(envConfig.backendUrl, navigate), [navigate]);
    return null;
};
