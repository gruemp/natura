const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('apps-script/lector publico natura/Lector.js','utf8');
function reader(state){
  const context={AdminNatura:{leerEstadoPublicoNatura:()=>state},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput(text){return {text,setMimeType(type){this.type=type;return this;}};}}};
  vm.createContext(context);vm.runInContext(source,context);return p=>context.doGet({parameter:p});
}
const current={configuracion:JSON.stringify(['DESACTIVADO','ACTIVADO','ACTIVADO','section,category,subcategory,public,line,product','price_asc']),revision:'2026-10-11T06:00:00.000Z',visibilidad:JSON.stringify({version:1,reglas:[{tipo:'producto',identificador:'245',oculto:true,etiqueta:'Producto',privado:'excluir'}]})};
test('lector independiente conserva estado actual y solo entrega campos públicos',()=>{
  const get=reader(current);const config=JSON.parse(get({modo:'config'}).text);
  assert.equal(config.valores.MOSTRAR_CANTIDAD_STOCK,'ACTIVADO');assert.equal(config.publicadoEn,current.revision);
  const visibility=JSON.parse(get({modo:'visibilidad'}).text);assert.deepEqual(visibility.reglas,[{tipo:'producto',identificador:'0245',oculto:true,etiqueta:'Producto'}]);
});
test('no recupera configuración ausente desde hojas antiguas y valida JSONP',()=>{
  const get=reader({...current,configuracion:null});assert.equal(JSON.parse(get({modo:'config'}).text).ok,false);
  assert.equal(JSON.parse(get({modo:'config',callback:'x);alert(1)//'}).text).ok,false);
  assert.match(reader(current)({modo:'config',callback:'catalogo_1'}).text,/^catalogo_1\(/);
  assert.equal(JSON.parse(get({modo:'admin'}).text).ok,false);
});
