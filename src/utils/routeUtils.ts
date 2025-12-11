// frontend-plus-react/src/utils/routeUtils.ts (o dentro de App.tsx)
import React, { Children, isValidElement, ReactNode } from 'react';

/**
 * Recorre recursivamente los hijos de React buscando componentes que tengan una prop 'path'.
 * Esto permite pasar <Route path="..."> o Fragmentos <><Route.../></> y extraer los strings.
 */
export const extractPathsFromRoutes = (node: ReactNode): string[] => {
    const paths: string[] = [];

    Children.forEach(node, (child) => {
        if (!isValidElement(child)) return;

        // Caso 1: Es un <Route path="/algo" ... /> directo
        if (child.props.path) {
            paths.push(child.props.path);
        }

        // Caso 2: Es un Fragmento <>...</> o un componente wrapper que tiene children
        // (Tus rutas unlogged vienen dentro de un Fragment <>)
        if (child.props.children) {
            paths.push(...extractPathsFromRoutes(child.props.children));
        }
    });

    return paths;
};