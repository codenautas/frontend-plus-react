import React from 'react';
import { ClientSideProps, FieldDefinition, FilaDeDatos, ParametrosDeProcedimiento, TableDefinition } from '../../types';

import ExampleClientSideComponent from './ExampleClientSideComponent';
import FallbackClientSideRenderer from './FallbackClientSideRenderer';
import ClientSideDisplayUrl from './ClientSideDisplayUrl';
import { campoDibujable } from '../../utils/columnasOcultas';

// Los de `myOwn.clientSides` de backend-plus que se pueden reproducir acá (`$lock` usa la base local del modo offline: no está)
export let clientSides: Record<string, React.FC<ClientSideProps>> = {
    'ExampleClientSideComponent': ExampleClientSideComponent as React.FC<ClientSideProps>,
    'FallbackClientSideRenderer': FallbackClientSideRenderer as React.FC<ClientSideProps>,
    'displayUrl': ClientSideDisplayUrl,
};

export interface ArgumentosDeGuardadoPropio {
    fila: FilaDeDatos;
    /** Clave primaria de la tabla */
    primaryKey: string[];
    /** Lo que se escribió en la celda, ya tipado (null si quedó vacío) */
    valor: unknown;
    callApi: (procedimiento: string, parametros: ParametrosDeProcedimiento) => Promise<unknown>;
}

/**
 * clientSides que se editan como cualquier celda (el mismo editor, con sus teclas) pero no se guardan en la tabla:
 * al terminar de editar se corre esta función en lugar de `table_record_save`. El valor escrito no queda en la fila.
 */
export const guardadosPropios: Record<string, (argumentos: ArgumentosDeGuardadoPropio) => Promise<void>> = {
    // `newPass` de backend-plus: la clave nueva del usuario de la fila
    newPass: async ({ fila, primaryKey, valor, callApi }) => {
        const claveNueva = typeof valor === 'string' ? valor.trim() : '';
        if (!claveNueva) return;
        await callApi('admin_chpass', { user: fila[primaryKey[primaryKey.length - 1]], newpass: claveNueva });
    },
};

/** Un campo clientSide solo se edita en la celda si tiene guardado propio; uno que se dibuja con un componente no es editable */
export const campoEditableEnCelda = (campo: FieldDefinition | undefined): boolean =>
    campo?.editable !== false && (!campo?.clientSide || campo.clientSide in guardadosPropios);

/**
 * Los clientSides que la tabla necesita y esta librería no puede dibujar: los de campos que se dibujan y sin componente
 * registrado, y el de la tabla (`TableDefinition.clientSide`, que acá no se reproduce).
 */
export const clientSidesSinImplementar = (tableDefinition: TableDefinition): string[] => {
    const deCampos = tableDefinition.fields.flatMap((campo: FieldDefinition) =>
        campo.clientSide && campoDibujable(campo) && !clientSides[campo.clientSide] && !guardadosPropios[campo.clientSide] ? [campo.clientSide] : []
    );
    const deTabla = tableDefinition.clientSide ? [tableDefinition.clientSide] : [];
    return [...new Set([...deCampos, ...deTabla])];
};

export const extendClientSides = (newRenderers: Record<string, React.FC<ClientSideProps>>) => {
    clientSides = { ...clientSides, ...newRenderers };
    console.log('clientSides extendidos:', clientSides);
};
