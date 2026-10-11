# Entrega de Natura

Actualizado: 2026-10-11.

## Resultado de la extracción

Repositorio independiente: https://github.com/gruemp/natura .
Origen exacto: https://github.com/gruemp/stock/tree/33a1026b32544f3a350b41f6f923a6ef763e2b95/natura .

Los 104 archivos del origen se trasladaron a la raíz con igualdad de sus objetos Git. Se conservaron 1.019 commits propios de Natura, con autores, fechas, mensajes y relaciones entre padres aplicables a la subcarpeta. Los SHA cambian al extraer el árbol; la historia original permanece en stock.

Evidencia del traslado: https://github.com/gruemp/natura/actions/runs/38117286206 .
La extracción ejecutó sintaxis JavaScript, JSON y 78 pruebas: 77 aprobadas y una opcional omitida, sin escrituras comerciales. El primer intento fue rechazado por permisos de workflows; el segundo terminó correctamente después de añadir las automatizaciones con el conector autorizado.

## Publicación y servicios

Catálogo publicado: https://gruemp.github.io/natura/catalogo.html . GitHub Pages está configurado desde main y la raíz del repositorio; el despliegue inicial terminó correctamente y catalogo.html respondió HTTP 200. Canonical, sitemap, robots y enlaces de exportación y pedidos se adaptan a esa dirección.

Las publicaciones Apps Script continúan desde stock. Los cuatro flujos del nuevo repositorio que interactúan con Google exigen NATURA_PUBLICACION_HABILITADA=true; no se habilitaron ni se trasladaron secretos. No hay dos publicadores Apps Script activos.

El lector y el administrador comparten scriptId y propiedades. La visibilidad y la configuración vigentes están en PropertiesService; las hojas anteriores son fuentes de importación inicial. Separar proyectos requiere un mecanismo que preserve ese estado y sus futuras actualizaciones, además de verificar permisos e implementaciones. La protección del lector sigue bloqueando la sobrescritura del administrador.

## Pendientes

1. Publicación web realizada; las comprobaciones de fuente se ejecutan automáticamente después de este ajuste.
2. Acceder a los proyectos originales de Google y resolver el lector público con su estado vigente; el acceso del navegador quedó bloqueado por revisión automática al redirigir a developers.google.com.
3. Reconectar credenciales y permisos de Google de forma segura; verificar los servicios antes de sustituir el publicador de stock.
4. Definir la fuente principal definitiva y la sincronización con Drive; no se ha modificado Drive.
5. Cuenta renombrada por el titular a gruemp el 2026-10-11; referencias del catálogo actualizadas.

No se borraron archivos del repositorio stock, no se fusionó su PR #8 y no se registraron pedidos, ventas, visitas ni modificaciones de inventario como pruebas.
