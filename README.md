# Natura — mapa de archivos

Estado vigente (2026-10-11): las fuentes de Natura se mantienen en https://github.com/gruemp/natura . La única carpeta vigente del proyecto en Google Drive es https://drive.google.com/drive/folders/14aLaWOZKqHKm42qlZmcx2HXnDwR9c249 . Las actualizaciones entre ambos se realizan manualmente, con verificación de contenido e identificadores; no hay sincronización automática.

## Sitio público

- `catalogo.html`: entrada principal del catálogo, orden de carga de recursos y arranque de `init()` cuando todos los módulos ya están disponibles.
- `catalogo.css`: estilos generales y responsive.
- `catalogo-app.js`: núcleo del catálogo: configuración, datos, productos, filtros, navegación y renderizado.
- `catalogo-carrito-pedido.js`: carrito, cliente, dirección, resumen PNG, registro de pedido y salida por WhatsApp.
- `catalogo-herramientas.js`: herramienta única Folleto: snapshot, layout y renderer comunes con salidas PNG y documento PDF. No controla el arranque del catálogo.
- `catalogo-ui.js`: ajustes de experiencia visual y comportamiento de interfaz.
- `precios-admin-config.js`: endpoint/configuración del administrador.
- `precios-admin.js`: interfaz administrativa de precios, visibilidad y controles.
- `analytics-visitas.js`: registro y lectura de analítica de visitas.

## Recursos técnicos públicos

- `robots.txt`: directivas para buscadores.
- `sitemap.xml`: mapa del sitio.
- `google8559800fc0ba033d.html`: verificación de Google; no renombrar.
- `logos/`: imágenes y recursos gráficos usados por el catálogo.

## Apps Script

- `apps-script/`: fuentes de los proyectos de Apps Script mantenidas en el repositorio independiente. Los proyectos y despliegues de Google siguen siendo sistemas externos; ninguna actualización del código autoriza por sí sola publicar, sobrescribir el Apps Script remoto ni cambiar sus datos.
- `lectura de carpetas en natura`: proyecto Apps Script real visible en Drive; es destino de ejecución, no fuente normal de edición.

## Repositorio independiente

- Las fuentes están en la raíz de https://github.com/gruemp/natura .
- Se trasladaron los 104 archivos de la carpeta preparada, conservando 1.019 commits de su historial; los identificadores de los commits cambian al extraer la subcarpeta. El repositorio stock conserva su historia original.
- `.github/workflows/verificar-fuentes-natura.yml` comprueba sintaxis, manifiestos y pruebas sin datos comerciales ni secretos.
- La credencial `CLASPRC_JSON` está guardada como secreto del repositorio y `NATURA_PUBLICACION_HABILITADA=true` habilita sus publicaciones. Los cinco proyectos y despliegues oficiales de Google fueron consultados y publicados correctamente el 2026-10-11; los publicadores anteriores de Apps Script en stock están desactivados.
- Catálogo publicado: https://gruemp.github.io/natura/catalogo.html . GitHub Pages se sirve desde `main`, en la raíz; canonical, sitemap, robots y enlaces del catálogo utilizan esta dirección.
- El lector público utiliza un proyecto independiente y consulta tres propiedades públicas vigentes mediante la biblioteca privada del administrador, fijada en la versión 35. Su publicación conserva el archivo original Código.gs y no modifica el administrador.
- Carpeta vigente de Google Drive: https://drive.google.com/drive/folders/14aLaWOZKqHKm42qlZmcx2HXnDwR9c249 . Los archivos de código conciliados conservan sus IDs. La carpeta de anuncios y el proyecto nativo de lectura se trasladaron conservando sus identificadores y permisos; las hojas comerciales y los despliegues mantienen sus identidades.
- `.github/archivo/workflows/migrar-natura.yml` conserva el proceso histórico de extracción. Está archivado y no es un workflow operativo.

## Regla de mantenimiento

Conservar los nombres públicos y técnicos estables salvo necesidad real. Dividir archivos solo cuando exista una responsabilidad clara y la separación reduzca riesgo de mantenimiento sin cambiar el comportamiento público.

## Archivo

Los recursos históricos se conservan en `.github/archivo/`, con guía en `.github/archivo/leeme.md`. Los workflows retirados están en `.github/archivo/workflows/`; los operativos permanecen en `.github/workflows/`. Los IDs de recursos archivados son evidencia histórica, no referencias vigentes. No ejecutar auxiliares archivados sin revisar referencias, permisos y autorización.
