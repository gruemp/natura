const ROOT_FOLDER = "1b1S1Xry9kroXgZm_-bPveC7iYWOAyAbc";
const ARCHIVE_FOLDER = "1eMBCtGfY20qkluklvljwroxmGNQd6wkp";
const OWNER_ID = "131928432";
const AUDIENCE = "drive-mirror.gruemp";
const FOLDERS = {"997592217":"1iiqMF23DAIU7jwq2Lxbt_JpzNT7JY1wg","1148450879":"1Zc-2waAtTQhIBNXGBH6dmTGJaH-n3iBS","1149218454":"1CQi9AN5DGLIK6eiLc1MsFUiaT_zI-O-w","1153155645":"1DRwNlOMuxxNgaC5ERY0oPudmUXyyls15","1367153430":"1Q_Jvaz8ye22A8nv5J0PgAT8R6qEZzEb8","1369352716":"1A3YHB5dkX2-bOAKDKcU8P9y5zQogPDR_","1381934054":"1PqBQJ2db8bZ78g-E8DTFVFsZCjDx8yRi","1413990611":"14aLaWOZKqHKm42qlZmcx2HXnDwR9c249","1414615278":"1JqZsF4s7oLzXAVYqCOOI9xkzg1VqCwf-","1414637992":"1OQJf4sKZghYkImPX0aEAU6s5spVccZpe","1414638068":"1ra358Npp-ADxMpB4Auad1Fy6M7Fnmm6v","1414638132":"1hC91QwBW41h9RKOr6KsySgAGqG8LxUKG","1414638205":"1vdTgpbWC4IiDJgMGIU6gDtMUJhPwqd6t","1414638292":"1hdamD1qyc07-HArt5PadxbXL-9d8kjjC","1414638376":"1f8ceMScYin3Vy7l-L1lfxVNRGpD4ponn"};
function bytes64_(s) { return Utilities.base64DecodeWebSafe(s + "=".repeat((4 - s.length % 4) % 4)); }
function hex_(a) { return a.map(b => (b & 255).toString(16).padStart(2,"0")).join(""); }
function integer_(a) { return BigInt("0x" + hex_(a)); }
function modpow_(a, e, n) {
  let result = BigInt(1); a %= n;
  while (e > BigInt(0)) { if (e & BigInt(1)) result = result * a % n; a = a * a % n; e >>= BigInt(1); }
  return result;
}
function claims_(jwt) {
  const parts = jwt.split(".");
  if (parts.length !== 3 || parts.some(x => !/^[A-Za-z0-9_-]+$/.test(x))) throw Error("token");
  const header = JSON.parse(Utilities.newBlob(bytes64_(parts[0])).getDataAsString());
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw Error("alg");
  const cache = CacheService.getScriptCache();
  let jwks = cache.get("github-jwks");
  if (!jwks) { jwks = UrlFetchApp.fetch("https://token.actions.githubusercontent.com/.well-known/jwks").getContentText(); cache.put("github-jwks",jwks,300); }
  const key = JSON.parse(jwks).keys.find(k => k.kid === header.kid && k.kty === "RSA" && k.use === "sig");
  if (!key) throw Error("key");
  const modulus = bytes64_(key.n), sig = bytes64_(parts[2]);
  if (sig.length !== modulus.length || integer_(sig) >= integer_(modulus)) throw Error("signature");
  const digest = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, parts[0]+"."+parts[1], Utilities.Charset.UTF_8));
  const suffix = "3031300d060960864801650304020105000420" + digest;
  const paddingLength = modulus.length - suffix.length/2 - 3;
  if (paddingLength < 8) throw Error("padding");
  const expected = "0001" + "ff".repeat(paddingLength) + "00" + suffix;
  const decoded = modpow_(integer_(sig), integer_(bytes64_(key.e)), integer_(modulus)).toString(16).padStart(modulus.length*2,"0");
  if (decoded !== expected) throw Error("signature");
  const c = JSON.parse(Utilities.newBlob(bytes64_(parts[1])).getDataAsString());
  const now = Math.floor(Date.now()/1000);
  if (!Number.isInteger(c.exp) || !Number.isInteger(c.iat) || !Number.isInteger(c.nbf) || c.iss !== "https://token.actions.githubusercontent.com" || c.aud !== AUDIENCE || c.exp <= now || c.nbf > now + 10 ||
      c.iat > now + 10 || c.exp - c.iat > 600 || c.repository_owner_id !== OWNER_ID || !FOLDERS[c.repository_id] ||
      c.ref !== "refs/heads/main" || !["push","workflow_dispatch","schedule"].includes(c.event_name)) throw Error("claims");
  const normal = c.repository + "/.github/workflows/espejo-drive.yml@refs/heads/main";
  const bootstrap = c.repository === "gruemp/natura" && c.workflow_ref === "gruemp/natura/.github/workflows/configurar-espejo-drive.yml@refs/heads/main";
  if (c.workflow_ref !== normal && !bootstrap) throw Error("workflow");
  c.bootstrap = bootstrap;
  return c;
}
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const c = claims_(body.token);
    if (body.op !== "probe") throw Error("operation");
    const folder = DriveApp.getFolderById(ROOT_FOLDER);
    return ContentService.createTextOutput(JSON.stringify({ok:true,root:folder.getId(),folder:FOLDERS[c.repository_id],bigint:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:"Autorizacion u operacion no valida"})).setMimeType(ContentService.MimeType.JSON);
  }
}
