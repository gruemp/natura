const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'catalogo-inicio.js'),'utf8');

test('Los estilos de la portada exigen su ámbito y no seleccionan fichas ni folleto',()=>{
  const css=fs.readFileSync(path.join(__dirname,'catalogo-inicio.css'),'utf8');
  assert.doesNotMatch(css,/\.catalog-ficha|\.ficha-|\.folleto-|\.card\b|:root|^body\b/m);
  for(const line of css.split('\n').filter(line=>line.includes('{')&&!line.startsWith('@'))){
    for(const selector of line.split('{')[0].split(','))
      assert.match(selector,/^\s*\.(?:catalog-home-|site-footer\.catalog-products-info\.catalog-home-info|social-contact-region\.catalog-home-social)/);
  }
});

function environment({images=true}={}) {
  const nodes = new Map();
  const make = (classes='') => {
    const tokens = new Set(classes.split(' ').filter(Boolean));
    const node = {children:[],dataset:{},hidden:false,events:{},parentElement:null,
      classList:{contains:s=>tokens.has(s),add:s=>tokens.add(s),toggle(s,on){on?tokens.add(s):tokens.delete(s);}},
      appendChild(child){if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(n=>n!==child);this.children.push(child);child.parentElement=this;},
      addEventListener(type,fn){this.events[type]=fn;},querySelector(){return null;},matches(){return false;}};
    Object.defineProperty(node,'className',{get:()=>[...tokens].join(' ')});
    return node;
  };
  for(const id of ['grid','catalogMain','q'])nodes.set('#'+id,make());
  for(const name of ['catalog-layout','site-header','catalog-contact','catalog-navigation','social-contact-region','social-contact-card','catalog-products-info'])nodes.set('.'+name,make(name));
  const grid=nodes.get('#grid');grid.classList.add('root-nav-mode');grid.classList.add('album-grid-mode');
  const names=['Perfumería','Cabello','Cuidado personal','Kits y combos','Maquillaje','Regalos'];
  grid.children=names.map(text=>{const n=make('album-card');n.matches=s=>s==='.album-card[data-nav-level="category"]';n.querySelector=()=>({textContent:text});return n;});
  const social=nodes.get('.social-contact-card'),left=nodes.get('.catalog-navigation');left.appendChild(social);
  const body=make();const observers=[];const tasks=[];const loads=[];
  const media={matches:true,addEventListener(_,fn){this.changed=fn;}};
  vm.runInNewContext(source,{
    document:{getElementById:id=>nodes.get('#'+id),querySelector:s=>nodes.get(s),body,currentScript:{src:'https://gruemp.github.io/natura/catalogo-inicio.js'}},
    window:{matchMedia:()=>media,INTERRUPTORES:{CARGAR_IMAGENES_CATALOGO:images},addEventListener(){}},
    location:{href:'https://gruemp.github.io/natura/catalogo.html'},URL,
    MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}},
    Image:class{constructor(){loads.push(this);}set src(value){this.url=value;}},
    queueMicrotask:fn=>tasks.push(fn)
  });
  const flush=()=>{let runs=0;while(tasks.length){assert.ok(++runs<20,'La composición no crea un ciclo');tasks.shift()();}};
  const render=()=>{observers[0].fn([{type:'childList'}]);flush();};
  return {nodes,grid,body,observers,media,loads,flush,render,social,left};
}

test('La portada conserva los nombres y cantidades del catálogo y devuelve las redes al pie',()=>{
  const env=environment();
  assert.equal(env.nodes.get('.catalog-layout').classList.contains('catalog-home-layout'),true);
  assert.equal(env.social.parentElement,env.nodes.get('.social-contact-region'));
  assert.equal(env.nodes.get('.social-contact-region').hidden,false);
  assert.equal(env.grid.children.length,6);
  assert.deepEqual(env.grid.children.map(n=>n.dataset.homeCategory),['perfumeria','cabello','cuidado-personal','kits-y-combos','maquillaje','regalos']);
  assert.equal(env.nodes.get('.catalog-layout').classList.contains('catalog-home-art-ready'),false);
  env.loads[0].onload();env.flush();
  assert.equal(env.nodes.get('.catalog-layout').classList.contains('catalog-home-art-ready'),true);
});

test('Al navegar, buscar o entrar en administración se restaura la distribución interna',()=>{
  for(const state of ['inner','product','search','admin']){
    const env=environment();
    if(state==='inner')env.grid.classList.toggle('root-nav-mode',false);
    if(state==='product')env.grid.children=[{matches:()=>false}];
    if(state==='search')env.nodes.get('#q').value='0499';
    if(state==='admin')env.body.classList.add('catalog-admin-mode');
    env.render();
    assert.equal(env.nodes.get('.catalog-layout').classList.contains('catalog-home-layout'),false,state);
    assert.equal(env.grid.classList.contains('catalog-home-categories'),false,state);
    assert.equal(env.social.parentElement,env.left,state);
    assert.equal(env.nodes.get('.social-contact-region').hidden,true,state);
  }
});

test('La portada respeta imágenes desactivadas y conserva las redes accesibles en móvil',()=>{
  const env=environment({images:false});assert.equal(env.loads.length,0);
  env.media.matches=false;env.grid.classList.toggle('root-nav-mode',false);env.media.changed();env.flush();
  assert.equal(env.social.parentElement,env.nodes.get('.social-contact-region'));
  assert.equal(env.nodes.get('.social-contact-region').hidden,false);
});

test('Las marcas de la propia portada no provocan una nueva composición',()=>{
  const env=environment();
  env.observers[0].fn([{type:'attributes',attributeName:'class',oldValue:'root-nav-mode album-grid-mode'}]);
  env.flush();
  assert.equal(env.loads.length,1);
});
