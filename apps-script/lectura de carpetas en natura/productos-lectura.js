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
function productoPublico_(rich,row){
  const fields=productoCampos_(rich),selected=fields.filter(f=>f.selected&&!productoPrivado_(f.label));
  const aliases={
    'codigo interno':'Código','codigo interno del producto':'Código','codigo':'Código',
    'nombre':'Nombre','nombre comercial del producto':'Nombre','nombre completo para publicar':'Nombre',
    'seccion':'Sección','seccion del catalogo':'Sección',
    'categoria':'Categoría','categoria del producto':'Categoría',
    'subcategoria':'Subcategoría','subcategoria del producto':'Subcategoría',
    'linea':'Línea','linea comercial':'Línea','marca':'Marca',
    'publico':'Público','publico destinatario':'Público',
    'precio':'Precio','precio de venta':'Precio',
    'disponibilidad':'Estado comercial','estado comercial':'Estado comercial','estado comercial del producto':'Estado comercial',
    'condicion':'Condición','condicion del producto':'Condición'
  };
  const canonical=label=>aliases[productoClave_(label)]||productoClave_(label);
  const publicFields=selected.map(f=>({...f})),seen=new Set(publicFields.map(f=>canonical(f.label)));
  for(const field of fields){
    const label=aliases[productoClave_(field.label)];
    if(!label||seen.has(label))continue;
    let value=field.value;
    if(label==='Código'){
      if(!/^\d{1,4}$/.test(value))continue;
      value=value.padStart(4,'0');
    }
    publicFields.push({label:label,value:value,selected:false});seen.add(label);
  }
  // Duplicate operational labels are reported through the table, never silently picked.
  for(const label of ['Código','Nombre','Precio']){
    const matches=fields.filter(f=>aliases[productoClave_(f.label)]===label);
    if(matches.length>1)publicFields.push({label:label,value:matches[1].value,selected:false});
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
  // The built-in SpreadsheetApp reader demands a write-capable scope. Sheets API accepts readonly.
  const metadata=Sheets.Spreadsheets.get(id,{fields:'sheets(properties(title,gridProperties(rowCount)))'});
  const sheet=(metadata.sheets||[]).find(s=>s.properties.title==='Productos');
  if(!sheet)throw new Error('Fuente de productos no confirmada.');
  const data=Sheets.Spreadsheets.get(id,{ranges:["'Productos'!A1:A"+sheet.properties.gridProperties.rowCount],includeGridData:true,fields:'sheets(data(rowData(values(userEnteredValue,textFormatRuns,userEnteredFormat(textFormat(bold))))))'});
  const cells=data.sheets[0].data[0].rowData||[];
  if(productoClave_(cells[0]?.values?.[0]?.userEnteredValue?.stringValue)!=='informacion del producto')throw new Error('Fuente de productos no confirmada.');
  const rows=cells.slice(1).map((r,i)=>productoPublico_(productoRichText_(r.values?.[0]||{}),i+2)).filter(r=>r.c[0].v);
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
