// Implementación inmutable, pública y de SOLO LECTURA del catálogo.
// No contiene el panel administrativo ni métodos de actualización.
// Lee únicamente propiedades públicas del administrador mediante biblioteca privada versionada.
const CONFIG_PUBLIC_KEYS = ['REGISTRAR_VISITAS_PROPIAS','MOSTRAR_CANTIDAD_STOCK','MOSTRAR_PRECIOS_PRODUCTO','CARGAR_IMAGENES_CATALOGO','ORDEN_NAVEGACION','ORDEN_PRODUCTOS','ACTUALIZACION_CATALOGO_MINUTOS'];
const VISIBILIDAD_TIPOS = ['producto','seccion','categoria','subcategoria','publico','linea','familia'];

function doGet(evento) {
  const p = evento && evento.parameter || {};
  const modo = String(p.modo || '').trim().toLowerCase();
  let payload;
  try {
    if (modo === 'visibilidad') payload = leerVisibilidadPublica_();
    else if (modo === 'config') payload = leerConfiguracionPublica_();
    else payload = {ok:false,error:'Modo público inexistente.'};
  } catch (e) {
    payload = {ok:false,error:'El control público no está disponible.'};
  }
  const callback = String(p.callback || '').trim();
  const json = JSON.stringify(payload);
  if (callback && !/^[A-Za-z_$][A-Za-z0-9_$]{0,100}$/.test(callback)) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Callback no válido.'})).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(callback ? callback+'('+json+');' : json)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
function normalizar_(valor) {
  return String(valor == null ? '' : valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
}
function confirmarReglas_(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Error('Visibilidad vacía');
  const claves = new Set();
  return raw.map(function(regla) {
    if (!regla || typeof regla.oculto !== 'boolean') throw new Error('Regla inválida');
    const tipo = normalizar_(regla.tipo).replace(/\s+/g,'');
    let identificador = normalizar_(regla.identificador).slice(0,500);
    if (tipo==='producto' && /^\d{1,4}$/.test(identificador)) identificador=identificador.padStart(4,'0');
    if (!VISIBILIDAD_TIPOS.includes(tipo) || !identificador || (tipo==='producto'&&!/^\d{4}$/.test(identificador))) throw new Error('Identificador inválido');
    const clave=tipo+'::'+identificador;
    if (claves.has(clave)) throw new Error('Duplicado');
    claves.add(clave);
    return {tipo:tipo,identificador:identificador,oculto:regla.oculto,etiqueta:String(regla.etiqueta||'').slice(0,250)};
  });
}
function leerVisibilidadPublica_() {
  const estado = AdminNatura.leerEstadoPublicoNatura();
  const obj = JSON.parse(estado.visibilidad);
  if (!obj || obj.version !== 1) throw new Error('Versión desconocida');
  return {ok:true,reglas:confirmarReglas_(obj.reglas),actualizadoEn:new Date().toISOString()};
}
function confirmarConfiguracion_(valores,revision) {
  if(!Array.isArray(valores) || ![5,6,7].includes(valores.length) || !revision || !Number.isFinite(Date.parse(revision)))throw new Error('Configuración incompleta');
  // Una versión anterior del administrador publicaba cinco claves. Completar la
  // nueva preferencia en ACTIVADO conserva fotografías sin bloquear el catálogo.
  const actuales=valores.length===5
    ? [valores[0],valores[1],valores[2],'ACTIVADO',valores[3],valores[4]]
    : valores.slice();
  if(actuales.length===6)actuales.push('30');
  for(let i=0;i<4;i++)if(!['ACTIVADO','DESACTIVADO'].includes(actuales[i]))throw new Error('Configuración de booleanos inválida');
  if(!validarOrdenPublico_(actuales[4]))throw new Error('Orden de navegación inválido');
  if(!['price_asc','price_desc','name_asc','name_desc'].includes(actuales[5]))throw new Error('Orden de productos inválido');
  if(!/^[1-9]\d{0,4}$/.test(actuales[6])||Number(actuales[6])>10080)throw new Error('Intervalo de actualización inválido');
  const result={};CONFIG_PUBLIC_KEYS.forEach((key,i)=>{result[key]=actuales[i]});return result;
}
function validarOrdenPublico_(orden) {
  const parts=String(orden||'').split(',');
  const found=new Set();
  if(parts.length!==6)return false;
  for(const part of parts){const key=part.replace(/^!/,'');if(!['section','category','subcategory','public','line','product'].includes(key)||found.has(key))return false;found.add(key)}
  return found.size===6;
}
function leerConfiguracionPublica_() {
  const estado = AdminNatura.leerEstadoPublicoNatura();
  if (!estado.configuracion) throw new Error('Configuración no publicada');
  return {ok:true,valores:confirmarConfiguracion_(JSON.parse(estado.configuracion),estado.revision),publicadoEn:estado.revision,actualizadoEn:new Date().toISOString()};
}
