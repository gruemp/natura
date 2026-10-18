/* Composición exclusiva de la portada: no modifica productos, fichas ni pedidos. */
(() => {
  "use strict";
  const grid = document.getElementById("grid");
  const main = document.getElementById("catalogMain");
  const layout = document.querySelector(".catalog-layout");
  const header = document.querySelector(".site-header");
  const contact = document.querySelector(".catalog-contact");
  const left = document.querySelector(".catalog-navigation");
  const socialHome = document.querySelector(".social-contact-region");
  const social = document.querySelector(".social-contact-card");
  const info = document.querySelector(".catalog-products-info");
  const search = document.getElementById("q");
  if (!grid || !main || !layout) return;
  const desktop = window.matchMedia("(min-width:761px)");
  const names = new Map([
    ["perfumeria", "perfumeria"], ["cabello", "cabello"],
    ["cuidado personal", "cuidado-personal"], ["kits y combos", "kits-y-combos"],
    ["maquillaje", "maquillaje"], ["regalos", "regalos"]
  ]);
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  let artReady = false;
  let artRequested = false;
  let queued = false;
  const artUrl = new URL("assets/inicio/categorias-natura-avon.webp", document.currentScript?.src || document.baseURI || location.href).href;
  function arrange() {
    queued = false;
    const cards = Array.from(grid.children);
    const home = grid.classList.contains("root-nav-mode") &&
      grid.classList.contains("album-grid-mode") && cards.length > 0 &&
      cards.every(card => card.matches('.album-card[data-nav-level="category"]')) &&
      !String(search?.value || "").trim() &&
      !document.body.classList.contains("catalog-admin-mode");
    for (const [node, name] of [[layout,"catalog-home-layout"],[main,"catalog-home-main"],
      [header,"catalog-home-header"],[contact,"catalog-home-contact"],
      [info,"catalog-home-info"],[socialHome,"catalog-home-social"],
      [grid,"catalog-home-categories"]]) node?.classList.toggle(name, home);
    const images = window.INTERRUPTORES?.CARGAR_IMAGENES_CATALOGO !== false;
    layout.classList.toggle("catalog-home-art-ready", home && images && artReady);
    if (home) {
      for (const card of cards) {
        card.classList.add("home-category-tile");
        const key = names.get(normalize(card.querySelector(".album-label")?.textContent));
        if (key) card.dataset.homeCategory = key;
      }
      if (images && !artRequested) {
        artRequested = true;
        const image = new Image();
        image.onload = () => { artReady = true; queue(); };
        image.src = artUrl;
      }
    }
    if (socialHome && social && left) {
      const destination = home || !desktop.matches ? socialHome : left;
      if (social.parentElement !== destination) destination.appendChild(social);
      socialHome.hidden = !home && desktop.matches;
    }
  }
  function queue() {
    if (queued) return;
    queued = true;
    queueMicrotask(arrange);
  }
  // Cambios del nivel de navegación; el observador ignora las clases que añade esta portada.
  new MutationObserver(records => {
    if (records.some(record => record.type === "childList" ||
      record.attributeName === "class" &&
      (record.oldValue || "").replace(/\bcatalog-home-categories\b/g, "").trim() !==
      grid.className.replace(/\bcatalog-home-categories\b/g, "").trim())) queue();
  }).observe(grid, {childList:true, attributes:true, attributeFilter:["class"], attributeOldValue:true});
  new MutationObserver(queue).observe(document.body, {attributes:true, attributeFilter:["class"]});
  search?.addEventListener("input", queue);
  desktop.addEventListener("change", queue);
  window.addEventListener("irenismb:admin-section-change", queue);
  window.addEventListener("irenismb:configuracion-publica-actualizada", queue);
  arrange();
})();
