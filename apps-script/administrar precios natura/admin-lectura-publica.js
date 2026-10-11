/** Lectura pública sin escrituras ni acceso a hojas. */
function leerEstadoPublicoNatura() {
  const propiedades = PropertiesService.getScriptProperties();
  return {
    configuracion: propiedades.getProperty("CATALOGO_CONFIG_PUBLIC_SNAPSHOT_V1"),
    revision: propiedades.getProperty("CATALOGO_CONFIG_PUBLIC_REVISION_V1"),
    visibilidad: propiedades.getProperty("CATALOGO_VISIBILIDAD_REGLAS_V1")
  };
}
