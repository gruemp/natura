const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const read = name => fs.readFileSync(path.join(__dirname,name),'utf8');

test('El HTML contiene cada producto, su nombre y su ID sin cargar datos externos',()=>{
  const html=read('productos_natura_y_avon_en_santa_marta.html');
  const entries=[...html.matchAll(/<li class="directorio-item" id="producto-(\d{4})"[\s\S]*?<\/li>/g)];
  const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(entries.length>0);
  assert.equal(entries.length,structured.mainEntity.numberOfItems);
  assert.equal(new Set(entries.map(m=>m[1])).size,entries.length);
  for(const [index,entry] of entries.entries()){
    const code=entry[1];
    assert.match(entry[0],new RegExp(`href="catalogo.html\\?producto=${code}&amp;imagen=1"`));
    assert.match(entry[0],new RegExp(`href="catalogo.html\\?producto=${code}"`));
    assert.ok(entry[0].includes('<h5><a '));
    assert.equal(structured.mainEntity.itemListElement[index].url,'https://gruemp.github.io/natura/catalogo.html?producto='+code);
  }
  assert.doesNotMatch(html,/script.google.com|spreadsheets\/d\/|wa.me|tel:|Costo:|Stock:|Precio:/i);
});

test('La generación excluye ocultos y otras secciones y protege los datos internos',()=>{
  const python=`import importlib.util,json
s=importlib.util.spec_from_file_location('directorio','generar-directorio-productos.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def row(code,extra=''):
 return {'c':[{'v':'Código interno: '+code+'\\nNombre: Producto de prueba\\nMarca: Natura\\nSección: Belleza y cuidado\\nCategoría: Cabello\\nContenido: 300\\nUnidad: ml\\n'+extra},{'v':'Nombre: Producto <seguro>\\nCosto: SECRETO\\nTeléfono: PRIVADO'}]}
p={'ok':True,'version':3,'table':{'cols':[{'label':'Datos operativos del producto'},{'label':'Etiquetas para fichas'}],'rows':[row('0012'),row('0013'),row('0014','Disponibilidad: No a la venta')]}}
v={'ok':True,'reglas':[{'tipo':'producto','identificador':'0013','oculto':True}]}
products=m.products_from_payload(p,v)
assert len(products)==1 and products[0]['id']=='0012'
h=m.render(products)
assert 'Producto &lt;seguro&gt; — 300 ml' in h and 'SECRETO' not in h and 'PRIVADO' not in h
p['table']['rows'].append(row('0012'))
try:m.products_from_payload(p,v);raise AssertionError('Se admitió un ID duplicado')
except ValueError:pass
print('ok')`;
  const result=spawnSync('python3',['-c',python],{cwd:__dirname,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('El navegador envía solo un aviso de la página al servicio existente, sin GPS ni IP',async()=>{
  const requests=[];
  const storage=new Map();
  const context={document:{getElementById:()=>null,querySelectorAll:()=>[],visibilityState:'visible',referrer:'https://www.google.com/'},location:{hostname:'gruemp.github.io',href:'https://gruemp.github.io/natura/productos_natura_y_avon_en_santa_marta.html'},navigator:{userAgent:'Navegador normal'},crypto:{randomUUID:()=>'12345678-1234-1234-1234-123456789012'},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},URL,URLSearchParams,fetch:(url,options)=>{requests.push({url,options});return Promise.resolve({})}};
  vm.runInNewContext(read('directorio-productos.js'),context);
  await Promise.resolve();
  assert.equal(requests.length,1);
  const body=requests[0].options.body;
  assert.equal(body.get('pagina'),'productos_natura_y_avon_en_santa_marta.html');
  assert.equal(body.get('fuente'),'SIN_UBICACION');
  assert.equal(body.get('origen'),'Directorio de productos · www.google.com');
  assert.equal(body.has('lat'),false);assert.equal(body.has('ip_externa'),false);
  context.location.href+='?verificacion=1';
  vm.runInNewContext(read('directorio-productos.js'),context);
  assert.equal(requests.length,1);
});

test('El aviso de Telegram distingue el directorio sin modificar el destino configurado',()=>{
  const messages=[];
  const context={TELEGRAM_BOT_TOKEN_PROPERTY:'token',TELEGRAM_CHAT_ID_PROPERTY:'chat',PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='token'?'token-ficticio':'chat-existente'})},UrlFetchApp:{fetch:(url,options)=>{messages.push(JSON.parse(options.payload));return {getResponseCode:()=>200,getContentText:()=>'{"ok":true}'}}}};
  vm.createContext(context);
  vm.runInContext(read('apps-script/coordenadas de visitantes natura/visitantes-servicios.js'),context);
  context.sendVisitToTelegram_({categoria:'Productos Natura y Avon en Santa Marta',fuente:'SIN_UBICACION'});
  assert.equal(messages.length,1);
  assert.equal(messages[0].chat_id,'chat-existente');
  assert.match(messages[0].text,/Nueva visita · Productos Natura y Avon en Santa Marta/);
});
