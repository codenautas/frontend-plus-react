# CLAUDE.md — frontend-plus-react

Librería React (MUI + react-data-grid) para consumir backends hechos con `backend-plus` sin reescribir el frontend de cada aplicación: login, menú, grillas editables de cualquier tabla (con sus detalles anidados), formularios de procedimientos y editor vertical. Cada aplicación aporta solo lo propio (wScreens, clientSides, resultados de procedimientos) mediante `extendWScreens`, `extendClientSides` y `extendResultsOk`.

Se consume desde las aplicaciones (`mi-frontend`, `dmencu-frontend`, y las que vengan) como paquete npm o enlazado con `npm link`. Esta librería **no** es el frontend de `backend-plus` (ese es el que sirve el propio framework con `my-tables.js`): reproduce su comportamiento. Ante la duda de cómo debe comportarse algo, la referencia es `backend-plus` (`for-client/my-tables.js`, `unlogged/my-ajax.js`) y los `.d.ts` en `node_modules/backend-plus/lib/backend-plus.d.ts`.

---

## Reglas de código

Son las de `dmencu` (que aplican a todo proyecto compartido de esta carpeta), escritas acá porque esta librería no depende de `dmencu` y no puede importar su `CLAUDE.md`:

- **Todos los tipos explícitos.** Prohibido `any`, `@ts-ignore`, casts vía `unknown` o magia sin justificación. Hoy el código no tiene ninguno y tiene que seguir así. Si un callback recibe un parámetro, tiparlo.
  - Lo que viene del servidor o de un catch es `unknown`: `mensajeDeError(err)` para el mensaje de un error y `requerido(valor, 'qué faltó')` para algo que tiene que existir (ambos en `utils/errores.ts`). Las filas son `FilaDeDatos`; las filas de resumen (filtros y totales), `FilaDeResumen`; los parámetros de un procedimiento, `ParametrosDeProcedimiento`.
  - `callApi<R>(...)` lleva la forma del resultado de ese procedimiento; la única afirmación de tipo sobre lo que manda el servidor está en `resultadoDeProcedimiento` (`utils/fetchApi.ts`).
  - `type-store` no publica tipos: están declarados en `src/types/type-store.d.ts`, escritos para mudarse tal cual a `types.d.ts` (`modules/type-store/index.d.ts`). Las columnas propias se distinguen con `esColumnaPropia` y `customType`, no con casts.
  - Una excepción acotada: los tests usan dobles de los eventos de react-data-grid con una aserción de tipo, en un único helper por archivo.
  - Si una `interface` no cabe en `FilaDeDatos` (`Record<string, unknown>`), es porque las interfaces no tienen firma de índice: usar `type`.
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

### Scroll de la página
- `html`, `body` y `#root` tienen `overflow: hidden` a propósito (las grillas toman el alto que queda de la ventana). El que scrollea es el contenedor que `MainLayout` pone dentro de `<main>`, **debajo** de un `<Toolbar />` espaciador (mide lo mismo que el de la AppBar en cualquier tamaño de pantalla). Una pantalla más alta que la ventana (una wScreen, un formulario de procedimiento, las pantallas de `backend-plus` como el tablero de dmencu) queda recortada si ese contenedor no scrollea. Y el área que scrollea no puede empezar en el borde de la ventana: la AppBar (fija) taparía la flecha de arriba de la barra de desplazamiento. No usar `theme.mixins.toolbar.minHeight` como margen: es solo el valor base (56 px) y la barra mide 64 px desde 600 px de ancho.
- Las grillas no deben generar una barra de más: en una página de grilla, `scrollHeight` del contenedor mayor que su `clientHeight` es un error del cálculo de alto de la grilla. Esto no se puede probar en jsdom: se mide en el navegador.

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
- **Detalle `wScreen`** (`{wScreen:'ticket', fields:[...]}`, como las anotaciones de un ticket en gestik): se dibuja la pantalla registrada en `myWScreens` y recibe `params` (los fixedFields del detalle como objeto plano, igual que `mainAction(params, div)` de backend-plus). La fila toma el alto de lo que la pantalla dibuja, hasta el máximo disponible, y scrollea por dentro. Las grillas que la pantalla arma (`<GenericDataGrid anidada .../>`) reciben ese máximo por `AltoDisponibleContext`. Con Ctrl+click o el botón del medio se abre en otra pestaña, en `/wScreens/<nombre>?campo=valor` (`PantallaDeRuta` pasa la query string como `params`).
- **`condition`** de un detalle: el nombre de una función registrada en `myConditions` (o `extendConditions`) que recibe la fila y dice si se muestra el botón; sin ella o si da falso, la celda queda vacía. Si el nombre no está registrado se avisa una vez por consola y se muestra el detalle.
- Lo que aporta la aplicación (`myWScreens`, `myClientSides`, `myResultsOk`, `myConditions`) se registra **antes del primer render**, no en un efecto: las rutas de las wScreens se arman al renderizar a partir del registro.
- El `ff` de un ítem de menú puede ser un arreglo `[{fieldName, value}]` (lo que documenta backend-plus) o un objeto `{campo: valor}` (lo que usa dmencu); `fixedFieldsDeMenu` entiende los dos.

### Sesión y arranque
- Con el estado todavía sin cargar (`idle`), `PrivateRoute` manda a `/login` guardando la ruta pedida; `InitialRedirectHandler` (montado fuera de las rutas privadas) vuelve a esa ruta cuando la sesión resulta válida. Tiene una guarda para no caer en la pantalla de inicio mientras la ruta guardada se limpia.
- **No hay `HomePage` ni ruta `/home`: la pantalla de inicio la define el backend, como en `backend-plus`.** `/` (`PantallaInicial`) redirige al ítem de menú con `selectedByDefault` (y, si es un grupo, al que lo declare adentro; `itemInicial`, `rutaDeItemDeMenu` en `utils/menuInicial.ts`, que también arma las rutas del menú lateral). Si el backend no declara ninguno, `/` queda vacía, igual que en `backend-plus`. El login y `InitialRedirectHandler` mandan a `/`. Una aplicación que quiera otra pantalla de inicio la declara en su menú.
- El cartel «¡Sesión expirada!» solo corresponde si hubo una sesión (guardada de la visita anterior o activa en esta carga). En la primera visita sin sesión, ir al login no lleva cartel.

---

## Puente con el cliente de backend-plus (opcional, `src/puente/`)

Para no perder lo que la grilla de `backend-plus` ya hace y que acá todavía no está: la aplicación pasa `puenteBP` a `App` y las wScreens que **no** registró en `myWScreens` se piden al cliente de `backend-plus` (`myOwn.wScreens[nombre]`), en lugar de mostrar «no implementada». `GrillaBP` pone `myOwn.tableGrid` dentro de una página React; `/bp/table/:tableName` sirve para comparar las dos grillas. Lo propio de React siempre tiene prioridad.

- **Mismo origen que el backend, obligatoriamente.** Los scripts de `backend-plus` solo se sirven con sesión (sin ella redirigen al login) y su cliente es un singleton global (`myOwn`, `my`). La aplicación se sirve bajo `<base-url>/react/` o, en desarrollo, Vite hace de proxy (ver `mi-frontend`: `VITE_BASE=/ggs2026/react/ VITE_BACKEND_URL=/ggs2026 PROXY_BACKEND=http://localhost:3044`).
- `cargarClienteBP` lee la página `<base-url>/menu`, saca de ahí los `<script>` y `<link>` (los arma el servidor con `clientIncludes`, en orden) y los carga. Es un atajo: lo sano sería que el servidor exponga esa lista, y eso es cambiar `backend-plus` (consultar antes).
- Tres cosas que el cliente de `backend-plus` necesita y que el puente hace: un `<base href>` en la base-url (arma sus direcciones relativas a la página), el global `my` igual a `myOwn`, y llamar a `myOwn.autoSetup()` a mano (él lo hace al evento `load`, que ya pasó).
- Una wScreen de `backend-plus` puede ser una función, un objeto con `mainFunction`, o un objeto con `parameters` y `mainAction` (como `abrir_encuesta` de dmencu: muestra el formulario de parámetros). `resolverPantallaBP` reproduce el `showPage` de my-menu.js para las tres.
- **Las pantallas de `backend-plus` viven en una sola ruta, `/bp/menu#w=<pantalla>&...`** (`PaginaBP`; `/wScreens-fallback/:nombre` redirige ahí). Se parece a `<base-url>/menu` **a propósito**: BP y las aplicaciones arman direcciones a partir de la ubicación (`location.origin + location.pathname + '/../menu#w=...'` en un `history.replaceState` + `location.reload()`, como el «Cerrar» de una encuesta de dmencu; `location.pathname + '#w=...'` para abrir en otra pestaña) y así caen en esta misma ruta, que lee los parámetros del hash (o de la query) como BP. Con otra ruta, esas direcciones salen de `/react`. En producción, el servidor tiene que devolver el `index.html` también para `/react/bp/menu`.
- **Lo que BP manda a páginas del backend se resuelve adentro** (`capturaDeNavegacion.ts`, activo mientras hay una pantalla de BP): clics en `<a>` (a nivel documento, también en diálogos) y, donde existe la Navigation API, cualquier `location.href = ...`. `rutaDeEnlaceBP` traduce `<base-url>/menu#w=...` a `/bp/menu#w=...`, y `login`/`logout` a los de la aplicación. El clic se corta con `stopPropagation`: el botón «proceder» de BP tiene además un `onclick` propio (`history.pushState` a `<base-url>/menu#...` y `showPage`) que dejaría la URL fuera de la aplicación y daría un error de BP. Los enlaces `menu#i=...` (ítems del menú de BP, sin `w`) no se traducen. Los parámetros se leen con `myOwn.UriSearchToObject`, no con `URLSearchParams`: `up`, `ff` y `detailing` tienen su propio formato y llegan como objetos.
- Las wScreens de `backend-plus` dibujan en `#main_layout`: `PantallaBP` le da ese contenedor y le pasa lo que declara su ítem de menú más la query string. Mientras está montada no puede haber otro elemento con ese id.
- `rutaBase` (`src/rutaBase.ts`) toma el `base` del bundler: es el `basename` del router y el prefijo de las pestañas nuevas (Ctrl+click en un detalle `wScreen`).
- **No hay un entorno de prueba automático para esto**: jsdom no carga los scripts de `backend-plus`. Los tests cubren la extracción de recursos y la elección de pantalla; el resto se prueba en el navegador contra un backend real (headless: Chrome con `--screenshot` y un proxy chico que inyecte la cookie de sesión).
- Probado contra ggs (con Chrome controlado por el protocolo de depuración, sin escribir en la base): grilla `usuarios`, la wScreen `ayuda` y `abrir_encuesta` hasta ver el formulario de la encuesta de dmencu dentro de `mi-frontend`. Sin probar: edición, detalles anidados, exportar y la convivencia del CSS global de `backend-plus` con MUI.

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
- Se cubren las funcionalidades críticas y, sobre todo, **cada bug que se arregla lleva su test**: se verifica que falle si se reintroduce el bug. Hoy (74 casos): codificación de parámetros, fixedFields de los detalles, detalle wScreen y `condition`, `PantallaDeRuta`, `ff` del menú, el store de la grilla, la vista de datos (orden, filtros, edición en el lugar), la edición con filtro, la cola de F4, la vuelta a la ruta pedida tras el login, el cartel de sesión expirada y los helpers.
- jsdom no calcula medidas ni trae `ResizeObserver`: lo que depende del layout (alturas, anchos, virtualización) se prueba en el navegador con `mi-frontend`, no en Vitest.
- Para el mock de `fetch` y de `fetchApi` usar `vi.stubGlobal` / `vi.mock`; no levantar servidores en los tests.
- Antes de commitear: `npm run typecheck`, `npm test` y `npm run build`.

### Pruebas en el navegador con un backend real
- `mi-frontend` sirve para probar con una aplicación real: `VITE_BACKEND_URL=/dmencu PROXY_BACKEND=http://localhost:3050 npx vite`. Con una ruta en `VITE_BACKEND_URL`, Vite hace de proxy y el navegador habla con un solo origen (el backend solo habilita CORS si tiene `server.allowedHosts`). En Git Bash agregar `MSYS_NO_PATHCONV=1` o la ruta se convierte en una ruta de Windows.
- Las credenciales de prueba se las da el usuario en el chat; **no escribirlas en archivos ni en la documentación**. Las pruebas contra una base real son de solo lectura salvo que el usuario diga otra cosa, y lo que se escriba se deja como estaba.
- Para medir rendimiento usar el build de producción: en desarrollo React valida de más y los tiempos engañan.

---

## Publicación en npm

Es automática, igual que `dmencu`: `.github/workflows/publish.yml` llama al workflow reutilizable `codenautas/.github@v3` (`npm ci`, `npm run build`, tests y `npm publish`). No hay token: npm confía en el repo (Trusted Publisher configurado en npmjs.com para `codenautas/frontend-plus-react`, workflow `publish.yml`, sin environment).

Para publicar una versión (solo cuando el usuario lo pide):
1. Subir la versión: `npm version X.Y.Z --no-git-tag-version` (toca `package.json` y `package-lock.json`; npm no deja republicar un número ya publicado).
2. Commit y `git push origin main`.
3. Crear y subir el tag: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`. El tag tiene que coincidir con la versión de `package.json` o el workflow falla.
4. Verificar en la pestaña Actions de GitHub y con `npm view frontend-plus-react version`. En esta máquina no está `gh`.

- Alternativa: correr el workflow a mano desde Actions en `main` (crea él mismo el tag `v<versión>`).
- Las versiones con `beta`, `alpha` o `rc` en el número se publican con ese dist-tag, no como `latest`.
- `package.json` necesita el campo `repository`; sin él npm no valida la publicación.
- `npm ci` exige el lock sincronizado: probar con `npm ci --dry-run` antes de taguear.

---

## Cuándo parar y preguntar

- Si hace falta cambiar `backend-plus` para que algo ande: parar. Casi siempre hay un punto de extensión (o el cambio va en el protocolo del cliente).
- Si una propiedad de `TableDefinition`, `FieldDefinition` o `ProcedureDef` no aparece en `backend-plus.d.ts`: no inventarla.
- Si el comportamiento observado difiere de `backend-plus`: avisar de la diferencia en lugar de resolverla en silencio.
- No publicar en npm ni subir tags sin que el usuario lo pida.

---

## Documentación

Mantener actualizados este archivo y el `README.md` cuando cambie el comportamiento de la grilla, el protocolo o el arranque. Las decisiones que se aprenden a los golpes (como las de arriba) van en la sección «Cosas que no son obvias», con el porqué.
