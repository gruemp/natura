// Ejecutar: node --test natura/catalogo-integracion.test.cjs
// CATALOG_PRODUCTS_FIXTURE permite comprobar un rango oficial leído en modo solo lectura.
// No realiza solicitudes de red ni modifica productos, pedidos o precios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const visualSource = fs.readFileSync(path.join(__dirname, 'recursos-visuales.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, 'catalogo-app.js'), 'utf8');
const cacheSource = fs.readFileSync(path.join(__dirname, 'catalogo-cache.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(__dirname, 'precios-admin.js'), 'utf8');
const cartSource = fs.readFileSync(path.join(__dirname, 'catalogo-carrito-pedido.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(__dirname, 'catalogo.html'), 'utf8');
const toolsSource = fs.readFileSync(path.join(__dirname, 'catalogo-herramientas.js'), 'utf8');
const fichaCssSource = fs.readFileSync(path.join(__dirname, 'catalogo.css'), 'utf8');
const uiSource = fs.readFileSync(path.join(__dirname, 'catalogo-ui.js'), 'utf8');

const headers = ['Código','Sección','Categoría','Subcategoría','Familia olfativa','Condición','Nombre','Precio','Costo','Stock','Referencia externa','Descripción','Código Natura','Línea','Público','Estado comercial','Marketplace','Nombre anterior','Marca','Tipo de producto','Variante','Característica','Presentación','Contenido','Unidad','Cantidad de unidades'];
const samples = [
  [9997,'Belleza y cuidado','Cabello','','','','Producto ficticio para prueba',194974.5],
  [9998,'Belleza y cuidado','Cabello','','','','Segundo producto ficticio',''],
  [9999,'Otros productos','Medicamentos','','','','Registro ficticio oculto',10]
];

test('Los enlaces del directorio resuelven el código exacto y la imagen pública de Drive',async()=>{
  const env=await facetEnvironment();
  env.sandbox.location.href='https://gruemp.github.io/natura/catalogo.html?producto=9901&imagen=1';
  env.run('readStateFromUrl();productById=new Map(products.map(p=>[String(p.id),p]));');
  assert.equal(env.run('catalogUrlHasExplicitViewState()'),true);
  assert.equal(env.run('navigationViewMode().mode'),'products');
  assert.deepEqual(clone(env.run('currentProductSourceList().map(p=>p.id)')),['9901']);
  env.run('productById.get("9901").docsImageUrl="https://drive.google.com/thumbnail?id=imagen-publica-de-prueba";');
  const opened=[];
  env.sandbox.opened=opened;
  env.run('openImgModal=(src,alt)=>opened.push({src,alt});openCatalogLinkedProductImage();openCatalogLinkedProductImage();');
  assert.equal(opened.length,1);
  assert.match(opened[0].src,/imagen-publica-de-prueba/);
  const root=env.run('catalogUrlForRestoredNavigation("","","","","",{preserveDiscovery:false})');
  assert.equal(new URL(root).searchParams.has('producto'),false);
  env.sandbox.location.href='https://gruemp.github.io/natura/catalogo.html?producto=9904&imagen=1';
  env.run('readStateFromUrl();openCatalogLinkedProductImage();');
  assert.equal(opened.length,1,'No debe abrir una imagen de un producto no publicado');
});
const visibility = {ok:true,reglas:[{tipo:'seccion',identificador:'otros productos',oculto:true,etiqueta:'Otros productos'}]};
function columnId(index){let result="";for(let n=index+1;n>0;n=Math.floor((n-1)/26))result=String.fromCharCode(65+(n-1)%26)+result;return result;}
function tableFromValues(values){
  const [labels,...rows]=values;
  return {cols:labels.map((label,i)=>({label,id:columnId(i)})),rows:rows.map(row=>({c:labels.map((label,i)=>{
    const v=row[i]??null;
    return {v:v===''?null:v,f:v===null||v===''?'':label==='Código'?String(v).padStart(4,'0'):['Precio','Costo','Stock'].includes(label)&&typeof v==='number'?new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(v):String(v)};
  })}))};
}
function clone(value){return JSON.parse(JSON.stringify(value));}

const facetHeaders=['Código','Nombre','Precio','Sección','Categoría','Subcategoría','Marca','Línea','Tipo de producto','Variante','Característica','Público','Presentación','Contenido','Unidad','Familia olfativa','Estado comercial','Nombre del componente 1','Nombre del componente 2','Conectividad','Compatibilidad','Edad recomendada','Número de jugadores','Materiales','Perfil aromático','Textura y acabado','Duración del efecto'];
function facetFixture(){
  const product=(code,extra={})=>({'Código':code,'Nombre':'Título comercial independiente','Precio':code,'Sección':'Belleza y cuidado','Categoría':'Perfumería','Subcategoría':'Perfumes','Marca':'Natura','Línea':'Kaiak','Tipo de producto':'Perfume','Público':'Masculinos','Contenido':100,'Unidad':'ml','Familia olfativa':'Floral; Frutal; Floral',...extra});
  const products=[product(9901,{'Variante':'Flor de Cereza y Aguacate','Nombre del componente 1':'Champú','Nombre del componente 2':'Champú'}),
    product(9902,{'Marca':'Avon','Línea':'Far Away','Público':'Femeninos','Familia olfativa':'Floral'}),
    product(9903,{'Contenido':50,'Familia olfativa':'Amaderada'}),
    product(9904,{'Estado comercial':'No a la venta'}),
    product(9905,{'Sección':'Otros productos','Categoría':'Tecnología y hogar','Marca':'Samsung','Conectividad':'Bluetooth; USB; Bluetooth','Compatibilidad':'PlayStation 4','Familia olfativa':''}),
    product(9906,{'Contenido':75,'Familia olfativa':'Frutal','Público':'Femeninos'})];
  return tableFromValues([facetHeaders,...products.map(p=>facetHeaders.map(h=>p[h]??''))]);
}
async function facetEnvironment(){
  const env=environment();await confirmed(env);env.sandbox.products=assess(env,facetFixture()).products;
  env.run('allLoadedProducts=products;all=filterVisibleProducts(products);refreshNavigationAlbums()');
  return env;
}
function facetGroups(env){return clone(env.run('buildSuggestionEntries()'));}
function facetCount(env,group,value){return facetGroups(env).find(g=>g.id===group)?.options.find(o=>o.label===value)?.count;}
function facetIds(env){return clone(env.run('buildFilteredList().map(p=>p.id)')).sort();}
function facetButtons(env){return env.sandbox.document.getElementById('wordChips').children.flatMap(group=>group.children[1]?.children||[]);}

test('Filtrar agrupa campos estructurados en la raíz antes del nivel Producto',async()=>{
  const env=await facetEnvironment(),groups=facetGroups(env);
  assert.equal(env.run('navigationViewMode().mode'),'albums');
  for(const group of ['brand','line','public','content','olfactoryFamily','components'])assert.ok(groups.some(g=>g.id===group));
  assert.equal(facetCount(env,'brand','Natura'),3);assert.equal(facetCount(env,'brand','Avon'),1);
  assert.ok(groups.every(g=>g.options.length&&g.options.every(o=>o.count>0)));
  assert.ok(!groups.some(g=>['section','category','productType'].includes(g.id)));
});
test('Nombre no genera opciones ni impide filtrar atributos ausentes de él',async()=>{
  const env=await facetEnvironment(),names=facetGroups(env).flatMap(g=>g.options.map(o=>o.label));
  assert.ok(!names.some(n=>/Título|comercial|independiente/.test(n)));
  env.run('toggleFacetFilter("brand","Avon")');assert.deepEqual(facetIds(env),['9902']);
  assert.equal(env.run('all.find(p=>p.id==="9901").name'),env.run('all.find(p=>p.id==="9902").name'));
});
test('Familias separadas por punto y coma y componentes repetidos cuentan cada Código una vez',async()=>{
  const env=await facetEnvironment();assert.equal(facetCount(env,'olfactoryFamily','Floral'),2);
  assert.equal(facetCount(env,'olfactoryFamily','Frutal'),2);assert.equal(facetCount(env,'components','Champú'),1);
  env.run('all.push(all[0])');assert.equal(facetCount(env,'components','Champú'),1);
});
test('Contenido y Unidad forman valores completos y las variantes conservan sus palabras',async()=>{
  const env=await facetEnvironment();assert.equal(facetCount(env,'content','100 ml'),2);
  const options=facetGroups(env).flatMap(g=>g.options.map(o=>o.label));
  assert.ok(options.includes('Flor de Cereza y Aguacate'));assert.ok(!options.includes('100'));assert.ok(!options.includes('ml'));
  env.sandbox.row={contentValue:1.14,unit:'g'};
  assert.equal(env.run('buildProductFacetAttributes(row).content[0].label'),'1,14 g');
});
test('Alternativas dentro de un grupo usan OR y grupos diferentes usan AND',async()=>{
  const env=await facetEnvironment();env.run('toggleFacetFilter("brand","Natura");toggleFacetFilter("olfactoryFamily","Floral");toggleFacetFilter("content","100 ml")');
  assert.deepEqual(facetIds(env),['9901']);env.run('toggleFacetFilter("brand","Avon")');assert.deepEqual(facetIds(env),['9901','9902']);
  env.run('toggleFacetFilter("olfactoryFamily","Amaderada")');assert.deepEqual(facetIds(env),['9901','9902']);
  env.run('removeFacetFilter("content","100 ml")');assert.deepEqual(facetIds(env),['9901','9902','9903']);
});
test('Recuentos por opción respetan otros grupos y ofrecen alternativas OR sin depender del orden',async()=>{
  const env=await facetEnvironment();env.run('toggleFacetFilter("brand","Natura");toggleFacetFilter("olfactoryFamily","Floral");toggleFacetFilter("content","100 ml")');
  assert.equal(facetCount(env,'brand','Natura'),1);assert.equal(facetCount(env,'brand','Avon'),1);
  assert.equal(facetCount(env,'olfactoryFamily','Frutal'),1);assert.equal(facetCount(env,'content','100 ml'),1);
  const before=facetGroups(env);env.run('selectedFacetFilters.reverse()');assert.deepEqual(facetGroups(env),before);
});
test('Ruta recorrida se omite y el orden configurable no determina los grupos',async()=>{
  const env=await facetEnvironment();env.run('setSelectedNavigationValue("section","Belleza y cuidado");setSelectedNavigationValue("category","Perfumería");setSelectedNavigationValue("subcategory","Perfumes");setSelectedNavigationValue("public","Masculinos");setSelectedNavigationValue("line","Kaiak")');
  assert.equal(env.run('navigationViewMode().mode'),'products');
  assert.ok(facetGroups(env).every(g=>!['section','category','subcategory','public','line'].includes(g.id)));
  env.run('window.applyCatalogNavigationOrder("line,public,category,section,subcategory,product",{rebuild:false})');
  assert.ok(facetGroups(env).every(g=>!['section','category','subcategory','public','line'].includes(g.id)));
  assert.ok(facetGroups(env).some(g=>g.id==='olfactoryFamily'));
});
test('Niveles omitidos continúan ofreciendo filtros comerciales cuando distinguen productos',async()=>{
  const env=await facetEnvironment();env.run('window.applyCatalogNavigationOrder("!section,category,subcategory,!public,!line,product",{rebuild:false});validateNavigationStateAgainstProducts()');
  for(const id of ['line','public'])assert.ok(facetGroups(env).some(g=>g.id===id));
  env.run('window.applyCatalogNavigationOrder("product,section,category,subcategory,public,line",{rebuild:false})');
  assert.equal(env.run('navigationViewMode().mode'),'products');assert.equal(facetCount(env,'brand','Avon'),1);
});
test('Visibilidad y Estado comercial excluyen productos y cantidades del panel público',async()=>{
  const env=await facetEnvironment();assert.equal(env.run('all.length'),4);
  assert.ok(!facetGroups(env).flatMap(g=>g.options).some(o=>o.label==='Samsung'));
  env.run('toggleFacetFilter("olfactoryFamily","Floral")');assert.deepEqual(facetIds(env),['9901','9902']);
});
test('Abrir, seleccionar, cerrar y reabrir conserva resultados, selección e indicadores',async()=>{
  const env=await facetEnvironment();env.run('setWordSuggestionsVisible(true);renderWordSuggestions();toggleFacetFilter("brand","Natura");toggleFacetFilter("olfactoryFamily","Floral");toggleFacetFilter("content","100 ml");renderWordSuggestions()');
  const filters=clone(env.run('selectedFacetFilters')),before=facetIds(env);assert.equal(filters.length,3);
  env.run('setWordSuggestionsVisible(false);renderWordSuggestions()');
  assert.equal(env.sandbox.document.getElementById('wordPanel').hidden,true);assert.deepEqual(facetIds(env),before);
  assert.equal(env.sandbox.document.getElementById('filterSummary').hidden,false);assert.equal(env.sandbox.document.getElementById('clearTermsBtn').hidden,false);
  env.run('setWordSuggestionsVisible(true);renderWordSuggestions()');assert.deepEqual(clone(env.run('selectedFacetFilters')),filters);
  assert.equal(facetButtons(env).filter(b=>b.attributes['aria-pressed']==='true').length,3);
  env.run('toggleFacetFilter("brand","Avon")');assert.deepEqual(facetIds(env),['9901','9902']);
});
test('Retirada individual conserva las demás selecciones y Limpiar todo las elimina',async()=>{
  const env=await facetEnvironment();env.run('toggleFacetFilter("brand","Natura");toggleFacetFilter("olfactoryFamily","Floral");toggleFacetFilter("content","100 ml")');
  env.run('uxClearOneFilter(uxActiveFilterEntries().find(e=>e.label.startsWith("Contenido:")).key)');
  assert.equal(env.run('selectedFacetFilters.length'),2);env.run('uxClearAllFilters()');assert.equal(env.run('selectedFacetFilters.length'),0);assert.equal(facetIds(env).length,4);
});
test('Recalcular, cambiar niveles y volver con Atrás no borra filtros aunque queden sin resultados',async()=>{
  const env=await facetEnvironment();env.run('toggleFacetFilter("brand","Avon");setWordSuggestionsVisible(true);setSelectedNavigationValue("public","Masculinos");resetDiscoveryFilters();renderWordSuggestions()');
  assert.equal(facetIds(env).length,0);assert.equal(facetCount(env,'brand','Avon'),0);assert.equal(env.run('selectedFacetFilters.length'),1);
  for(let i=0;i<4;i++){env.run('setWordSuggestionsVisible(false);renderWordSuggestions();setWordSuggestionsVisible(true);renderWordSuggestions();buildSuggestionEntries()');assert.equal(env.run('selectedFacetFilters.length'),1);}
  env.sandbox.scrollTo=()=>{};env.run('restoreCatalogStateFromHistory({state:null})');assert.equal(env.run('selectedFacetFilters.length'),1);assert.deepEqual(facetIds(env),['9902']);
  env.run('removeFacetFilter("brand","avon")');assert.equal(env.run('selectedFacetFilters.length'),0);
});
test('URL y estado persistente restauran selecciones aunque el panel esté cerrado',async()=>{
  const env=await facetEnvironment();env.run('toggleFacetFilter("brand","Natura");setWordSuggestionsVisible(false);captureCatalogReloadViewState()');
  const snapshot=JSON.parse(env.sandbox.localStorage.getItem('irenismb_catalog_last_view_v1'));assert.equal(snapshot.facets.length,1);assert.equal(snapshot.wordPanelVisible,false);
  env.sandbox.snapshot=snapshot;env.run('selectedFacetFilters=[];applyCatalogReloadViewState(snapshot)');assert.equal(env.run('selectedFacetFilters.length'),1);
  env.sandbox.location.href+='?facets='+encodeURIComponent(JSON.stringify(snapshot.facets));env.run('selectedFacetFilters=[];readStateFromUrl()');assert.equal(env.run('selectedFacetFilters.length'),1);
});
test('Buscador y ordenación siguen operando junto con filtros estructurados',async()=>{
  const env=await facetEnvironment();env.run('toggleFacetFilter("brand","Natura");qInp.value="independiente";sortSel.value="price_desc"');
  assert.deepEqual(clone(env.run('buildFilteredList().map(p=>p.id)')),['9906','9903','9901']);
  env.run('qInp.value="no existe"');assert.equal(facetIds(env).length,0);assert.equal(env.run('selectedFacetFilters.length'),1);
});
test('Filtros operan sobre tarjetas de navegación sin abrir un nivel Producto implícito',async()=>{
  const env=await facetEnvironment();env.run('toggleFacetFilter("brand","Avon");refreshNavigationAlbums()');
  const albums=clone(env.run('buildFilteredAlbums()'));assert.equal(albums.reduce((sum,a)=>sum+a.count,0),1);
  env.run('window.applyCatalogNavigationOrder("section,category,subcategory,public,line,!product",{rebuild:false});refreshNavigationAlbums()');
  assert.equal(env.run('navigationViewMode().mode'),'albums');assert.equal(env.run('selectedFacetFilters.length'),1);
});
test('Conectividad y compatibilidad se obtienen del campo y conservan expresiones identificativas',()=>{
  const env=environment();env.sandbox.row={connectivity:'Wi-Fi 2,4 GHz; IEEE 802.11b/g/n; Wi-Fi 2,4 GHz',compatibility:'PlayStation 4',variant:'Flor de Cereza y Aguacate',materials:'Cubierta superior de aluminio; base de PC-ABS'};
  const data=clone(env.run('buildProductFacetAttributes(row)'));
  assert.deepEqual(data.connectivity.map(o=>o.label),['Wi-Fi 2,4 GHz','IEEE 802.11b/g/n']);assert.equal(data.compatibility[0].label,'PlayStation 4');
  assert.equal(data.variant[0].label,'Flor de Cereza y Aguacate');assert.equal(data.materials.length,2);
});
test('La consulta pública resuelve IDs por encabezados y excluye costos e identificadores privados',async()=>{
  const env=environment();await confirmed(env);const table=facetFixture();
  for(const label of ['Costo','Número de serie','Dirección MAC','Identificadores técnicos de la unidad','Especificaciones técnicas'])table.cols.push({label,id:columnId(table.cols.length)});
  table.cols.reverse();const pending=env.run('loadGoogleSheetRows()');env.reply({...table,rows:[]});await new Promise(resolve=>setImmediate(resolve));
  const query=new URL(env.requests.at(-1).src).searchParams.get('tq'),ids=query.slice(7).split(',');
  for(const col of table.cols.filter(c=>/Costo|serie|MAC|Identificadores|Especificaciones/.test(c.label)))assert.ok(!ids.includes(col.id));
  for(const label of ['Nombre','Familia olfativa','Nombre del componente 1'])assert.ok(ids.includes(table.cols.find(c=>c.label===label).id));
  env.reply(facetFixture());assert.equal((await pending).length,6);
});
test('Los controles activos quedan fuera del panel ocultable y los grupos son accesibles',async()=>{
  const env=await facetEnvironment();env.run('setWordSuggestionsVisible(true);renderWordSuggestions()');
  assert.ok(htmlSource.indexOf('id="filterSummary"')>htmlSource.indexOf('id="wordChips"'));
  for(const group of env.sandbox.document.getElementById('wordChips').children){assert.equal(group.attributes.role,'group');assert.ok(group.attributes['aria-labelledby']);}
  const button=facetButtons(env).find(b=>b.dataset.facetGroup==='brand');button.focus();env.run('renderWordSuggestions()');
  assert.equal(env.sandbox.document.activeElement.dataset.facetValue,button.dataset.facetValue);
  assert.ok(facetButtons(env).every(b=>b.attributes['aria-pressed']!==undefined&&b.attributes['aria-label']));
});

test('La vista directa conserva la explicación y retirada de filtros sin resultados',async()=>{
  const env=await facetEnvironment();
  const renderer=uiSource.slice(uiSource.indexOf('  function renderDirectProducts(){'),uiSource.indexOf('  let directRenderQueued'));
  env.run('window.CATALOG_INITIAL_LOAD_READY=true; const searchInput=qInp; const count=countEl; function isActive(){return true;} function hasSearch(){return !!qInp.value;} function directProducts(){return buildFilteredList();}');
  env.run(renderer);
  env.run('toggleFacetFilter("brand","Avon");setSelectedNavigationValue("public","Masculinos");setWordSuggestionsVisible(false);renderDirectProducts()');
  const fragment=env.document.getElementById('grid').children[0],empty=fragment.children[0];
  assert.match(empty.children[0].textContent,/filtros activos/);
  assert.match(empty.children[1].textContent,/selecciones siguen activas/);
  assert.equal(empty.children[2].children[0].dataset.clearSearch,'all');
  assert.equal(env.run('selectedFacetFilters.length'),1);
  assert.equal(env.document.getElementById('count').textContent,'0 productos');
});

test('Todos vuelve a la raíz sin depender del botón Inicio eliminado y conserva los filtros por atributos',async()=>{
  const env=await facetEnvironment();browserNavigation(env);
  const getElementById=env.document.getElementById;
  env.document.getElementById=id=>id==='catalogHomeBtn'?null:getElementById(id);
  env.run('window.CATALOG_INITIAL_LOAD_READY=true;render=()=>{};setSelectedNavigationValue("section","Belleza y cuidado");refreshNavigationAlbums();qInp.value="inexistente";toggleFacetFilter("brand","Natura")');
  env.run(uiSource);
  const todos=env.document.getElementById('catalogCategories').children[0];
  assert.equal(todos.textContent,'Todos');assert.equal(env.document.getElementById('count').textContent,'0 productos');
  todos.listeners.get('click')();
  assert.equal(env.run('selectedNavigationTrail().length'),0);assert.equal(env.document.getElementById('q').value,'');
  assert.equal(env.run('selectedFacetFilters[0].value'),'natura');
  assert.equal(env.document.getElementById('count').textContent,'3 productos');
  assert.equal(new URL(env.sandbox.location.href).searchParams.has('section'),false);
});

function environment(options={}){
  const elements=new Map(),timers=new Map(),requests=[],events=new Map(),storage=options.storage||new Map();
  let timerId=0,context;
  class Node {
    set innerHTML(value){this.children=[];this._html=value;}
    get innerHTML(){return this._html||'';}
    focus(){document.activeElement=this;}
    pause(){}
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={setProperty(){}};this.value='';this.textContent='';this.attributes={};this.hidden=false;this.listeners=new Map();this.classList={add(){},remove(){},toggle(){},contains(){return false}};}
    appendChild(node){this.children.push(node);node.parentNode=this;if(node.tagName==='SCRIPT')requests.push(node);return node;}
    append(...nodes){nodes.forEach(node=>this.appendChild(node));}
    removeChild(node){node.remove();return node;}
    replaceChildren(...nodes){this.children=[];this.append(...nodes);}
    remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}
    setAttribute(name,value){this.attributes[name]=value;}
    getAttribute(name){return this.attributes[name]??null;}
    addEventListener(name,fn){this.listeners.set(name,fn);}
    getBoundingClientRect(){return {top:0,width:350,height:350};}
    querySelector(){return null;}
    querySelectorAll(){return [];}
    insertAdjacentElement(_,node){return this.appendChild(node);}
  }
  const document={head:new Node('head'),body:new Node('body'),documentElement:new Node('html'),visibilityState:'visible',
    createDocumentFragment(){return new Node('fragment');},
    getElementById(id){if(!elements.has(id))elements.set(id,new Node());return elements.get(id);},
    createElement(tag){const node=new Node(tag);if(tag==='template')node.content={firstElementChild:new Node()};return node;},
    querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){}};
  const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
  const Clock=options.clock?class extends Date {constructor(...args){super(...(args.length?args:[options.clock.now]));}static now(){return options.clock.now;}}:Date;
  const sandbox={document,localStorage,sessionStorage:localStorage,URL,URLSearchParams,Intl,Date:Clock,console:{info(){},warn(){},error(){}},
    setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),
    setInterval(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearInterval:id=>timers.delete(id),
    requestAnimationFrame:fn=>{fn();return 1;},scrollTo(){},MutationObserver:class {observe(){}disconnect(){}},
    Image:class {set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}},
    CustomEvent:class {constructor(type,options={}){this.type=type;this.detail=options.detail;}},
    location:{href:'https://gruemp.github.io/natura/catalogo.html',origin:'https://gruemp.github.io',protocol:'https:',search:'',hash:''},
    history:{state:null,replaceState(){},pushState(){}},navigator:{},performance:{now:()=>0,getEntriesByType:()=>[]},
    addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},dispatchEvent:event=>events.get(event.type)?.forEach(fn=>fn(event)),
    PRECIOS_ADMIN_CONFIG:{endpoint:'https://script.google.com/macros/s/PRUEBA_SIN_RED/exec'},
    fetch(){throw new Error('Las pruebas no permiten solicitudes de red.');}};
  sandbox.window=sandbox;
  context=vm.createContext(sandbox);
  vm.runInContext(visualSource,context,{filename:'recursos-visuales.js'});
  vm.runInContext(appSource,context,{filename:'catalogo-app.js'});
  vm.runInContext(cacheSource,context,{filename:'catalogo-cache.js'});
  vm.runInContext(cartSource,context,{filename:'catalogo-carrito-pedido.js'});
  vm.runInContext(adminSource,context,{filename:'precios-admin.js'});
  return {context,sandbox,document,requests,timers,events,storage,run:source=>vm.runInContext(source,context),
    reply(table,status='ok'){const node=[...requests].reverse().find(n=>n.parentNode);assert.ok(node,'Debe existir una solicitud JSONP');const url=new URL(node.src);const cb=url.searchParams.get('callback')||url.searchParams.get('tqx').split('responseHandler:')[1];sandbox[cb](url.searchParams.has('modo')?table:{status,table});return cb;},
    fail(){const node=[...requests].reverse().find(n=>n.parentNode);assert.ok(node);node.onerror();},
    timeout(ms){const timer=[...timers.values()].find(item=>item.ms===ms);assert.ok(timer);timer.fn();}};
}
function assess(env,table){env.sandbox.inputTable=table;return env.run('buildCompatibleGoogleSheetProducts(readGoogleSheetProductRows(inputTable).map(row=>({row,imageIndex:new Map()})))');}
async function confirmed(env,table=visibility){env.reply(table);await env.sandbox.CATALOG_PUBLIC_VISIBILITY_READY;}
function fixture(){return tableFromValues([headers,...samples]);}

async function savedCatalogEnvironment(){
  const clock={now:Date.now()},env=environment({clock});await confirmed(env);
  env.run('acceptCatalogPublicConfiguration({...REMOTE_CONTROL_DEFAULTS,ORDEN_PRODUCTOS:"price_asc"},{revision:new Date().toISOString(),rebuild:false});render=()=>{}');
  const assessment=assess(env,fixture());env.sandbox.savedProducts=assessment.products;env.sandbox.savedReport=assessment.report;
  assert.equal(env.run('window.CATALOG_CACHE.save(savedProducts,savedReport,{imagesIncluded:true})'),true);
  env.run('allLoadedProducts=savedProducts;all=filterVisibleProducts(savedProducts);window.CATALOG_INITIAL_LOAD_READY=true');
  return {...env,clock};
}
const cacheTick=()=>new Promise(resolve=>setImmediate(resolve));

function browserNavigation(env,{href='https://gruemp.github.io/natura/catalogo.html',type='navigate',state=null,scrollY=0}={}){
  const browser={scrolls:[],historyWrites:[]};
  const locate=url=>{const value=new URL(url,env.sandbox.location.href);for(const key of ['href','origin','protocol','search','hash','pathname'])env.sandbox.location[key]=value[key];};
  locate(href);env.sandbox.scrollY=scrollY;
  env.sandbox.performance.getEntriesByType=()=>[{type}];
  env.sandbox.history.state=state;
  for(const method of ['replaceState','pushState'])env.sandbox.history[method]=(value,_,url)=>{
    env.sandbox.history.state=value;if(url)locate(url);browser.historyWrites.push({method,state:clone(value),href:env.sandbox.location.href});
  };
  env.sandbox.scrollTo=options=>{env.sandbox.scrollY=options.top;browser.scrolls.push(options.top);};
  return browser;
}

async function savedNavigationEnvironment(){
  const env=await facetEnvironment();browserNavigation(env,{scrollY:850});
  env.run(`acceptCatalogPublicConfiguration({...REMOTE_CONTROL_DEFAULTS,ORDEN_PRODUCTOS:"price_asc"},{revision:new Date().toISOString(),rebuild:false});
    setNavigationFromRawState({section:"Belleza y cuidado",category:"Perfumería",subcategory:"Perfumes",public:"Masculinos",line:"Kaiak"});
    qInp.value="Título";sortSel.value="name_desc";selectedSuggestionTerms=["comercial"];
    toggleFacetFilter("brand","Natura");wordSuggestionsVisible=true;window.__catalogUxScrollStack=[{scrollY:120},{scrollY:340}];
    window.CATALOG_CACHE.save(allLoadedProducts,{}, {imagesIncluded:true});window.CATALOG_INITIAL_LOAD_READY=true;
    writeStateToUrl({index:5});captureCatalogReloadViewState();`);
  return env;
}

function prepareNavigationStartup(env){
  env.run(`function syncAdministrativeToolVisibility(){};function initCatalogFichas(){};
    refreshCartCount=initCartButton=initShipping=bindFilters=bindGridActions=initFolleto=loadClientFromLS=loadAddressFromLS=()=>{};
    restoreCatalogAdminAfterReload=async()=>{};
    let firstRenderedNavigation=null;render=()=>{if(window.CATALOG_INITIAL_LOAD_READY===true)firstRenderedNavigation??={section:selectedSection,category:selectedCategory,line:selectedLine,q:qInp.value};};`);
}

test('Recargar restaura la ruta completa antes del primer render, junto con búsqueda, filtros, orden y desplazamiento',async()=>{
  const first=await savedNavigationEnvironment();
  const reopened=environment({storage:first.storage});
  const browser=browserNavigation(reopened,{href:first.sandbox.location.href,type:'reload',state:clone(first.sandbox.history.state)});
  prepareNavigationStartup(reopened);await reopened.run('init()');
  assert.deepEqual(clone(reopened.run('selectedNavigationTrail().map(crumb=>crumb.label)')),['Belleza y cuidado','Perfumería','Perfumes','Masculinos','Kaiak']);
  assert.deepEqual(clone(reopened.run('firstRenderedNavigation')),{section:'Belleza y cuidado',category:'Perfumería',line:'Kaiak',q:'Título'});
  assert.equal(reopened.document.getElementById('q').value,'Título');assert.equal(reopened.document.getElementById('sort').value,'name_desc');
  assert.deepEqual(clone(reopened.run('selectedSuggestionTerms')),['comercial']);assert.equal(reopened.run('selectedFacetFilters[0].value'),'natura');
  assert.equal(reopened.run('wordSuggestionsVisible'),true);assert.equal(reopened.run('productOrderChosen'),true);
  assert.deepEqual(clone(reopened.run('uxScrollStack()')),[{scrollY:120},{scrollY:340}]);assert.equal(browser.scrolls.at(-1),850);
  assert.equal(new URL(reopened.sandbox.location.href).searchParams.get('line'),'Kaiak');assert.equal(reopened.requests.length,0);
});

test('Volver a abrir restaura la última vista y reconstruye Atrás, mientras un enlace explícito mantiene su propia ruta',async()=>{
  const first=await savedNavigationEnvironment(),reopened=environment({storage:first.storage});
  const browser=browserNavigation(reopened);prepareNavigationStartup(reopened);await reopened.run('init()');
  assert.equal(reopened.run('selectedLine'),'Kaiak');assert.equal(reopened.run('currentCatalogHistoryIndex()'),5);
  assert.equal(browser.historyWrites.filter(entry=>entry.method==='pushState').length,6);
  const linked=environment({storage:first.storage});browserNavigation(linked,{href:'https://gruemp.github.io/natura/catalogo.html?section=Belleza+y+cuidado&category=Perfumer%C3%ADa&subcategory=Perfumes&public=Femeninos&line=Far+Away'});
  prepareNavigationStartup(linked);await linked.run('init()');
  assert.equal(linked.run('selectedLine'),'Far Away');assert.equal(linked.document.getElementById('q').value,'');
  assert.equal(linked.run('selectedFacetFilters.length'),0);
});

test('Una rama eliminada al recargar conserva el nivel superior disponible y los filtros del visitante',async()=>{
  const first=await savedNavigationEnvironment(),saved=JSON.parse(first.storage.get('irenismb_catalog_reload_view_v1'));
  saved.line='Línea retirada';first.storage.set('irenismb_catalog_reload_view_v1',JSON.stringify(saved));
  const reopened=environment({storage:first.storage});browserNavigation(reopened,{type:'reload'});prepareNavigationStartup(reopened);await reopened.run('init()');
  assert.equal(reopened.run('selectedLine'),'');assert.equal(reopened.run('selectedPublic'),'Masculinos');assert.equal(reopened.run('selectedSubcategory'),'Perfumes');
  assert.equal(reopened.document.getElementById('q').value,'Título');assert.equal(reopened.run('selectedFacetFilters[0].value'),'natura');
});

test('Una vista guardada por la versión anterior se restaura también si hay que descargar todos los productos',async()=>{
  const first=await savedNavigationEnvironment(),saved=JSON.parse(first.storage.get('irenismb_catalog_reload_view_v1'));
  saved.version=4;delete saved.scrollStack;first.storage.set('irenismb_catalog_reload_view_v1',JSON.stringify(saved));
  first.storage.delete('irenismb_catalog_snapshot_v1');
  const reopened=environment({storage:first.storage});browserNavigation(reopened,{type:'reload'});prepareNavigationStartup(reopened);await confirmed(reopened);
  reopened.sandbox.freshEntries=clone(first.run('allLoadedProducts')).map(p=>({row:{code:p.id,name:p.name,section:p.section,category:p.category,subcategory:p.subcategory,public:p.public,line:p.line,brand:p.brand,priceValue:123},imageIndex:new Map()}));
  reopened.run('refreshRemoteCatalogConfiguration=async()=>true;loadGoogleSheetCatalog=async()=>({sheetEntries:freshEntries,giftImageUrls:[],imagesIncluded:true})');
  const starting=reopened.run('init()');await cacheTick();reopened.timeout(220);await starting;
  assert.equal(reopened.run('selectedLine'),'Kaiak');assert.equal(reopened.document.getElementById('q').value,'Título');
  assert.equal(reopened.run('firstRenderedNavigation.line'),'Kaiak');assert.equal(reopened.run('selectedFacetFilters[0].value'),'natura');
  assert.equal(reopened.sandbox.scrollY,850);
});

test('Actualizar conserva la navegación más reciente durante la descarga y la tarjeta visible si cambia de posición',async()=>{
  const env=await savedNavigationEnvironment(),browser=browserNavigation(env,{scrollY:850});
  env.run(`render=()=>{};let releaseData;refreshRemoteCatalogConfiguration=async()=>true;window.refreshCatalogVisibility=async()=>true;
    loadGoogleSheetCatalog=()=>new Promise(resolve=>releaseData=resolve);`);
  const updating=env.run('window.CATALOG_CACHE.refresh()');await cacheTick();
  env.run('setNavigationFromRawState({section:"Belleza y cuidado",category:"Perfumería",subcategory:"Perfumes",public:"Femeninos",line:"Far Away"});qInp.value="comercial"');
  const card=env.document.createElement('article');card.dataset.id='9902';let cardTop=-30;
  card.getBoundingClientRect=()=>({top:cardTop,bottom:cardTop+500});env.document.getElementById('grid').appendChild(card);
  env.sandbox.scrollY=1250;env.sandbox.moveCard=()=>{cardTop=170;env.sandbox.scrollY=900;};
  env.run('render=()=>moveCard()');env.sandbox.freshEntries=clone(env.run('allLoadedProducts')).map(p=>({row:{code:p.id,name:p.name,section:p.section,category:p.category,subcategory:p.subcategory,public:p.public,line:p.line,brand:p.brand,priceValue:123},imageIndex:new Map()}));
  env.run('releaseData({sheetEntries:freshEntries,giftImageUrls:[],imagesIncluded:true})');assert.equal(await updating,true);
  assert.equal(env.run('selectedLine'),'Far Away');assert.equal(env.document.getElementById('q').value,'comercial');
  assert.equal(env.run('selectedFacetFilters[0].value'),'natura');assert.equal(env.document.getElementById('sort').value,'name_desc');
  assert.equal(browser.scrolls.at(-1),1100);assert.equal(env.run('uxScrollStack().length'),2);
});

test('Recargar y volver a abrir el navegador conserva el catálogo sin consultar Google durante 30 minutos',async()=>{
  const first=await savedCatalogEnvironment(),savedAt=first.run('window.CATALOG_CACHE.read().fetchedAt');
  first.clock.now+=29*60000;
  const reopened=environment({storage:first.storage,clock:first.clock});
  reopened.run('function syncAdministrativeToolVisibility(){};render=()=>{};let queried=0;loadGoogleSheetCatalog=()=>{queried++;throw new Error("No debe consultar Google")}');
  await reopened.sandbox.CATALOG_PUBLIC_VISIBILITY_READY;
  await reopened.run('initializeRemoteCatalogConfiguration()');
  assert.equal(await reopened.run('loadProducts()'),true);
  assert.equal(reopened.requests.length,0,'Configuración, Visibilidad y productos se reutilizan al recargar');
  assert.equal(reopened.run('queried'),0);assert.equal(reopened.run('all.length'),2);
  assert.equal(reopened.run('window.CATALOG_CACHE.read().fetchedAt'),savedAt,'Abrir la página no renueva el vencimiento');
  assert.equal(reopened.sandbox.CATALOG_INITIAL_LOAD_READY,true);
  first.clock.now+=60001;assert.equal(reopened.run('window.CATALOG_CACHE.read()'),null);
  assert.ok(reopened.run('window.CATALOG_CACHE.read({allowExpired:true})'));
});

test('Una actualización manual omite la copia vigente, conserva la navegación y comparte la solicitud concurrente',async()=>{
  const env=await savedCatalogEnvironment();env.clock.now+=60000;
  env.run(`let configCalls=0,visibilityCalls=0,dataCalls=0;let releaseData;
    refreshRemoteCatalogConfiguration=async()=>{configCalls++;return true};window.refreshCatalogVisibility=async()=>{visibilityCalls++;return true};
    loadGoogleSheetCatalog=()=>{dataCalls++;return new Promise(resolve=>releaseData=resolve)};
    setSelectedNavigationValue("section","Belleza y cuidado");readStateFromUrl=()=>{throw new Error("No debe restablecer la navegación")};`);
  const first=env.run('window.CATALOG_CACHE.refresh()'),second=env.run('window.CATALOG_CACHE.refresh()');
  assert.equal(first,second);await cacheTick();
  assert.equal(env.run('dataCalls'),1);assert.equal(env.document.getElementById('catalogRefreshBtn').disabled,true);
  env.sandbox.freshRows=clone(env.run('savedProducts')).map(product=>({row:{code:product.id,name:'Nombre actualizado',section:product.section,category:product.category,priceValue:123},imageIndex:new Map()}));
  env.run('releaseData({sheetEntries:freshRows,giftImageUrls:[],imagesIncluded:true})');
  assert.equal(await first,true);
  assert.equal(env.run('configCalls'),1);assert.equal(env.run('visibilityCalls'),1);
  assert.equal(env.run('allLoadedProducts[0].name'),'Nombre actualizado');
  assert.equal(env.run('selectedSection'),'Belleza y cuidado');
  assert.equal(env.run('window.CATALOG_CACHE.read().fetchedAt'),env.clock.now);
  assert.equal(env.document.getElementById('catalogRefreshBtn').disabled,false);
});
test('Incluso una copia vencida se muestra al recargar y se renueva después sin una pantalla de espera',async()=>{
  const first=await savedCatalogEnvironment();first.clock.now+=31*60000;
  const reopened=environment({storage:first.storage,clock:first.clock});
  reopened.run('function syncAdministrativeToolVisibility(){};render=()=>{};let calls=0;loadGoogleSheetCatalog=async()=>{calls++;throw new Error("Todavía no debe consultar productos")}');
  await reopened.sandbox.CATALOG_PUBLIC_VISIBILITY_READY;await reopened.run('initializeRemoteCatalogConfiguration()');
  assert.equal(await reopened.run('loadProducts()'),true);assert.equal(reopened.requests.length,0);
  assert.equal(reopened.run('calls'),0);assert.equal(reopened.run('all.length'),2);
  assert.equal(reopened.sandbox.CATALOG_INITIAL_LOAD_READY,true);
  assert.ok([...reopened.timers.values()].some(timer=>timer.ms===1000),'La actualización queda programada sin bloquear la vista guardada');
});

test('El vencimiento actualiza automáticamente y cambiar el intervalo no reinicia la antigüedad de los datos',async()=>{
  const env=await savedCatalogEnvironment(),loadedAt=env.run('window.CATALOG_CACHE.read().fetchedAt');
  env.clock.now+=10*60000;
  assert.equal(env.run('window.CATALOG_CACHE.setMinutes("15")'),true);
  assert.equal(env.run('window.CATALOG_CACHE.read().fetchedAt'),loadedAt);
  const pair=[...env.timers].find(([,timer])=>timer.ms===5*60000);assert.ok(pair);
  env.run('let calls=0;refreshRemoteCatalogConfiguration=async()=>true;window.refreshCatalogVisibility=async()=>true;loadProducts=async()=>{calls++;return true}');
  env.clock.now+=5*60000;env.timers.delete(pair[0]);pair[1].fn();await cacheTick();
  assert.equal(env.run('calls'),1);
  for(const bad of ['0','-1','1.5','10081','abc'])assert.equal(env.run(`window.CATALOG_CACHE.setMinutes(${JSON.stringify(bad)})`),false);
});

test('Fallar al actualizar conserva los datos y la fecha anterior; volver a abrir no convierte datos vencidos en nuevos',async()=>{
  const env=await savedCatalogEnvironment(),before=clone(env.run('window.CATALOG_CACHE.read()'));
  env.clock.now+=31*60000;
  env.run('refreshRemoteCatalogConfiguration=async()=>true;window.refreshCatalogVisibility=async()=>true;loadGoogleSheetCatalog=async()=>{throw new Error("Sin conexión")}');
  assert.equal(await env.run('window.CATALOG_CACHE.refresh()'),false);
  assert.deepEqual(clone(env.run('window.CATALOG_CACHE.read({allowExpired:true}).products')),before.products);
  assert.equal(env.run('window.CATALOG_CACHE.read({allowExpired:true}).fetchedAt'),before.fetchedAt);
  assert.equal(env.run('window.CATALOG_CACHE.read()'),null);
  assert.match(env.document.getElementById('catalogRefreshStatus').textContent,/catálogo anterior/);
  assert.equal(env.document.getElementById('catalogRefreshBtn').disabled,false);
});

test('Una pestaña oculta espera a volver a estar visible para actualizar',async()=>{
  const env=await savedCatalogEnvironment();env.run('let calls=0;refreshRemoteCatalogConfiguration=async()=>true;window.refreshCatalogVisibility=async()=>true;loadProducts=async()=>{calls++;return true};window.CATALOG_CACHE.schedule()');
  const pair=[...env.timers].find(([,timer])=>timer.ms===30*60000);assert.ok(pair);
  env.document.visibilityState='hidden';env.clock.now+=30*60000;env.timers.delete(pair[0]);pair[1].fn();await cacheTick();
  assert.equal(env.run('calls'),0);
  env.document.visibilityState='visible';env.run('window.CATALOG_CACHE.schedule()');
  const resumed=[...env.timers].find(([,timer])=>timer.ms===1000);assert.ok(resumed);env.timers.delete(resumed[0]);resumed[1].fn();await cacheTick();
  assert.equal(env.run('calls'),1);
});

test('Activar fotografías reutiliza la información guardada y no reinicia el plazo',async()=>{
  const env=await savedCatalogEnvironment();
  env.run('window.CATALOG_CACHE.save(savedProducts,savedReport,{imagesIncluded:false});let queries=0;loadGoogleSheetCatalog=async()=>{queries++;throw new Error("No debe recargar datos")};loadAppsScriptImageIndex=async()=>({ok:true,products:{"9997":[{name:"9997.png",path:"9997.png",url:"https://ejemplo.invalid/9997.png"}]},gifts:[]})');
  const stamp=env.run('window.CATALOG_CACHE.read().fetchedAt');env.clock.now+=60000;
  assert.equal(await env.run('loadProducts({silent:true,refreshImages:true})'),true);
  assert.equal(env.run('queries'),0);assert.equal(env.run('allLoadedProducts.find(p=>p.id==="9997").hasImage'),true);
  assert.equal(env.run('window.CATALOG_CACHE.read().fetchedAt'),stamp);
});

test('El intervalo se guarda en administración, se valida y se publica sin modificar productos',()=>{
  const server=imageConfigurationServer(true);
  assert.equal(server.run('obtenerConfiguracionWeb().valores.ACTUALIZACION_CATALOGO_MINUTOS'),'30');
  const result=server.run('actualizarConfiguracionWeb("ACTUALIZACION_CATALOGO_MINUTOS","45")');
  assert.equal(result.estado,'45');assert.equal(result.valores.ACTUALIZACION_CATALOGO_MINUTOS,'45');
  assert.equal(JSON.parse(server.props.CATALOGO_CONFIG_PUBLIC_SNAPSHOT_V1).at(-1),'45');
  assert.equal(imageConfigurationServer(true,server.props).run('obtenerConfiguracionWeb().valores.ACTUALIZACION_CATALOGO_MINUTOS'),'45');
  for(const value of ['0','-1','1.2','10081','incorrecto'])assert.throws(()=>server.run(`actualizarConfiguracionWeb("ACTUALIZACION_CATALOGO_MINUTOS",${JSON.stringify(value)})`),/intervalo/);
  assert.match(adminSource,/id="catalogRefreshMinutes" type="number"/);
  assert.match(htmlSource,/id="catalogRefreshBtn"[^>]*>Actualizar catálogo/);
});

// DOM acotado para ejecutar las funciones publicadas del editor sin guardar precios.
function priceEditorEnvironment(){
  const boundaries=[
    ['  function clearAdminDecorations(){','  function ensureAdminSidebar(){'],
    ['  function syncAdminSectionUI(emit=false){','  function setCatalogAdminSection(section){'],
    ['  function installPrices(){','  function addDescriptionCopy(card){'],
    ['  function removePrice(card){','  async function savePrice('],
    ['  function validPrice(v){','  function sendRequest(data,timeout=45000){']
  ];
  const selected=boundaries.map(([start,end])=>{
    const a=adminSource.indexOf(start),b=adminSource.indexOf(end,a);
    assert.ok(a>=0&&b>a,'Función real del editor disponible');
    return adminSource.slice(a,b);
  }).join('\n')+'\n'+adminSource.split('\n').find(line=>line.includes('function syncUI(){'));
  const classes={add(){},remove(){},toggle(){}};
  let focused=null,editor=null,created=0,removed=0;
  const price={textContent:'Consultar precio',hidden:false,insertAdjacentElement(_,node){editor=node;created++;}};
  const row={classList:classes};
  const card={dataset:{id:'0245'},querySelector(selector){return selector==='.price-admin-editor'?editor:selector==='.price'?price:selector==='.row'?row:null;}};
  const grid={hidden:false,querySelectorAll(selector){return [':scope > .card:not(.album-card)','.card'].includes(selector)?[card]:[];}};
  function node(tag){return {tag,dataset:{},children:[],value:'',disabled:false,append(...children){this.children.push(...children);},remove(){if(this===editor){if(this.children.includes(focused))focused=null;editor=null;removed++;}}};}
  const context={Intl,admin:true,adminSection:'catalogo',capabilities:new Set(),grid,window:{dispatchEvent(){}},
    DOCUMENTS:environment().sandbox.CATALOG_ADMIN_DOCUMENTS,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    document:{body:{classList:classes},getElementById(){return null;},createElement:node},
    ensureAdminSidebar:()=>({querySelectorAll:()=>[]}),syncConnectionButton(){},addDescriptionCopy(){},
    visibilityId:(_,code)=>code,productObj:()=>({hasPrice:false,priceText:''}),console};
  vm.createContext(context);vm.runInContext(selected,context);
  return {context,get editor(){return editor;},get focused(){return focused;},focus(input){focused=input;},counts:()=>({created,removed})};
}

test('Actualizar interfaz conserva campo de precio, foco, importe y botón Guardar',()=>{
  const env=priceEditorEnvironment();env.context.syncUI();
  const editor=env.editor,input=editor.children[0],save=editor.children[1];
  const book=editor.children.find(child=>child.tag==='a');
  assert.equal(book.href,env.context.DOCUMENTS.productos.url);
  assert.equal(book.target,'_blank');assert.equal(book.rel,'noopener noreferrer');
  input.value='25000';env.focus(input);input.oninput();assert.equal(save.disabled,false);
  for(let i=0;i<4;i++)env.context.syncUI();
  assert.equal(env.editor,editor);assert.equal(env.focused,input);assert.equal(input.value,'25000');
  assert.equal(save.disabled,false);assert.deepEqual(env.counts(),{created:1,removed:0});
  input.disabled=save.disabled=true;save.textContent='Guardando…';
  env.context.syncUI();assert.equal(env.editor,editor);assert.equal(input.disabled,true);
  assert.equal(save.disabled,true);assert.equal(save.textContent,'Guardando…');
});

test('Cambiar de sección o retirar administración conserva la limpieza de editores',()=>{
  const env=priceEditorEnvironment();env.context.syncUI();const first=env.editor;
  env.context.syncAdminSectionUI(true);assert.notEqual(env.editor,first);
  assert.deepEqual(env.counts(),{created:2,removed:1});
  env.context.clearAdminDecorations();assert.equal(env.editor,null);
  assert.deepEqual(env.counts(),{created:2,removed:2});
});

test('Carga el código real completo y bloquea publicación antes de confirmar Visibilidad',()=>{
  const env=environment(),result=assess(env,fixture());env.sandbox.products=result.products;
  assert.equal(result.report.compatible,3);assert.equal(env.run('filterVisibleProducts(products).length'),0);
  assert.equal(env.sandbox.isCatalogProductPublic(result.products[0]),false);
});
test('Confirma visibilidad y conserva ocultación por sección omitida en navegación',async()=>{
  const env=environment();await confirmed(env);env.sandbox.products=assess(env,fixture()).products;
  env.run('window.applyCatalogNavigationOrder("!section,category,subcategory,public,!line,product",{rebuild:false})');
  assert.equal(env.run('filterVisibleProducts(products).length'),2);
  assert.equal(env.sandbox.isCatalogProductPublic(env.sandbox.products[2]),false);
});
test('Reordenar todas las columnas conserva identidad, nombre, valores y atributos',()=>{
  const env=environment(),table=fixture(),expected=assess(env,table).products;
  table.cols.reverse();table.rows.forEach(row=>row.c.reverse());
  assert.deepEqual(clone(assess(env,table).products),clone(expected));
});
test('Conserva decimales reales y separa el texto usado para edición optimista',()=>{
  const env=environment(),product=assess(env,fixture()).products[0];
  assert.equal(product.price,194974.5);assert.equal(product.priceText,'194.975');
  env.sandbox.product=product;
  // Se ejecuta la misma función privada que utiliza addPrice, sin enviar una operación.
  const start=adminSource.indexOf('  function previousPriceForEditor('),end=adminSource.indexOf('  function addPrice(',start);
  const valuesStart=adminSource.indexOf('  function priceValue('),valuesEnd=adminSource.indexOf('  function editable(',valuesStart);
  env.run(adminSource.slice(start,end)+adminSource.slice(valuesStart,valuesEnd));
  assert.equal(env.run('previousPriceForEditor(product,"194.975")'),'194974.5');
});
test('Precio y stock desconocidos permanecen desconocidos y no excluyen',()=>{
  const env=environment(),product=assess(env,fixture()).products[1];
  assert.equal(product.hasPrice,false);assert.equal(product.stock,null);assert.equal(product.cost,null);
  assert.equal(product.presentation,'');assert.equal(product.hasImage,false);assert.equal(env.run('shouldEnforceStockLimits()'),false);
});
test('Nombre vacío aísla una fila y se reincorpora al corregirla sin cambiar código',()=>{
  const env=environment(),table=fixture();table.rows[0].c[6]={v:null,f:''};
  let result=assess(env,table);assert.equal(result.report.pending,1);assert.equal(result.products.length,2);
  assert.match(result.report.records[0].causes[0].reason,/Nombre/);
  table.rows[0].c[6]={v:'Producto ficticio corregido'};result=assess(env,table);
  assert.equal(result.products.length,3);assert.equal(result.report.pending,0);
});
test('Código duplicado aísla ambas filas y preserva los otros productos',()=>{
  const env=environment(),table=fixture();table.rows.push(clone(table.rows[0]));
  const result=assess(env,table);assert.equal(result.products.length,2);assert.equal(result.report.pending,2);
  assert.equal(result.report.records.filter(row=>row.causes.some(cause=>cause.reason==='Código duplicado')).length,2);
});
test('Código inválido, categoría, sección y precio ambiguo tienen causas específicas',()=>{
  const env=environment();
  for(const [column,value,reason] of [[0,1.5,/Código/],[2,'',/Categoría/],[1,'',/Sección/],[7,'12,5 pesos',/Precio/],[7,-1,/Precio/]]){
    const table=fixture();table.rows[0].c[column]={v:value};const result=assess(env,table);
    assert.equal(result.products.length,2);assert.equal(result.report.pending,1);
    assert.ok(result.report.records[0].causes.some(cause=>reason.test(cause.reason)));
  }
});
test('Una fila malformada y una excepción al construir una ficha no abortan el lote',()=>{
  const env=environment(),table=fixture();table.rows.push(null);let result=assess(env,table);
  assert.equal(result.products.length,3);assert.equal(result.report.pending,1);
  env.sandbox.inputRows=env.run('readGoogleSheetProductRows(inputTable)');
  result=env.run('buildCompatibleGoogleSheetProducts(inputRows.map((row,index)=>({row,imageIndex:index===0?{get(){throw new TypeError("fallo controlado")}}:new Map()})))');
  assert.equal(result.products.length,2);assert.equal(result.report.pending,2);
});
test('Encabezado indispensable ausente o duplicado detiene la lectura ambigua',()=>{
  const env=environment(),table=fixture();table.cols[6].label='Campo sin nombre';assert.throws(()=>assess(env,table),/Nombre/);
  table.cols[6].label='Nombre';table.cols[18].label='NÓMBRE';assert.throws(()=>assess(env,table),/duplicado/);
});
test('No depende de A:Z y acepta un campo indispensable ubicado después de Z',()=>{
  const env=environment(),table=fixture();table.cols.push({label:'Auxiliar'});table.rows.forEach(row=>row.c.push({v:null}));
  table.cols.push(table.cols.splice(6,1)[0]);table.rows.forEach(row=>row.c.push(row.c.splice(6,1)[0]));
  assert.equal(assess(env,table).products.length,3);const query=new URL(env.run('googleSheetQueryUrl("prueba")'));
  assert.equal(query.searchParams.has('range'),false);assert.equal(query.searchParams.get('tq'),'select * limit 0');
});
test('Fallo o timeout de Visibilidad en primera carga deja cero productos públicos',async()=>{
  for(const mode of ['error','timeout']){const env=environment();mode==='error'?env.fail():env.timeout(25000);
    await env.sandbox.CATALOG_PUBLIC_VISIBILITY_READY;env.sandbox.products=assess(env,fixture()).products;
    assert.equal(env.sandbox.CATALOG_PUBLIC_VISIBILITY_CONFIRMED,false);assert.equal(env.run('filterVisibleProducts(products).length'),0);
  }
});
test('Fallo posterior conserva reglas y no publica nuevas filas o clasificaciones inciertas',async()=>{
  const env=environment();await confirmed(env);env.sandbox.products=assess(env,fixture()).products;
  assert.equal(env.run('filterVisibleProducts(products).length'),2);
  const retry=env.sandbox.refreshCatalogVisibility();env.fail();await retry;
  env.sandbox.products.push({...env.sandbox.products[0],id:'0001'});
  env.sandbox.products.push({...env.sandbox.products[0],id:'9997',category:'Nueva categoría'});
  assert.equal(env.run('filterVisibleProducts(products).length'),2);
  assert.ok(env.sandbox.CATALOG_VISIBILITY_RULES.has('seccion::otros productos'));
  const recover=env.sandbox.refreshCatalogVisibility();env.reply(visibility);await recover;
  assert.equal(env.run('filterVisibleProducts(products).length'),4);
});
test('Respuesta tardía tras timeout no altera la confirmación ni publica productos',async()=>{
  const env=environment(),node=env.requests.at(-1),cb=new URL(node.src).searchParams.get('callback');
  env.timeout(25000);await env.sandbox.CATALOG_PUBLIC_VISIBILITY_READY;env.sandbox[cb](visibility);
  assert.equal(env.sandbox.CATALOG_PUBLIC_VISIBILITY_CONFIRMED,false);
});
test('Visibilidad reordenada funciona; estados inválidos y reglas duplicadas cierran publicación',async()=>{
  const env=environment(),payload=clone(visibility);payload.reglas.reverse();
  await confirmed(env,payload);assert.equal(env.sandbox.CATALOG_PUBLIC_VISIBILITY_CONFIRMED,true);
  for(const bad of [()=>{const t=clone(visibility);t.reglas[0].oculto='X';return t;},()=>{const t=clone(visibility);t.reglas.push({...t.reglas[0],oculto:false});return t;}]){
    const another=environment();await confirmed(another,bad());assert.equal(another.sandbox.CATALOG_PUBLIC_VISIBILITY_CONFIRMED,false);
  }
});
test('No a la venta conserva exclusión comercial aunque sea compatible técnicamente',async()=>{
  const env=environment();await confirmed(env);const table=fixture();table.rows[0].c[15]={v:'No a la venta'};
  const result=assess(env,table);assert.equal(result.report.compatible,3);assert.equal(env.sandbox.isCatalogProductPublic(result.products[0]),false);
});
async function replyProductTable(env,table){
  env.reply({...table,rows:[]});
  await new Promise(resolve=>setImmediate(resolve));
  env.reply(table);
}
test('JSONP usa el adaptador real y rechaza schema ambiguo sin dejar promesa pendiente',async()=>{
  const env=environment();await confirmed(env);let pending=env.run('loadGoogleSheetRows()');await replyProductTable(env,fixture());
  assert.equal((await pending).length,3);pending=env.run('loadGoogleSheetRows()');const table=fixture();table.cols[6].label='';env.reply(table);
  await assert.rejects(pending,/Nombre/);
});
test('El diagnóstico no incluye precios, costos, descripciones ni documentos operativos',()=>{
  const env=environment(),result=assess(env,fixture());
  for(const row of result.report.records)assert.deepEqual(Object.keys(row).sort(),['causes','code','sourceRow','status']);
});
test('Carrito usa el precio real con decimales y conserva pendiente de precio',()=>{
  const env=environment();env.run('Object.assign(cart,{"9997":{id:"9997",qty:2,price:194974.5,hasPrice:true},"9998":{id:"9998",qty:1,price:0,hasPrice:false}})');
  assert.equal(env.run('cartTotalValue()'),389949);assert.equal(env.run('cartHasUnpricedItems()'),true);
});
test('Navegación sin Producto o sin niveles no crea fichas implícitas',()=>{
  const env=environment();env.sandbox.products=assess(env,fixture()).products;
  env.run('window.applyCatalogNavigationOrder("!section,category,!subcategory,!public,!line,!product",{rebuild:false});setSelectedNavigationValue("category","Cabello")');
  assert.equal(env.run('navigationViewModeForProducts(products).mode'),'terminal');
  env.run('window.applyCatalogNavigationOrder("!section,!category,!subcategory,!public,!line,!product",{rebuild:false})');
  assert.equal(env.run('navigationViewModeForProducts(products).mode'),'empty');
});
test('loadProducts integra el informe y conserva los compatibles aunque una fila falle',async()=>{
  const env=environment();await confirmed(env);const table=fixture();table.rows[0].c[6]={v:''};
  const pending=env.run('loadProducts({silent:true,refreshImages:false})');
  await new Promise(resolve=>setImmediate(resolve));await replyProductTable(env,table);assert.equal(await pending,true);
  assert.equal(env.sandbox.CATALOG_COMPATIBILITY_REPORT.pending,1);
  assert.equal(env.sandbox.CATALOG_COMPATIBILITY_REPORT.compatible,2);
  assert.equal(env.run('allLoadedProducts.length'),2);assert.equal(env.run('all.length'),1);
});
test('Un lote con todos los productos pendientes se refleja sin conservar fichas anteriores',async()=>{
  const env=environment();await confirmed(env);const table=fixture();table.rows.forEach(row=>row.c[6]={v:''});
  const pending=env.run('loadProducts({silent:true,refreshImages:false})');
  await new Promise(resolve=>setImmediate(resolve));await replyProductTable(env,table);assert.equal(await pending,true);
  assert.equal(env.run('all.length'),0);assert.equal(env.sandbox.CATALOG_COMPATIBILITY_REPORT.pending,3);
});
test('Costo o Stock no interpretable permanecen desconocidos sin excluir la ficha',()=>{
  const env=environment(),table=fixture();table.rows[0].c[8]={v:'Por verificar'};table.rows[0].c[9]={v:-1};
  const result=assess(env,table);assert.equal(result.report.pending,0);assert.equal(result.products[0].cost,null);assert.equal(result.products[0].stock,null);
});
test('Nombre con error de fórmula queda pendiente y no se reconstruye desde atributos',()=>{
  const env=environment(),table=fixture();table.rows[0].c[6]={v:'#REF!'};
  const result=assess(env,table);assert.equal(result.report.pending,1);assert.match(result.report.records[0].causes[0].reason,/Nombre/);
});
test('La entrada conserva canonical, SEO y versiones coherentes de los dos scripts',()=>{
  assert.match(htmlSource,/<link rel="canonical" href="https:\/\/gruemp\.github\.io\/natura\/catalogo\.html"/);
  assert.match(htmlSource,/id="ld-products"/);
  assert.ok(htmlSource.includes('catalogo-app.js?actualizacion=directorio-productos-v1'));
  assert.ok(htmlSource.includes('catalogo-cache.js?actualizacion=cache-configurable-v1'));
  assert.ok(htmlSource.includes('catalogo-herramientas.js?actualizacion=depuracion-sin-inicio-v1'));
  assert.ok(htmlSource.includes('catalogo-ui.js?actualizacion=depuracion-sin-inicio-v1'));
  assert.doesNotMatch(htmlSource,/id="catalogHomeBtn"/);
  assert.ok(htmlSource.includes('catalogo.css?actualizacion=depuracion-integral-v1'));
  assert.ok(htmlSource.includes('precios-admin.js?actualizacion=depuracion-integral-v1'));
  for(const id of ['grid','q','priceAdminBtn','btn-cart'])assert.ok(htmlSource.includes('id="'+id+'"'));
});
test('Rango oficial opcional: todos los registros conservan nombre, código y valores reales',{skip:!process.env.CATALOG_PRODUCTS_FIXTURE},async()=>{
  const values=JSON.parse(fs.readFileSync(process.env.CATALOG_PRODUCTS_FIXTURE,'utf8')),env=environment();await confirmed(env);
  const result=assess(env,tableFromValues(values));assert.equal(result.report.pending,0);assert.equal(result.products.length,values.length-1);
  const index=label=>values[0].indexOf(label);
  if(index('Descripción integral del producto')>=0){
    env.sandbox.compactValues=values;
    const expected=env.run('compactValues.slice(1).map(row=>catalogDescriptionRecord(row[compactValues[0].indexOf("Descripción integral del producto")]))');
    result.products.forEach((product,i)=>{
      const fields=expected[i].byKey,price=env.run('catalogCompactNumber('+JSON.stringify(fields.get('precio')?.value||'')+')');
      assert.equal(product.id,fields.get('codigo').value.padStart(4,'0'));
      assert.equal(product.name,fields.get('nombre').value);
      assert.equal(product.price,price.value??0);assert.equal(product.hasPrice,price.value!==null);
      assert.equal(product.category,fields.get('categoria').value);assert.equal(product.section,fields.get('seccion').value);
    });
    const compact=values.map(row=>[row[index('Descripción integral del producto')],row[index('Orden de la ficha')>=0?index('Orden de la ficha'):index('Campos y orden de la ficha')]||'']);
    const migrated=assess(env,tableFromValues(compact));
    assert.equal(migrated.report.pending,0);
    assert.deepEqual(JSON.parse(JSON.stringify(migrated.products)),JSON.parse(JSON.stringify(result.products)));
  }else result.products.forEach((product,i)=>{const row=values[i+1];assert.equal(product.id,String(row[index('Código')]).padStart(4,'0'));assert.equal(product.name,row[index('Nombre')]);assert.equal(product.price,row[index('Precio')]||0);assert.equal(product.hasPrice,typeof row[index('Precio')]==='number');});
  assert.equal(new Set(result.products.map(p=>p.id)).size,result.products.length);
});

test('La configuración y visibilidad públicas consultan únicamente lector Apps Script de solo lectura',()=>{
  const env=environment();const node=env.requests.at(-1);const url=new URL(node.src);
  assert.equal(url.hostname,'script.google.com');assert.equal(url.searchParams.get('modo'),'visibilidad');
  const deployment=JSON.parse(fs.readFileSync(path.join(__dirname,'apps-script/lector publico natura/deployment.json'),'utf8'));
  assert.equal(url.origin+url.pathname,deployment.endpoint);
  assert.ok(url.searchParams.get('callback'));
  const config=env.run('loadRemoteCatalogConfiguration("__testControl")');
  const request=new URL(env.requests.at(-1).src);
  assert.equal(request.hostname,'script.google.com');assert.equal(request.searchParams.get('modo'),'config');
  env.reply({ok:true,valores:{REGISTRAR_VISITAS_PROPIAS:'DESACTIVADO',MOSTRAR_CANTIDAD_STOCK:'DESACTIVADO',MOSTRAR_PRECIOS_PRODUCTO:'ACTIVADO',CARGAR_IMAGENES_CATALOGO:'ACTIVADO',ORDEN_NAVEGACION:'!section,category,subcategory,public,!line,product',ORDEN_PRODUCTOS:'price_asc'},publicadoEn:'2026-10-07T23:00:14.772Z'});
  return config.then(x=>assert.equal(x.valores.ORDEN_PRODUCTOS,'price_asc'));
});

function fichaLayoutEnvironment({width=350,descriptionHeight=48,factsHeight=150,empty=false}={}){
  const classes=()=>{const values=new Set();return {add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x),toggle(x,on){on?values.add(x):values.delete(x)}}};
  const properties=new Map();let layouts=0;
  const square={classList:classes(),style:{setProperty(k,v){properties.set(k,v);layouts++;}},getBoundingClientRect:()=>({width})};
  const description={textContent:empty?'':'Descripción ficticia completa',style:{}};
  const details={classList:classes(),open:false,hidden:empty,querySelector:()=>description,
    get scrollHeight(){return this.open?descriptionHeight:40;}};
  const row={textContent:'$ 25.000'};
  const attributes={parentNode:null};
  const facts={clientWidth:150,scrollWidth:150,
    get scrollHeight(){return Math.ceil(factsHeight*(width/350)*Number(properties.get('--ficha-fit')??1));}};
  attributes.parentNode=facts;
  const main={get clientHeight(){return Math.floor(width-width*32/420-(details.hidden?0:details.scrollHeight+width*12/420));}};
  square.querySelector=selector=>({'.product-details':details,'.ficha-facts':facts,'.ficha-main':main}[selector]);
  const card={querySelector:selector=>({'.ficha-square':square,'.ficha-attributes':attributes,'.row':row}[selector]||null)};
  const context=vm.createContext({card,getComputedStyle:()=>({fontSize:'14px',fontFamily:'Calibri'})});
  vm.runInContext(toolsSource,context);
  return {run:()=>vm.runInContext('fitCatalogFicha(card)',context),details,square,description,row,attributes,facts,main,properties,layouts:()=>layouts,setWidth:n=>{width=n;}};
}
test('Ficha corta omite el bloque inferior de descripción y conserva tamaño cuadrado',()=>{
  const e=fichaLayoutEnvironment();e.run();
  assert.equal(e.details.hidden,true);assert.equal(e.details.classList.contains('ficha-description-inline'),false);
  assert.equal(e.details.open,false);assert.equal(e.square.classList.contains('ficha-description-expanded'),false);
  assert.equal(e.description.textContent,'Descripción ficticia completa');
});
test('Ficha extensa mantiene retirada la descripción al cambiar de ancho',()=>{
  const e=fichaLayoutEnvironment({descriptionHeight:850});e.run();
  assert.equal(e.details.classList.contains('ficha-description-inline'),false);assert.equal(e.details.open,false);
  e.details.open=true;e.setWidth(390);e.run();
  assert.equal(e.details.hidden,true);assert.equal(e.details.open,false);assert.equal(e.square.classList.contains('ficha-description-expanded'),false);
  assert.equal(e.description.textContent,'Descripción ficticia completa');
});
test('El cambio de ancho no restaura el bloque de descripción retirado',()=>{
  const e=fichaLayoutEnvironment({width:500,descriptionHeight:180,factsHeight:190});e.run();
  assert.equal(e.details.hidden,true);assert.equal(e.details.classList.contains('ficha-description-inline'),false);
  e.setWidth(320);e.run();assert.equal(e.details.classList.contains('ficha-description-inline'),false);assert.equal(e.details.open,false);
});
test('Descripción vacía no muestra control y los atributos extensos permanecen dentro del cuadrado',()=>{
  const e=fichaLayoutEnvironment({empty:true,factsHeight:480});e.run();
  assert.equal(e.details.hidden,true);assert.equal(e.attributes.parentNode,e.facts);
  assert.ok(Number(e.properties.get('--ficha-fit'))<1);
  assert.ok(e.facts.scrollHeight<=e.main.clientHeight);
  const layouts=e.layouts();e.run();assert.equal(e.layouts(),layouts,'El observador no reconstruye controles sin cambios');
});
test('Datos extensos y precio se ajustan juntos sin salir del cuadrado en anchos móviles',()=>{
  for(const width of [240,280,320,360,390,420,520]){
    const e=fichaLayoutEnvironment({width,factsHeight:680});e.run();
    assert.equal(e.attributes.parentNode,e.facts);
    assert.ok(e.facts.scrollHeight<=e.main.clientHeight+1,'Ancho '+width);
    assert.equal(e.properties.get('--ficha-unit'),width/1080+'px');
    assert.equal(e.square.classList.contains('ficha-description-expanded'),false);
  }
});
test('El título omite solo los contenidos repetidos y conserva el nombre oficial y multipacks',()=>{
  const context=vm.createContext({});vm.runInContext(toolsSource,context);
  const cases=[
    ['Avon Senses colonia femenino 120 ml','120 ml','Avon Senses colonia femenino'],
    ['Crema 50ml','50 ml','Crema'],
    ['Crema 150 ml','50 ml','Crema 150 ml'],
    ['Perfume 50 mL','50 ml','Perfume'],
    ['Tratamiento 1,5 L','1.5 l','Tratamiento'],
    ['Kit 2 x 50 ml','50 ml','Kit 2 x 50 ml'],
    ['Natura desodorante unisex 80 g','80 g','Natura desodorante unisex'],
    ['Labial tono 50','50 ml','Labial tono 50']
  ];
  for(const [name,presentation,expected] of cases){
    context.product={name,presentation};
    assert.equal(vm.runInContext('catalogFichaName(product)',context),expected);
    assert.equal(context.product.name,name);
  }
});
test('Folleto conserva datos oficiales de la ficha y exportación sin precio',async()=>{
  const env=environment();await confirmed(env);vm.runInContext(toolsSource,env.context);
  env.sandbox.products=assess(env,fixture()).products;
  env.run('allLoadedProducts=products;window.CATALOG_INITIAL_LOAD_READY=true');
  const snapshot=env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997"]})');
  assert.equal(snapshot.products.length,1);assert.equal(snapshot.settings.prices,false);
  assert.equal(snapshot.products[0].name,env.sandbox.products[0].name);
  assert.equal(snapshot.products[0].code,'Código 9997');
});
test('Precio de Folleto es opcional, conserva los importes reales y distingue precio desconocido',async()=>{
  const env=environment();await confirmed(env);vm.runInContext(toolsSource,env.context);
  env.sandbox.products=assess(env,fixture()).products;
  env.run('allLoadedProducts=products;window.CATALOG_INITIAL_LOAD_READY=true');
  const original=env.sandbox.products[0].price;
  const withPrice=env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997","9998"],prices:true})');
  assert.equal(withPrice.settings.prices,true);
  assert.equal(withPrice.products.find(p=>p.id==='9997').priceText,new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(original));
  assert.equal(withPrice.products.find(p=>p.id==='9998').priceText,'','Sin importe oficial no debe quedar bloque ni separador de precio.');
  const withoutPrice=env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997","9998"],prices:false})');
  assert.equal(withoutPrice.settings.prices,false);assert.ok(withoutPrice.products.every(p=>p.priceText===''));
  env.sandbox.a=withPrice;env.sandbox.b=withoutPrice;
  assert.notEqual(env.run('folletoPreparationKey(a,"marketplace")'),env.run('folletoPreparationKey(b,"marketplace")'));
  assert.equal(env.sandbox.products[0].price,original);
});
test('Ficha exportada conserva datos y precio y omite la descripción inferior en PNG y PDF',()=>{
  const rendered=[];
  const ctx={font:'400 32px Arial',measureText(text){return {width:String(text).length*parseFloat(this.font.match(/([\d.]+)px/)[1])*.52};},
    save(){},restore(){},translate(){},scale(){},beginPath(){},roundRect(){},closePath(){},fill(){},clip(){},fillRect(){},moveTo(){},lineTo(){},stroke(){},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},fillText(text){rendered.push(text);}};
  const p={id:'9997',name:'Producto ficticio con atributos extensos',presentation:'50 ml',code:'Código 9997',priceText:'$ 194.975',description:'Descripción completa. '.repeat(65),attributes:Array.from({length:9},(_,i)=>({label:'Dato '+i,value:'Información ficticia extensa para comprobar ajuste proporcional'}))};
  const context=vm.createContext({ctx,p});vm.runInContext(toolsSource,context);
  const measure=vm.runInContext('measureFicha(ctx,buildFichaModel(p))',context);context.measure=measure;
  assert.ok(measure.scale<1);assert.equal(measure.name.size/46,measure.price.size/44);
  assert.equal(measure.attributes.size/33,measure.price.size/44);
  assert.equal(measure.description.lines.length,0);
  vm.runInContext('renderFicha(ctx,{x:0,y:0,width:1080,height:1080,product:buildFichaModel(p),measure},null)',context);
  assert.ok(rendered.includes(p.priceText));assert.ok(rendered.some(t=>t.includes('Información')));
  for(const key of ['marketplace','document']){
    context.key=key;const plan=vm.runInContext('layoutFolleto({products:[p]},key,ctx)',context);
    assert.equal(plan.pages.length,1);assert.equal(plan.pages[0].cards[0].width,plan.pages[0].cards[0].height);
    assert.equal(plan.pages[0].cards[0].product.priceText,p.priceText);
    const format=vm.runInContext('FOLLETO_FORMATS[key]',context);assert.equal(plan.pages[0].width,format.width);assert.equal(plan.pages[0].height,format.height);
  }
});
test('Información lateral usa los mismos nodos y restaura el orden móvil sin duplicar enlaces',()=>{
  const container=()=>({children:[],append(node){node.parentNode?.children.splice(node.parentNode.children.indexOf(node),1);this.children.push(node);node.parentNode=this;},prepend(node){node.parentNode?.children.splice(node.parentNode.children.indexOf(node),1);this.children.unshift(node);node.parentNode=this;}});
  const social={},visit={},products={},socialHome=container(),visitHome=container(),left=container(),right=container();
  socialHome.append(social);visitHome.append(visit);visitHome.append(products);
  const media={matches:true,addEventListener(_,fn){this.change=fn;}};
  const document={querySelector:selector=>({'.social-contact-card':social,'.footer-visit-card':visit,'.catalog-navigation':left,'.catalog-contact':right}[selector])};
  const context=vm.createContext({document,window:{matchMedia:()=>media}});vm.runInContext(toolsSource,context);vm.runInContext('initCatalogInformationLayout()',context);
  assert.equal(social.parentNode,left);assert.equal(visit.parentNode,right);assert.equal(socialHome.hidden,true);
  for(let i=0;i<3;i++){
    media.matches=false;media.change();assert.equal(social.parentNode,socialHome);assert.equal(visitHome.children[0],visit);assert.equal(visitHome.children[1],products);assert.equal(socialHome.hidden,false);
    media.matches=true;media.change();assert.equal(left.children.length,1);assert.equal(right.children.length,1);
  }
});


const compactHeaders=['Descripción integral del producto','Campos y orden de la ficha'];
const richReaderSource=fs.readFileSync(path.join(__dirname,'apps-script','lectura de carpetas en natura','productos-lectura.js'),'utf8');
function richNativeCell(text,labels=[],partialLabel=''){
  const runs=[];let offset=0;
  for(const line of text.split('\n')){
    const colon=line.indexOf(':'),label=line.slice(0,colon);
    if(labels.includes(label))runs.push({startIndex:offset,format:{bold:true}},{startIndex:offset+colon+1,format:{bold:false}});
    if(label===partialLabel)runs.push({startIndex:offset,format:{bold:true}},{startIndex:offset+2,format:{bold:false}});
    offset+=line.length+1;
  }
  return {userEnteredValue:{stringValue:text},textFormatRuns:runs};
}
function nativeRich(cell){
  const text=cell.userEnteredValue.stringValue;
  const boldAt=i=>{let bold=cell.userEnteredFormat?.textFormat?.bold===true;for(const r of cell.textFormatRuns||[]){if((r.startIndex||0)>i)break;bold=r.format?.bold===true;}return bold;};
  return {getText:()=>text,getTextStyle:(a,b)=>({isBold:()=>Array.from({length:b-a},(_,i)=>boldAt(a+i)).every(Boolean)})};
}
function sanitizedRichTable(cells){
  const context=vm.createContext({});vm.runInContext(richReaderSource,context);
  return {cols:[{id:'A',label:'Informacion del producto'}],rows:cells.map((c,i)=>context.productoPublico_(nativeRich(c),i+2))};
}
test('Lector utiliza A como datos completos y B como selección, sin revelar información privada',()=>{
  const calls=[],a=richNativeCell('Nombre: Prueba\nCódigo interno: 0042\nSección: Belleza y cuidado\nCategoría: Cabello\nTipo de producto: Champú\nPrecio: 25.000\nDisponibilidad: A la venta\nCosto de adquisición: 10.000\nNúmero de serie: SECRETO');
  const b=richNativeCell('Nombre: Prueba\nMarca: Natura',['Nombre','Marca']);
  const ctx=vm.createContext({Sheets:{Spreadsheets:{get(id,options){
    calls.push({id,options});return calls.length===1
      ?{sheets:[{properties:{title:'Productos',gridProperties:{rowCount:888,columnCount:2}}}]}
      :{sheets:[{data:[{rowData:[
        {values:[{userEnteredValue:{stringValue:'Descripción completa del producto'}},{userEnteredValue:{stringValue:'Informacion del producto para el sistema'}}]},
        {values:[a,b]}
      ]}]}]};
  }}}});
  vm.runInContext(richReaderSource,ctx);
  const payload=ctx.leerProductosPublicos_();
  assert.equal(payload.table.rows.length,1);
  assert.deepEqual(Array.from(calls[1].options.ranges),["'Productos'!A1:B888"]);
  assert.ok(calls[1].options.fields.includes('textFormatRuns'));
  assert.ok(!JSON.stringify(payload).includes('SECRETO'));
  assert.ok(!JSON.stringify(payload).includes('10.000'));
  assert.equal(payload.version,3);
  assert.ok(payload.table.rows[0].c[0].v.includes('Código interno: 0042'));
  assert.ok(payload.table.rows[0].c[0].v.includes('Precio: 25.000'));
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'apps-script','lectura de carpetas en natura','appsscript.json'),'utf8'));
  assert.deepEqual(manifest.oauthScopes,['https://www.googleapis.com/auth/drive.readonly']);
});
const richDescription='Nombre: Perfume de prueba\nMarca: Natura\nFragancia: Intensa\nVariedad: Flor de Cereza y Aguacate\nColor: Rojo vivo\nPrecio: 25.000\nSección: Belleza y cuidado\nCategoría: Perfumería\nLínea: Kaiak\nDisponibilidad: A la venta\nCódigo interno: 0042\nCosto: 15.000\nNúmero de serie: PRIVADO-123\nCódigo Natura: PRIVADO-NAT\nReferencia: https://example.com/privado';
function pairedTable(values){
  const ctx=vm.createContext({});vm.runInContext(richReaderSource,ctx);
  return {cols:[{id:'A',label:'Datos operativos del producto'},{id:'B',label:'Etiquetas para fichas'}],rows:values.map((r,i)=>ctx.productoDosColumnas_(nativeRich(richNativeCell(r[0]||'')),i+2,nativeRich(richNativeCell(r[1]||''))))};
}
test('Dos columnas leen B sin negrita, conservan valores resumidos, orden y filtros operativos de A',()=>{
  const a=richDescription+'\nCompatibilidad: Android; iOS\nNombre del componente 1: Champú';
  const b='Nombre: Perfume breve\nComponentes: Champú y crema\nMarca: Marca resumida\nFragancia: Intensa, fresca; duradera\nCosto: SECRETO\nIdentificador técnico CMIIT: SECRETO';
  const table=pairedTable([[a,b]]),env=environment(),result=assess(env,table),p=result.products[0];
  assert.equal(result.report.pending,0);assert.ok(!JSON.stringify(table).includes('SECRETO'));
  assert.deepEqual(Array.from(p.fichaFields,f=>f.label),['Nombre','Componentes','Marca','Fragancia']);
  assert.equal(p.fichaFields[3].value,'Intensa, fresca; duradera');
  assert.equal(p.facetAttributes.brand[0].label,'Natura');
  assert.equal(p.facetAttributes.compatibility.length,2);
  assert.equal(p.price,25000);assert.equal(p.name,'Perfume de prueba');
  vm.runInContext(toolsSource,env.context);env.sandbox.product=p;assert.equal(env.run('fichaHeaderFields(product).name'),'Perfume breve');
});
test('B vacía no publica automáticamente atributos de A; A inválida aísla su producto',()=>{
  const result=assess(environment(),pairedTable([[richDescription,''],['','Nombre: Sin identidad']]));
  assert.equal(result.report.compatible,1);assert.equal(result.report.pending,1);
  assert.equal(result.products[0].fichaSelectionExplicit,true);assert.equal(result.products[0].fichaFields.length,0);
});
test('La carga reconoce encabezados actuales y exige respuesta pública saneada',async()=>{
  const env=environment();await confirmed(env);const pending=env.run('loadGoogleSheetRows()');
  env.reply({cols:[{id:'A',label:'Etiquetas: obligatorias (negrita) - No obligatorias (sin negrita)'},{id:'B',label:'Etiquetas para fichas'}],rows:[]});await Promise.resolve();
  const url=new URL(env.requests.at(-1).src);assert.equal(url.searchParams.get('modo'),'productos');
  env.sandbox[url.searchParams.get('callback')]({ok:true,version:3,table:pairedTable([[richDescription,'Nombre: Breve\nMarca: Natura']])});
  assert.equal((await pending)[0].code,'0042');
});
test('Pedidos usa precio e identidad de A con los encabezados actuales, sin escribir pedidos',()=>{
  const data=[['Etiquetas: obligatorias (negrita) - No obligatorias (sin negrita)','Etiquetas para fichas'],[richDescription,'Nombre: Breve\nPrecio: 1']];
  const sheet={getLastRow:()=>2,getLastColumn:()=>2,getMaxRows:()=>2,getMaxColumns:()=>2,getName:()=> 'Productos',getRange(row,col,count=1,width=1){
    return {getDisplayValues:()=>data.slice(row-1,row-1+count).map(r=>r.slice(col-1,col-1+width))};
  }};
  const ctx=vm.createContext({SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},INVENTORY_SPREADSHEET_ID:'original',INVENTORY_SHEET_NAME:'Productos',HEADER_SCAN_MAX_ROWS:30,HEADER_SCAN_MAX_COLS:40,safe_:v=>String(v??'').trim(),safeClientCell_:v=>String(v??'')});
  for(const name of ['pedidos-tablas.js','pedidos-inventario.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'apps-script','pedidos natura',name),'utf8'),ctx);
  const items=ctx.resolveInventoryItems_([{codigo:'0042',cantidadSolicitada:1}]);
  assert.equal(items[0].valorUnitario,25000);assert.equal(items[0].nombreProducto,'Perfume de prueba');
});
test('Administración reconoce A actual y conserva B fuera de la edición de precios',()=>{
  const env=compactPriceBackend(richDescription,{headers:['Etiquetas: obligatorias (negrita) - No obligatorias (sin negrita)','Etiquetas para fichas']});
  assert.equal(env.run('obtenerProductosPrecios().productos[0].codigo'),'0042');
  assert.equal(env.run('obtenerContextoInventario_().columnas.descripcion'),0);
  assert.equal(env.writes(),0);
});
test('Maestro original de dos columnas: cada ficha conserva B y los datos operativos de A',{skip:!process.env.CATALOG_PAIRED_FIXTURE},()=>{
  const values=JSON.parse(fs.readFileSync(process.env.CATALOG_PAIRED_FIXTURE,'utf8')),env=environment(),table=pairedTable(values.slice(1));
  const result=assess(env,table);assert.equal(result.report.total,363);assert.equal(result.report.pending,0,JSON.stringify(result.report.records.filter(r=>r.status==='PENDIENTE')));
  assert.equal(new Set(result.products.map(p=>p.id)).size,363);
  result.products.forEach((p,i)=>{
    const a=env.run('catalogDescriptionRecord('+JSON.stringify(values[i+1][0])+')'),b=env.run('catalogDescriptionRecord('+JSON.stringify(values[i+1][1]||'')+')');
    assert.equal(p.id,a.byKey.get('codigo').value.padStart(4,'0'));
    assert.equal(p.name,a.byKey.get('nombre').value);assert.equal(p.category,a.byKey.get('categoria').value);
    assert.deepEqual(Array.from(p.fichaFields,f=>[f.label,f.value]),Array.from(b.fields).filter(f=>!env.run('catalogPrivateField('+JSON.stringify(f.key)+')')&&f.value).map(f=>[f.label,f.value]));
    assert.equal(p.price,env.run('catalogCompactNumber('+JSON.stringify(a.byKey.get('precio')?.value||'')+').value')??0);
  });
});
test('B contiene solo etiquetas visibles breves, A conserva código, precio y navegación',()=>{
  const completo=richNativeCell(richDescription);
  const resumen=richNativeCell('Nombre: Perfume de prueba\nMarca: Natura\nFragancia: Intensa',['Nombre','Marca','Fragancia']);
  const context=vm.createContext({});vm.runInContext(richReaderSource,context);
  const sanitized={cols:[{id:'A',label:'Datos operativos del producto'},{id:'B',label:'Etiquetas para fichas'}],rows:[context.productoPublico_(nativeRich(completo),2,nativeRich(resumen))]};
  const serialized=JSON.stringify(sanitized);
  assert.ok(!serialized.includes('PRIVADO'));
  assert.ok(!serialized.includes('15.000'));
  const result=assess(environment(),sanitized),p=result.products[0];
  assert.equal(result.report.pending,0);
  assert.equal(p.id,'0042');
  assert.equal(p.price,25000);
  assert.equal(p.category,'Perfumería');
  assert.equal(p.commercialStatus,'A la venta');
  assert.deepEqual(Array.from(p.fichaFields,f=>f.label),['Nombre','Marca','Fragancia']);
});
test('A conserva identidad y precio operativos mientras B puede resumir el nombre',()=>{
  const resumen=richNativeCell('Nombre: Producto distinto\nPrecio: 12.000',['Nombre','Precio']);
  const context=vm.createContext({});vm.runInContext(richReaderSource,context);
  const table={cols:[{id:'A',label:'Datos operativos del producto'},{id:'B',label:'Etiquetas para fichas'}],rows:[context.productoPublico_(nativeRich(richNativeCell(richDescription)),2,nativeRich(resumen))]};
  const result=assess(environment(),table);
  assert.equal(result.report.pending,0);
  const p=result.products[0];
  assert.equal(p.name,'Perfume de prueba');assert.equal(p.price,25000);
  assert.equal(p.fichaFields[0].value,'Producto distinto');
  const env=environment();env.sandbox.product=p;
  vm.runInContext(toolsSource,env.context);
  assert.equal(env.run('fichaHeaderFields(product).name'),'Producto distinto');
});
test('Rich Text de una sola A selecciona nombres completos en negrita y excluye datos privados antes de enviarlos',()=>{
  const table=sanitizedRichTable([richNativeCell(richDescription,['Nombre','Marca','Fragancia','Variedad','Costo','Número de serie','Código Natura'],'Color')]);
  assert.ok(!JSON.stringify(table).includes('PRIVADO'));assert.ok(!JSON.stringify(table).includes('15.000'));assert.ok(!JSON.stringify(table).includes('example.com/privado'));
  const env=environment(),result=assess(env,table),p=result.products[0];
  assert.equal(result.report.pending,0);assert.equal(p.id,'0042');assert.equal(p.price,25000);
  assert.deepEqual(Array.from(p.fichaFields,f=>f.label),['Nombre','Marca','Fragancia','Variedad']);
  assert.ok(!p.fullTxtRecord.includes('Color:'));assert.equal(p.description,'');
  assert.equal(p.facetAttributes['atributo:fragancia'][0].label,'Intensa');
});
test('Sin formato comercial el lector Rich Text no publica todos los atributos por defecto',()=>{
  const p=assess(environment(),sanitizedRichTable([richNativeCell(richDescription)])).products[0];
  assert.equal(p.fichaSelectionExplicit,true);assert.equal(p.fichaFields.length,0);assert.equal(p.fullTxtRecord,'');
  assert.ok(!JSON.stringify(p).includes('Flor de Cereza'));assert.ok(!JSON.stringify(p).includes('PRIVADO'));
});
test('Opciones de tres palabras preservan valores completos y distinguen opciones con el mismo comienzo',async()=>{
  const env=environment();await confirmed(env);
  const cells=['Flor de Cereza y Aguacate','Flor de Cereza y Vainilla'].map((v,i)=>richNativeCell(richDescription.replace('0042','00'+(42+i)).replace('Flor de Cereza y Aguacate',v),['Nombre','Marca','Variedad']));
  env.sandbox.products=assess(env,sanitizedRichTable(cells)).products;
  env.run('allLoadedProducts=products;all=filterVisibleProducts(products);setWordSuggestionsVisible(true);renderWordSuggestions()');
  const buttons=facetButtons(env).filter(b=>b.dataset.facetGroup==='atributo:variedad');
  assert.equal(buttons.length,2);assert.ok(buttons.every(b=>b.children[0].textContent==='Flor de Cereza'));
  assert.notEqual(buttons[0].dataset.facetValue,buttons[1].dataset.facetValue);
  for(const group of env.sandbox.document.getElementById('wordChips').children){assert.ok(!/\s/.test(group.children[0].id));assert.equal(group.attributes['aria-labelledby'],group.children[0].id);}
  env.run('toggleFacetFilter("atributo:variedad","Flor de Cereza y Aguacate")');assert.deepEqual(facetIds(env),['0042']);
  assert.equal(env.run('catalogTabLabel("Lanzadores y juegos de agua")'),'Lanzadores y juegos');
});
test('La carga del catálogo consulta el lector público y no obtiene A en bruto',async()=>{
  const env=environment();await confirmed(env);const pending=env.run('loadGoogleSheetRows()');
  env.reply({cols:[{id:'A',label:'Descripción completa del producto'},{id:'B',label:'Informacion del producto para el sistema'}],rows:[]});await Promise.resolve();
  const url=new URL(env.requests.at(-1).src);assert.equal(url.searchParams.get('modo'),'productos');assert.equal(url.searchParams.has('tq'),false);
  const callback=url.searchParams.get('callback');env.sandbox[callback]({ok:true,version:2,table:sanitizedRichTable([richNativeCell(richDescription,['Nombre','Marca'])])});
  assert.equal((await pending)[0].code,'0042');
});
test('Maestro Rich Text oficial: integridad de todas las fichas, selección y exclusión de campos privados',{skip:!process.env.CATALOG_RICH_TEXT_FIXTURE},()=>{
  const native=JSON.parse(fs.readFileSync(process.env.CATALOG_RICH_TEXT_FIXTURE,'utf8'));
  const cells=native.sheets[0].data[0].rowData.slice(1).map(r=>r.values[0]);
  const table=sanitizedRichTable(cells),env=environment(),result=assess(env,table);
  assert.equal(result.report.total,363);assert.equal(result.report.pending,0,JSON.stringify(result.report.records.filter(r=>r.status!=='COMPATIBLE')));
  assert.equal(new Set(result.products.map(p=>p.id)).size,363);
  for(const p of result.products){assert.equal(p.fichaSelectionExplicit,true);assert.equal(p.description,'');assert.ok(p.fichaFields.every(f=>!env.run('catalogPrivateField('+JSON.stringify(f.label)+')')));}
});
test('Pedidos lee el maestro de una sola A y valida precios, estado y códigos sin escribir movimientos',()=>{
  const text=richDescription,other=text.replace('0042','0043').replace('A la venta','No a la venta');
  const sheet={getLastRow:()=>3,getLastColumn:()=>1,getMaxRows:()=>3,getMaxColumns:()=>1,getName:()=> 'Productos',getRange(row,col,count){
    assert.equal(col,1);return {getDisplayValues:()=>row===1?(count===1?[['Informacion del producto']]:[['Informacion del producto'],[text],[other]]):[[text],[other]]};
  }};
  const ctx=vm.createContext({SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},INVENTORY_SPREADSHEET_ID:'original',INVENTORY_SHEET_NAME:'Productos',HEADER_SCAN_MAX_ROWS:30,HEADER_SCAN_MAX_COLS:40,safe_:v=>String(v??'').trim(),safeClientCell_:v=>String(v??'')});
  for(const file of ['pedidos-tablas.js','pedidos-inventario.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'apps-script','pedidos natura',file),'utf8'),ctx);
  const result=vm.runInContext('resolveInventoryItems_([{codigo:"0042",cantidadSolicitada:2}])',ctx);
  assert.equal(result[0].nombreProducto,'Perfume de prueba');assert.equal(result[0].valorUnitario,25000);assert.equal(result[0].categoria,'Perfumería');
  assert.throws(()=>vm.runInContext('resolveInventoryItems_([{codigo:"0043",cantidadSolicitada:1}])',ctx),/no está a la venta/);
});
test('La actualización de precio en A conserva la negrita de todos los nombres comerciales',()=>{
  let text=richDescription,styles=richNativeCell(text,['Nombre','Marca','Precio','Variedad']).textFormatRuns,writes=0;
  const builder=()=>({setText(t){this.text=t;this.runs=[];return this;},setTextStyle(a,b,style){this.runs.push({a,b,style});return this;},build(){return this;}});
  const rich=()=>({getText:()=>text,copy:builder,getRuns:()=>styles.map((r,i)=>({getStartIndex:()=>r.startIndex,getEndIndex:()=>styles[i+1]?.startIndex??text.length,getTextStyle:()=>r.format}))});
  const cell={getFormula:()=>'',getValue:()=>text,getRichTextValue:rich,setRichTextValue(value){writes++;text=value.text;styles=value.runs.flatMap(r=>[{startIndex:r.a,format:r.style}]);},setValue(){throw new Error('No borrar Rich Text');}};
  const sheet={getLastRow:()=>2,getLastColumn:()=>1,getRange(row,col,count){assert.equal(col,1);return row===1?{getDisplayValues:()=>[['Informacion del producto']]}:count?{getDisplayValues:()=>[[text]]}:cell;}};
  const ctx=vm.createContext({SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},INVENTARIO_SPREADSHEET_ID:'original',INVENTARIO_SHEET_NAME:'Productos',INVENTARIO_HEADER_ROW:1});
  for(const file of ['admin-contextos.js','admin-precios.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'apps-script','administrar precios natura',file),'utf8'),ctx);
  vm.runInContext('actualizarPrecioWeb("0042","300000","25000")',ctx);assert.equal(writes,1);assert.equal(text,richDescription.replace('25.000','300000'));
  const env=environment();env.sandbox.cell={v:text,textFormatRuns:styles};
  assert.equal(env.run('catalogRichTextSelection(cell)'), 'Nombre\nMarca\nVariedad\nPrecio');
});
const compactDescription='Código interno del producto: 0042\nNombre comercial del producto: Kit de prueba: champú y crema\nSección del catálogo: Belleza y cuidado\nCategoría del producto: Cabello\nMarca: Natura\nLínea comercial: Lumina\nPúblico destinatario: Femeninos\nEstado comercial del producto: A la venta\nPrecio de venta: 25.000\nBeneficios y funciones del producto: Suaviza el cabello.\nDescripción sensorial y uso recomendado: Texto completo de prueba.\nEnlace de referencia del producto: https://example.com/item:42\nCosto de adquisición: 15000\nNúmero de serie: PRIVADO-123';
test('Dos columnas recuperan identidad, precio, navegación y filtros desde títulos',()=>{
  const env=environment(),r=assess(env,tableFromValues([compactHeaders,[compactDescription,'']]));
  assert.equal(r.report.pending,0);assert.equal(r.products[0].id,'0042');assert.equal(r.products[0].price,25000);
  assert.equal(r.products[0].line,'Lumina');assert.equal(r.products[0].public,'Femeninos');
  assert.equal(r.products[0].fichaSelectionExplicit,false);assert.equal(r.products[0].description,'Suaviza el cabello.\nTexto completo de prueba.');
});
test('Títulos cortos con acentos, dos puntos y orden arbitrario seleccionan valores exactos',()=>{
  const env=environment(),r=assess(env,tableFromValues([compactHeaders,[compactDescription,'precio:\nMarca:\nCódigo:\nNombre:\nLÍNEA:\nPrecio de venta:\nNo existe:\nCosto:']]));
  assert.deepEqual(Array.from(r.products[0].fichaFields,f=>f.key),['precio','marca','codigo','nombre','linea']);
  assert.equal(r.products[0].fichaFields[3].value,'Kit de prueba: champú y crema');
});
test('Referencias con dos puntos y valores multilínea se conservan sin inventar campos',()=>{
  const env=environment();env.sandbox.raw=compactDescription+'\nMateriales: Tela\nAlgodón suave';
  const record=env.run('catalogDescriptionRecord(raw)');
  assert.equal(record.byKey.get('referencia externa').value,'https://example.com/item:42');
  assert.equal(record.byKey.get('materiales').value,'Tela\nAlgodón suave');
});
test('Datos privados se excluyen de ficha, búsqueda y texto copiable',()=>{
  const env=environment(),r=assess(env,tableFromValues([compactHeaders,[compactDescription,'Costo:\nNúmero de serie:\nMarca:']]));
  assert.deepEqual(Array.from(r.products[0].fichaFields,f=>f.key),['marca']);
  assert.equal(r.products[0].cost,null);assert.equal(r.products[0].costText,'');
  assert.ok(!JSON.stringify(r.products[0]).includes('PRIVADO-123'));
  assert.ok(!JSON.stringify(r.products[0]).includes('15000'));
});
test('Títulos duplicados y códigos duplicados no eligen una fila arbitraria',()=>{
  const env=environment();
  assert.equal(assess(env,tableFromValues([compactHeaders,[compactDescription+'\nPrecio: 30000','']])).report.pending,1);
  assert.equal(assess(env,tableFromValues([compactHeaders,[compactDescription,''],[compactDescription,'']])).report.pending,2);
});
test('Precio vacío conserva consultar precio y un dato inválido deja la fila pendiente',()=>{
  const env=environment(),make=price=>assess(env,tableFromValues([compactHeaders,[compactDescription.replace('25.000',price),'']]));
  assert.equal(make('').products[0].hasPrice,false);assert.equal(make('').products[0].price,0);
  assert.equal(make('-100').report.pending,1);assert.equal(make('no disponible').report.pending,1);
});
test('La consulta compacta selecciona exclusivamente las dos columnas por sus encabezados',async()=>{
  const env=environment();await confirmed(env);const promise=env.run('loadGoogleSheetRows()');
  env.reply(tableFromValues([['Código interno del producto',...compactHeaders]]));await Promise.resolve();
  const url=new URL(env.requests.at(-1).src);assert.equal(url.searchParams.get('tq'),'select B,C');
  env.reply(tableFromValues([compactHeaders,[compactDescription,'Precio:']]));assert.equal((await promise)[0].code,'0042');
});
function compactPriceBackend(text=compactDescription,{duplicate=false,formula=false,concurrent=false,headers=compactHeaders}={}){
  let content=text,writes=0,reads=0,released=0;
  const cell={getFormula:()=>formula?'=FORMULA()':'',getValue(){reads++;return concurrent&&reads===1?content+'\nCambio ajeno: sí':content;},setValue(value){writes++;content=value;}};
  const sheet={getLastRow:()=>duplicate?3:2,getLastColumn:()=>2,getRange(row,col,count){
    if(row===1)return {getDisplayValues:()=>[headers]};
    if(count!==undefined)return {getDisplayValues:()=>duplicate?[[content],[content]]:[[content]]};
    return cell;
  }};
  const context=vm.createContext({SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){released++;}})},
    INVENTARIO_SPREADSHEET_ID:'prueba',INVENTARIO_SHEET_NAME:'Productos',INVENTARIO_HEADER_ROW:1});
  for(const name of ['admin-contextos.js','admin-precios.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'apps-script','administrar precios natura',name),'utf8'),context);
  return {run:source=>vm.runInContext(source,context),content:()=>content,writes:()=>writes,released:()=>released};
}
test('Administrador compacto actualiza únicamente el valor de precio y conserva todas las otras líneas',()=>{
  const env=compactPriceBackend();assert.equal(env.run('obtenerProductosPrecios().productos[0].codigo'),'0042');
  assert.equal(env.run('actualizarPrecioWeb("0042","30.000","25000").precioGuardado'),'30000');
  assert.equal(env.content(),compactDescription.replace('Precio de venta: 25.000','Precio de venta: 30000'));assert.equal(env.writes(),1);assert.equal(env.released(),1);
});
test('Administrador compacto agrega y vacía precio sin borrar identidad o atributos',()=>{
  const original=compactDescription.replace('\nPrecio de venta: 25.000',''),env=compactPriceBackend(original);
  env.run('actualizarPrecioWeb("0042","12000","")');assert.equal(env.content(),original+'\nPrecio de venta: 12000');
  env.run('actualizarPrecioWeb("0042","","12000")');assert.equal(env.content(),original+'\nPrecio de venta: ');
});
test('Administrador rechaza conflictos, fórmulas, códigos o precios ambiguos sin escribir',()=>{
  for(const options of [{duplicate:true},{formula:true},{concurrent:true}]){
    const env=compactPriceBackend(compactDescription,options);assert.throws(()=>env.run('actualizarPrecioWeb("0042","30000","25000")'));assert.equal(env.writes(),0);assert.equal(env.released(),1);
  }
  for(const text of [compactDescription+'\nPrecio: 1',compactDescription+'\nCódigo: 0042']){
    const env=compactPriceBackend(text);assert.throws(()=>env.run('actualizarPrecioWeb("0042","30000","25000")'));assert.equal(env.writes(),0);
  }
  const env=compactPriceBackend();assert.throws(()=>env.run('actualizarPrecioWeb("0042","30000","20000")'));assert.equal(env.writes(),0);
});
test('Web y Folleto componen los mismos atributos en el orden oficial sin separar Código',()=>{
  const context=vm.createContext({});
  vm.runInContext(toolsSource,context);
  const product={id:'0042',name:'Kit',brand:'Natura',fichaSelectionExplicit:true,
    fichaFields:[{key:'marca',label:'Marca',value:'Natura'},{key:'precio',label:'Precio',value:'25000'},
      {key:'nombre',label:'Nombre',value:'Kit'},{key:'codigo',label:'Código',value:'0042'}]};
  context.product=product;
  const list=JSON.parse(JSON.stringify(vm.runInContext('fichaOrderedFacts(product)',context)));
  assert.deepEqual(list,[{label:'Marca',value:'Natura'},{label:'Código',value:'0042'}]);
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('fichaOrderedFacts(product,false)',context))),[{label:'Marca',value:'Natura'}]);
  // No hay fila artificial para Precio ni un tratamiento diferente de Código.
  assert.ok(!list.some(f=>f.label==='Precio'));
  const webAttributes=JSON.parse(JSON.stringify(vm.runInContext('buildFichaModel({id:"0042",name:"Kit",facts:fichaOrderedFacts(product)})',context).facts));
  assert.deepEqual(webAttributes,list);
});
test('La ficha interactiva usa un único bloque de etiquetas y mantiene el precio en la fila de controles',()=>{
  const nodes={},node=tag=>({tag,children:[],hidden:false,textContent:'',classList:{add(){},toggle(){}},setAttribute(){},addEventListener(){},append(...items){for(const item of items){item.parent?.children.splice(item.parent.children.indexOf(item),1);this.children.push(item);item.parent=this;}},prepend(item){this.children.unshift(item);}});
  for(const selector of ['.name','.img','.pad','.product-details','.description','.meta','.row','.product-line'])nodes[selector]=node(selector);
  nodes['.img'].querySelector=()=>node('img');nodes['.product-details'].querySelector=()=>node('summary');
  const card=node('card');card.append(...Object.values(nodes));
  card.querySelector=selector=>{const find=parent=>parent===nodes[selector]?parent:parent.children.map(find).find(Boolean);return find(card)||null;};
  const context=vm.createContext({document:{createElement:node},fichaHeaderFields:()=>({name:'Kit',presentation:''}),
    fichaOrderedFacts:()=>[{label:'Código',value:'0042'},{label:'Marca',value:'Natura'}],
    buildFichaModel:p=>p,drawCatalogFichaImage(){},queueCatalogFichaLayout(){}});
  const start=toolsSource.indexOf('function renderCatalogFicha('),end=toolsSource.indexOf('const CATALOG_FICHA_LAYOUT_KEYS',start);
  vm.runInContext(toolsSource.slice(start,end),context);
  context.card=card;context.product={id:'0042',name:'Kit',description:'Texto completo'};
  vm.runInContext('renderCatalogFicha(card,product)',context);
  const square=card.children[0],main=square.children[0],facts=main.children[1];
  assert.equal(square.children.length,1);assert.equal(nodes['.product-details'].hidden,true);
  const attributes=facts.children[2];
  assert.equal(attributes.className,'ficha-attributes');
  assert.deepEqual(attributes.children.map(item=>item.children[0].textContent),['Código:','Marca:']);
  assert.equal(facts.children[3],nodes['.row']);
  assert.equal(nodes['.meta'].hidden,true);
});
test('El mismo motor omite completamente el bloque de precio si no existe un importe',()=>{
  const ctx={font:'400 32px Arial',measureText(t){return {width:String(t).length*parseFloat(this.font.match(/([\d.]+)px/)[1])*.52};},
    save(){},restore(){},translate(){},scale(){},beginPath(){},roundRect(){},closePath(){},fill(){},clip(){},fillRect(){},moveTo(){},lineTo(){},stroke(){this.strokes=(this.strokes||0)+1;},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},fillText(t){(this.printed||(this.printed=[])).push(t);}};
  const context=vm.createContext({ctx});vm.runInContext(toolsSource,context);
  context.p={id:'0042',name:'Colonia',presentation:'120 ml',facts:[{label:'Código',value:'0042'},{label:'Marca',value:'Avon'}],description:'Texto de prueba',priceText:'',imageUrl:''};
  const noPrice=vm.runInContext('measureFicha(ctx,buildFichaModel(p))',context);
  assert.equal(noPrice.priced,false);assert.equal(noPrice.price,null);
  context.measure=noPrice;
  vm.runInContext('renderFicha(ctx,{x:0,y:0,width:1080,height:1080,product:buildFichaModel(p),measure},null)',context);
  assert.equal(ctx.strokes,1,'Solo el separador de atributos; sin precio ni descripción inferior.');
  assert.ok(ctx.printed.includes('Sin fotografía'),'La exportación presenta la misma ausencia de foto de la web.');
  assert.ok(ctx.printed.some(v=>v.includes('Código:')));assert.ok(ctx.printed.some(v=>v.includes('Marca:')));
  context.p.priceText='15.000';
  const withPrice=vm.runInContext('measureFicha(ctx,buildFichaModel(p))',context);
  assert.equal(withPrice.priced,true);
  context.measure=withPrice;ctx.strokes=0;
  vm.runInContext('renderFicha(ctx,{x:0,y:0,width:1080,height:1080,product:buildFichaModel(p),measure},null)',context);
  assert.equal(ctx.strokes,2,'El segundo separador pertenece exclusivamente al precio visible; no hay raya de descripción.');
});
test('Orden de la ficha reconoce el nuevo encabezado y rechaza selecciones ambiguas',()=>{
  const env=environment(),headers=['Descripción integral del producto','Orden de la ficha'];
  assert.equal(assess(env,tableFromValues([headers,[compactDescription,'Marca:\nNombre:']])).report.pending,0);
  assert.throws(()=>assess(env,tableFromValues([['Descripción integral del producto','Orden de la ficha','Campos y orden de la ficha'],[compactDescription,'Nombre:','Marca:']])),/ambiguo/);
  assert.throws(()=>assess(env,tableFromValues([['Descripción integral del producto'],[compactDescription]])),/Orden de la ficha/);
});
test('La presentación seleccionada conserva contenido y componentes sin exigir un título vacío',()=>{
  const env=environment(),headers=['Descripción integral del producto','Orden de la ficha'];
  const description=compactDescription+'\nTipo de producto: Esencia capilar\nCantidad de contenido: 60\nUnidad de medida del contenido: ml\nCondición del producto: Nuevo';
  const order='Nombre:\nPresentación:\nCódigo:\nMarca:\nLínea:\nTipo:\nVariante:\nCaracterística:\nCategoría:\nSubcategoría:\nPúblico:\nPrecio:';
  const product=assess(env,tableFromValues([headers,[description,order]])).products[0];
  assert.equal(product.fichaFields.find(f=>f.key==='presentacion').value,'60 ml');
  assert.equal(product.fichaFields.find(f=>f.key==='tipo').value,'Esencia capilar');
  assert.equal(product.condition,'Nuevo');assert.equal(product.fichaFields.some(f=>f.key==='condicion'),false);
  const kit=description.replace('\nCantidad de contenido: 60','')+'\nNombre del componente 1: Champú\nCantidad de contenido del componente 1: 300\nUnidad de medida del contenido del componente 1: ml';
  assert.match(assess(env,tableFromValues([headers,[kit,order]])).products[0].fichaFields.find(f=>f.key==='presentacion').value,/Champú 300 ml/);
});
test('El administrador conserva la edición segura con Orden de la ficha y rechaza encabezados dobles',()=>{
  const env=compactPriceBackend(compactDescription,{headers:['Descripción integral del producto','Orden de la ficha']});
  assert.equal(env.run('actualizarPrecioWeb("0042","30000","25000").precioGuardado'),'30000');
  const conflict=compactPriceBackend(compactDescription,{headers:['Descripción integral del producto','Orden de la ficha','Campos y orden de la ficha']});
  assert.throws(()=>conflict.run('actualizarPrecioWeb("0042","30000","25000")'),/ambiguo/);assert.equal(conflict.writes(),0);
});
test('La consulta descubre Orden de la ficha por encabezado con columnas reordenadas',async()=>{
  const env=environment();await confirmed(env);const promise=env.run('loadGoogleSheetRows()');
  const headers=['Orden de la ficha','Descripción integral del producto'];
  env.reply(tableFromValues([headers]));await Promise.resolve();
  assert.equal(new URL(env.requests.at(-1).src).searchParams.get('tq'),'select B,A');
  env.reply(tableFromValues([headers,['Tipo:\nPresentación:',compactDescription+'\nTipo de producto: Esencia capilar\nCantidad de contenido: 60\nUnidad de medida del contenido: ml']]));
  const row=(await promise)[0];assert.deepEqual(Array.from(row.fichaFields,f=>f.key),['tipo','presentacion']);
});

test('El precio de la ficha pública depende exclusivamente de Mostrar precios, no del Folleto',async()=>{
  const env=environment();await confirmed(env);vm.runInContext(toolsSource,env.context);
  env.sandbox.products=assess(env,fixture()).products;
  env.run('allLoadedProducts=products;window.CATALOG_INITIAL_LOAD_READY=true');
  const product=env.sandbox.products[0],price=product.price;
  assert.equal(env.run('shouldShowFichaPrices()'),true);
  assert.equal(env.run('shouldShowFolletoPrices()'),false);
  // Cambiar la preferencia local del folleto no afecta a visitantes ni a administradores.
  env.run('setFolletoPriceVisibility(false)');
  assert.equal(env.run('shouldShowFichaPrices()'),true);
  env.run('setFolletoPriceVisibility(true)');
  assert.equal(env.run('shouldShowFichaPrices()'),true);
  assert.equal(env.sandbox.localStorage.getItem('natura-folleto-mostrar-precio'),'true');
  const snapshot=env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997"]})');
  assert.equal(snapshot.settings.prices,true);
  assert.equal(snapshot.products[0].priceText,new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(price));
  assert.ok(!snapshot.products[0].priceText.includes('$'));
  env.run('setFolletoPriceVisibility(false)');
  assert.equal(env.run('shouldShowFichaPrices()'),true);
  assert.equal(env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997"]}).products[0].priceText'),'');
  env.run('window.INTERRUPTORES.MOSTRAR_PRECIOS_PRODUCTO=false;setFolletoPriceVisibility(true)');
  // El visitante obedece el interruptor publicado incluso si el Folleto tiene precios.
  assert.equal(env.run('shouldShowPublicProductPrices()'),false);
  assert.equal(env.run('shouldShowFichaPrices()'),false);
  assert.equal(env.run('shouldShowFolletoPrices()'),false);
  assert.equal(env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997"],prices:true}).settings.prices'),false);
  // En administración no se ocultan importes, aun con el interruptor desactivado.
  env.run('window.CATALOG_ADMIN_MODE_ACTIVE=true');
  assert.equal(env.run('shouldShowPublicProductPrices()'),false);
  assert.equal(env.run('shouldShowFichaPrices()'),true);
  assert.equal(env.run('shouldShowFolletoPrices()'),true);
  assert.equal(env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997"],prices:true}).settings.prices'),true);
  // La elección del Folleto sigue siendo independiente: no altera la ficha administrativa.
  env.run('setFolletoPriceVisibility(false)');
  assert.equal(env.run('shouldShowFichaPrices()'),true);
  assert.equal(env.run('shouldShowFolletoPrices()'),false);
  assert.equal(env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["9997"]}).settings.prices'),false);
  env.run('window.CATALOG_ADMIN_MODE_ACTIVE=false');
  assert.equal(env.run('shouldShowFichaPrices()'),false);
  assert.equal(env.sandbox.products[0].price,price);
});
test('Ficha pública muestra el precio incluso si Orden de la ficha omite Precio',()=>{
  const env=environment(),classes=new Set(),price={textContent:'',hidden:false};
  const row={hidden:false,classList:{toggle(key,value){value?classes.add(key):classes.delete(key);}}};
  const actions={hidden:false,classList:{toggle(){}}},qty={classList:{toggle(){}}};
  let editing=null;
  const card={dataset:{id:'9997'},querySelector(selector){return ({'.row':row,'.price':price,'.actions':actions,'[data-role="qty"]':qty,'.price-admin-editor':editing})[selector]||null;}};
  env.sandbox.card=card;
  // La ficha tiene campos definidos, pero la lista de campos no contiene Precio.
  env.sandbox.product={id:'9997',price:20000,hasPrice:true,fichaSelectionExplicit:true,fichaFields:[{key:'codigo'}]};
  env.run('refreshCardUI(card,product)');
  assert.equal(row.hidden,false);
  assert.equal(price.hidden,false);
  assert.equal(price.textContent,'20.000');
  assert.equal(classes.has('ficha-price-suppressed'),false);
  // El interruptor del folleto, también en modo no administrador, no toca esa ficha.
  env.run('setFolletoPriceVisibility(false);refreshCardUI(card,product)');
  assert.equal(price.hidden,false);assert.equal(price.textContent,'20.000');
  env.run('window.CATALOG_ADMIN_MODE_ACTIVE=true;refreshCardUI(card,product)');
  assert.equal(price.hidden,false);
  // Desactivar "Mostrar precios" no oculta importes al administrador.
  env.run('window.INTERRUPTORES.MOSTRAR_PRECIOS_PRODUCTO=false;refreshCardUI(card,product)');
  assert.equal(row.hidden,false);assert.equal(price.hidden,false);
  assert.equal(price.textContent,'20.000');
  assert.equal(classes.has('ficha-price-suppressed'),false);
  // Al salir de administración se restablece la regla pública.
  env.run('window.CATALOG_ADMIN_MODE_ACTIVE=false;refreshCardUI(card,product)');
  assert.equal(row.hidden,true);assert.equal(price.hidden,true);
  assert.equal(classes.has('ficha-price-suppressed'),true);
  env.run('cart["9997"]={qty:2};refreshCardUI(card,product)');
  assert.equal(row.hidden,false);assert.equal(qty.textContent,'2 en carrito');
  env.run('window.CATALOG_ADMIN_MODE_ACTIVE=true;refreshCardUI(card,product)');
  assert.equal(row.hidden,false);assert.equal(price.hidden,false);assert.equal(price.textContent,'20.000');
  editing={input:{value:'25000',disabled:true},save:{disabled:true}};
  env.run('delete cart["9997"];refreshCardUI(card,product)');
  assert.equal(row.hidden,false);assert.equal(price.hidden,true);
  assert.equal(editing.input.value,'25000');assert.equal(editing.save.disabled,true);
  editing=null;env.run('refreshCardUI(card,product)');assert.equal(row.hidden,false);assert.equal(price.hidden,false);
  env.run('window.INTERRUPTORES.MOSTRAR_PRECIOS_PRODUCTO=true;refreshCardUI(card,product)');
  assert.equal(price.hidden,false);assert.equal(row.hidden,false);
  env.sandbox.product.hasPrice=false;
  env.run('refreshCardUI(card,product)');assert.equal(price.textContent,'Consultar precio');
});
test('El Folleto justifica líneas completas sin estirar los finales de párrafo ni agregar espacios verticales',()=>{
  const drawn=[],ctx={measureText:text=>({width:text.length*2}),fillText(text,x,y){drawn.push({text,x,y});}};
  const context=vm.createContext({ctx});vm.runInContext(toolsSource,context);
  context.text='uno dos tres cuatro cinco seis\nsiete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho';
  context.measure=vm.runInContext('({lines:folletoLines(ctx,text,80),size:10,lineHeight:12})',context);
  vm.runInContext('folletoDrawText(ctx,measure,0,0,80,false,true)',context);
  for(const end of context.measure.lines.paragraphEnds){
    const line=drawn.filter(d=>d.y===end*12);assert.equal(line.length,1);assert.equal(line[0].text,context.measure.lines[end]);
  }
  assert.equal(new Set(drawn.map(d=>d.y)).size,context.measure.lines.length);
  assert.equal(drawn.map(d=>d.text).join(' ').replace(/\s+/g,' '),context.text.replace(/\s+/g,' '));
});


test('El redondeo de un píxel en la fila de precio no reduce innecesariamente los datos',()=>{
  const e=fichaLayoutEnvironment({width:560});
  Object.defineProperty(e.facts,'scrollHeight',{get(){
    const scale=Number(e.properties.get('--ficha-fit')??1);
    return Math.max(e.main.clientHeight+1,Math.ceil(e.main.clientHeight/.95*scale));
  }});
  e.run();
  assert.ok(Number(e.properties.get('--ficha-fit'))>.94);
  assert.ok(e.facts.scrollHeight<=e.main.clientHeight+1);
});
test('El Folleto omite el pie descriptivo incluso para registros históricos',async()=>{
  const env=environment();await confirmed(env);vm.runInContext(toolsSource,env.context);
  const raw=compactDescription+'\nEspecificaciones técnicas: Datos técnicos completos.';
  const product=assess(env,tableFromValues([compactHeaders,[raw,'Nombre:\nCódigo:']])).products[0];
  assert.equal(product.description,'Suaviza el cabello.\nTexto completo de prueba.\nDatos técnicos completos.');
  env.sandbox.products=[product];env.run('allLoadedProducts=products;window.CATALOG_INITIAL_LOAD_READY=true');
  const snapshot=env.run('buildFolletoSnapshot({scope:"selected",selectedIds:["0042"]})');
  assert.equal(snapshot.products[0].description,'');
  const onlyBenefits=assess(env,tableFromValues([compactHeaders,[compactDescription.replace('\nDescripción sensorial y uso recomendado: Texto completo de prueba.',''),'']])).products[0];
  assert.equal(onlyBenefits.description,'Suaviza el cabello.');
});


test('La ficha web comparte ancho de foto, familia tipográfica y ritmo vertical con Marketplace y PDF',()=>{
  assert.match(fichaCssSource,/\.catalog-ficha-card \.ficha-main\{[^}]*grid-template-columns:calc\(var\(--ficha-layout-imageWidth,486\)/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.ficha-square\{[^}]*font-family:Calibri,Carlito,Arial,sans-serif/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.name\{[^}]*text-align:left;[^}]*hyphens:none/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.ficha-facts\{[^}]*gap:0/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.ficha-presentation\{[^}]*line-height:1\.24/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.description\{[^}]*line-height:1\.24/);
  assert.ok(toolsSource.includes('folletoDrawImage(ctx,image,FICHA_LAYOUT.padding,FICHA_LAYOUT.padding,FICHA_LAYOUT.imageWidth,measure.mainHeight,true)'));
});
test('Folleto reserva la misma columna para fotografía real y marcador sin fotografía',()=>{
  const ctx={font:'400 32px Arial',measureText(t){return {width:String(t).length*parseFloat(this.font.match(/([\d.]+)px/)[1])*.52};}};
  const context=vm.createContext({ctx});vm.runInContext(toolsSource,context);
  for(const imageUrl of ['','https://example.org/fotografia.png']){
    context.p={id:'0042',name:'Colonia',presentation:'120 ml',facts:[{label:'Característica',value:'Floral'}],description:'Beneficios',priceText:'20.000',imageUrl};
    const measure=vm.runInContext('measureFicha(ctx,buildFichaModel(p))',context);
    assert.equal(measure.textX,562);
    assert.equal(measure.textWidth,464);
  }
});

test('Deseleccionar todo quita las marcas visibles y ocultas sin modificar filtros ni carrito',()=>{
  const checkA={dataset:{folletoSelect:'0042'},checked:true};
  const checkB={dataset:{folletoSelect:'0088'},checked:false};
  const toolbar={hidden:true,disabled:true,textContent:''};
  const dialogButton={hidden:true,disabled:true};
  const count={textContent:''};
  const nodes={folletoClearSelectionBtn:toolbar,folletoDialogClearSelectionBtn:dialogButton,folletoSelectedCount:count};
  const cart=[{id:'0088',qty:1}];
  const document={
    getElementById:id=>nodes[id]||null,
    querySelectorAll:selector=>selector==='input[data-folleto-select]'?[checkA,checkB]:[]
  };
  const context=vm.createContext({document,cartItemsArray:()=>cart});
  vm.runInContext(toolsSource,context);
  vm.runInContext('FOLLETO_SELECTION.add("0042");FOLLETO_SELECTION.add("9999");syncFolletoSelectionControls()',context);
  assert.equal(toolbar.hidden,false);assert.equal(dialogButton.hidden,false);
  assert.equal(toolbar.textContent,'Deseleccionar todo (2)');
  assert.equal(count.textContent,'(2)');
  vm.runInContext('clearFolletoSelection()',context);
  assert.equal(vm.runInContext('FOLLETO_SELECTION.size',context),0);
  assert.equal(checkA.checked,false);assert.equal(checkB.checked,false);
  assert.equal(toolbar.hidden,true);assert.equal(toolbar.disabled,true);
  assert.equal(dialogButton.hidden,true);assert.equal(count.textContent,'(1)','El carrito sigue siendo la fuente alternativa existente');
  assert.equal(cart[0].qty,1,'No se cambia la cantidad del carrito');
  vm.runInContext('clearFolletoSelection()',context);
  assert.equal(cart.length,1);
  assert.ok(htmlSource.includes('id="folletoClearSelectionBtn"'));
  assert.ok(toolsSource.includes('id="folletoDialogClearSelectionBtn"'));
  assert.ok(toolsSource.includes('syncFolletoSelectionControls();if(dialog.open&&!busy)refresh()'));
});

test('Descripción justificada en ficha web y en exportaciones PNG/PDF sin estirar la última línea',()=>{
  const webDescriptionRule=fichaCssSource.split('.catalog-ficha-card .description{')[1]?.split('}')[0];
  assert.ok(webDescriptionRule,'La descripción de la ficha tiene una regla propia');
  assert.match(webDescriptionRule,/(?:^|;)text-align:justify(?:;|$)/);
  assert.match(webDescriptionRule,/(?:^|;)text-align-last:left(?:;|$)/);
  assert.match(webDescriptionRule,/white-space:pre-line/,'Mantiene los saltos de párrafo originales');
  assert.ok(toolsSource.includes('folletoDrawText(ctx,measure.description,54,descriptionY+18,972,false,true);'),
    'El mismo renderizador del Folleto justifica la descripción en PNG y PDF');
});

test('La capa exterior del diálogo Folleto no toca fichas ni el lienzo de vista previa',()=>{
  const marker="/* Folleto: renovación de los controles del diálogo; nunca altera la vista previa ni las fichas. */";
  assert.equal(fichaCssSource.split(marker).length,2);
  const layer=fichaCssSource.split(marker)[1].split('/* Fichas: opción editorial minimalista (reversible; composición cuadrada intacta). */')[0];
  assert.doesNotMatch(layer,/\.catalog-ficha-card|\.ficha-|#grid|\.folleto-preview(?:\s*[\\{>]| img)|\.folleto-body\s*\\{|\.card\s*\\{/);
  for(const line of layer.split('\n')){
    const candidate=line.trim();
    if(candidate.includes('{')&&!candidate.startsWith('/*')&&!candidate.startsWith('}')){
      assert.ok(candidate.startsWith('.folleto-dialog')||candidate.startsWith('@media'),candidate);
    }
  }
});

test('Fichas editoriales comparten tipografía y paleta en web, PNG y PDF, sin alterar medidas ni productos',()=>{
  assert.match(toolsSource,/const FICHA_EDITORIAL_FONT='Georgia,"Times New Roman",serif'/);
  assert.match(toolsSource,/const FICHA_THEME=Object.freeze\(\{paper:"#fffdf9",center:"#f9f2ed",wash:"#f5e6df",line:"#c9ada2",ink:"#382922",muted:"#66554c",blend:"multiply"\}\)/);
  assert.match(toolsSource,/const name=fit\(ficha.name,FICHA_LAYOUT.nameSize,true,FICHA_EDITORIAL_FONT\)/);
  assert.match(toolsSource,/const price=priced\?fit\(ficha.priceText,FICHA_LAYOUT.priceSize,true,FICHA_EDITORIAL_FONT\):null/);
  assert.match(toolsSource,/folletoDrawText\(ctx,measure.name,measure.textX,textY,measure.textWidth,true,false,FICHA_EDITORIAL_FONT,FICHA_THEME.ink\)/);
  assert.match(toolsSource,/folletoDrawText\(ctx,measure.price,measure.textX,priceY,measure.textWidth,true,false,FICHA_EDITORIAL_FONT,FICHA_THEME.ink\)/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.name\{font-family:Georgia,"Times New Roman",serif;font-weight:700;color:var\(--ficha-ink/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.price\{font-family:Georgia,"Times New Roman",serif;font-weight:700;color:var\(--ficha-ink/);
  assert.match(toolsSource,/const FICHA_SIZE=Object.freeze\(\{width:1080,height:1080\}\)/);
  assert.match(toolsSource,/padding:54,imageWidth:486,columnGap:22,factX:562,right:54/);
  assert.ok(fichaCssSource.includes("/* Fichas: opción editorial minimalista (reversible; composición cuadrada intacta). */"));
  const layer=fichaCssSource.split("/* Fichas: opción editorial minimalista (reversible; composición cuadrada intacta). */")[1].split("/* Carrito: presentación editorial cálida y reversible, aislada de fichas y pedidos. */")[0];
  assert.ok(layer.split('\n').filter(line=>line.includes('{')).every(line=>/^\.(?:card\.catalog-ficha-card|catalog-ficha-card )/.test(line.trim())));
});

test('El estilo editorial del carrito no altera fichas ni lógica de productos y pedidos',()=>{
  const marker="/* Carrito: presentación editorial cálida y reversible, aislada de fichas y pedidos. */";
  assert.ok(fichaCssSource.includes(marker));
  const layer=fichaCssSource.split(marker)[1].split("/* Composición exterior 2026-10-14: cinco mejoras estáticas; nunca seleccionar #grid ni fichas. */")[0];
  assert.ok(layer.includes('#cartModal .cart-item')&&layer.includes('#cartModal .cart-summary')&&layer.includes('#cartModal .cart-footer-actions>#cartBuyBtn'));
  assert.doesNotMatch(layer,/\.catalog-ficha-card|\.ficha-|#grid|\.folleto-|\.card\s*\{|\.form-modal|\.site-header|\.cart-modal[^-]/);
  for(const row of layer.split('\n')){
    const rule=row.trim();
    if(rule.includes('{')&&!rule.startsWith('/*')&&!rule.startsWith('}'))
      assert.ok(rule.startsWith('#cartModal')||rule.startsWith('@media'),rule);
  }
  for(const id of ['cartItems','shippingCop','invoicePaymentMethod','cartSubtotal','cartShippingTotal','cartTotal','cartBuyBtn','cartClearBtn']){
    assert.ok(htmlSource.includes('id="'+id+'"'));
  }
  assert.ok(htmlSource.includes('catalogo.css?actualizacion=depuracion-integral-v1'));
});


test('Los accesos administrativos apuntan a los libros de escritura reales y abren una pestaña nueva',()=>{
  const docs=environment().sandbox.CATALOG_ADMIN_DOCUMENTS;
  const dir=path.join(__dirname,'apps-script','administrar precios natura');
  const movements=fs.readFileSync(path.join(dir,'admin-movimientos.js'),'utf8').match(/const MOV_BOOK="([^"]+)"/)[1];
  const products=fs.readFileSync(path.join(dir,'Código.js'),'utf8').match(/const INVENTARIO_SPREADSHEET_ID = "([^"]+)"/)[1];
  assert.equal(new URL(docs.movimientos.url).pathname,`/spreadsheets/d/${movements}/edit`);
  assert.equal(new URL(docs.codigos_barras.url).pathname,`/spreadsheets/d/${movements}/edit`);
  assert.equal(new URL(docs.productos.url).pathname,`/spreadsheets/d/${products}/edit`);
  const cart=htmlSource.slice(htmlSource.indexOf('<section id="cartInventoryTools"'),htmlSource.indexOf('<div class="cart-modal-layout">'));
  const barcodes=htmlSource.slice(htmlSource.indexOf('<div id="barcodeBindDialog"'),htmlSource.indexOf('<div class="cart-modal"'));
  for(const [markup,key] of [[cart,'movimientos'],[cart,'productos'],[barcodes,'codigos_barras']]){
    const anchor=markup.match(new RegExp('<a[^>]+data-admin-document="'+key+'"[^>]*>'))[0];
    assert.match(anchor,/target="_blank"/);assert.match(anchor,/rel="noopener noreferrer"/);
  }
  const standalone=fs.readFileSync(path.join(dir,'Admin.html'),'utf8');
  assert.ok(standalone.includes(`href="${docs.productos.url}" target="_blank" rel="noopener noreferrer"`));
});

test('El carrito público conserva el pedido y el administrador utiliza el puente autenticado',()=>{
  assert.match(cartSource,/if\(window\.CATALOG_ADMIN_MODE_ACTIVE===true\)\{\s*await registerAdminInventoryMovement\(\);\s*return;\s*\}/);
  assert.match(cartSource,/const receipt = await registerOrderInSheet\("Pedido"\)/);
  assert.match(cartSource,/window\.CATALOG_ADMIN_REQUEST\(\{tipo:"registrar-movimiento",datos:request\}\)/);
  assert.match(adminSource,/m\.tipo==="movimiento-registrado"/);
  assert.match(htmlSource,/id="cartInventoryTools"/);
  assert.match(htmlSource,/id="cartMovementSwitch"[^>]*type="checkbox"[^>]*role="switch"/);
  assert.match(htmlSource,/id="cartBarcodeInput"/);
  assert.match(htmlSource,/id="cartCameraToggle"/);
  assert.ok(!htmlSource.includes('id="cartMovementSwitch" checked'),'El interruptor debe iniciar apagado: SALIDA');
});

test('Solo SALIDA crea un documento; la ENTRADA únicamente registra el movimiento',()=>{
  assert.match(cartSource,/if\(tipo==="SALIDA"\)\{\s*try\{invoice=await invoiceBuildPng\(\)/);
  assert.match(cartSource,/if\(tipo==="SALIDA"\)\{\s*try\{invoiceDownloadPng\(invoice\.blob\)/);
  assert.match(cartSource,/if\(inventorySwitchEl\)inventorySwitchEl\.checked=false/);
  assert.match(appSource,/entryMode\?"Registrar ENTRADA":"Registrar SALIDA y generar documento"/);
  assert.match(appSource,/cartInvoiceBtn\.hidden=!adminCart\|\|entryMode/);
});

test('Servidor valida códigos, cantidades y precios de movimientos sin crear ventas públicas',()=>{
  const movementSource=fs.readFileSync(path.join(__dirname,'apps-script','administrar precios natura','admin-movimientos.js'),'utf8');
  const ctx=vm.createContext({});
  vm.runInContext(movementSource,ctx);
  assert.equal(vm.runInContext('movCode("583")',ctx),'0583');
  assert.equal(vm.runInContext('movQty("3")',ctx),3);
  assert.equal(vm.runInContext('movPrice("40.000")',ctx),40000);
  assert.equal(vm.runInContext('movPrice("19.450,5")',ctx),19450.5);
  assert.equal(vm.runInContext('movPrice("")',ctx),null);
  assert.throws(()=>vm.runInContext('movCode("ABC")',ctx),/inválido/);
  assert.throws(()=>vm.runInContext('movQty(0)',ctx),/inválida/);
  assert.match(movementSource,/tipo!=="ENTRADA"&&tipo!=="SALIDA"|!\["ENTRADA","SALIDA"\]\.includes\(tipo\)/);
  assert.match(movementSource,/tipo==="SALIDA"\?p\.price:null/);
  assert.match(movementSource,/i===0\?payment:"",""/);
  assert.match(movementSource,/MOV-\s*"\+key/);
});


test('Botón cuadrado de vincular barras junto al código, solo en administración',()=>{
  assert.match(appSource,/function addBarcodeBindingControl\(card,p\)/);
  assert.match(appSource,/codeRow\.appendChild\(control\)/);
  assert.match(appSource,/button\.dataset\.vincularBarras=code/);
  assert.match(appSource,/barcodeLink\.hidden=window\.CATALOG_ADMIN_MODE_ACTIVE!==true/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.catalog-barcode-bind\{[^}]*aspect-ratio:1/);
  assert.match(fichaCssSource,/\.catalog-ficha-card \.catalog-barcode-bind svg\{/);
  for(const id of ['barcodeBindDialog','barcodeBindVideo','barcodeBindInput','barcodeBindList'])assert.ok(htmlSource.includes('id="'+id+'"'));
});
test('Lector y cámara asocian al producto elegido sin registrar inventario',()=>{
  const start=cartSource.indexOf('/* Asociación individual desde las fichas;');
  const end=cartSource.indexOf('let orderSending = false;',start);
  assert.ok(start>0&&end>start);
  const src=cartSource.slice(start,end);
  for(const kind of ['listar-codigos-barras','buscar-codigo-barras','vincular-codigo-barras'])assert.ok(src.includes('tipo:"'+kind+'"'));
  assert.match(src,/new window\.BarcodeDetector\(\{formats\}\)/);
  assert.match(src,/bindInput\?\.addEventListener\("keydown"/);
  assert.match(src,/existing\.codigoInterno!==code/);
  assert.doesNotMatch(src,/registerAdminInventoryMovement|registerOrderInSheet|saveCart\(/);
});
test('Servidor admite varios EAN por producto e impide reasignar los existentes',()=>{
  const backend=fs.readFileSync(path.join(__dirname,'apps-script','administrar precios natura','admin-movimientos.js'),'utf8');
  const bridge=fs.readFileSync(path.join(__dirname,'apps-script','administrar precios natura','Puente.html'),'utf8');
  assert.match(backend,/function listarCodigosBarrasWeb\(internal\)/);
  assert.match(backend,/codes\.push\(barcode\)/);
  assert.match(backend,/if\(movCode\(old\[1\]\)!==code\)throw new Error\("Código vinculado a otro producto"\)/);
  assert.match(backend,/sheet\.setFrozenColumns\(0\)/);
  assert.match(bridge,/mensaje\.tipo === "listar-codigos-barras"/);
  assert.match(adminSource,/m\.tipo==="codigos-barras-listados"/);
  const ctx=vm.createContext({});
  vm.runInContext(backend,ctx);
  assert.equal(vm.runInContext('movBarcodeCode("7701234567890")',ctx),'7701234567890');
  assert.throws(()=>vm.runInContext('movBarcodeCode("1234")',ctx),/inválido/);
});


test('Interruptor de imágenes impide consultar el índice y conserva los datos del inventario',async()=>{
  const env=environment();
  env.run('window.INTERRUPTORES.CARGAR_IMAGENES_CATALOGO=false');
  assert.equal(env.run('shouldShowProductImages()'),false);
  const n=env.requests.length;
  const result=await env.run('loadAppsScriptImageIndex()');
  assert.equal(result.ok,true);
  assert.equal(Object.keys(result.products).length,0);
  assert.equal(env.requests.length,n,'No se debe consultar el servicio de imágenes');
  env.run('loadGoogleSheetRows=async()=>[{code:"0583",name:"Producto Natura"}]');
  const data=await env.run('loadGoogleSheetCatalog({refreshImages:true})');
  assert.equal(data.sheetEntries.length,1);
  assert.equal(data.sheetEntries[0].row.code,'0583');
  assert.equal(data.sheetEntries[0].imageIndex.size,0);
  assert.equal(env.requests.length,n,'Los datos no deben causar descargas de imágenes');
  assert.match(env.run('makeNoPhotoPlaceholder().innerHTML'),/Carga desactivada/);
  assert.equal(env.run('makeAlbumPreview(["https://ejemplo.invalid/foto.png"],"Natura").tagName'),'DIV');
});

function imageConfigurationServer(publicEnabled,existing={}){
  const props={
    CATALOGO_CONFIG_MIGRADA_V1:'ok',
    CATALOGO_CONFIG_CARGAR_IMAGENES_CATALOGO:publicEnabled?'ACTIVADO':'DESACTIVADO',
    CATALOGO_CONFIG_PUBLIC_SNAPSHOT_V1:JSON.stringify(['DESACTIVADO','DESACTIVADO','ACTIVADO',publicEnabled?'ACTIVADO':'DESACTIVADO','section,category,subcategory,public,line,product','price_asc']),
    CATALOGO_CONFIG_PUBLIC_REVISION_V1:'2026-10-11T06:00:00.000Z',
    ...existing
  };
  let locked=false;
  const context=vm.createContext({
    console:{log(){}},
    PropertiesService:{getScriptProperties:()=>({
      getProperty:key=>props[key]??null,getProperties:()=>({...props}),
      setProperty(key,value){assert.equal(locked,true);props[key]=value;},
      setProperties(values){assert.equal(locked,true);Object.assign(props,values);}
    })},
    LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true;},releaseLock(){locked=false;}})},
    SpreadsheetApp:{openById:()=>({getSheetByName:name=>{assert.equal(name,'Configuracion');return null;}})}
  });
  const root=path.join(__dirname,'apps-script','administrar precios natura');
  for(const file of fs.readdirSync(root).filter(name=>name.endsWith('.js')).sort()){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  }
  return {props,run:code=>vm.runInContext(code,context)};
}

test('Separar imágenes conserva una sola vez el estado anterior y no vuelve a vincular las vistas',()=>{
  for(const enabled of [false,true]){
    const server=imageConfigurationServer(enabled);
    const initial=server.run('obtenerConfiguracionWeb()');
    assert.equal(initial.valores.CARGAR_IMAGENES_ADMIN,enabled?'ACTIVADO':'DESACTIVADO');
    server.run(`actualizarConfiguracionWeb("CARGAR_IMAGENES_CATALOGO",${!enabled})`);
    const again=server.run('obtenerConfiguracionWeb()');
    assert.equal(again.valores.CARGAR_IMAGENES_CATALOGO,!enabled?'ACTIVADO':'DESACTIVADO');
    assert.equal(again.valores.CARGAR_IMAGENES_ADMIN,initial.valores.CARGAR_IMAGENES_ADMIN);
    const restored=imageConfigurationServer(!enabled,server.props).run('obtenerConfiguracionWeb()');
    assert.equal(restored.valores.CARGAR_IMAGENES_ADMIN,initial.valores.CARGAR_IMAGENES_ADMIN);
  }
});

test('Los cuatro estados de imágenes se guardan independientemente y la preferencia administrativa es privada',()=>{
  for(const publicEnabled of [false,true])for(const adminEnabled of [false,true]){
    const server=imageConfigurationServer(publicEnabled);
    server.run('obtenerConfiguracionWeb()');
    const snapshot=server.props.CATALOGO_CONFIG_PUBLIC_SNAPSHOT_V1;
    const revision=server.props.CATALOGO_CONFIG_PUBLIC_REVISION_V1;
    const saved=server.run(`actualizarConfiguracionWeb("CARGAR_IMAGENES_ADMIN",${adminEnabled})`);
    assert.equal(saved.valores.CARGAR_IMAGENES_ADMIN,adminEnabled?'ACTIVADO':'DESACTIVADO');
    assert.equal(saved.valores.CARGAR_IMAGENES_CATALOGO,publicEnabled?'ACTIVADO':'DESACTIVADO');
    assert.equal(server.props.CATALOGO_CONFIG_PUBLIC_SNAPSHOT_V1,snapshot);
    assert.equal(server.props.CATALOGO_CONFIG_PUBLIC_REVISION_V1,revision);
    const publicConfig=server.run('obtenerConfiguracionPublicaWeb()');
    assert.equal(Object.hasOwn(publicConfig.valores,'CARGAR_IMAGENES_ADMIN'),false);
    assert.equal(Object.keys(publicConfig.valores).length,7);
    assert.throws(()=>server.run('actualizarConfiguracionWeb("CARGAR_IMAGENES_ADMIN","invalido")'),/estado.*no es válido/);
    assert.equal(server.run('obtenerConfiguracionWeb().valores.CARGAR_IMAGENES_ADMIN'),saved.valores.CARGAR_IMAGENES_ADMIN);
  }
});

test('Público y administradores muestran fotos y Folleto según su propio control en las cuatro combinaciones',async()=>{
  for(const publicEnabled of [false,true])for(const adminEnabled of [false,true]){
    const env=environment();await confirmed(env);
    vm.runInContext(toolsSource,env.context);
    env.run(`INTERRUPTORES.CARGAR_IMAGENES_CATALOGO=${publicEnabled};window.applyCatalogAdminImageLoading("${adminEnabled?'ACTIVADO':'DESACTIVADO'}")`);
    assert.equal(env.run('shouldShowProductImages()'),publicEnabled);
    env.run('window.CATALOG_INITIAL_LOAD_READY=true');
    // Sin productos no hay recarga de datos al cambiar de modo en esta prueba.
    const check=enabled=>{
      assert.equal(env.run('shouldShowProductImages()'),enabled);
      assert.equal(env.run('makeImgFromFilename("foto.png","Producto","https://ejemplo.invalid/foto.png").tagName'),enabled?'IMG':'DIV');
      assert.equal(env.run('makeCartThumbFromFilename("foto.png","Producto","https://ejemplo.invalid/foto.png").tagName'),enabled?'IMG':'DIV');
      assert.equal(env.run('buildFolletoSnapshot({images:true}).settings.images'),enabled);
    };
    check(publicEnabled);
    env.run('window.CATALOG_ADMIN_MODE_ACTIVE=true;window.dispatchEvent(new CustomEvent("irenismb:admin-mode-change",{detail:{active:true}}))');
    check(adminEnabled);
    if(!adminEnabled)assert.equal((await env.run('loadAppsScriptImageIndex()')).ok,true);
    env.run('window.CATALOG_ADMIN_MODE_ACTIVE=false;window.dispatchEvent(new CustomEvent("irenismb:admin-mode-change",{detail:{active:false}}))');
    check(publicEnabled);
    assert.equal(env.run('window.applyCatalogAdminImageLoading("invalido")'),false);
  }
});

test('Cambios de vista y de preferencias notifican imágenes únicamente cuando cambia su estado efectivo',()=>{
  const env=environment(),changes=[];
  env.sandbox.addEventListener('natura:image-visibility-changed',event=>changes.push(event.detail.enabled));
  env.run('applyRemoteControlValues({CARGAR_IMAGENES_CATALOGO:"DESACTIVADO"});syncCatalogImageLoading()');
  env.run('window.applyCatalogAdminImageLoading("ACTIVADO")');
  assert.deepEqual(changes,[false]);
  env.run('window.CATALOG_ADMIN_MODE_ACTIVE=true;window.dispatchEvent(new CustomEvent("irenismb:admin-mode-change",{detail:{active:true}}))');
  assert.deepEqual(changes,[false,true]);
  env.run('applyRemoteControlValues({CARGAR_IMAGENES_CATALOGO:"ACTIVADO"});syncCatalogImageLoading()');
  assert.deepEqual(changes,[false,true]);
  env.run('window.applyCatalogAdminImageLoading("DESACTIVADO")');
  assert.deepEqual(changes,[false,true,false]);
  env.run('window.CATALOG_ADMIN_MODE_ACTIVE=false;window.dispatchEvent(new CustomEvent("irenismb:admin-mode-change",{detail:{active:false}}))');
  assert.deepEqual(changes,[false,true,false,true]);
});

test('El administrador arranca y lee configuración aunque Apps Script cargue configuración antes de Código.js',()=>{
  const root=path.join(__dirname,'apps-script','administrar precios natura');
  const files=fs.readdirSync(root).filter(name=>name.endsWith('.js')).sort();
  const revision='2026-10-11T06:00:00.000Z';
  for(const first of ['admin-configuracion.js','Código.js']){
    const props={
      CATALOGO_CONFIG_MIGRADA_V1:'ok',
      CATALOGO_CONFIG_PUBLIC_SNAPSHOT_V1:JSON.stringify(['DESACTIVADO','DESACTIVADO','ACTIVADO','ACTIVADO','section,category,subcategory,public,line,product','price_asc','30']),
      CATALOGO_CONFIG_PUBLIC_REVISION_V1:revision
    };
    const served=[];
    let released=0;
    const context=vm.createContext({
      PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],getProperties:()=>({...props}),setProperties:()=>assert.fail('La configuración vigente no debe reescribirse')})},
      LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>released++})},
      HtmlService:{XFrameOptionsMode:{ALLOWALL:'allowall'},createHtmlOutputFromFile(name){
        assert.ok(fs.existsSync(path.join(root,name+'.html')));
        const output={name,setTitle(){return this;},setXFrameOptionsMode(mode){this.frameMode=mode;return this;}};
        served.push(output);return output;
      }}
    });
    for(const file of [first,...files.filter(name=>name!==first)]){
      vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
    }
    assert.equal(vm.runInContext('doGet({parameter:{}}).name',context),'Admin');
    assert.equal(vm.runInContext('doGet({parameter:{modo:"puente"}}).name',context),'Puente');
    assert.equal(served[1].frameMode,'allowall');
    const config=vm.runInContext('obtenerConfiguracionWeb()',context);
    assert.equal(config.ok,true);
    assert.equal(config.valores.ORDEN_NAVEGACION,'section,category,subcategory,public,line,product');
    assert.equal(config.valores.CARGAR_IMAGENES_CATALOGO,'ACTIVADO');
    assert.equal(config.publicadoEn,revision);
    assert.equal(released,1);
  }
});

test('El ajuste compartido se valida, se expone en administración y conserva migración histórica',()=>{
  assert.match(appSource,/CARGAR_IMAGENES_CATALOGO: "ACTIVADO"/);
  assert.match(adminSource,/key:"CARGAR_IMAGENES_CATALOGO",scope:"public",label:"Cargar imágenes para el público"/);
  assert.match(adminSource,/key:"CARGAR_IMAGENES_ADMIN",scope:"admin",label:"Cargar imágenes para administradores"/);
  const server=fs.readFileSync(path.join(__dirname,'apps-script','administrar precios natura','Código.js'),'utf8');
  const config=fs.readFileSync(path.join(__dirname,'apps-script','administrar precios natura','admin-configuracion.js'),'utf8');
  assert.match(server,/CARGAR_IMAGENES_CATALOGO: "ACTIVADO"/);
  assert.match(server,/"CARGAR_IMAGENES_CATALOGO"/);
  assert.match(config,/CONFIG_MIGRATION_PUBLIC_KEYS/);
  assert.match(config,/values\[k\] \|\| CONFIG_DEFAULTS\[k\]/);
  assert.match(appSource,/natura:image-visibility-changed/);
});

test('Anuncios y miniaturas respetan la configuración sin descargar archivos al estar apagada',()=>{
  const html=htmlSource.slice(htmlSource.indexOf('const cacheKey = "irenismb_ads_last_valid_v1"'));
  assert.match(html,/const imagesAllowed = \(\) => window\.CATALOG_PUBLIC_CONFIG_CONFIRMED === true/);
  assert.match(html,/if \(!imagesAllowed\(\)\) \{ render\(null\); return; \}/);
  assert.match(html,/window\.REMOTE_CONFIG_READY\?\.then/);
  assert.match(html,/window\.addEventListener\("natura:image-visibility-changed"/);
  assert.match(appSource,/if\(!shouldShowProductImages\(\) \|\| !preferredUrl\) return makeNoPhotoPlaceholder/);
  assert.match(appSource,/if\(!shouldShowProductImages\(\)\) return makeNoPhotoPlaceholder\("album"\)/);
});

test('catálogo acepta cinco controles legacy y conserva fotografías activadas',async()=>{
  const env=environment();
  const old={
    REGISTRAR_VISITAS_PROPIAS:'DESACTIVADO',
    MOSTRAR_CANTIDAD_STOCK:'DESACTIVADO',
    MOSTRAR_PRECIOS_PRODUCTO:'ACTIVADO',
    ORDEN_NAVEGACION:'section,category,subcategory,public,line,product',
    ORDEN_PRODUCTOS:'price_asc'
  };
  env.sandbox.legacyConfig=old;
  const normalized=env.run('normalizePublicConfiguration(legacyConfig)');
  assert.equal(normalized.CARGAR_IMAGENES_CATALOGO,'ACTIVADO');
  assert.equal(env.run('acceptCatalogPublicConfiguration(legacyConfig,{revision:"2026-10-12T10:00:00.000Z",rebuild:false})'),true);
  assert.equal(env.run('window.CATALOG_PUBLIC_CONFIG_CONFIRMED'),true);
  assert.equal(env.run('shouldShowProductImages()'),true);
  const pending=env.run('loadRemoteCatalogConfiguration("__legacyReader")');
  env.reply({ok:true,valores:old,publicadoEn:'2026-10-12T11:00:00.000Z'});
  const remote=await pending;
  assert.equal(remote.valores.CARGAR_IMAGENES_CATALOGO,'ACTIVADO');
});

test('configuración nueva permite apagar fotografías sin bloquear los productos',()=>{
  const env=environment();
  const values={
    REGISTRAR_VISITAS_PROPIAS:'DESACTIVADO',
    MOSTRAR_CANTIDAD_STOCK:'DESACTIVADO',
    MOSTRAR_PRECIOS_PRODUCTO:'ACTIVADO',
    CARGAR_IMAGENES_CATALOGO:'DESACTIVADO',
    ORDEN_NAVEGACION:'section,category,subcategory,public,line,product',
    ORDEN_PRODUCTOS:'price_asc'
  };
  env.sandbox.newConfig=values;
  assert.equal(env.run('acceptCatalogPublicConfiguration(newConfig,{revision:"2026-10-12T10:00:00.000Z",rebuild:false})'),true);
  assert.equal(env.run('window.CATALOG_PUBLIC_CONFIG_CONFIRMED'),true);
  assert.equal(env.run('shouldShowProductImages()'),false);
});

// Ejecuta el registro real del frontend con servicios y almacenamiento aislados.
function inventorySubmissionEnvironment(){
  const start=cartSource.indexOf('    function fingerprintInventory(request){');
  const end=cartSource.indexOf('    /* Lector USB',start);
  let finishInvoice,finishRequest;
  const storage=new Map(),sent=[],alerts=[];
  const ctx={inventorySubmitting:false,lastRegisteredFingerprint:'',
    cart:{'0042':{id:'0042',qty:2}},inventorySwitchEl:{checked:false},cartBuyBtn:{},
    window:{CATALOG_ADMIN_REQUEST:async data=>{sent.push(clone(data));return new Promise(resolve=>finishRequest=resolve)}},
    inventoryAllowed:()=>ctx.allowed,allowed:true,cartItemsArray:()=>Object.values(ctx.cart),
    inventoryIsEntry:()=>ctx.inventorySwitchEl.checked,
    invoiceBuildPng:()=>new Promise(resolve=>finishInvoice=()=>resolve({blob:'aislado'})),
    getClientDataCurrent:()=>({name:'Prueba aislada'}),getAddressDataCurrent:()=>({}),
    getShippingCop:()=>0,invoicePaymentMethod:()=>ctx.payment,payment:'Efectivo',
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789012'},
    confirm:()=>ctx.confirmed,confirmed:true,alert:message=>alerts.push(message),
    cartTotalQty:()=>Object.values(ctx.cart).reduce((n,it)=>n+it.qty,0),
    invoiceDownloadPng(){ctx.downloads++},downloads:0,saveCart(){},inventoryStatus(){},renderCartModal(){ctx.renders++},renders:0};
  vm.createContext(ctx);vm.runInContext(cartSource.slice(start,end),ctx);
  return {ctx,sent,alerts,storage,submit:()=>ctx.registerAdminInventoryMovement(),
    invoice:()=>finishInvoice(),reply:()=>finishRequest({ok:true,filas:1,numeroMovimiento:'aislado'})};
}
test('Una segunda pulsación durante el PNG no envía otro movimiento y libera el bloqueo al terminar',async()=>{
  const env=inventorySubmissionEnvironment(),first=env.submit();
  assert.equal(env.ctx.inventorySubmitting,true);assert.equal(env.ctx.cartBuyBtn.disabled,true);
  await env.submit();assert.equal(env.sent.length,0);
  env.invoice();await new Promise(resolve=>setImmediate(resolve));assert.equal(env.sent.length,1);
  env.reply();await first;
  assert.equal(env.sent[0].datos.tipo,'SALIDA');assert.equal(env.ctx.downloads,1);
  assert.equal(env.ctx.inventorySubmitting,false);assert.equal(env.ctx.window.NATURA_INVENTORY_SUBMITTING,false);
  assert.equal(env.storage.size,0);assert.deepEqual(Object.keys(env.ctx.cart),[]);
});
test('Cambiar cantidades, pago, tipo o sesión mientras se prepara el PNG impide registrar',async()=>{
  for(const change of [ctx=>ctx.cart['0042'].qty++,ctx=>ctx.payment='Nequi',ctx=>ctx.inventorySwitchEl.checked=true,ctx=>ctx.allowed=false]){
    const env=inventorySubmissionEnvironment(),task=env.submit();change(env.ctx);env.invoice();await task;
    assert.equal(env.sent.length,0);assert.equal(env.storage.size,0);assert.equal(env.ctx.downloads,0);
    assert.equal(env.ctx.inventorySubmitting,false);assert.ok(env.alerts.length);
  }
});
test('Cancelar una salida libera el bloqueo y la entrada registra sin generar PNG',async()=>{
  const env=inventorySubmissionEnvironment();env.ctx.confirmed=false;
  const canceled=env.submit();env.invoice();await canceled;
  assert.equal(env.sent.length,0);assert.equal(env.ctx.inventorySubmitting,false);
  env.ctx.confirmed=true;env.ctx.inventorySwitchEl.checked=true;
  const entry=env.submit();assert.equal(env.sent.length,1);env.reply();await entry;
  assert.equal(env.sent[0].datos.tipo,'ENTRADA');assert.equal(env.ctx.downloads,0);
  assert.equal(env.ctx.inventorySwitchEl.checked,false);
});
test('Un fallo de transporte conserva el identificador para reintentar el mismo movimiento',async()=>{
  const env=inventorySubmissionEnvironment();env.ctx.inventorySwitchEl.checked=true;
  env.ctx.window.CATALOG_ADMIN_REQUEST=async data=>{env.sent.push(clone(data));throw new Error('Sin confirmación')};
  await env.submit();assert.equal(env.storage.size,1);assert.equal(env.ctx.inventorySubmitting,false);
  await env.submit();assert.equal(env.sent.length,2);
  assert.equal(env.sent[0].datos.client_request_id,env.sent[1].datos.client_request_id);
});


test('El precio anterior decimal se compara exactamente y permite cambiarlo a entero sin conflicto falso',()=>{
  const original=compactDescription.replace('25.000','194.974,5'),env=compactPriceBackend(original);
  assert.throws(()=>env.run('actualizarPrecioWeb("0042","200000",194975)'),/precio cambió/);
  assert.equal(env.writes(),0);
  assert.equal(env.run('actualizarPrecioWeb("0042","200000",194974.5).precioGuardado'),'200000');
  assert.equal(env.content(),original.replace('194.974,5','200000'));
  assert.equal(env.writes(),1);
});


test('Una modificación durante la respuesta de Google no se pierde al confirmar el movimiento anterior',async()=>{
  const env=inventorySubmissionEnvironment();env.ctx.inventorySwitchEl.checked=true;
  const task=env.submit();assert.equal(env.sent.length,1);
  env.ctx.cart['0042'].qty=3;env.reply();await task;
  assert.equal(env.ctx.cart['0042'].qty,3);assert.equal(env.storage.size,0);
  assert.ok(env.alerts.some(message=>message.includes('El carrito cambió durante el envío y se conservó')));
  assert.equal(env.ctx.inventorySubmitting,false);
});


test('El administrador directo conserva decimales del precio anterior escrito con formato colombiano',()=>{
  const original=compactDescription.replace('25.000','194.974,5'),env=compactPriceBackend(original);
  assert.equal(env.run('actualizarPrecioWeb("0042","200000","194.974,5").precioGuardado'),'200000');
  assert.equal(env.writes(),1);
});

test('Cinco mejoras exteriores sin selectores que afecten fichas ni folleto',()=>{
  const marker="/* Composición exterior 2026-10-14: cinco mejoras estáticas; nunca seleccionar #grid ni fichas. */";
  assert.equal(fichaCssSource.split(marker).length,2);
  const layer=marker+fichaCssSource.split(marker)[1];
  assert.doesNotMatch(layer,/\.catalog-ficha-card|\.ficha-|\.folleto-dialog|#grid:|\.product-details|\.product-selection|\.ficha-square/);
  const selectors=layer.split('\n').filter(line=>line.includes('{')&&!line.trim().startsWith('/*')&&!line.trim().startsWith('@media'));
  assert.ok(selectors.length>=12);
  for(const line of selectors)assert.match(line,/^\s*\.(?:site-header|catalog-contact|social-contact-region|site-footer)\b/);
  assert.match(layer,/\.social-contact-region>\.social-contact-card \.social-icons\{grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/);
  assert.match(layer,/\.site-footer \.footer-products-card \.footer-product-benefits\{display:grid;grid-column:1\/-1;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  for(const id of ['folletoBtn','grid','socialSectionHeading','footerVisitTitle','footerProductsTitle'])assert.ok(htmlSource.includes('id="'+id+'"'));
  assert.ok(htmlSource.includes('catalogo.css?actualizacion=depuracion-integral-v1'));
});

