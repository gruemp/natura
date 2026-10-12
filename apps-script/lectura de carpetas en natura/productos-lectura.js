// Fuente pública de solo lectura: selección Rich Text del maestro original Productos!A.
// La respuesta nunca contiene celdas originales, notas, costos ni identificadores privados.
function productoClave_(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
}
function productoPrivado_(label){
  return /^(?:costo|coste|numero de serie|serie|serial|mac|direccion|p\/n|numero de parte|identificadores?|ubicacion interna|proveedor|margen|rentabilidad|precio de compra|codigo interno|codigo natura|referencia|placa|factura|notas? internas?)(?:\b|$)/.test(productoClave_(label));
}
function productoCampos_(rich){
  if(!rich||typeof rich.getText!=='function')return [];
  const text=rich.getText(),fields=[];let offset=0;
  for(const line of text.split('\n')){
    const colon=line.indexOf(':');
    if(colon>0){
      const label=line.slice(0,colon).trim(),value=line.slice(colon+1).trim();
      // A mixed or absent style fails closed: every letter of the label must be bold.
      const selected=label.length>0&&rich.getTextStyle(offset,offset+colon).isBold()===true;
      fields.push({label:label,value:value,selected:selected});
    }
    offset+=line.length+1;
  }
  return fields;
}
// A define las etiquetas que verá el comprador; B guarda el registro integral.
// B se procesa solo en Apps Script. Nunca se entrega íntegro al navegador.
function productoPublico_(rich,row,richIntegral){
  const fields=productoCampos_(rich),integral=richIntegral?productoCampos_(richIntegral):fields;
  const selected=fields.filter(f=>f.selected&&!productoPrivado_(f.label));
  const aliases={
    'codigo interno':'Código','codigo interno del producto':'Código','codigo':'Código',
    'nombre':'Nombre','nombre comercial del producto':'Nombre','nombre completo para publicar':'Nombre',
    'seccion':'Sección','seccion del catalogo':'Sección',
    'categoria':'Categoría','categoria del producto':'Categoría',
    'subcategoria':'Subcategoría','subcategoria del producto':'Subcategoría',
    'tipo de producto':'Tipo','tipo':'Tipo',
    'linea':'Línea','linea comercial':'Línea','marca':'Marca',
    'publico':'Público','publico destinatario':'Público',
    'precio':'Precio','precio de venta':'Precio',
    'disponibilidad':'Estado comercial','estado comercial':'Estado comercial','estado comercial del producto':'Estado comercial',
    'condicion':'Condición','condicion del producto':'Condición'
  };
  const canonical=label=>aliases[productoClave_(label)]||productoClave_(label);
  const allowed=new Set(['Código','Nombre','Sección','Categoría','Subcategoría','Tipo','Línea','Marca','Público','Precio','Estado comercial','Condición']);
  const publicFields=selected.map(f=>({...f})),seen=new Set(publicFields.map(f=>canonical(f.label)));
  // Extraer de B exclusivamente valores operativos expresamente permitidos.
  for(const field of integral){
    const label=aliases[productoClave_(field.label)];
    if(!label||!allowed.has(label)||seen.has(label))continue;
    let value=field.value;
    if(label==='Código'){
      if(!/^\d{1,4}$/.test(value))continue;
      value=value.padStart(4,'0');
    }
    publicFields.push({label:label,value:value,selected:false});seen.add(label);
  }
  // Rechazar duplicados y discordancias en valores críticos, sin publicar la fuente B.
  for(const label of ['Código','Nombre','Precio','Sección','Categoría','Condición','Estado comercial']){
    const matches=integral.filter(f=>aliases[productoClave_(f.label)]===label);
    if(matches.length>1)publicFields.push({label:label,value:matches[1].value,selected:false});
    if(!richIntegral||!matches.length)continue;
    const publicSelected=selected.filter(f=>canonical(f.label)===label);
    if(publicSelected.some(f=>f.value!==matches[0].value))
      publicFields.push({label:label,value:matches[0].value,selected:false});
  }
  const lines=[],textFormatRuns=[];let offset=0;
  for(const f of publicFields){
    const line=f.label+': '+f.value;
    textFormatRuns.push({startIndex:offset,format:{bold:f.selected===true}},{startIndex:offset+f.label.length+1,format:{bold:false}});
    lines.push(line);offset+=line.length+1;
  }
  return {sourceRow:row,c:[{v:lines.join('\n'),textFormatRuns:textFormatRuns}]};
}
function leerProductosPublicos_(){
  const id='1x7mC7iq-vbOcvSL58cL-slC55gP4aoCKCig-WpggCNs';
  // Sheets API readonly: A selecciona etiquetas visibles; B aporta identidad, navegación y precio.
  const metadata=Sheets.Spreadsheets.get(id,{fields:'sheets(properties(title,gridProperties(rowCount,columnCount)))'});
  const sheet=(metadata.sheets||[]).find(s=>s.properties.title==='Productos');
  if(!sheet||sheet.properties.gridProperties.columnCount<2)throw new Error('Fuente de productos de dos columnas no confirmada.');
  const data=Sheets.Spreadsheets.get(id,{ranges:["'Productos'!A1:B"+sheet.properties.gridProperties.rowCount],includeGridData:true,fields:'sheets(data(rowData(values(userEnteredValue,textFormatRuns,userEnteredFormat(textFormat(bold))))))'});
  const cells=data.sheets[0].data[0].rowData||[];
  if(productoClave_(cells[0]?.values?.[0]?.userEnteredValue?.stringValue)!=='informacion del producto'
     ||productoClave_(cells[0]?.values?.[1]?.userEnteredValue?.stringValue)!=='descripcion para marketplace')
    throw new Error('Encabezados de la fuente de productos no confirmados.');
  const rows=cells.slice(1).map((r,i)=>{
    const a=r.values?.[0]||{},b=r.values?.[1]||{};
    if(!a.userEnteredValue?.stringValue&&!b.userEnteredValue?.stringValue)return null;
    if(!a.userEnteredValue?.stringValue||!b.userEnteredValue?.stringValue)throw new Error('Registro incompleto en Productos.');
    return productoPublico_(productoRichText_(a),i+2,productoRichText_(b));
  }).filter(r=>r&&r.c[0].v);
  return {ok:true,version:2,actualizadoEn:new Date().toISOString(),table:{cols:[{id:'A',label:'Informacion del producto'}],rows:rows}};
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
  try{payload=leerProductosPublicos_();}catch(error){payload={ok:false,error:'No se pudo leer la selección comercial del maestro.',code:/permission|authoriz|permiso|autoriz/i.test(String(error&&error.message||''))?'authorization_required':'read_failed'};}
  const text=JSON.stringify(payload);
  return ContentService.createTextOutput(callback?callback+'('+text+');':text).setMimeType(callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);
}
// Entrada manual para autorizar y comprobar el lector, sin mostrar datos de productos.
function verificarLectorProductos(){
  const payload=leerProductosPublicos_();
  const result={ok:payload.ok,version:payload.version,productos:payload.table.rows.length};
  console.log(JSON.stringify(result));return result;
}
