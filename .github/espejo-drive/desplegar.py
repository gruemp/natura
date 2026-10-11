import json, os, urllib.request, urllib.error, urllib.parse
from pathlib import Path
def request(url, method="GET", payload=None, token=None):
    headers = {"Content-Type":"application/json"} if payload is not None else {}
    if token: headers["Authorization"]="Bearer "+token
    req=urllib.request.Request(url,data=None if payload is None else json.dumps(payload).encode(),headers=headers,method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response: return json.load(response)
    except urllib.error.HTTPError as error: raise SystemExit("Operacion remota bloqueada: HTTP "+str(error.code)) from None
auth=json.loads(os.environ["CLASPRC_JSON"])
credentials=(auth.get("tokens") or {}).get("default") or auth.get("token") or auth
client_id=credentials.get("client_id") or auth.get("client_id") or auth.get("clientId")
client_secret=credentials.get("client_secret") or auth.get("client_secret") or auth.get("clientSecret")
refresh=credentials.get("refresh_token")
if not all([client_id,client_secret,refresh]): raise SystemExit("Autorizacion Google incompleta")
data=urllib.parse.urlencode({"client_id":client_id,"client_secret":client_secret,"refresh_token":refresh,"grant_type":"refresh_token"}).encode()
try:
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token",data=data),timeout=60) as response:
        access=json.load(response)["access_token"]
except urllib.error.HTTPError as error: raise SystemExit("No se pudo renovar acceso Google: HTTP "+str(error.code)) from None
# Verificar el destino antes de crear la aplicacion.
request("https://www.googleapis.com/drive/v3/files/1b1S1Xry9kroXgZm_-bPveC7iYWOAyAbc?fields=id,mimeType",token=access)
project=request("https://script.googleapis.com/v1/projects","POST",{"title":"espejo github drive"},access)
script_id=project["scriptId"]
manifest={"timeZone":"America/Bogota","runtimeVersion":"V8","exceptionLogging":"STACKDRIVER",
    "oauthScopes":["https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/script.external_request"],
    "webapp":{"access":"ANYONE_ANONYMOUS","executeAs":"USER_DEPLOYING"}}
request("https://script.googleapis.com/v1/projects/"+script_id+"/content","PUT",{"files":[
    {"name":"servidor","type":"SERVER_JS","source":Path(".github/espejo-drive/servidor.js").read_text()},
    {"name":"appsscript","type":"JSON","source":json.dumps(manifest)}]},access)
version=request("https://script.googleapis.com/v1/projects/"+script_id+"/versions","POST",{"description":"Autenticacion GitHub OIDC para espejo Drive"},access)
deployment=request("https://script.googleapis.com/v1/projects/"+script_id+"/deployments","POST",
    {"versionNumber":version["versionNumber"],"manifestFileName":"appsscript","description":"espejo github drive"},access)
url=next(e["webApp"]["url"] for e in deployment.get("entryPoints",[]) if e.get("webApp"))
# Ubicar el proyecto nuevo en la carpeta autorizada de documentos nuevos.
metadata=request("https://www.googleapis.com/drive/v3/files/"+script_id+"?fields=parents",token=access)
query=urllib.parse.urlencode({"addParents":"16DmWgblOF75LrNp0YJ5XL_FRU4TSgyBV","removeParents":",".join(metadata.get("parents",[])),"fields":"id"})
request("https://www.googleapis.com/drive/v3/files/"+script_id+"?"+query,"PATCH",{},access)
oidc_url=os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]+"&audience=drive-mirror.gruemp"
oidc=request(oidc_url,token=os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"])["value"]
result=request(url,"POST",{"token":oidc,"op":"probe"})
info={"script_id":script_id,"deployment_id":deployment["deploymentId"],"url":url,"probe":result}
Path(os.environ["RUNNER_TEMP"],"espejo-conexion.json").write_text(json.dumps(info))
print("Proyecto de conexion creado: "+script_id)
print("Servicio: "+url)
print("Prueba autenticada: "+json.dumps(result))
if not result.get("ok"): raise SystemExit("Conexion creada pero autorizacion de ejecucion pendiente")
