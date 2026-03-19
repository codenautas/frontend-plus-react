import React from 'react';
import { ClientSideProps, FieldDefinition, TableDefinition } from '../../types';

import ExampleClientSideComponent from './ExampleClientSideComponent';
import FallbackClientSideRenderer from './FallbackClientSideRenderer';

export let clientSides: Record<string, React.FC<ClientSideProps>> = {
    'ExampleClientSideComponent': ExampleClientSideComponent as React.FC<ClientSideProps>,
    'FallbackClientSideRenderer': FallbackClientSideRenderer as React.FC<ClientSideProps>,
};

export const extendClientSides = (newRenderers: Record<string, React.FC<ClientSideProps>>) => {
    clientSides = { ...clientSides, ...newRenderers };
    console.log('clientSides extendidos:', clientSides);
};