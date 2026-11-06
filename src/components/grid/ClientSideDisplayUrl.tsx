import React from 'react';
import { ClientSideProps } from '../../types';

/** `displayUrl` de backend-plus: el valor de la celda se muestra como un enlace a sí mismo */
const ClientSideDisplayUrl: React.FC<ClientSideProps> = ({ row, column }) => {
    const valor = row[column.key];
    if (valor === null || valor === undefined || valor === '') return null;
    const url = String(valor);
    return (
        <a className="fpr-celda" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
    );
};

export default ClientSideDisplayUrl;
