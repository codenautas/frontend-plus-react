import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { itemInicial, rutaDeItemDeMenu } from '../utils/menuInicial';

/** Ruta `/`: va a la pantalla de inicio que declara el backend (`selectedByDefault`). Si no declara ninguna, queda vacía, como en backend-plus. */
const PantallaInicial: React.FC = () => {
    const { clientContext } = useApp();
    const item = clientContext.menu ? itemInicial(clientContext.menu) : undefined;
    return item ? <Navigate to={rutaDeItemDeMenu(item)} replace /> : null;
};

export default PantallaInicial;
