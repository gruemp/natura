// Fuente pública de solo lectura: datos operativos de A y ficha literal de B.
// La respuesta nunca contiene celdas originales, notas, costos ni identificadores privados.
function productoClave_(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
}
function productoPrivado_(label){
  return /^(?:costo|coste|numero de serie|serie|serial|mac|direccion|p\/n|numero de parte|identificador(?:es)?|ubicacion interna|proveedor|margen|rentabilidad|precio de compra|codigo interno|codigo natura|referencia|placa|factura|notas? internas?)(?:\b|$)/.test(productoClave_(label));
}
function productoCampos_(rich){
  if(!rich||typeof rich.getText!=='function')return [];
  const text=rich.getText(),fields=[];let offset=0,current=null;
  for(const line of text.split('\n')){
    const colon=line.indexOf(':');
    if(colon>0){
      const label=line.slice(0,colon).trim(),value=line.slice(colon+1).trim();
      // A mixed or absent style fails closed: every letter of the label must be bold.
      const selected=label.length>0&&rich.getTextStyle(offset,offset+colon).isBold()===true;
      current={label:label,value:value,selected:selected};fields.push(current);
    }else if(current&&line.trim())current.value+='\n'+line.trim();
    offset+=line.length+1;
  }
  return fields;
}
// La salida heredada de una sola columna se conserva únicamente para compatibilidad.
function productoPublico_(rich,row,richFicha){
  if(richFicha)return productoDosColumnas_(rich,row,richFicha);
  const complete=productoCampos_(rich);
  const selected=productoCampos_(richFicha||rich).filter(f=>f.selected&&!productoPrivado_(f.label));
  const aliases={'codigo interno':'Código','codigo':'Código','nombre':'Nombre',
    'seccion':'Sección','categoria':'Categoría','subcategoria':'Subcategoría',
    'tipo de producto':'Tipo','marca':'Marca','linea':'Línea','publico':'Público',
    'contenido':'Contenido','familia olfativa':'Familia olfativa','variante':'Variante',
    'precio':'Precio','disponibilidad':'Estado comercial','condicion':'Condición'};
  const canonical=label=>aliases[productoClave_(label)]||productoClave_(label);
  const allowed=new Set(['Código','Nombre','Sección','Categoría','Subcategoría','Tipo','Marca','Línea','Público','Contenido','Familia olfativa','Variante','Precio','Estado comercial','Condición']);
  const publicFields=selected.slice(),seen=new Set(publicFields.map(f=>canonical(f.label)));
  for(const f of complete){
    const label=aliases[productoClave_(f.label)];
    if(!label||!allowed.has(label)||seen.has(label))continue;
    let value=f.value;
    if(label==='Código'){
      if(!/^\d{1,4}$/.test(value))continue;
      value=value.padStart(4,'0');
    }
    publicFields.push({label,value,selected:false});seen.add(label);
  }
  for(const label of ['Código','Nombre','Precio','Sección','Categoría','Condición','Estado comercial']){
    const matches=complete.filter(f=>canonical(f.label)===label);
    if(matches.length>1)publicFields.push({label,value:matches[1].value,selected:false});
    if(richFicha&&matches.length&&selected.some(f=>canonical(f.label)===label&&f.value!==matches[0].value))
      publicFields.push({label,value:matches[0].value,selected:false});
  }
  const lines=[],textFormatRuns=[];let offset=0;
  for(const f of publicFields){
    const line=f.label+': '+f.value;
    textFormatRuns.push({startIndex:offset,format:{bold:f.selected===true}},{startIndex:offset+f.label.length+1,format:{bold:false}});
    lines.push(line);offset+=line.length+1;
  }
  return {sourceRow:row,c:[{v:lines.join('\n'),textFormatRuns}]};
}
// A es la fuente operativa; B contiene texto público literal en el orden de la ficha.
// La negrita es una ayuda visual del maestro, nunca un requisito de lectura de A/B.
function productoDosColumnas_(rich,row,richFicha){
  const operationalLabels=new Set(('codigo|codigo interno|codigo interno del producto|nombre|nombre comercial del producto|nombre completo para publicar|seccion|seccion del catalogo|categoria|categoria del producto|subcategoria|subcategoria del producto|tipo|tipo de producto|marca|linea|linea comercial|publico|publico destinatario|contenido|cantidad de contenido|unidad|unidad de medida del contenido|cantidad de unidades|stock|familia olfativa|perfil aromatico|variante|variante del producto|caracteristica|caracteristica distintiva|precio|precio de venta|disponibilidad|estado comercial|estado comercial del producto|condicion|condicion del producto|presentacion|tipo de presentacion|formato de presentacion|textura y acabado|duracion del efecto|conectividad|compatibilidad|edad recomendada|numero de jugadores|jugadores|materiales').split('|'));
  const ficha=productoCampos_(richFicha).filter(f=>!productoPrivado_(f.label)&&f.value);
  const fichaLabels=new Set(ficha.map(f=>productoClave_(f.label)));
  const operations=productoCampos_(rich).filter(f=>operationalLabels.has(productoClave_(f.label))
    ||(!productoPrivado_(f.label)&&fichaLabels.has(productoClave_(f.label)))
    ||/^(?:nombre del componente|cantidad de contenido del componente|unidad de medida del contenido del componente|componente) [1-4]$/.test(productoClave_(f.label)));
  const text=fields=>fields.map(f=>f.label+': '+f.value).join('\n');
  return {sourceRow:row,c:[{v:text(operations)},{v:text(ficha)}]};
}
function leerProductosPublicos_(){
  const id='1x7mC7iq-vbOcvSL58cL-slC55gP4aoCKCig-WpggCNs';
  const metadata=Sheets.Spreadsheets.get(id,{fields:'sheets(properties(title,gridProperties(rowCount,columnCount)))'});
  const sheet=(metadata.sheets||[]).find(s=>s.properties.title==='Productos');
  if(!sheet||sheet.properties.gridProperties.columnCount<2)throw new Error('Se requieren A y B de Productos.');
  const data=Sheets.Spreadsheets.get(id,{ranges:["'Productos'!A1:B"+sheet.properties.gridProperties.rowCount],includeGridData:true,fields:'sheets(data(rowData(values(userEnteredValue,textFormatRuns,userEnteredFormat(textFormat(bold))))))'});
  const cells=data.sheets[0].data[0].rowData||[];
  const headers=(cells[0]?.values||[]).map(c=>productoClave_(c.userEnteredValue?.stringValue));
  const aTitles=['etiquetas: obligatorias (negrita) - no obligatorias (sin negrita)','descripcion completa del producto','descripcion integral del producto'];
  const bTitles=['etiquetas para fichas','informacion del producto para el sistema'];
  if(headers.length!==2||!aTitles.includes(headers[0])||!bTitles.includes(headers[1]))
    throw new Error('Encabezados de Productos no confirmados.');
  const rows=cells.slice(1).map((r,i)=>{
    const a=r.values?.[0]||{},b=r.values?.[1]||{};
    if(!a.userEnteredValue?.stringValue&&!b.userEnteredValue?.stringValue)return null;
    return productoPublico_(productoRichText_(a),i+2,productoRichText_(b));
  }).filter(r=>r&&r.c.some(c=>c.v));
  return {ok:true,version:3,actualizadoEn:new Date().toISOString(),table:{cols:[{id:'A',label:'Datos operativos del producto'},{id:'B',label:'Etiquetas para fichas'}],rows}};
}
function productoRichText_(cell){
  const text=cell.userEnteredValue?.stringValue||'',runs=cell.textFormatRuns||[],base=cell.userEnteredFormat?.textFormat?.bold===true;
  const boldAt=i=>{let bold=base;for(const r of runs){if((r.startIndex||0)>i)break;bold=typeof r.format?.bold==='boolean'?r.format.bold:base;}return bold;};
  return {getText:()=>text,getTextStyle:(start,end)=>({isBold:()=>{for(let i=start;i<end;i++)if(!boldAt(i))return false;return end>start;}})};
}
function responderProductosPublicos_(parameters){
  const callback=String(parameters.callback||'').trim();
  if(callback&&!/^[A-Za-z_$][A-Za-z0-9_$]{0,100}$/.test(callback))return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Callback no válido.'})).setMimeType(ContentService.MimeType.JSON);
  let payload;
  try{payload=parameters.limit!==undefined?leerProductosPublicosPorLotes_(parameters):leerProductosPublicos_();}catch(error){payload={ok:false,error:'No se pudo leer la selección comercial del maestro.',code:/permission|authoriz|permiso|autoriz/i.test(String(error&&error.message||''))?'authorization_required':'read_failed'};}
  const text=JSON.stringify(payload);
  return ContentService.createTextOutput(callback?callback+'('+text+');':text).setMimeType(callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);
}
// Entrada manual para autorizar y comprobar el lector, sin mostrar datos de productos.
function verificarLectorProductos(){
  const payload=leerProductosPublicos_();
  const result={ok:payload.ok,version:payload.version,productos:payload.table.rows.length};
  console.log(JSON.stringify(result));return result;
}
