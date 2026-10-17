# Natura — mapa de archivos

Estado vigente (2026-10-11): las fuentes de Natura se mantienen en https://github.com/gruemp/natura . La única carpeta vigente del proyecto en Google Drive es https://drive.google.com/drive/folders/14aLaWOZKqHKm42qlZmcx2HXnDwR9c249 . Las actualizaciones entre ambos se realizan manualmente, con verificación de contenido e identificadores; no hay sincronización automática.

## Sitio público

- `catalogo.html`: entrada principal del catálogo, orden de carga de recursos y arranque de `init()` cuando todos los módulos ya están disponibles.
- `catalogo.css`: estilos generales y responsive.
- `catalogo-app.js`: núcleo del catálogo: configuración, datos, productos, filtros, navegación y renderizado.
- `catalogo-cache.js`: copia persistente por navegador, vencimiento configurable y actualización manual del catálogo.
- `catalogo-carrito-pedido.js`: carrito, cliente, dirección, resumen PNG, registro de pedido y salida por WhatsApp.
- `catalogo-herramientas.js`: herramienta única Folleto: snapshot, layout y renderer comunes con salidas PNG y documento PDF. No controla el arranque del catálogo.
- `catalogo-ui.js`: ajustes de experiencia visual y comportamiento de interfaz.
- `precios-admin-config.js`: endpoint/configuración del administrador.
- `precios-admin.js`: interfaz administrativa de precios, visibilidad y controles.
- `analytics-visitas.js`: registro y lectura de analítica de visitas.

El catálogo conserva su carga original en una sola lectura. Después de la primera descarga correcta, guarda productos, imágenes disponibles, configuración pública y reglas de visibilidad en ese navegador. Recargar la página o volver a abrirla reutiliza la copia sin consultar nuevamente esos datos ni reiniciar su antigüedad. El intervalo comienza en 30 minutos y se cambia en Administración → Configuración → Preferencias compartidas. Los demás navegadores reciben el intervalo nuevo cuando actualizan su catálogo.

El botón **Actualizar catálogo** está disponible para visitantes y administradores y solicita una lectura nueva antes de vencer el plazo. Al vencer, la página renueva los datos en segundo plano; una pestaña oculta espera hasta volver a estar visible. La copia anterior permanece visible durante la actualización y se conserva si falla la conexión. Los cambios guardados explícitamente por el administrador se conservan en su copia local sin reiniciar el plazo. Esta copia es propia de cada navegador y no modifica los datos comerciales originales.

Recargar la página restaura la ruta, búsqueda, filtros, orden y posiciones de desplazamiento después de disponer de los productos y las reglas vigentes, antes de mostrar el catálogo. Las actualizaciones manuales y automáticas conservan la navegación actual y la tarjeta visible cuando sigue disponible. Si desaparece una rama, se conserva el nivel superior válido.

## Recursos técnicos públicos

- `robots.txt`: directivas para buscadores.
- `sitemap.xml`: mapa del sitio.
- `google8559800fc0ba033d.html`: verificación de Google; no renombrar.
- `recursos-visuales.js`: logo e iconos SVG definidos directamente en código, sin carpetas de imágenes. Los formatos PNG/WebP conservados en la raíz sirven exclusivamente para la compatibilidad de Apple y las vistas previas de redes sociales.

## Apps Script

- `apps-script/`: fuentes de los proyectos de Apps Script mantenidas en el repositorio independiente. El titular autoriza a los agentes a corregir y actualizar por iniciativa propia el código de los proyectos remotos oficiales, así como publicar sus despliegues existentes, sin pedir una confirmación adicional para cada corrección. Antes de publicar, ejecutar las pruebas pertinentes y verificar las identidades del proyecto y del despliegue; conservar los IDs, enlaces y permisos existentes y comprobar el resultado. Utilizar los workflows vigentes y las credenciales autorizadas, sin extraerlas ni mostrarlas. Esta autorización se limita al código y sus despliegues: no incluye modificar datos comerciales, inventario, precios, pedidos ni sincronizar archivos de Drive fuera de Apps Script.
- `lectura de carpetas en natura`: proyecto Apps Script real visible en Drive; es destino de ejecución, no fuente normal de edición.

## Repositorio independiente

- Las fuentes están en la raíz de https://github.com/gruemp/natura .
- Se trasladaron los 104 archivos de la carpeta preparada, conservando 1.019 commits de su historial; los identificadores de los commits cambian al extraer la subcarpeta. El repositorio stock conserva su historia original.
- `.github/workflows/verificar-fuentes-natura.yml` comprueba sintaxis, manifiestos y pruebas sin datos comerciales ni secretos.
- La credencial `CLASPRC_JSON` está guardada como secreto del repositorio y `NATURA_PUBLICACION_HABILITADA=true` habilita sus publicaciones. Los cinco proyectos y despliegues oficiales de Google fueron consultados y publicados correctamente el 2026-10-11; los publicadores anteriores de Apps Script en stock están desactivados.
- Catálogo publicado: https://gruemp.github.io/natura/catalogo.html . GitHub Pages se sirve desde `main`, en la raíz; canonical, sitemap, robots y enlaces del catálogo utilizan esta dirección.
- El lector público utiliza un proyecto independiente y consulta tres propiedades públicas vigentes mediante la biblioteca privada del administrador, fijada en la versión 35. Su publicación conserva el archivo original Código.gs y no modifica el administrador.
- Carpeta vigente de Google Drive: https://drive.google.com/drive/folders/14aLaWOZKqHKm42qlZmcx2HXnDwR9c249 . Los archivos de código conciliados conservan sus IDs. La carpeta de anuncios y el proyecto nativo de lectura se trasladaron conservando sus identificadores y permisos; las hojas comerciales y los despliegues mantienen sus identidades.
- Los procedimientos retirados de migración y sincronización se consultan en el historial Git; no forman parte del código vigente.

## Sincronizar solo diferencias con Google Drive

El **origen del código** es GitHub; la carpeta de [fuentes originales en Drive](https://drive.google.com/drive/folders/14aLaWOZKqHKm42qlZmcx2HXnDwR9c249) recibe únicamente las diferencias que autorice el titular. La última conciliación completa de fuentes activas fue de **68/68 archivos de texto**, comprobados contra el commit `7efbde14e2b63061858bb8080d9b0a7059cea3da` el 2026-10-12; [auditoría verificada](https://github.com/gruemp/natura/actions/runs/38317024151).

**Procedimiento para la próxima sincronización puntual**:

1. Preparar desde la pestaña *Actions* el workflow manual `Preparar cambios Natura para Google Drive`. Compara la rama principal contra `.github/natura-drive-sync-state.json` (o un commit base indicado manualmente), **sin acceder a secretos ni escribir en Drive**. Produce un ZIP con solo los archivos fuente modificados y un `manifest.json` con ruta, tamaño y SHA-256; las eliminaciones se notifican pero **no se ejecutan**.
2. Cotejar el paquete con los archivos ya existentes en Drive, resolviendo cada ruta desde la carpeta vigente y buscando **por nombre exacto dentro de su carpeta**. Si hay duplicados o rutas ambiguas, detener la operación. Comparar hashes y **no subir contenido idéntico**.
3. Actualizar con la conexión autorizada de Google Drive únicamente los originales que difieran (misma identidad/ID, ubicación, enlaces, permisos e historial). Crear los nuevos solo si faltan. **No borrar ni reemplazar carpetas completas**.
4. Releer los archivos tocados y comparar sus bytes/hashes con GitHub; auditar el alcance previsto. Registrar el commit conciliado y actualizar el punto de control **solo después** de verificar todas las escrituras. Si hay un error, dejarlo registrado y conservar el último commit verificado.

`CLASPRC_JSON` **no es necesaria** para la transferencia directa mediante las conexiones de ChatGPT; el workflow manual solo prepara el paquete. Los permisos de despliegue de Apps Script, los documentos comerciales y los archivos binarios/históricos están fuera de esta sincronización. No se activa sincronización automática.

## Regla de mantenimiento

Conservar los nombres públicos y técnicos estables salvo necesidad real. Dividir archivos solo cuando exista una responsabilidad clara y la separación reduzca riesgo de mantenimiento sin cambiar el comportamiento público.

Toda opción administrativa que escriba en un libro externo debe ofrecer en esa misma pantalla un enlace al libro correspondiente, en una pestaña nueva y conservando abierto el formulario o diálogo. Reutilizar el registro de documentos vigente y verificar que el destino coincide con el libro donde se escribe.

## Archivo

`.github/archivo/recursos-visuales/` conserva los originales gráficos reemplazados por los SVG del sitio, con su guía de procedencia. Los scripts, workflows, activadores y solicitudes retirados se recuperan del historial Git. Los workflows operativos permanecen en `.github/workflows/`.
