// Registro real, autenticado mediante el puente de administración de Google.
// Este Web App ejecuta como USER_ACCESSING: los permisos del Sheet son obligatorios.
const MOV_BOOK="1M8yCu65FG0wBeBAPqMXLaaXg2YXIhrJ_4gJ5lo1tZ9g";
const MOV_SHEET="movimientos";
const MOV_HEADERS=["fecha","número de factura o movimiento","tipo de movimiento","tipo de registro","cliente o tercero","dirección del cliente o tercero","ciudad del cliente","celular","código","nombre completo del artículo","cantidad","stock anterior","stock posterior","valor unitario","valor total por producto","valor del envío","valor total del movimiento","medio de pago","enlace factura png"];
function movNorm(v){return String(v==null?"":v).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ")}
function movSafe(v,max){let t=String(v==null?"":v).replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max||300);return /^[=+\-@]/.test(t)?"'"+t:t}
function movCode(v){const s=String(v==null?"":v).trim();if(!/^\d{1,4}$/.test(s))throw new Error("Código interno inválido");return s.padStart(4,"0")}
function movQty(v){const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>9999)throw new Error("Cantidad inválida");return n}
function movPrice(v){let s=String(v==null?"":v).trim().replace(/^(?:COP\s*|\$\s*)/i,"").replace(/\s/g,"");if(!s)return null;if(/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s))s=s.replace(/\./g,"").replace(",",".");else if(/^\d+(?:,\d+)?$/.test(s))s=s.replace(",",".");if(!/^\d+(?:\.\d+)?$/.test(s)||!Number.isFinite(Number(s)))throw new Error("Precio del maestro inválido");return Number(s)}
function movSheet(){
  const sheet=SpreadsheetApp.openById(MOV_BOOK).getSheetByName(MOV_SHEET);
  if(!sheet)throw new Error("No se encontró la pestaña movimientos");
  const heads=sheet.getRange(1,1,1,19).getDisplayValues()[0];
  MOV_HEADERS.forEach(function(h,i){if(movNorm(heads[i])!==movNorm(h))throw new Error("Encabezado modificado en columna "+(i+1))});
  return sheet;
}
function movProducts(codes){
  const sheet=SpreadsheetApp.openById(INVENTARIO_SPREADSHEET_ID).getSheetByName(INVENTARIO_SHEET_NAME);
  if(!sheet)throw new Error("No se encontró Productos");
  const header=movNorm(sheet.getRange(1,1).getDisplayValue());
  if(!["etiquetas: obligatorias (negrita) - no obligatorias (sin negrita)","descripcion completa del producto","informacion del producto","descripcion integral del producto"].includes(header))throw new Error("Encabezado comercial no reconocido");
  const wanted=new Set(codes),found={};
  sheet.getRange(2,1,Math.max(1,sheet.getLastRow()-1),1).getDisplayValues().forEach(function(row){
    const fields={};
    String(row[0]||"").split(/\r?\n/).forEach(function(line){
      const p=line.indexOf(":");if(p<0)return;const k=movNorm(line.slice(0,p));
      if(["codigo interno","codigo interno del producto","codigo","nombre","nombre comercial del producto","precio","precio de venta"].includes(k)){
        if(Object.prototype.hasOwnProperty.call(fields,k))throw new Error("Etiqueta duplicada: "+k);
        fields[k]=line.slice(p+1).trim();
      }
    });
    const raw=fields["codigo interno"]||fields["codigo interno del producto"]||fields.codigo||"";
    if(!/^\d{1,4}$/.test(raw))return;
    const code=raw.padStart(4,"0");if(!wanted.has(code))return;
    if(found[code])throw new Error("Código de producto duplicado: "+code);
    found[code]={name:fields.nombre||fields["nombre comercial del producto"]||"",price:movPrice(fields.precio||fields["precio de venta"]||"")};
  });
  codes.forEach(function(code){if(!found[code]?.name)throw new Error("Producto inexistente o sin nombre: "+code)});
  return found;
}
function movLastBalances(sheet,codes){
  const balances={},wanted=new Set(codes);
  if(sheet.getLastRow()<2)return balances;
  sheet.getRange(2,3,sheet.getLastRow()-1,11).getDisplayValues().forEach(function(row){
    if(movNorm(row[1])!=="real")return;
    const code=String(row[6]||"").trim().padStart(4,"0");
    if(!wanted.has(code))return;
    const prev=String(row[10]||"").trim();
    if(/^\d+$/.test(prev))balances[code]=Number(prev);else delete balances[code];
  });
  return balances;
}
function registrarMovimientoInventarioWeb(data){
  const request=data&&typeof data==="object"?data:{};
  const tipo=String(request.tipo||"").trim().toUpperCase();
  if(!["ENTRADA","SALIDA"].includes(tipo))throw new Error("Tipo de movimiento inválido");
  const key=String(request.client_request_id||"").trim();
  if(!/^[A-Za-z0-9_-]{16,120}$/.test(key))throw new Error("Identificador de movimiento inválido");
  if(!Array.isArray(request.items)||!request.items.length||request.items.length>50)throw new Error("Carrito vacío o excesivo");
  const groups={};
  request.items.forEach(function(item){const code=movCode(item?.codigo),qty=movQty(item?.cantidad);groups[code]=(groups[code]||0)+qty;if(groups[code]>9999)throw new Error("Cantidad acumulada excesiva")});
  const codes=Object.keys(groups),reference="MOV-"+key;
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const sheet=movSheet(),last=sheet.getLastRow();
    if(last>1&&sheet.getRange(2,2,last-1,1).getDisplayValues().some(function(r){return r[0]===reference}))
      return {ok:true,duplicate:true,numeroMovimiento:reference,tipo,filas:codes.length};
    const products=movProducts(codes),balances=movLastBalances(sheet,codes),withoutBase=[];
    const customer=request.cliente&&typeof request.cliente==="object"?request.cliente:{};
    const shipping=tipo==="SALIDA"?Number(request.envio||0):0;
    if(!Number.isSafeInteger(shipping)||shipping<0||shipping>1000000)throw new Error("Envío inválido");
    const payments=["Efectivo","Transferencia","Nequi","Daviplata","Tarjeta","Otro"];
    const payment=tipo==="SALIDA"&&payments.includes(request.medioPago)?request.medioPago:"";
    let total=shipping;
    const prepared=codes.map(function(code){
      const p=products[code],qty=groups[code],price=tipo==="SALIDA"?p.price:null;
      if(tipo==="SALIDA"&&price===null)throw new Error("Sin precio para generar SALIDA: "+code);
      if(price!==null)total+=price*qty;
      const known=Object.prototype.hasOwnProperty.call(balances,code);
      const before=known?balances[code]:"",after=known?before+(tipo==="ENTRADA"?qty:-qty):"";
      if(known&&after<0)throw new Error("Existencias insuficientes: "+code);
      if(known)balances[code]=after;else withoutBase.push(code);
      return {code,p,qty,price,before,after};
    });
    const date=Utilities.formatDate(new Date(),"America/Bogota","yyyy-MM-dd HH:mm");
    const rows=prepared.map(function(x,i){
      return [date,reference,tipo,"REAL",movSafe(customer.nombre,120),movSafe(customer.direccion,240),
        movSafe(customer.ciudad,100),movSafe(customer.celular,40),x.code,movSafe(x.p.name,240),x.qty,
        x.before,x.after,x.price===null?"":x.price,x.price===null?"":x.qty*x.price,
        i===0?shipping:"",i===0&&tipo==="SALIDA"?total:"",i===0?payment:"",""];
    });
    sheet.getRange(Math.max(2,last+1),1,rows.length,19).setValues(rows);
    SpreadsheetApp.flush();
    return {ok:true,numeroMovimiento:reference,tipo,filas:rows.length,saldosSinBase:withoutBase};
  }finally{lock.releaseLock()}
}
function movBarcodeTable(create){
  const book=SpreadsheetApp.openById(MOV_BOOK);
  let sheet=book.getSheetByName("codigos_barras");
  if(!sheet&&create){sheet=book.insertSheet("codigos_barras");sheet.getRange(1,1,1,3).setValues([["Código de barras","Código interno","Fecha de vinculación"]]);sheet.setFrozenRows(1)}
  if(sheet){const h=sheet.getRange(1,1,1,2).getDisplayValues()[0];if(movNorm(h[0])!=="codigo de barras"||movNorm(h[1])!=="codigo interno")throw new Error("Encabezados inválidos en códigos de barras")}
  return sheet;
}
function movBarcodeCode(input){const code=String(input||"").trim();if(!/^\d{8,14}$/.test(code))throw new Error("Código de barras EAN/UPC inválido");return code}
function buscarCodigoBarrasWeb(input){
  const barcode=movBarcodeCode(input);movSheet();
  const sheet=movBarcodeTable(false);
  if(!sheet||sheet.getLastRow()<2)return {ok:true,codigoInterno:""};
  const matches=sheet.getRange(2,1,sheet.getLastRow()-1,2).getDisplayValues().filter(function(r){return String(r[0]).trim()===barcode});
  if(matches.length>1)throw new Error("Código de barras duplicado");
  return {ok:true,codigoInterno:matches.length?movCode(matches[0][1]):""};
}
function vincularCodigoBarrasWeb(input,internal){
  const barcode=movBarcodeCode(input),code=movCode(internal);
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    movSheet();movProducts([code]);
    const sheet=movBarcodeTable(true);
    const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,2).getDisplayValues():[];
    const old=rows.find(function(r){return String(r[0]).trim()===barcode});
    if(old){if(movCode(old[1])!==code)throw new Error("Código vinculado a otro producto");return {ok:true,codigoInterno:code,duplicate:true}}
    sheet.appendRow([barcode,code,Utilities.formatDate(new Date(),"America/Bogota","yyyy-MM-dd HH:mm")]);
    return {ok:true,codigoInterno:code};
  }finally{lock.releaseLock()}
}