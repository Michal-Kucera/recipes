const fs=require('fs'); const {JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.org/'});
const w=dom.window,d=w.document,$=x=>d.querySelector(x),$$=x=>[...d.querySelectorAll(x)];
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const T=(l,v,x)=>console.log((v?'PASS':'FAIL').padEnd(5),l,x===undefined?'':'  ['+x+']');
const rows=()=>[...$('#shop').querySelectorAll('.shoplist .txt')].map(e=>e.textContent);
const cardLines=t=>[...$$('.card').find(c=>c.querySelector('h3').textContent===t).querySelectorAll('[data-body] ul li:not(.grp)')].map(l=>l.textContent.trim());
function listMatchesMenu(){
  const titles=$$('.slot [data-go]').map(b=>b.textContent);
  const all=new Set(titles.flatMap(cardLines));
  return rows().every(r=>all.has(r));
}
console.log('=== the shopping list must always describe the menu on screen');
T('at boot', listMatchesMenu());
for(let i=0;i<3;i++){ click($$('.slot')[i].querySelector('[data-reroll]')); T('after re-rolling slot '+(i+1), listMatchesMenu()); }
click($('#shuffle')); T('after Shuffle the day', listMatchesMenu());
click($$('.chip').find(c=>c.querySelector('.nm').textContent==='Eggs')); T('after ticking Eggs', listMatchesMenu());
// persistence: the menu survives a reload, ticks included
const box=$('#shop .shoplist input'); box.checked=true; box.dispatchEvent(new w.Event('change',{bubbles:true}));
const before=$$('.slot [data-go]').map(b=>b.textContent), saved=w.localStorage.getItem('plated-menu-v1');
const dom2=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.org/',
  beforeParse(w2){ w2.localStorage.setItem('plated-menu-v1',saved); }});
const d2=dom2.window.document;
T('menu survives a reload', JSON.stringify([...d2.querySelectorAll('.slot [data-go]')].map(b=>b.textContent))===JSON.stringify(before));
T('ticks survive a reload', d2.querySelector('#shop .shoplist input').checked);
T('search ignores button text', (()=>{const q=d2.getElementById('q'); q.value='mark cooked'; q.dispatchEvent(new dom2.window.Event('input'));
  return [...d2.querySelectorAll('.card')].filter(c=>!c.classList.contains('hidden')).length===0;})());
T('search is accent-insensitive', (()=>{const q=d2.getElementById('q'); q.value='jamon'; q.dispatchEvent(new dom2.window.Event('input'));
  return [...d2.querySelectorAll('.card')].filter(c=>!c.classList.contains('hidden')).length>5;})());
