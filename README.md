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

## La grilla, como la de backend-plus

- **Teclado en una celda en edición**: Enter y Tab guardan y pasan a la celda siguiente, Shift+Tab a la anterior, ↑ y ↓ a la de arriba y abajo; ← y → solo salen de la celda al llegar al borde del texto. El clic fuera de la grilla también guarda.
- **F9 o Alt+↓** (y la lupa junto al editor) abren el selector del tipo de campo: las filas de la tabla referenciada (FK y softFK, con sus campos `isName`), Sí/No, las `options`, un calendario o el contenido completo. Los filtros tienen los mismos selectores (referencias, Sí/No, `options` y fecha). Los filtros tienen los mismos selectores (referencias, Sí/No, `options` y fecha).
- **Menú lateral** con acordeón, buscador (Ctrl+K) y pantallas recientes; **cambio de contraseña** (`/chpass`) y, opcional, el enlace «me olvidé la clave» del login (prop `recuperarClave`).
- **Parámetros de la tabla** en la dirección y en el menú, como en backend-plus: `ff` (fixedFields, también con `show`, `range` y `until`), `fc` (filtros iniciales), `td`, `pf`, `pick` y `label`.
- Un campo con `table` se guarda en esa tabla, y el `width` del campo manda sobre el ancho calculado.
- Los detalles completos están en `CLAUDE.md`.
