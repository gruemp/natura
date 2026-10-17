const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const visitorDir = path.join(__dirname, 'apps-script/coordenadas de visitantes natura');
const browserSource = fs.readFileSync(path.join(__dirname, 'analytics-visitas.js'), 'utf8');
const ownIds = [
  '461e0283-5358-4400-a31e-d8d74866d660',
  '7aa54b29-d9db-4d17-a8dd-56bdc11c1f74',
  '747d377e-20e4-423e-bed1-463b3154eb72',
  'bdfc4faf-9f3b-4b27-867d-538ab2392c60',
  'a2542505-3211-4970-885b-30dbeb5e43ee',
  '481dd00a-2810-4e7f-b371-d303a4a468a5',
  'dfd7a7e8-cf33-43d6-9ae3-a99309fe9508'
];
const otherId = 'navegador-de-prueba-12345';
const silentConsole = {info(){}, error(){}, log(){}};
const publicConfig = value => ({ok:true, valores:{REGISTRAR_VISITAS_PROPIAS:value}, publicadoEn:'2026-10-17T00:00:00.000Z'});

// Ejecuta el POST completo y el emisor real con hojas, propiedades y HTTP simulados.
// Ninguna prueba puede abrir conexiones ni leer credenciales reales.
function server(options = {}) {
  const writes = [], telegram = [], configReads = [], legacyReads = [];
  const aliases = options.aliases || [];
  let headers;
  const visits = {
    getLastColumn:()=>headers.length, getLastRow:()=>1,
    getRange(row) { return {
      getDisplayValues:()=>[headers],
      setValues(values) { assert.equal(row, 2); writes.push(...values); }
    }; }
  };
  const names = {
    getLastRow:()=>aliases.length + 1,
    getRange(row, column) { return {
      createTextFinder(id) { return {
        matchEntireCell(){return this;},
        findNext() {
          const index = aliases.findIndex(a=>a[0].toLowerCase() === id.toLowerCase());
          return index < 0 ? null : {getRow:()=>index + 2};
        }
      }; },
      getDisplayValue() { assert.equal(column, 2); return aliases[row - 2][1]; }
    }; }
  };
  const context = {
    console:silentConsole,
    SpreadsheetApp:{openById(id) { return {
      getSheets:()=>[visits],
      getSheetByName(name) {
        if (name === 'id_navegador') {
          if (options.aliasFailure) throw new Error('Hoja inaccesible');
          return options.aliasMissing ? null : names;
        }
        legacyReads.push(id);
        return options.legacyState ? {
          getLastRow:()=>1, getLastColumn:()=>5,
          getRange:()=>({getDisplayValues:()=>[['',options.legacyState,'','','REGISTRAR_VISITAS_PROPIAS']]})
        } : null;
      }
    }; }},
    ContentService:{MimeType:{JSON:'json'}, createTextOutput(text){return {text,setMimeType(){return this;}};}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    CacheService:{getScriptCache:()=>({get:()=>null,put(){}})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
      computeDigest:(_,value)=>crypto.createHash('sha256').update(value).digest(),
      base64EncodeWebSafe:value=>Buffer.from(value).toString('base64url'),
      formatDate:(_,__,format)=>format === 'HH:mm:ss' ? '12:00:00' : '2026-10-17'},
    PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'simulado'})},
    UrlFetchApp:{fetch(url, request) {
      if (url.startsWith('https://api.telegram.org/')) {
        assert.equal(request.method, 'post'); telegram.push(JSON.parse(request.payload));
        return {getResponseCode:()=>200,getContentText:()=>'{"ok":true}'};
      }
      assert.match(url, /^https:\/\/script\.google\.com\/macros\/s\/AKfycbzVQGki8PkioPQL1bbsm3_z-yVBuG02PZ0kNkiQXbtP8Dp2wamppiXQgmBLEEAEVFde4A\/exec\?modo=config$/);
      assert.equal(request.method, 'get'); configReads.push(request);
      if (options.configFailure) throw new Error('Control inaccesible');
      return {getResponseCode:()=>options.httpStatus || 200,
        getContentText:()=>options.rawConfig ?? JSON.stringify(options.config || publicConfig('DESACTIVADO'))};
    }}
  };
  vm.createContext(context);
  for (const file of ['Código.js','visitantes-identidad.js','visitantes-validacion.js','visitantes-control.js','visitantes-servicios.js']) {
    vm.runInContext(fs.readFileSync(path.join(visitorDir,file),'utf8'), context, {filename:file});
  }
  headers = vm.runInContext('Array.from(REQUIRED_HEADERS)', context);
  return {writes,telegram,configReads,legacyReads,
    post(id) {
      return JSON.parse(context.doPost({parameter:{user_id:id,load_id:'visita-simulada-12345',fuente:'SIN_UBICACION'}}).text);
    }};
}

function browser(options = {}) {
  const requests = [], scripts = [], timers = new Map();
  let timerId = 0;
  const context = {
    console:silentConsole, URL, URLSearchParams, AbortController, navigator:{},
    setTimeout(fn, delay){timers.set(++timerId, {fn,delay});return timerId;},
    clearTimeout(id){timers.delete(id);},
    localStorage:{getItem:()=>options.id || otherId,setItem(){}},
    REMOTE_CONFIG_READY:Promise.resolve(),
    CATALOG_PUBLIC_CONFIG_CONFIRMED:options.confirmed !== false,
    REMOTE_CONTROL_VALUES:{REGISTRAR_VISITAS_PROPIAS:options.state || 'DESACTIVADO'},
    document:{createElement:()=>({remove(){}}),head:{appendChild(script) {
      scripts.push(script);
      const url = new URL(script.src);
      assert.equal(url.hostname, 'docs.google.com');
      assert.equal(url.searchParams.get('sheet'), 'id_navegador');
      if (options.aliasTimeout) return;
      queueMicrotask(()=>{
        if (options.aliasFailure) return script.onerror();
        const name = url.searchParams.get('tqx').split('responseHandler:')[1];
        context[name]({status:'ok',table:{rows:(options.aliases || []).map(([id,name])=>({c:[{v:id},{v:name}]}))}});
      });
    }}},
    async fetch(url, request) {
      requests.push({url,request});
      if (request.method === 'POST') {
        options.onPost?.(new URLSearchParams(request.body));
        return {ok:true};
      }
      assert.equal(url, 'https://ipapi.co/json/');
      options.onLocation?.(context);
      return {ok:true,json:async()=>({city:'Ciudad simulada',country:'País simulado',ip:'192.0.2.1'})};
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(browserSource, context, {filename:'analytics-visitas.js'});
  return {context,requests,scripts,timers,
    posts:()=>requests.filter(r=>r.request.method === 'POST'),
    async settle(){for(let i=0;i<5;i++) await new Promise(setImmediate);}};
}

test('Los siete IDs se omiten en el servidor sin depender de alias ni del espejo antiguo',()=>{
  for (const id of ownIds) {
    for (const options of [{}, {aliasMissing:true}, {aliasFailure:true}]) {
      const env = server({...options, legacyState:'ACTIVADO'});
      assert.equal(env.post(id).status, 'skipped', id);
      assert.equal(env.writes.length, 0); assert.equal(env.telegram.length, 0);
      assert.equal(env.configReads.length, 1); assert.equal(env.legacyReads.length, 0);
    }
  }
});
test('Alias propios añadidos a la hoja también se omiten; otros alias se registran',()=>{
  for (const name of ['MARTIN','  Martín  ','IRENIS','irenis']) {
    const env=server({aliases:[[otherId,name]]});
    assert.equal(env.post(otherId).status,'skipped');assert.equal(env.telegram.length,0);
  }
  const env=server({aliases:[[otherId,'Visitante de prueba']],configFailure:true});
  assert.equal(env.post(otherId).status,'registered');assert.equal(env.writes.length,1);assert.equal(env.telegram.length,1);
  assert.equal(env.configReads.length,0);
});
test('Errores o configuración no confirmada nunca habilitan avisos propios',()=>{
  for (const options of [
    {configFailure:true},{httpStatus:503},{rawConfig:'<html>Sin conexión</html>'},{rawConfig:'null'},
    {config:{ok:false}},{config:{ok:true,valores:{}}},
    {config:{...publicConfig('ACTIVADO'),publicadoEn:'inválido'}},
    {config:publicConfig('true')},{config:publicConfig('DESACTIVADO')}
  ]) {
    const env=server(options);
    assert.equal(env.post(ownIds[0]).status,'skipped');
    assert.equal(env.writes.length,0);assert.equal(env.telegram.length,0);
  }
});
test('Solo activar explícitamente el control vigente permite registrar visitas propias',()=>{
  const env=server({config:publicConfig('ACTIVADO'),legacyState:'DESACTIVADO'});
  assert.equal(env.post(ownIds[0]).status,'registered');assert.equal(env.writes.length,1);assert.equal(env.telegram.length,1);
});
test('Un visitante ajeno se registra normalmente con la hoja de alias vacía',()=>{
  const env=server();assert.equal(env.post(otherId).status,'registered');
  assert.equal(env.writes.length,1);assert.equal(env.telegram.length,1);assert.equal(env.configReads.length,0);
});
test('Un fallo de identidad no puede convertir un alias propio en una visita ajena',()=>{
  for (const aliasOptions of [{aliasMissing:true},{aliasFailure:true}]) {
    const env=server(aliasOptions);
    assert.equal(env.post(otherId).status,'skipped');assert.equal(env.writes.length,0);assert.equal(env.telegram.length,0);
  }
});
test('La página bloquea los siete IDs, incluso con mayúsculas o espacios',async()=>{
  for (const id of ownIds) {
    const env=browser({id:` ${id.toUpperCase()} `});await env.settle();
    assert.equal(env.requests.length,0);assert.equal(env.scripts.length,0);
  }
  const env=server();assert.equal(env.post(ownIds[0].toUpperCase()).status,'skipped');
});
test('La página bloquea alias propios y omite la visita si su consulta falla o vence',async()=>{
  for (const options of [{aliases:[[otherId,'Martín']]},{aliases:[[otherId,'IRENIS']]},{aliasFailure:true},{aliasTimeout:true}]) {
    const env=browser(options);await env.settle();
    if (options.aliasTimeout) {
      for(const {fn,delay} of env.timers.values()) if(delay === 3500) fn();
      await env.settle();
    }
    assert.equal(env.posts().length,0);assert.equal(env.requests.length,0);
  }
});
test('Una visita ajena hace una sola consulta de alias y un solo POST',async()=>{
  const env=browser();await env.settle();
  assert.equal(env.posts().length,1);assert.equal(env.scripts.length,1);
  assert.equal(new URLSearchParams(env.posts()[0].request.body).get('user_id'),otherId);
});
test('La página vuelve a comprobar el control si cambia mientras obtiene la ubicación',async()=>{
  const env=browser({id:ownIds[0],state:'ACTIVADO',onLocation(ctx){ctx.REMOTE_CONTROL_VALUES.REGISTRAR_VISITAS_PROPIAS='DESACTIVADO';}});
  await env.settle();assert.equal(env.posts().length,0);
});
test('Una copia antigua del catálogo con visitas propias activadas no supera el bloqueo del servidor',async()=>{
  const backend=server();
  const env=browser({id:ownIds[0],state:'ACTIVADO',onPost(params){assert.equal(backend.post(params.get('user_id')).status,'skipped');}});
  await env.settle();assert.equal(env.posts().length,1);
  assert.equal(backend.writes.length,0);assert.equal(backend.telegram.length,0);
});
test('Sin configuración pública confirmada la página no inicia el registro',async()=>{
  const env=browser({confirmed:false});await env.settle();
  assert.equal(env.requests.length,0);assert.equal(env.scripts.length,0);
});
