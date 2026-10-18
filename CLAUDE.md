# CLAUDE.md — frontend-plus-react

Librería React (MUI + react-data-grid) para consumir backends hechos con `backend-plus` sin reescribir el frontend de cada aplicación: login, menú, grillas editables de cualquier tabla (con sus detalles anidados), formularios de procedimientos y editor vertical. Cada aplicación aporta solo lo propio (wScreens, clientSides, resultados de procedimientos) mediante `extendWScreens`, `extendClientSides` y `extendResultsOk`.

Se consume desde las aplicaciones (`mi-frontend`, `dmencu-frontend`, y las que vengan) como paquete npm o enlazado con `npm link`. Esta librería **no** es el frontend de `backend-plus` (ese es el que sirve el propio framework con `my-tables.js`): reproduce su comportamiento. Ante la duda de cómo debe comportarse algo, la referencia es `backend-plus` (`for-client/my-tables.js`, `unlogged/my-ajax.js`) y los `.d.ts` en `node_modules/backend-plus/lib/backend-plus.d.ts`.

---

## Reglas de código

Son las de `dmencu` (que aplican a todo proyecto compartido de esta carpeta), escritas acá porque esta librería no depende de `dmencu` y no puede importar su `CLAUDE.md`:

- **Todos los tipos explícitos.** Prohibido `any`, casts vía `unknown` o magia sin justificación. Si un callback recibe un parámetro, tiparlo. El código de bajo nivel que no se pueda tipar va encapsulado en un lugar muy delimitado y se trata como excepción: `type-store` no publica tipos, así que se importa con `// @ts-ignore` y se usa a través de `typerFrom` / la interfaz `Typer` de `components/grid/utils/helpers.ts`; los tests usan dobles de eventos de react-data-grid con una aserción de tipo.
  - **Deuda conocida**: el código heredado todavía tiene unos 135 `any` y varios `@ts-ignore` (en `App.tsx`, `ExportDialog`, `TypedField`, `DynamicField`, `VerticalEditorPage`, `MenuTablePage`). No sumar nuevos; al tocar una línea, tiparla bien.
- **Preservar el estilo existente** y **no tocar el formato de lo que ya existe**: el diff muestra solo las líneas que cambian de verdad. Sin reindentar, sin tocar espacios finales, sin agregar ni quitar el salto de línea final.
- **Respetar el fin de línea de cada archivo**: hay archivos con CRLF y otros con LF. Las líneas nuevas llevan el mismo que el resto del archivo (`git ls-files --eol <archivo>`). No editar con `sed -i` ni con herramientas que reescriban el archivo entero. Antes de commitear, `git diff --stat` tiene que coincidir con `git diff --ignore-all-space --ignore-cr-at-eol --stat`; si no, hay formato que revertir.
- **Nombres de dominio, funciones, variables y comentarios en castellano** (consistente con las aplicaciones y las bases). Los identificadores que son API de terceros se dejan como están.
- **Compilación sin fallbacks**: `npm run build` y `npm run typecheck` no toleran errores; no agregar `|| echo ...` a los scripts. Un error de tipos se corrige en el código.
- `npm install` reordena y reformatea todo `package.json`. Después de instalar algo, restaurar el archivo y agregar a mano solo la línea nueva (el `package-lock.json` sí lo maneja npm).

---

## Estructura

- `src/index.ts` — lo que exporta la librería. Lo que no está acá es interno.
- `src/App.tsx` — `App` y `FrontendPlusReactRoutes` (rutas, proveedores).
- `src/components/grid/` — la grilla:
  - `GenericDataGrid.tsx`: orquesta todo (carga, columnas, detalles anidados, diálogos).
  - `estadoGrilla.ts`: store por grilla para el feedback de guardado y las celdas pendientes (`useSyncExternalStore`).
  - `detalles.tsx`: tipos y contextos de los detalles desplegados dentro de la grilla.
  - `InputRenderer.tsx`: editor de celda y guardado de la fila.
  - `renderers/`: celdas, encabezados, filas de resumen y editores.
- `src/hooks/grid/` — `useGridDataView` (filtros, orden, totales), `useGridColumns`, `useGridEvents` (teclado y edición), `useGridLayout` (alturas), `useGridActions`, `useGridMenu`.
- `src/utils/fetchApi.ts` — comunicación con el backend (codificación de parámetros).
- `src/store/` — Redux: contexto del cliente (menú, procedimientos), ruta y menú.
- `src/contexts/AppContext.tsx` — sesión (`keep-alive`) y cartel de sesión expirada.
- `src/components/` — `PrivateRoute`, `InitialRedirectHandler`, `MainLayout`, `ProcedureForm`, etc.
- `dist/` — salida de `tsup`. Está en `.gitignore`; no se edita ni se versiona.

---

## Cosas que no son obvias (y se rompieron antes)

### Protocolo con el backend
- Cada parámetro viaja codificado según su `encoding` en `client-setup` (`JSON4all` por omisión, `plain`, `JSON`), igual que `my-ajax.js`; el servidor decodifica con el mismo encoding. Mandar `JSON.stringify` o texto crudo rompe fechas (llegan como string) y convierte textos como `"5"` en números. Los procedimientos `method:'get'` van por la URL.
- El resultado puede traer líneas de progreso antes de `--`; `parseBackendResponse` se queda con la última parte.

### Rendimiento de la grilla
- Las **columnas** (`useGridColumns`) no pueden depender de datos, feedback, orden ni filtros: si cambian en cada edición, react-data-grid redibuja todas las celdas. Lo que cambia por celda va al `EstadoGrilla`; la celda (`CeldaDato`) es un componente memorizado que se suscribe solo a lo suyo.
- No copiar las filas en cada render (`rows.map(...)`): anula la memorización de filas. El estilo por fila va por `rowClass`.
- No reemplazar la grilla por un spinner mientras hay una llamada en curso; el spinner es solo para la carga inicial.
- `useGridDataView` deja en su lugar la fila editada cuando cambian pocas filas (no reordena ni vuelve a filtrar en medio de una edición) y recalcula todo cuando cambia mucho (refrescar, importar).
- Las grillas se cargan con una sola petición por tabla y filtros aunque React monte los efectos dos veces (`cargasEnCurso`).

### Edición y teclado
- Al editar con un filtro activo, react-data-grid entrega solo las filas visibles: `handleRowsChange` reemplaza las filas editadas dentro de `tableData`, nunca lo pisa con lo recibido.
- **No esperar la respuesta del servidor para mover el foco** (Enter, Tab, flechas, F4): con la tecla apretada llegan más pulsaciones que respuestas. El cambio de la fila se aplica en el acto y el guardado sigue en segundo plano.
- **No llamar `onRowChange(fila, true)` del editor después de un `await`**: cierra el editor de la celda que esté seleccionada en ese momento (la siguiente). La fila que devuelve el servidor se aplica sobre los datos (`setTableData`).
- F4 con la tecla apretada: las pulsaciones que caen en la celda antes de que el editor nuevo tenga el foco se le pasan por `registrarEditor`, o quedan en cola hasta que haya uno. F4 usa el valor que acaba de copiar si la fila de arriba todavía no se redibujó.

### Detalles desplegados (como `backend-plus`)
- Un detalle es una fila especial (`FilaDetalle`, marcada con un `Symbol`) que se intercala debajo de su fila y ocupa todas las columnas; adentro hay otra `GenericDataGrid` (recursiva). Ctrl+click o botón del medio lo abre en otra pestaña.
- Alturas: **de arriba hacia abajo**. La grilla principal toma lo que queda de la ventana; cada detalle recibe `altoDisponible` y no puede pasar de ahí, así su pie queda visible. No calcular el tope con el alto medido de la grilla padre: una grilla de pocas filas es baja y aplasta a su detalle.
- Un detalle con muchas filas muestra `firstDisplayCount` (20) cuando supera `firstDisplayOverLimit` (30), los mismos umbrales de `backend-plus`, y **virtualiza** sus filas; los chicos crecen según su contenido. La grilla principal siempre virtualiza.
- Anchos: una grilla anidada es tan ancha como sus columnas; si un detalle abierto es más ancho, informa su ancho hacia arriba y el padre se ensancha.
- Un cache compartido por la jerarquía (`CacheGrillasContext`) permite volver a mostrar un detalle que salió de pantalla por la virtualización sin pedirlo otra vez.
- El título de una grilla anidada es el de su tabla, igual que el de la principal.
- Los detalles de tipo `wScreen` y la `condition` de cada detalle todavía no están soportados.

### Sesión y arranque
- Con el estado todavía sin cargar (`idle`), `PrivateRoute` manda a `/login` guardando la ruta pedida; `InitialRedirectHandler` (montado fuera de las rutas privadas) vuelve a esa ruta cuando la sesión resulta válida. Tiene una guarda para no caer en `/home` mientras la ruta guardada se limpia.
- El cartel «¡Sesión expirada!» solo corresponde si hubo una sesión (guardada de la visita anterior o activa en esta carga). En la primera visita sin sesión, ir al login no lleva cartel.

---

## Compilación y fuentes en F12

- `npm run build` (tsup, config en `tsup.config.ts`) genera `dist/` en ESM y CJS con `.d.ts`. **Sin `--splitting`**: con una sola entrada el `.map` de CJS sale roto. Los `.map` llevan el código fuente adentro (`sourcesContent`): en F12 se ven los `.ts`/`.tsx` originales.
- Las dependencias y `peerDependencies` quedan externas; las resuelve el bundler de la aplicación.
- `mi-frontend` tiene un plugin de Vite que encadena el `.map` de esta librería en el build de la aplicación (Rollup no lo hace solo).
- ⚠️ `npm install` dentro de una aplicación enlazada (`mi-frontend`) **reemplaza el `npm link`** y pisa `dist/` y `package.json` de esta carpeta con lo publicado. Después hay que rehacer el enlace (en Windows, `mklink /J`) y volver a compilar.

---

## Tests

- **Framework**: Vitest + jsdom + Testing Library. **Comandos**: `npm test` (una pasada), `npx vitest` (modo vigilancia), `npm run typecheck`.
- Los tests viven al lado de lo que prueban (`*.test.ts` / `*.test.tsx`) y están en castellano. La preparación común está en `src/test/preparacion.ts`.
- Se cubren las funcionalidades críticas y, sobre todo, **cada bug que se arregla lleva su test**: se verifica que falle si se reintroduce el bug. Hoy: codificación de parámetros, fixedFields de los detalles, el store de la grilla, la vista de datos (orden, filtros, edición en el lugar), la edición con filtro, la cola de F4, la vuelta a la ruta pedida tras el login y el cartel de sesión expirada.
- Para el mock de `fetch` y de `fetchApi` usar `vi.stubGlobal` / `vi.mock`; no levantar servidores en los tests.
- Antes de commitear: `npm run typecheck`, `npm test` y `npm run build`.

### Pruebas en el navegador con un backend real
- `mi-frontend` sirve para probar con una aplicación real: `VITE_BACKEND_URL=/dmencu PROXY_BACKEND=http://localhost:3050 npx vite`. Con una ruta en `VITE_BACKEND_URL`, Vite hace de proxy y el navegador habla con un solo origen (el backend solo habilita CORS si tiene `server.allowedHosts`). En Git Bash agregar `MSYS_NO_PATHCONV=1` o la ruta se convierte en una ruta de Windows.
- Las credenciales de prueba se las da el usuario en el chat; **no escribirlas en archivos ni en la documentación**. Las pruebas contra una base real son de solo lectura salvo que el usuario diga otra cosa, y lo que se escriba se deja como estaba.
- Para medir rendimiento usar el build de producción: en desarrollo React valida de más y los tiempos engañan.

---

## Cuándo parar y preguntar

- Si hace falta cambiar `backend-plus` para que algo ande: parar. Casi siempre hay un punto de extensión (o el cambio va en el protocolo del cliente).
- Si una propiedad de `TableDefinition`, `FieldDefinition` o `ProcedureDef` no aparece en `backend-plus.d.ts`: no inventarla.
- Si el comportamiento observado difiere de `backend-plus`: avisar de la diferencia en lugar de resolverla en silencio.
- No publicar en npm ni subir tags sin que el usuario lo pida.

---

## Documentación

Mantener actualizados este archivo y el `README.md` cuando cambie el comportamiento de la grilla, el protocolo o el arranque. Las decisiones que se aprenden a los golpes (como las de arriba) van en la sección «Cosas que no son obvias», con el porqué.
