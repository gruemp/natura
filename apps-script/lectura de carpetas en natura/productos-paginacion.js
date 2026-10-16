// Lotes de una misma lectura pública: nunca mezcla precios o fichas de dos lecturas.
// La caché contiene exclusivamente la salida ya saneada de leerProductosPublicos_.
function codigosDuplicadosPublicos_(rows){
  const counts=new Map();
  for(const row of rows){
    const codes=new Set(String(row.c?.[0]?.v||'').split('\n').flatMap(line=>{
      const colon=line.indexOf(':');
      if(colon<0||!['codigo','codigo interno','codigo interno del producto'].includes(productoClave_(line.slice(0,colon))))return [];
      const value=line.slice(colon+1).trim();
      return /^\d{1,4}$/.test(value)?[value.padStart(4,'0')]:[];
    }));
    for(const code of codes)counts.set(code,(counts.get(code)||0)+1);
  }
  return [...counts].filter(([,count])=>count>1).map(([code])=>code);
}
function guardarLecturaPublica_(payload){
  const snapshot=Utilities.getUuid();
  const prefix='catalog_products_v1_'+snapshot+'_';
  const text=JSON.stringify(payload),entries={};let chunks=0;
  for(let i=0;i<text.length;i+=20000)entries[prefix+chunks++]=text.slice(i,i+20000);
  const cache=CacheService.getScriptCache();
  cache.putAll(entries,300);
  cache.put(prefix+'meta',JSON.stringify({chunks}),300);
  return snapshot;
}
function recuperarLecturaPublica_(snapshot){
  const prefix='catalog_products_v1_'+snapshot+'_',cache=CacheService.getScriptCache();
  const meta=JSON.parse(cache.get(prefix+'meta')||'null');
  if(!meta||!Number.isInteger(meta.chunks)||meta.chunks<1||meta.chunks>1000)throw new Error('CATALOG_SNAPSHOT_EXPIRED');
  const keys=Array.from({length:meta.chunks},(_,i)=>prefix+i),entries=cache.getAll(keys);
  if(keys.some(key=>typeof entries[key]!=='string'))throw new Error('CATALOG_SNAPSHOT_EXPIRED');
  return JSON.parse(keys.map(key=>entries[key]).join(''));
}
function leerProductosPublicosPorLotes_(parameters){
  const limit=Number(parameters.limit),offset=Number(parameters.offset||0),token=String(parameters.snapshot||'');
  if(!/^\d{1,3}$/.test(String(parameters.limit))||!Number.isInteger(limit)||limit<1||limit>100
    ||!/^\d{1,6}$/.test(String(parameters.offset||0))||!Number.isInteger(offset)||offset<0
    ||(token&&!/^[a-f0-9-]{36}$/i.test(token))||(!token&&offset!==0))throw new Error('Paginación no válida.');
  let payload,snapshot=token;
  if(snapshot)payload=recuperarLecturaPublica_(snapshot);
  else{
    payload=leerProductosPublicos_();
    try{snapshot=guardarLecturaPublica_(payload);}catch(_){return payload;}
  }
  const total=payload.table.rows.length;
  if(offset>total)throw new Error('Paginación fuera de rango.');
  const next=Math.min(offset+limit,total);
  return {...payload,table:{...payload.table,rows:payload.table.rows.slice(offset,next)},
    page:{snapshot,offset,limit,total,nextOffset:next<total?next:null,
      duplicateCodes:codigosDuplicadosPublicos_(payload.table.rows)}};
}
