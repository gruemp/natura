# Política de sincronización entre Google Drive y GitHub — SUSPENDIDA

Vigente desde el 6 de noviembre de 2026. Aplica al proyecto Natura y, como criterio general, a los 16 proyectos de la carpeta «paginas web» de Google Drive.

## Dirección predeterminada
- **Origen:** Google Drive, carpeta `paginas web/<proyecto>/codigo/`.
- **Destino:** la raíz del repositorio GitHub correspondiente, conservando las rutas internas.
- **Carpeta protegida:** `paginas web/<proyecto>/recursos/`. Nunca comparar, transferir, sobrescribir ni borrar su contenido como parte de la sincronización.
- Las copias históricas de Apps Script no se sincronizan ni se publican. Los proyectos oficiales de Apps Script se editan y publican directamente en Apps Script.
- No se permite GitHub → Drive sin una instrucción posterior, explícita y específica del titular.

## Estado actual: sin sincronización
No ejecutar ninguna transferencia o actualización automática ni manual de contenido entre Drive y GitHub hasta recibir una orden expresa del titular. No usar programación periódica, push como disparador de sincronización ni secretos de Google para este propósito. Este documento no autoriza ningún despliegue.

## Procedimiento únicamente cuando se autorice
1. Identificar el proyecto exacto y confirmar la orden específica y la dirección autorizada.
2. Leer `codigo/` recursivamente, conservar rutas relativas y verificar nombres y versiones. Excluir `recursos/`, respaldos, credenciales, secretos, datos privados y artefactos de Apps Script.
3. Comparar por ruta y huella SHA-256 con el repositorio. Presentar diferencias: nuevos, modificados, eliminados y renombrados. No asumir que lo ausente en Drive debe borrarse de GitHub.
4. Detener la operación si aparecen rutas ambiguas, conflictos o contenido sensible. Las eliminaciones, los workflows, los cambios de publicación y Apps Script requieren autorización separada.
5. Solo tras orden expresa, preparar los cambios permitidos en una rama de revisión de GitHub. No modificar `main`, hacer merge, publicar ni activar automatizaciones sin autorización específica.
6. Verificar archivos, pruebas, diferencias y commit; registrar el estado conciliado solo después de una operación aprobada y completada.

Esta política es documentación de control de GitHub: no es parte del código del sitio que se debe copiar a Google Drive. Las futuras operaciones deben excluirla de la correspondencia de archivos.

## Workflows suspendidos de Natura
Se conservan únicamente como historial inerte en `.github/archivo/workflows-suspendidos/`; no se ejecutan desde `.github/workflows/`. Solo pueden restaurarse por orden expresa del titular, previa revisión de los efectos.
