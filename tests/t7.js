const fs=require('fs'); const {JSDOM,VirtualConsole}=require('jsdom');
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message.split('\n')[0]));
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',
  pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/'});
const w=dom.window,d=w.document,$=x=>d.querySelector(x),$$=x=>[...d.querySelectorAll(x)];
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const DATA=w.RECIPES_DATA;
const ITEMS=DATA.items;

// tick a realistic set of things you'd have at home
const HAVE=['Eggs','Tomatoes','Cucumber','Olive oil','Bread','Greek yogurt','Onion','Garlic','Lemon'];
HAVE.forEach(n=>{const c=$$('.chip').find(x=>x.querySelector('.nm').textContent===n); if(c) click(c);});
const haveIdx=new Set(HAVE.map(n=>ITEMS.findIndex(i=>i.n===n)));
console.log('ticked:', HAVE.join(', '));

const lines=[...$('#shop').querySelectorAll('.shoplist .txt')].map(e=>e.textContent);
console.log('list length:', lines.length);

// which picked recipes are on the menu, and what tags each listed line carries
const picks=[...$$('.slot')].map(s=>s.querySelector('[data-go]').textContent);
const byTitle={}; DATA.recipes.forEach(r=>{byTitle[r.t]=r;});
let leaks=[];
picks.forEach(t=>{
  const r=byTitle[t]; if(!r) return;
  const card=[...$$('.card')].find(c=>c.querySelector('h3').textContent===t);
  const lis=[...card.querySelectorAll('[data-body] ul li')];
  lis.forEach((li,idx)=>{
    if(li.classList.contains('grp')) return;
    const txt=li.textContent.trim();
    if(!lines.includes(txt)) return;                 // correctly filtered out
    const tags=(r.lt&&r.lt[idx])||[];
    const owned=tags.filter(i=>haveIdx.has(i)).map(i=>ITEMS[i].n);
    if(owned.length) leaks.push({txt, owned, tags:tags.map(i=>ITEMS[i].n)});
  });
});
console.log('\nLINES STILL LISTED DESPITE BEING OWNED:', leaks.length);
leaks.slice(0,10).forEach(l=>console.log('   "'+l.txt+'"  owned:', l.owned.join('/'), ' allTags:', l.tags.join('/')||'(none)'));

// and the reverse: untagged lines can never be filtered
let untagged=[];
picks.forEach(t=>{
  const r=byTitle[t]; if(!r) return;
  const card=[...$$('.card')].find(c=>c.querySelector('h3').textContent===t);
  [...card.querySelectorAll('[data-body] ul li')].forEach((li,idx)=>{
    if(li.classList.contains('grp')) return;
    const tags=(r.lt&&r.lt[idx])||[];
    if(!tags.length && lines.includes(li.textContent.trim())) untagged.push(li.textContent.trim());
  });
});
console.log('\nUNTAGGED lines on the list (can never be filtered):', untagged.length);
untagged.slice(0,8).forEach(x=>console.log('   ', x));
