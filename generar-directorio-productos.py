#!/usr/bin/env python3
"""Publica una lista estática desde los lectores públicos originales, sin precios ni datos privados."""
import argparse
import html
import json
from pathlib import Path
import re
import unicodedata
import urllib.request
from itertools import groupby
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "productos_natura_y_avon_en_santa_marta.html"
PRODUCTS_URL = "https://script.google.com/macros/s/AKfycbzuHYa9Uf_5v5-FhDXQFu6WRuW49DgxJLUHrm_tq1Vdk539VZjeQeGrlWWqgJj4SzMg2w/exec?modo=productos"
VISIBILITY_URL = "https://script.google.com/macros/s/AKfycbzVQGki8PkioPQL1bbsm3_z-yVBuG02PZ0kNkiQXbtP8Dp2wamppiXQgmBLEEAEVFde4A/exec?modo=visibilidad"
PAGE_URL = "https://gruemp.github.io/natura/" + OUTPUT.name

def norm(value):
    return " ".join("".join(c for c in unicodedata.normalize("NFD", str(value or "")) if not unicodedata.combining(c)).lower().split())

def record(text):
    fields = {}
    for line in str(text or "").splitlines():
        if ":" not in line:
            continue
        label, value = line.split(":", 1)
        key = norm(label)
        if key in fields:
            raise ValueError("Etiqueta duplicada en la fuente pública: " + label)
        fields[key] = value.strip()
    return fields

def pick(fields, *labels):
    return next((fields[norm(label)] for label in labels if fields.get(norm(label))), "")

def hidden(product, rules):
    sec, cat, sub, public, line = [norm(product[k]) for k in ["section", "category", "subcategory", "public", "line"]]
    paths = [("producto", product["id"]), ("seccion", sec), ("categoria", sec), ("categoria", cat), ("categoria", "|".join([sec,cat])), ("subcategoria", "|".join([sec,cat])), ("subcategoria", "|".join([sec,cat,sub])), ("publico", "|".join([sec,cat,sub,public])), ("linea", "|".join([sec,cat,sub,public,line])), ("familia", "|".join([cat,sub,line]))]
    return any((kind, ident) in rules for kind, ident in paths if ident)

def products_from_payload(payload, visibility):
    if payload.get("ok") is not True or payload.get("version") != 3:
        raise ValueError("El lector público no confirmó sus productos.")
    if visibility.get("ok") is not True or not isinstance(visibility.get("reglas"), list) or not visibility["reglas"]:
        raise ValueError("No se confirmaron las reglas públicas de visibilidad.")
    columns = [col.get("label") for col in payload.get("table", {}).get("cols", [])]
    if columns != ["Datos operativos del producto", "Etiquetas para fichas"]:
        raise ValueError("La estructura del lector público cambió.")
    rules = {(norm(r.get("tipo")), norm(r.get("identificador"))) for r in visibility["reglas"] if r.get("oculto") is True}
    result, seen = [], set()
    for row in payload["table"].get("rows", []):
        cells = row.get("c", [])
        if len(cells) < 2:
            raise ValueError("Fila pública incompleta.")
        a, b = record(cells[0].get("v")), record(cells[1].get("v"))
        brand = pick(a, "Marca")
        section = pick(a, "Sección", "Sección del catálogo")
        if norm(brand) not in {"natura", "avon"} or norm(section) != "belleza y cuidado":
            continue
        if norm(pick(a, "Disponibilidad", "Estado comercial", "Estado comercial del producto")) == "no a la venta":
            continue
        code = pick(a, "Código interno", "Código interno del producto", "Código")
        if not re.fullmatch(r"\d{1,4}", code):
            raise ValueError("Producto sin código original válido.")
        code = code.zfill(4)
        if code in seen:
            raise ValueError("Código duplicado: " + code)
        seen.add(code)
        name = pick(a, "Nombre completo para publicar", "Nombre", "Nombre comercial del producto") or pick(b, "Nombre", "Nombre completo para publicar")
        p = {"id": code, "name": name, "brand": "Natura" if norm(brand) == "natura" else "Avon", "section": section,
             "category": pick(a,"Categoría","Categoría del producto"), "subcategory": pick(a,"Subcategoría","Subcategoría del producto"),
             "line": pick(a,"Línea","Línea comercial"), "public": pick(a,"Público","Público destinatario")}
        if not name or not p["category"]:
            raise ValueError("Producto sin nombre o categoría: " + code)
        if hidden(p, rules):
            continue
        # Lista explícita de atributos identificativos; nunca exportar costos,
        # precios, stock, referencias, contactos, instrucciones ni notas internas.
        specifications = []
        candidates = [
            ("Contenido", " ".join(filter(None,[pick(a,"Contenido","Cantidad de contenido"),pick(a,"Unidad","Unidad de medida del contenido")])) or pick(b,"Contenido","Contenido y presentación")),
            ("Presentación",pick(a,"Presentación","Formato de presentación","Tipo de presentación") or pick(b,"Presentación","Presentación verificada","Formato de presentación")),
            ("Unidades",pick(a,"Cantidad de unidades") or pick(b,"Unidades incluidas")),
            ("Componentes"," · ".join(pick(a,"Componente " + str(i)) for i in range(1,5) if pick(a,"Componente " + str(i))) or pick(b,"Componentes","Componentes incluidos")),
            ("Tipo",pick(a,"Tipo","Tipo de producto")),
            ("Variante",pick(a,"Variante","Variante del producto") or pick(b,"Variedad")),
            ("Característica",pick(a,"Característica","Característica distintiva")),
        ]
        for label in ["Tono","Tamaño","Aroma","Fragancia","Tipo de piel","Tipo de cabello","Familia olfativa","Tipo de fragancia","Textura","Textura y acabado","Acabado","Protección solar"]:
            candidates.append((label,pick(a,label) or pick(b,label)))
        used = set()
        for label, value in candidates:
            if value and norm(value) not in used:
                specifications.append((label,value)); used.add(norm(value))
        p["specifications"] = specifications
        # El contenido forma parte del nombre publicado cuando no estaba incluido.
        content = candidates[0][1]
        if content and norm(content) not in norm(name):
            p["name"] = name + " — " + content
        result.append(p)
    if not result:
        raise ValueError("La fuente no contiene productos publicables; se conserva el HTML anterior.")
    return sorted(result,key=lambda p: tuple(norm(p[k]) for k in ["brand","category","subcategory","name"]) + (p["id"],))

def esc(value):
    return html.escape(str(value), quote=True)

def render(products):
    sections, links = [], []
    for brand, brand_items in groupby(products,key=lambda p:p["brand"]):
        brand_items = list(brand_items)
        brand_id = "marca-" + norm(brand)
        links.append(f'<a href="#{brand_id}">{esc(brand)} <span>({len(brand_items)})</span></a>')
        sections.append(f'<section class="directorio-marca" id="{brand_id}"><h2>{esc(brand)}</h2>')
        for category, category_items in groupby(brand_items,key=lambda p:p["category"]):
            sections.append(f'<section class="directorio-categoria"><h3>{esc(category)}</h3>')
            for subcategory, sub_items in groupby(category_items,key=lambda p:p["subcategory"]):
                sections.append('<section class="directorio-subcategoria">' + (f'<h4>{esc(subcategory)}</h4>' if subcategory else '') + '<ul class="directorio-items">')
                for p in sub_items:
                    code = p["id"]
                    url = "catalogo.html?producto=" + code
                    photo = url + "&amp;imagen=1"
                    attrs = {"marca":p["brand"],"categoria":p["category"],"subcategoria":p["subcategory"],"linea":p["line"],"publico":p["public"]}
                    attributes = " ".join('data-' + k + '="' + esc(v) + '"' for k,v in attrs.items())
                    meta = " · ".join(["ID " + code] + (["Línea " + p["line"]] if p["line"] else []) + ([p["public"]] if p["public"] else []))
                    specs = " · ".join(label + ": " + value for label,value in p["specifications"])
                    sections.append(f'<li class="directorio-item" id="producto-{code}" data-product-id="{code}" {attributes}><div><h5><a href="{photo}">{esc(p["name"])}</a></h5><p class="directorio-meta">{esc(meta)}</p><p class="directorio-especificaciones">{esc(specs)}</p></div><div class="directorio-acciones"><a href="{photo}" aria-label="Ver foto de {esc(p["name"])}">Ver foto del producto</a><a href="{url}" aria-label="Ver {esc(p["name"])} y comprar en el catálogo">Ver y comprar en el catálogo <span aria-hidden="true">→</span></a></div></li>')
                sections.append('</ul></section>')
            sections.append('</section>')
        sections.append('</section>')
    structured = {"@context":"https://schema.org","@type":"CollectionPage","name":"Productos Natura y Avon en Santa Marta","url":PAGE_URL,"inLanguage":"es-CO","mainEntity":{"@type":"ItemList","numberOfItems":len(products),"itemListElement":[{"@type":"ListItem","position":i+1,"name":p["name"],"url":"https://gruemp.github.io/natura/catalogo.html?producto="+p["id"]} for i,p in enumerate(products)]}}
    values = {"brand_links":"\n".join(links),"product_list":"\n".join(sections),"product_count":str(len(products)),"structured_data":json.dumps(structured,ensure_ascii=False,separators=(",",":")).replace("<","\\u003c")}
    document = (ROOT / "directorio-productos.plantilla.html").read_text(encoding="utf-8")
    for key, value in values.items():
        document = document.replace("{{"+key+"}}",value)
    return document

def read_source(path, url):
    if path:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    with urllib.request.urlopen(url,timeout=55) as response:
        return json.load(response)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--products-json")
    parser.add_argument("--visibility-json")
    args = parser.parse_args()
    products = products_from_payload(read_source(args.products_json,PRODUCTS_URL),read_source(args.visibility_json,VISIBILITY_URL))
    document = render(products)
    changed = not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != document
    if changed:
        OUTPUT.write_text(document,encoding="utf-8")
        sitemap = ROOT / "sitemap.xml"
        if sitemap.exists():
            original = sitemap.read_text(encoding="utf-8")
            today = datetime.now(ZoneInfo("America/Bogota")).date().isoformat()
            pattern = r"(<loc>" + re.escape(PAGE_URL) + r"</loc>\s*<lastmod>)[^<]+(</lastmod>)"
            sitemap.write_text(re.sub(pattern,lambda match:match[1]+today+match[2],original),encoding="utf-8")
    print(json.dumps({"productos":len(products),"actualizado":changed,"archivo":OUTPUT.name},ensure_ascii=False))

if __name__ == "__main__":
    main()
