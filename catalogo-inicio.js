/* Composición exterior del catálogo: no modifica productos, fichas ni pedidos. */
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
  const promotion = document.getElementById("catalogPromotion");
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
  let wasPublic = false;
  const artUrl = new URL("assets/inicio/categorias-natura-avon.webp", document.currentScript?.src || document.baseURI || location.href).href;
  function arrange() {
    queued = false;
    const cards = Array.from(grid.children);
    const publicView = (cards.length > 0 || wasPublic) && !document.body.classList.contains("catalog-admin-mode");
    const albums = publicView && cards.length > 0 && grid.classList.contains("album-grid-mode") &&
      cards.every(card => card.matches(".album-card[data-nav-level]")) &&
      !String(search?.value || "").trim();
    const home = albums && grid.classList.contains("root-nav-mode") &&
      grid.classList.contains("album-grid-mode") && cards.length > 0 &&
      cards.every(card => card.matches('.album-card[data-nav-level="category"]')) &&
      !String(search?.value || "").trim() &&
      !document.body.classList.contains("catalog-admin-mode");
    // La anchura ampliada solo corresponde a navegación por álbumes.
    // Las fichas conservan exactamente la geometría original de sus columnas.
    layout.classList.toggle("catalog-home-layout", albums);
    contact?.classList.toggle("catalog-home-contact", albums);
    grid.classList.toggle("catalog-home-categories", albums);
    left?.classList.toggle("catalog-home-promotion", publicView);
    if (promotion && left && contact) {
      const destination = publicView && desktop.matches ? left : contact;
      if (promotion.parentElement !== destination) destination.appendChild(promotion);
    }
    for (const [node, name] of [[main,"catalog-home-main"],
      [header,"catalog-home-header"],
      [info,"catalog-home-info"],[socialHome,"catalog-home-social"]]) node?.classList.toggle(name, publicView);
    const images = window.INTERRUPTORES?.CARGAR_IMAGENES_CATALOGO !== false;
    layout.classList.toggle("catalog-home-art-ready", home && images && artReady);
    if (albums) {
      for (const card of cards) {
        card.classList.add("home-category-tile");
        const key = names.get(normalize(card.querySelector(".album-label")?.textContent));
        if (home && key) card.dataset.homeCategory = key;
        else delete card.dataset.homeCategory;
      }
      if (home && images && !artRequested) {
        artRequested = true;
        const image = new Image();
        image.onload = () => { artReady = true; queue(); };
        image.src = artUrl;
      }
    }
    // La composición original debe registrar primero el lugar de las redes.
    // Solo restauramos su distribución después de haber mostrado contenido del catálogo.
    if (socialHome && social && left && (publicView || wasPublic)) {
      const destination = publicView || !desktop.matches ? socialHome : left;
      if (social.parentElement !== destination) destination.appendChild(social);
      socialHome.hidden = !publicView && desktop.matches;
    }
    wasPublic = publicView;
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
  if (socialHome && left) {
    // La composición existente también mueve las redes al cambiar de anchura.
    // Reconciliar su destino evita depender del orden de los eventos de pantalla.
    const socialObserver = new MutationObserver(queue);
    socialObserver.observe(left, {childList:true});
    socialObserver.observe(socialHome, {childList:true});
  }
  search?.addEventListener("input", queue);
  desktop.addEventListener("change", queue);
  window.addEventListener("irenismb:admin-section-change", queue);
  window.addEventListener("irenismb:configuracion-publica-actualizada", queue);
  arrange();
})();
