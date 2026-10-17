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
    assert.match(entry[0],new RegExp(`href="catalogo.html\\?producto=${code}&amp;desde=directorio&amp;imagen=1"`));
    assert.match(entry[0],new RegExp(`href="catalogo.html\\?producto=${code}&amp;desde=directorio"`));
    assert.ok(entry[0].includes('<h5><a '));
    assert.equal(structured.mainEntity.itemListElement[index].url,'https://gruemp.github.io/natura/catalogo.html?producto='+code);
  }
  assert.doesNotMatch(html,/script.google.com|spreadsheets\/d\/|wa.me|tel:|Costo:|Stock:|Precio:/i);
  const catalogLinks=[...html.matchAll(/href="(catalogo\.html[^"]*)"/g)];
  assert.ok(catalogLinks.length>entries.length);
  for(const link of catalogLinks)assert.equal(new URL(link[1].replaceAll('&amp;','&'),'https://gruemp.github.io/natura/').searchParams.get('desde'),'directorio');
});

test('La generación excluye ocultos y otras secciones y protege los datos internos',()=>{
  const python=`import importlib.util,json
s=importlib.util.spec_from_file_location('directorio','generar-directorio-productos.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def row(code,extra=''):
 return {'c':[{'v':'Código interno: '+code+'\\nNombre: Producto <seguro>\\nMarca: Natura\\nSección: Belleza y cuidado\\nCategoría: Cabello\\nContenido: 300\\nUnidad: ml\\nComponente 1: Acondicionador 300 ml\\n'+extra},{'v':'Nombre: Título resumido\\nComponentes: Acond…\\nCosto: SECRETO\\nTeléfono: PRIVADO'}]}
p={'ok':True,'version':3,'table':{'cols':[{'label':'Datos operativos del producto'},{'label':'Etiquetas para fichas'}],'rows':[row('0012'),row('0013'),row('0014','Disponibilidad: No a la venta')]}}
v={'ok':True,'reglas':[{'tipo':'producto','identificador':'0013','oculto':True}]}
products=m.products_from_payload(p,v)
assert len(products)==1 and products[0]['id']=='0012'
h=m.render(products)
assert 'Producto &lt;seguro&gt; — 300 ml' in h and 'Acondicionador 300 ml' in h and 'Título resumido' not in h and 'Acond…' not in h and 'SECRETO' not in h and 'PRIVADO' not in h
p['table']['rows'].append(row('0012'))
try:m.products_from_payload(p,v);raise AssertionError('Se admitió un ID duplicado')
except ValueError:pass
print('ok')`;
  const result=spawnSync('python3',['-c',python],{cwd:__dirname,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('Los desplegables nativos conservan los productos y muestran cantidades correctas',()=>{
  const python=`from html.parser import HTMLParser
from pathlib import Path
class Check(HTMLParser):
 def __init__(self):
  super().__init__();self.groups=[];self.stack=[];self.reading_count=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='details':
   brand=a.get('class')=='directorio-marca'
   assert ('open' in a)==brand
   g={'items':0,'count':''};self.groups.append(g);self.stack.append(g)
  if tag=='span' and a.get('class')=='directorio-total':self.reading_count=True
  if tag=='li' and a.get('class')=='directorio-item':
   assert len(self.stack)==2
   for g in self.stack:g['items']+=1
 def handle_data(self,data):
  if self.reading_count:self.stack[-1]['count']+=data
 def handle_endtag(self,tag):
  if tag=='span':self.reading_count=False
  if tag=='details':self.stack.pop()
c=Check();c.feed(Path('productos_natura_y_avon_en_santa_marta.html').read_text())
assert len(c.groups)>2 and not c.stack
for g in c.groups:assert g['items']==int(g['count'].split()[0])
print('ok')`;
  const result=spawnSync('python3',['-c',python],{cwd:__dirname,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('La búsqueda abre coincidencias y al limpiar restaura los grupos; abrir y cerrar todo funcionan',()=>{
  const node=(extra={})=>({hidden:false,value:'',events:{},addEventListener(type,fn){this.events[type]=fn;},...extra});
  const items=[
    node({textContent:'Champú 300 ml',dataset:{marca:'Natura',categoria:'Cabello',subcategoria:'Champú',linea:'Lumina',publico:'Adultos'}}),
    node({textContent:'Perfume 100 ml',dataset:{marca:'Natura',categoria:'Perfumería',subcategoria:'Perfume',linea:'Kaiak',publico:'Adultos'}}),
    node({textContent:'Crema 200 ml',dataset:{marca:'Avon',categoria:'Cuerpo',subcategoria:'Crema',linea:'Care',publico:'Adultos'}})
  ];
  const group=(children,open)=>node({open,querySelectorAll:()=>children});
  const brands=[group(items.slice(0,2),true),group(items.slice(2),true)];
  const categories=items.map(item=>group([item],false));
  const accordions=[...brands,...categories];
  const ids=Object.fromEntries(['filtros','buscar','contador','vacio','desplegables','abrir','cerrar'].map(id=>['directorio-'+id,node()]));
  for(const field of ['marca','categoria','subcategoria','linea','publico'])ids['directorio-'+field]=node({appendChild(){}});
  const document={getElementById:id=>ids[id],createElement:()=>({}),visibilityState:'visible',querySelectorAll:selector=>selector==='.directorio-item'?items:selector.startsWith('details.')?accordions:selector.startsWith('.directorio-subcategoria')?accordions:[]};
  vm.runInNewContext(read('directorio-productos.js'),{document,location:{hostname:'localhost'},setTimeout:fn=>fn()});
  assert.equal(ids['directorio-desplegables'].hidden,false);
  ids['directorio-abrir'].events.click();assert.ok(accordions.every(g=>g.open));
  ids['directorio-cerrar'].events.click();assert.ok(accordions.every(g=>!g.open));
  ids['directorio-buscar'].value='champu 300';ids['directorio-filtros'].events.input();
  assert.equal(ids['directorio-contador'].textContent,'1 producto');
  assert.equal(items[0].hidden,false);assert.equal(items[1].hidden,true);
  assert.equal(brands[0].open,true);assert.equal(categories[0].open,true);assert.equal(brands[1].hidden,true);
  ids['directorio-buscar'].value='';ids['directorio-filtros'].events.reset();
  assert.ok(accordions.every(g=>!g.open));assert.ok(items.every(item=>!item.hidden));
  ids['directorio-marca'].value='Avon';ids['directorio-filtros'].events.change();
  assert.equal(brands[1].open,true);assert.equal(categories[2].open,true);assert.equal(brands[0].hidden,true);
  ids['directorio-buscar'].value='inexistente';ids['directorio-filtros'].events.input();
  assert.equal(ids['directorio-contador'].textContent,'0 productos');assert.equal(ids['directorio-vacio'].hidden,false);
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
