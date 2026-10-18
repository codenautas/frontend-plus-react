# frontend-plus-react
Librería React genérica para consumir backends implementados en backend-plus

Login, menú, grillas editables de cualquier tabla (con sus detalles desplegados dentro de la grilla, como en backend-plus),
formularios de procedimientos y editor vertical. Cada aplicación aporta solo lo propio:

```tsx
import { App, GenericDataGrid, WScreenProps } from 'frontend-plus-react';
import 'frontend-plus-react/dist/index.css';

// Una wScreen: recibe como params los fixedFields del detalle (o la query string si se abre como página)
const Ticket = ({ params }: WScreenProps) => {
    const fixedFields = [{ fieldName: 'proyecto', value: params?.proyecto }, { fieldName: 'ticket', value: params?.ticket }];
    return <GenericDataGrid tableName="anotaciones" fixedFields={fixedFields} anidada />;
};

export default () => (
    <App
        myWScreens={{ ticket: Ticket }}                                    // detalles {wScreen: 'ticket'} y /wScreens/ticket
        myConditions={{ noCABA: fila => fila.provincia !== 'CABA' }}       // la `condition` de un detalle
    />
);
```

Las variables de entorno `VITE_BACKEND_URL` (o `REACT_APP_BACKEND_URL`) indican dónde está el backend. Ver `CLAUDE.md` para
las decisiones de diseño y cómo probar con un backend real.
