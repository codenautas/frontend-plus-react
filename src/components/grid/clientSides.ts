import React from 'react';
import { RenderCellProps } from 'react-data-grid';
import { FieldDefinition, TableDefinition } from '../../types';

import ExampleClientSideComponent from './ExampleClientSideComponent';
import FallbackClientSideRenderer from './FallbackClientSideRenderer';

export interface ClientSideProps extends RenderCellProps<any, any> {
    fieldDefinition: FieldDefinition;
    tableDefinition: TableDefinition;
    primaryKey: string[];
}

export let clientSides: Record<string, React.FC<ClientSideProps>> = {
    'ExampleClientSideComponent': ExampleClientSideComponent as React.FC<ClientSideProps>, // Aseguramos el tipo aquí también
    'FallbackClientSideRenderer': FallbackClientSideRenderer as React.FC<ClientSideProps>, // Y aquí
};

export const extendClientSides = (newRenderers: Record<string, React.FC<ClientSideProps>>) => {
    clientSides = { ...clientSides, ...newRenderers };
    console.log('clientSides extendidos:', clientSides);
};