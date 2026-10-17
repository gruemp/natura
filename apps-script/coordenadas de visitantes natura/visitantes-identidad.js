// Identidad del navegador y reglas de visitas propias.

// ===================== NAVEGADORES (FUNCIONES) =====================
function normalizeName_(value){
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function getBrowserIdentity_(userId){
  const id = String(userId || "").trim();
  if (!id) return { id:"", nombre:"", navegador:"", verificada:false };

  try{
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(BROWSER_ID_SHEET_NAME);
    if (!sh){
      return { id, nombre:"", navegador:id, verificada:false };
    }
    if (sh.getLastRow() < 2) return { id, nombre:"", navegador:id, verificada:true };

    const found = sh
      .getRange(2, 1, sh.getLastRow() - 1, 1)
      .createTextFinder(id)
      .matchEntireCell(true)
      .findNext();

    if (!found) return { id, nombre:"", navegador:id, verificada:true };

    const nombre = String(sh.getRange(found.getRow(), 2).getDisplayValue() || "").trim();
    return { id, nombre, navegador:nombre || id, verificada:true };
  }catch(error){
    console.error("No se pudo consultar id_navegador: " + error);
    return { id, nombre:"", navegador:id, verificada:false };
  }
}

function ownVisitRegistrationEnabled_(){
  try{
    // El administrador publica su estado desde Propiedades del script. La hoja
    // Configuracion es un espejo opcional y no autoriza registrar visitas propias.
    const response = UrlFetchApp.fetch(PUBLIC_CONFIG_ENDPOINT, {
      method:"get",
      muteHttpExceptions:true,
      headers:{"Cache-Control":"no-cache"}
    });
    if (response.getResponseCode() !== 200) return false;
    const config = JSON.parse(response.getContentText());
    if (!config || config.ok !== true || !config.valores
      || !Number.isFinite(Date.parse(config.publicadoEn))) return false;
    return config.valores[OWN_VISITS_CONTROL_KEY] === "ACTIVADO";
  }catch(error){
    console.error("No se pudo confirmar el control público de visitas propias.");
  }
  return false;
}

function shouldSkipOwnVisit_(identity){
  const id = String(identity && identity.id || "").trim().toLowerCase();
  const normalizedName = normalizeName_(identity && identity.nombre);
  const ownBrowser = OWN_BROWSER_IDS.has(id) || OWN_VISITOR_NAMES.has(normalizedName);
  if (!ownBrowser && identity && identity.verificada === true) return false;

  // Una consulta fallida tampoco permite tratar como ajeno un navegador propio.
  return !ownVisitRegistrationEnabled_();
}

function isPrivateIpv4_(value){
  const ip = String(value || "").trim();
  const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const p = match.slice(1).map(Number);
  if (p.some(n => n < 0 || n > 255)) return false;
  if (p[0] === 10) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  return false;
}
