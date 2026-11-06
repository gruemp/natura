# Natura — mapa de archivos

**Estado vigente (2026-11-06): las sincronizaciones están suspendidas.** El origen de las fuentes es la carpeta `natura/codigo/` de Google Drive; GitHub conserva el repositorio de publicación. Solo se permitirán transferencias de Drive a GitHub cuando el titular lo ordene expresamente; la dirección inversa requerirá una instrucción posterior. Leer `.github/POLITICA-SINCRONIZACION-DRIVE-GITHUB.md` antes de preparar cambios. Ningún archivo de `natura/recursos/` se sincroniza.

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
- `recursos-visuales.js`: utiliza el logo original `logo_empresa.png`, confirmado por el titular, para el encabezado, favicon y documentos que consumen `NATURA_RECURSOS.logoUrl`. Los iconos de navegación siguen definidos como SVG en código. El logo PNG/WebP también se utiliza en Apple y en las vistas previas de redes sociales.

## Apps Script

- `apps-script/`: copias históricas vinculadas a proyectos de Apps Script; no son fuente activa ni autorizan publicaciones. El material histórico de Drive está en `natura/recursos/apps-script/`. Los proyectos vigentes de Apps Script se administran directamente en Apps Script, fuera de la sincronización del sitio. Los workflows antiguos de publicación de Apps Script en GitHub están suspendidos.
- `lectura de carpetas en natura`: proyecto Apps Script real visible en Drive; es destino de ejecución, no fuente normal de edición.

## Repositorio independiente

- La versión publicada en GitHub mantiene su estructura en la raíz de https://github.com/gruemp/natura ; la raíz correspondiente de fuentes en Drive es `natura/codigo/`.
- Se trasladaron los 104 archivos de la carpeta preparada, conservando 1.019 commits de su historial; los identificadores de los commits cambian al extraer la subcarpeta. El repositorio stock conserva su historia original.
- `.github/workflows/verificar-fuentes-natura.yml` comprueba sintaxis, manifiestos y pruebas sin datos comerciales ni secretos.
- Históricamente se utilizaron credenciales y workflows de Apps Script; esos publicadores se han retirado de GitHub Actions. No se autoriza sincronización ni publicación de Apps Script desde el repositorio.
- Catálogo publicado: https://gruemp.github.io/natura/catalogo.html . GitHub Pages se sirve desde `main`, en la raíz; canonical, sitemap, robots y enlaces del catálogo utilizan esta dirección.
- El lector público utiliza un proyecto independiente y consulta tres propiedades públicas vigentes mediante la biblioteca privada del administrador, fijada en la versión 35. Su publicación conserva el archivo original Código.gs y no modifica el administrador.
- Carpeta vigente de Google Drive: https://drive.google.com/drive/folders/14aLaWOZKqHKm42qlZmcx2HXnDwR9c249 . Los archivos de código conciliados conservan sus IDs. La carpeta de anuncios y el proyecto nativo de lectura se trasladaron conservando sus identificadores y permisos; las hojas comerciales y los despliegues mantienen sus identidades.
- Los procedimientos retirados de migración y sincronización se consultan en el historial Git; no forman parte del código vigente.

## Sincronización de fuentes (suspendida)

**No ejecutar ninguna sincronización.** Este procedimiento reemplaza las instrucciones históricas GitHub → Drive. La fuente actual de Natura es [Google Drive, `natura/codigo/`](https://drive.google.com/drive/folders/1QTjyvYBFb5ZEzRwI9c8HyV_98oLhgbQ7). Su contenido se corresponderá en una futura operación autorizada con la **raíz** de `gruemp/natura`, sin añadir una carpeta `codigo/` en GitHub. La carpeta [`natura/recursos/`](https://drive.google.com/drive/folders/1sNOwNw1-YZs980o6zQ86uXJ2N7dC9NKN) está protegida y excluida.

El titular debe autorizar explícitamente cada operación, su dirección y alcance. Por defecto, una futura sincronización será **Google Drive → GitHub**; la dirección inversa solo puede habilitarse con una nueva orden expresa. Preparar primero una comparación de rutas, tamaños y SHA-256, separar creaciones, modificaciones, conflictos y eliminaciones, y pedir autorización específica para eliminar, modificar workflows, publicar o tocar Apps Script. Ante una orden autorizada, crear una rama de revisión, sin fusionar a `main` ni activar publicaciones por inferencia.

Los workflows antiguos de preparación GitHub → Drive, actualización automática de directorio, importación de imágenes en Drive y publicación de Apps Script quedaron fuera de `.github/workflows/`; sus versiones se conservan en `.github/archivo/workflows-suspendidos/`. No se ejecutarán ni restaurarán sin instrucción del titular.

Como **antecedente histórico**, la última conciliación antes de este cambio registró 68/68 archivos de texto frente al commit `7efbde14e2b63061858bb8080d9b0a7059cea3da` el 2026-10-12 ([auditoría](https://github.com/gruemp/natura/actions/runs/38317024151)). El punto de control `.github/natura-drive-sync-state.json` pertenecía al procedimiento anterior y no habilita transferencias actuales. La nueva política aplicable está en [`.github/POLITICA-SINCRONIZACION-DRIVE-GITHUB.md`](.github/POLITICA-SINCRONIZACION-DRIVE-GITHUB.md).

## Regla de mantenimiento

Conservar los nombres públicos y técnicos estables salvo necesidad real. Dividir archivos solo cuando exista una responsabilidad clara y la separación reduzca riesgo de mantenimiento sin cambiar el comportamiento público.

Toda opción administrativa que escriba en un libro externo debe ofrecer en esa misma pantalla un enlace al libro correspondiente, en una pestaña nueva y conservando abierto el formulario o diálogo. Reutilizar el registro de documentos vigente y verificar que el destino coincide con el libro donde se escribe.

## Archivo

`.github/archivo/recursos-visuales/` conserva los originales gráficos reemplazados por los SVG del sitio, con su guía de procedencia. Los cinco workflows suspendidos permanecen en `.github/archivo/workflows-suspendidos/`, fuera del directorio ejecutable de Actions. Los demás scripts, activadores y solicitudes retirados también se recuperan del historial Git. Solo los workflows de verificación de lectura se mantienen activos en `.github/workflows/`.

