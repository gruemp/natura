# Apps Script de Natura

Esta carpeta reúne las fuentes de los cinco proyectos Apps Script de Natura en https://github.com/gruemp/natura . La carpeta vigente del proyecto en Drive es https://drive.google.com/drive/folders/14aLaWOZKqHKm42qlZmcx2HXnDwR9c249 . Los proyectos remotos son destinos de ejecución y despliegue. Los cambios de fuentes no autorizan por sí solos modificar datos comerciales.

## Proyectos oficiales

- `administrar precios natura`
- `pedidos natura`
- `lectura de carpetas en natura`
- `coordenadas de visitantes natura`
- `lector publico natura`

## Origen de trabajo y continuidad (2026-10-11)

- Las fuentes se mantienen en este repositorio independiente. Drive se actualiza manualmente, verificando contenido y conservando los IDs de los archivos existentes. No hay sincronización automática GitHub ↔ Drive.
- Las publicaciones vigentes de Apps Script utilizan los workflows de `gruemp/natura/.github/workflows/`. Los publicadores anteriores de stock están desactivados. La publicación de Apps Script es distinta de la actualización de archivos en Drive.
- `CLASPRC_JSON` ya existe como secreto del repositorio y `NATURA_PUBLICACION_HABILITADA=true` habilita las publicaciones. Su renovación segura sigue pendiente; no extraer ni registrar credenciales en archivos o mensajes.
- Antes de cualquier nueva publicación, verificar `scriptId`, implementación, permisos y relación con el proyecto remoto. No activar dos publicadores ni usar `clasp push --force` con identidades no conciliadas.
- El lector depende de las propiedades vigentes del administrador. La hoja antigua solo se importó una vez y no representa el estado actual.
- El lector independiente es `1osm-0ZxL2p5UV041ufVSM2nQZezp2TonkC48wNWIG8EOPWAYMTSVY7DX`. Consulta tres propiedades públicas mediante `AdminNatura.leerEstadoPublicoNatura()`, utilizando la biblioteca privada del administrador fijada en la versión 35.
- Su publicación conserva `Código.gs` y el manifiesto, sin sobrescribir el administrador. El despliegue inicial fue la versión 1; la publicación posterior de la versión 2 consta en `entrega.md`. El campo `version` de `deployment.json` registra la verificación inicial, no una consulta actual del despliegue remoto.
- Endpoint vigente: https://script.google.com/macros/s/AKfycbzVQGki8PkioPQL1bbsm3_z-yVBuG02PZ0kNkiQXbtP8Dp2wamppiXQgmBLEEAEVFde4A/exec .
- La carpeta de anuncios y el proyecto nativo de lectura se trasladaron a la carpeta vigente conservando IDs y permisos. Las hojas comerciales y los despliegues mantienen sus identidades.
- `google-projects.json` registra los cinco proyectos y no habilita sincronización con Drive. Los auxiliares históricos están en `.github/archivo/` y sus referencias no deben utilizarse como fuentes actuales.
- Las operaciones con datos comerciales, inventario, precios, pedidos y servicios publicados requieren autorización correspondiente.

## Pedidos Natura

El proyecto `pedidos natura` está dividido por responsabilidades sin cambiar sus endpoints ni la validación contra el inventario oficial:

- `Código.js`: configuración, `doGet`, `doPost` y orquestación principal del registro de pedidos.
- `pedidos-tablas.js`: resolución segura de tablas y encabezados requeridos.
- `pedidos-inventario.js`: normalización de productos, consulta del inventario oficial y cálculo de precios/envío.
- `pedidos-registro.js`: escritura del movimiento, numeración consecutiva y dirección enriquecida con enlace a Maps.
- `pedidos-solicitudes.js`: idempotencia mediante `client_request_id`, registro temporal de solicitudes, sanitización y respuestas JSON/JSONP.

Las funciones públicas `doGet` y `doPost` permanecen en `Código.js`; la separación solo redistribuye funciones internas del mismo proyecto Apps Script.

## Lectura de carpetas Natura

Desde 2026-10-12, el mismo servicio de solo lectura ofrece `modo=productos`: `productos-lectura.js` lee exclusivamente `Productos!A` del maestro original. El encabezado vigente es `Informacion del producto`; no existe una columna B operativa. Los nombres de etiquetas íntegramente en negrita seleccionan los atributos comerciales y conservan su orden. La respuesta elimina datos privados y notas antes de enviarlos; solo añade código normalizado, identidad, navegación, disponibilidad y precio necesarios para operar. Una etiqueta sin negrita o con formato mixto no autoriza publicar su valor. Los permisos del servicio se limitan a lectura de Drive y de Sheets.

El catálogo muestra hasta tres palabras en pestañas y opciones, conservando la identidad completa de los filtros. Las fichas web, PNG y PDF omiten el bloque inferior de descripción y su separador; conservan precio y controles. La actualización administrativa del precio mantiene los tramos de Rich Text de A. Las pruebas de integración incluyen el contrato de una sola columna, privacidad, filtros y pedidos sin escribir movimientos comerciales.

El proyecto `lectura de carpetas en natura` está dividido por responsabilidades sin cambiar su endpoint público ni sus funciones manuales de mantenimiento:

- `Código.js`: configuración y `doGet` del índice público de imágenes.
- `imagenes-indice.js`: construcción del índice de productos, regalos y recursos web.
- `imagenes-utilidades.js`: normalización de carpetas, validación de imágenes, códigos de producto y datos públicos de archivos.
- `imagenes-cache.js`: lectura/escritura de caché y funciones manuales `clearImageIndexCache`, `refreshImageIndexCache` y `testIndex`.

El servicio sigue siendo de solo lectura sobre Google Drive: no mueve, elimina ni modifica archivos de productos.

## Coordenadas de visitantes Natura

El proyecto `coordenadas de visitantes natura` está dividido por responsabilidades sin cambiar sus funciones públicas:

- `Código.js`: configuración, `doGet`, `doPost`, pruebas manuales y orquestación principal del registro.
- `visitantes-identidad.js`: identificación del navegador, alias y reglas para visitas propias.
- `visitantes-validacion.js`: respuestas JSON/JSONP, parámetros, validación, normalización y resolución de encabezados.
- `visitantes-control.js`: duplicados, rate limit, modos de registro y estadísticas de visitas.
- `visitantes-servicios.js`: distancia, geocodificación inversa, caché de dirección y avisos por Telegram.

Las funciones públicas y nombres externos se conservan; la separación solo redistribuye funciones internas entre archivos del mismo proyecto Apps Script.

## Administración de precios

El proyecto `administrar precios natura` está dividido por responsabilidades sin cambiar sus funciones públicas ni los HTML existentes:

- `Código.js`: constantes compartidas, `doGet` y respuesta principal del servicio.
- `admin-configuracion.js`: lectura y actualización de controles de configuración.
- `admin-precios.js`: lectura y actualización segura de precios.
- `admin-visibilidad.js`: lectura y actualización de reglas de visibilidad.
- `admin-contextos.js`: resolución de hojas, encabezados y normalizaciones compartidas.
- `Admin.html` y `Puente.html`: interfaces existentes; no se cambian sus llamadas públicas.

La edición se ejecuta como la cuenta de Google que accede y requiere permiso sobre el inventario oficial. Los campos se resuelven por encabezados, el código de producto debe ser único y las escrituras críticas siguen protegidas con `LockService`.
