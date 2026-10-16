// Copia persistente del catálogo por navegador y actualización explícita o por vencimiento.
(() => {
  const KEY="irenismb_catalog_snapshot_v1";
  const MINUTES_KEY="ACTUALIZACION_CATALOGO_MINUTOS";
  const source=GOOGLE_SHEET_SOURCE.spreadsheetId+":"+GOOGLE_SHEET_SOURCE.gid;
  let memory=null,timer=0,retryAt=0,refreshing=null;
  const validMinutes=value=>/^[1-9]\d{0,4}$/.test(String(value))&&Number(value)<=10080;
  const minutes=()=>validMinutes(window.REMOTE_CONTROL_VALUES?.[MINUTES_KEY])?Number(window.REMOTE_CONTROL_VALUES[MINUTES_KEY]):30;
  const interval=()=>minutes()*60000;
  const configuration=()=>{
    const values=normalizePublicConfiguration(window.REMOTE_CONTROL_VALUES);
    return values?Object.fromEntries(PUBLIC_CONFIGURATION_KEYS.map(key=>[key,values[key]])):null;
  };
  function read(options={}){
    let snapshot;
    try{snapshot=JSON.parse(localStorage.getItem(KEY)||"null");}catch(_){}
    if(!snapshot || (memory && memory.fetchedAt>=snapshot.fetchedAt))snapshot=memory;
    if(!snapshot||snapshot.version!==1||snapshot.source!==source||!Number.isSafeInteger(snapshot.fetchedAt)
      ||snapshot.fetchedAt<=0||snapshot.fetchedAt>Date.now()||!Array.isArray(snapshot.products)
      ||!snapshot.products.every(p=>p&&typeof p.id==="string"&&typeof p.name==="string"&&typeof p.searchKey==="string"
        &&Number.isFinite(p.price)&&p.price>=0&&(/^\d{4}$/.test(p.id)||p.isGiftGalleryImage===true))
      ||!normalizePublicConfiguration(snapshot.configuration)||!Number.isFinite(Date.parse(snapshot.configurationRevision))
      ||!Array.isArray(snapshot.visibilityRules)||!snapshot.visibilityRules.length)return null;
    const duration=window.CATALOG_PUBLIC_CONFIG_CONFIRMED?interval():Number(snapshot.configuration[MINUTES_KEY]||30)*60000;
    if(!options.allowExpired && Date.now()-snapshot.fetchedAt>=duration)return null;
    return JSON.parse(JSON.stringify(snapshot));
  }
  function persist(snapshot){
    try{const text=JSON.stringify(snapshot);memory=JSON.parse(text);try{localStorage.setItem(KEY,text);}catch(_){}return true;}catch(_){return false;}
  }
  function save(products,report,options={}){
    if(!window.CATALOG_PUBLIC_CONFIG_CONFIRMED||window.CATALOG_PUBLIC_VISIBILITY_CONFIRMED!==true
      ||!window.CATALOG_VISIBILITY_SNAPSHOT?.length)return false;
    return persist({version:1,source,fetchedAt:options.fetchedAt??Date.now(),products,report,
      imagesIncluded:options.imagesIncluded===true,configuration:configuration(),
      configurationRevision:remoteConfigRevision,visibilityRules:window.CATALOG_VISIBILITY_SNAPSHOT});
  }
  function updateMetadata(){
    if(!window.CATALOG_PUBLIC_CONFIG_CONFIRMED||!Number.isFinite(Date.parse(remoteConfigRevision)))return;
    const snapshot=read({allowExpired:true});
    if(!snapshot)return;
    snapshot.configuration=configuration();
    snapshot.configurationRevision=remoteConfigRevision;
    if(window.CATALOG_VISIBILITY_SNAPSHOT?.length)snapshot.visibilityRules=window.CATALOG_VISIBILITY_SNAPSHOT;
    persist(snapshot);
    schedule();
  }
  function setMinutes(value){
    if(!validMinutes(value))return false;
    window.REMOTE_CONTROL_VALUES[MINUTES_KEY]=String(value);
    updateMetadata();
    return true;
  }
  function rememberCurrent(){
    const snapshot=read({allowExpired:true});
    if(snapshot)save(allLoadedProducts,window.CATALOG_COMPATIBILITY_REPORT,{fetchedAt:snapshot.fetchedAt,imagesIncluded:snapshot.imagesIncluded});
  }
  function busy(value){
    const button=document.getElementById("catalogRefreshBtn");
    if(!button)return;
    button.disabled=value||!!refreshing;
    button.textContent=button.disabled?"Actualizando…":"Actualizar catálogo";
    button.setAttribute("aria-busy",button.disabled?"true":"false");
  }
  function status(text){
    const node=document.getElementById("catalogRefreshStatus");
    if(node){node.textContent=text;node.hidden=!text;}
  }
  function schedule(){
    if(timer){window.clearTimeout(timer);timer=0;}
    const snapshot=read({allowExpired:true});
    if(!snapshot||window.CATALOG_INITIAL_LOAD_READY!==true)return;
    const delay=Math.max(1000,snapshot.fetchedAt+interval()-Date.now(),retryAt-Date.now());
    timer=window.setTimeout(()=>{timer=0;if(document.visibilityState!=="hidden"&&navigator.onLine!==false)refresh({automatic:true});},delay);
  }
  function refresh(options={}){
    if(refreshing)return refreshing;
    status("");busy(true);
    refreshing=(async()=>{
      try{
        const confirmed=await Promise.all([
          refreshRemoteCatalogConfiguration({rebuild:false}),
          window.refreshCatalogVisibility?.({rebuild:false})
        ]);
        if(confirmed.some(value=>value!==true))throw new Error("No se pudo comprobar la configuración del catálogo.");
        // La actualización manual también omite la espera mínima del índice de imágenes.
        imageIndexRefresh.nextAt=0;
        if(!await loadProducts({force:true,silent:window.CATALOG_INITIAL_LOAD_READY===true,preserveView:true}))throw new Error("No se pudo actualizar el catálogo.");
        retryAt=0;
        status("Catálogo actualizado.");
        window.dispatchEvent(new CustomEvent("catalog-updated"));
        return true;
      }catch(error){
        retryAt=Date.now()+120000;
        status(read({allowExpired:true})?"No se pudo actualizar. Se conserva el catálogo anterior. Puedes volver a intentarlo.":"No se pudo cargar el catálogo. Pulsa Actualizar catálogo para reintentar.");
        return false;
      }finally{
        refreshing=null;busy(false);schedule();
      }
    })();
    return refreshing;
  }
  window.CATALOG_CACHE={read,save,updateMetadata,rememberCurrent,setMinutes,validMinutes,minutes,schedule,busy,refresh,
    isRefreshing:()=>!!refreshing,isFresh:()=>!!read()};
  document.getElementById("catalogRefreshBtn")?.addEventListener("click",()=>refresh());
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState!=="hidden")schedule();});
  window.addEventListener("online",schedule);
})();
