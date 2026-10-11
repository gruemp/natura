# Natura — mapa de archivos

Estado de preparación (2026-10-11): durante esta etapa, el trabajo sobre el código de Natura se realiza exclusivamente en GitHub, en el repositorio independiente `gruemp/natura`. Google Drive no se modifica. El cambio definitivo de fuente principal y la futura sincronización GitHub → Drive permanecen pendientes de decisión y validación; no se presupone que todos los archivos ya estén conciliados.

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

- `apps-script/`: fuentes de los proyectos de Apps Script conservadas en GitHub para preparar el repositorio independiente. Los proyectos y despliegues de Google siguen siendo sistemas externos; ninguna actualización del código autoriza por sí sola publicar, sobrescribir el Apps Script remoto ni cambiar sus datos.
- `lectura de carpetas en natura`: proyecto Apps Script real visible en Drive; es destino de ejecución, no fuente normal de edición.

## Repositorio independiente

- Las fuentes están en la raíz de https://github.com/gruemp/natura .
- Se trasladaron los 104 archivos de la carpeta preparada, conservando 1.019 commits de su historial; los identificadores de los commits cambian al extraer la subcarpeta. El repositorio stock conserva su historia original.
- `.github/workflows/verificar-fuentes-natura.yml` comprueba sintaxis, manifiestos y pruebas sin datos comerciales ni secretos.
- Los flujos que interactúan con Google permanecen bloqueados por `NATURA_PUBLICACION_HABILITADA`; no se ha transferido ningún secreto.
- Catálogo publicado: https://gruemp.github.io/natura/catalogo.html . GitHub Pages se sirve desde `main`, en la raíz; canonical, sitemap, robots y enlaces del catálogo utilizan esta dirección.
- El lector público y el administrador siguen compartiendo proyecto y propiedades. Separarlos exige conservar la visibilidad y la configuración vigentes; no basta con cambiar `scriptId`.
- Google Drive no está sincronizado. La dirección definitiva de sincronización queda pendiente.
- `migrar-natura.yml` conserva el proceso de extracción utilizado y rechaza una nueva ejecución sobre un repositorio ya poblado.

## Regla de mantenimiento

Conservar los nombres públicos y técnicos estables salvo necesidad real. Dividir archivos solo cuando exista una responsabilidad clara y la separación reduzca riesgo de mantenimiento sin cambiar el comportamiento público.

## Archivo

Los recursos retirados de producción se conservan fuera de la carpeta activa, en la carpeta de archivo definida para el proyecto.
