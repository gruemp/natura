/* La lista se entrega completa en HTML; este archivo solo filtra y registra la visita. */
(() => {
  "use strict";
  const form = document.getElementById("directorio-filtros");
  const items = Array.from(document.querySelectorAll(".directorio-item"));
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
  if (form && items.length) {
    const search = document.getElementById("directorio-buscar");
    const fields = ["marca", "categoria", "subcategoria", "linea", "publico"];
    const selects = Object.fromEntries(fields.map(field => [field, document.getElementById("directorio-" + field)]));
    const text = new Map(items.map(item => [item, normalize([item.textContent,...Object.values(item.dataset)].join(" "))]));
    for (const field of fields) {
      const values = [...new Set(items.map(item => item.dataset[field]).filter(Boolean))].sort((a,b) => a.localeCompare(b,"es",{sensitivity:"base"}));
      for (const value of values) { const option = document.createElement("option"); option.value = value; option.textContent = value; selects[field].appendChild(option); }
    }
    function filter() {
      const terms = normalize(search.value).split(/\s+/).filter(Boolean);
      let count = 0;
      for (const item of items) {
        item.hidden = !terms.every(term => text.get(item).includes(term)) || fields.some(field => selects[field].value && item.dataset[field] !== selects[field].value);
        if (!item.hidden) count++;
      }
      for (const group of document.querySelectorAll(".directorio-subcategoria,.directorio-categoria,.directorio-marca")) group.hidden = !Array.from(group.querySelectorAll(".directorio-item")).some(item => !item.hidden);
      document.getElementById("directorio-contador").textContent = count + (count === 1 ? " producto" : " productos");
      document.getElementById("directorio-vacio").hidden = count > 0;
    }
    form.hidden = false;
    form.addEventListener("input", filter);
    form.addEventListener("change", filter);
    form.addEventListener("submit", event => event.preventDefault());
    form.addEventListener("reset", () => setTimeout(filter, 0));
  }

  // El servicio existente aplica la exclusión de visitas propias y sus límites.
  // No se solicitan ubicación, IP, contactos ni datos del dispositivo.
  function registerVisit() {
    if (location.hostname !== "gruemp.github.io" || new URL(location.href).searchParams.has("verificacion")) return;
    if (/bot|crawler|spider|headless|lighthouse/i.test(navigator.userAgent || "")) return;
    const uuid = () => typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : "directorio-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    let visitor = "";
    try { visitor = localStorage.getItem("irenismb_user_id") || ""; } catch (_) {}
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(visitor)) { visitor = uuid(); try { localStorage.setItem("irenismb_user_id", visitor); } catch (_) {} }
    let referrer = "Directo / no detectable";
    try { if (document.referrer) referrer = new URL(document.referrer).hostname; } catch (_) {}
    const payload = new URLSearchParams({user_id:visitor,navegador:visitor,load_id:uuid(),fuente:"SIN_UBICACION",src:"SIN_UBICACION",origen:"Directorio de productos · " + referrer,categoria:"Productos Natura y Avon en Santa Marta",pagina:"productos_natura_y_avon_en_santa_marta.html"});
    fetch("https://script.google.com/macros/s/AKfycbygXijUyDrpyeA8qmheyZpYw9HVWuN_JZPIeYNbqRKKNYhqFFUguEMZmof4yLTtGbVO/exec", {method:"POST",mode:"no-cors",keepalive:true,body:payload}).catch(() => {});
  }
  if (document.visibilityState === "hidden") {
    const onVisible = () => { if (document.visibilityState !== "hidden") { document.removeEventListener("visibilitychange", onVisible); registerVisit(); } };
    document.addEventListener("visibilitychange", onVisible);
  } else registerVisit();
})();
