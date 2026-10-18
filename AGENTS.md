# Reglas para mejoras visuales del catálogo Natura

**Ámbito:** este procedimiento rige **solo** las solicitudes de auditoría y mejora de apariencia visual de la página web de `gruemp/natura`. No reemplaza instrucciones explícitas posteriores ni cambia reglas para depuración de productos, operaciones comerciales o Apps Script.

## Objetivo de diseño

- Priorizar cambios **perceptibles inmediatamente** al abrir la página, sin pasar el cursor, hacer clic, usar teclado, abrir menús ni activar estados.
- Evaluar simetría, alineaciones consistentes, equilibrio entre columnas y bloques, jerarquía, proporciones, márgenes, distribución, legibilidad, contraste y armonía cromática.
- Concentrarse en la **estructura exterior**: encabezado, navegación, búsqueda, filtros visibles, información, promociones, redes sociales y pie de página.
- Buscar **cinco mejoras independientes** por revisión solo como objetivo: contar diferencias estáticas verdaderamente notorias y distintas. Nunca dividir artificialmente un cambio en cinco ni introducir retoques por cumplir una cuota.
- No contar hover, animaciones, transiciones, foco, efectos invisibles, cambios técnicos, cambios de texto sin mejora de composición ni diferencias diminutas.

## Criterio permanente de distribución y aprovechamiento del espacio

- En cada actualización visual, revisar el conjunto en móvil, tableta y PC y aprovechar el espacio útil ya disponible antes de crear filas nuevas o empujar información hacia abajo.
- Evitar huecos grandes causados por columnas laterales más altas: la información comercial que acompaña los productos debe seguir al contenido de la columna central, sin esperar al final de toda la página.
- Agrupar controles relacionados y avisos breves en la misma fila cuando quepan con comodidad. En particular, el aviso y el acceso a Google deben compartir la fila de «Filtrar» en escritorio cuando estén visibles.
- Mantener márgenes, separaciones e iconos compactos y proporcionales, sin solapamientos, desbordamientos ni texto ilegible. Adaptar las filas al espacio real disponible y permitir reordenamiento en pantallas estrechas.
- Mantener justificados los textos informativos exteriores y conservar una jerarquía clara. Este criterio no autoriza cambios en las fichas de producto ni en el folleto.
- Comprobar la vista normal, búsquedas con pocos resultados y controles administrativos visibles cuando la sesión ya los muestre, sin conectar cuentas ni realizar operaciones comerciales para una revisión visual.

## Restricción absoluta: fichas de productos y folleto

La portada aprobada por el titular el 17 de octubre de 2026 se implementa en `catalogo-inicio.js`, `catalogo-inicio.css` y sus ilustraciones. Abarca únicamente el nivel inicial de categorías: dos columnas en escritorio, ilustraciones de categorías, controles agrupados y redes en una franja inferior. Las clases de esta composición deben retirarse al navegar, buscar o administrar. No extender sus estilos a categorías interiores, productos individuales ni folleto; conservar los nombres, cantidades y enlaces reales del catálogo.

**Está prohibido cambiar, directa o indirectamente, la presentación de cualquier ficha de producto**, tanto en web como en vista previa, folleto, PDF, PNG u otras exportaciones. Se deben conservar exactamente disposición, dimensiones, tipografías, colores, fondos, bordes, imágenes, botones, controles, espacios y alineaciones en todos los tamaños.

Para tareas visuales exteriores, **no modificar** generadores, plantillas, HTML de fichas, `catalogo-herramientas.js`, lógica de renderizado, variables o clases relacionadas con fichas ni estilos globales, heredados o compartidos capaces de afectarlas. No cambiar `body`, `:root`, `.grid`, `.card`, `.catalog-ficha-card` ni reglas de ancestros que modifiquen indirectamente tamaño o presentación de las fichas.

Añadir exclusivamente selectores de CSS **estrictamente acotados** a componentes exteriores autorizados. Comprobar que la nueva cascada no alcanza descendientes de fichas. Ante incertidumbre, descartar el cambio. **Un test estático o una ficha sintética no demuestran por sí solos que todas las fichas reales sean idénticas.**

## Flujo obligatorio para una modificación

1. Consultar el estado más reciente de `https://github.com/gruemp/natura`, rama `main`; leer el código relevante y revisar si la mejora ya está implementada. No asumir que un commit conocido sigue siendo la versión vigente.
2. Obtener evidencia **antes** de la vista inicial, a tamaños representativos de móvil, tableta y escritorio (por ejemplo **390, 768/820 y 1440/1280 px**), sin interacción ni operaciones comerciales. Revisar estructura exterior y fichas reales.
3. Proponer solo diferencias claras de composición. Cada mejora debe corresponder a una zona y cambio independiente visibles en la comparación, no a estados ocultos.
4. Implementar cambios exclusivamente en reglas CSS exteriores con ámbito estricto, referencia de versión CSS cuando proceda y pruebas indispensables. No tocar `apps-script/`, ningún proyecto o despliegue Apps Script, otros repositorios, maestro de reglas, datos, precios, funciones, permisos, integraciones, analítica ni pedidos.
5. Comparar capturas **antes/después** en las tres anchuras, con el mismo estado de contenido. Comprobar explícitamente la identidad visual de las fichas reales web y folleto/exportaciones; si esa garantía no es posible, no publicar la modificación y explicar el alcance real de la prueba.
6. Ejecutar pruebas automatizadas pertinentes y aislamiento de selectores; comprobar que el diff solo incluye archivos autorizados. Releer `main` justo antes de escribir; si ha cambiado, reanalizar y respetar concurrencia. Publicar en `main` únicamente mejoras justificadas y verificadas.
7. Verificar el resultado de GitHub Actions y el despliegue de GitHub Pages **del commit nuevo**, y hacer un único intento razonable de verificación pública en `https://gruemp.github.io/natura/catalogo.html?verificacion=1`. Si una herramienta bloquea el acceso, declararlo: no confundir renderizaciones locales con verificación del sitio publicado ni generar visitas artificiales.

## Cómo informar

Reportar brevemente la **cifra real** de mejoras visibles y publicadas, zonas afectadas, evidencia de capturas antes/después por ancho, comprobación de fichas web y folleto, commit exacto, pruebas, Actions, Pages, y enlace `https://gruemp.github.io/natura/catalogo.html`. Indicar claramente bloqueos, pasos no comprobados o propuestas no publicadas. **Nunca afirmar que el diseño está terminado.**

## Ejemplo de alcance permitido, ya ejecutado

El commit `1989a6e95605e4042061cde23a5aed2541bc4036` introdujo cinco mejoras exteriores: botón Folleto móvil menos dominante, atención centrada en tabletas, redes sociales en una fila de escritorio, contacto equilibrado en el pie y beneficios en tres columnas. **No volver a contarlas como nuevas** a menos que el código cambie y haya un problema visual diferente demostrado. La prueba automatizada de aislamiento de CSS y el éxito de Actions no sustituyen capturas completas de fichas reales.

Estas reglas **no crean una tarea programada**: se aplican cuando el titular pida revisar o mejorar la apariencia de la web, salvo que solicite expresamente una programación.

