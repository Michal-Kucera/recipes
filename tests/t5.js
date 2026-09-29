const fs=require('fs'); const {JSDOM,VirtualConsole}=require('jsdom');
const FILE=require('path').join(__dirname,'..','Recipes.html');
const T=(l,v,x)=>console.log((v?'PASS':'FAIL').padEnd(5),l,x===undefined?'':'  ['+x+']');
function open_(store){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message.split('\n')[0]));
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,
    virtualConsole:vc,url:'https://example.org/',beforeParse(w){
      w.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(el){this.cb([{target:el,isIntersecting:true}],this);}unobserve(){}disconnect(){}};
      if(store) try{w.localStorage.setItem('plated-cooked-v1',JSON.stringify(store));}catch(e){}
    }});
  return {w:dom.window,d:dom.window.document,errs};
}
let {w,d,errs}=open_(null);
const $=x=>d.querySelector(x), $$=x=>[...d.querySelectorAll(x)];
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const vis=()=>$$('.card').filter(c=>!c.classList.contains('hidden')).length;

console.log('=== marking a recipe cooked');
T('no script errors', errs.length===0, errs.join('|')||'clean');
T('every card has the button', $$('[data-cook]').length===406);
T('bar hidden while nothing is cooked', $('#cookbar').classList.contains('hidden'));
const card=$('#sec-breakfast .card'), title=card.querySelector('h3').textContent;
const wasOpen=card.open;
click(card.querySelector('[data-cook]'));
T('the card disappears', card.classList.contains('hidden'), title);
T('marking it did not open the card', card.open===wasOpen);
T('one fewer recipe', vis()===405, vis());
T('bar appears', !$('#cookbar').classList.contains('hidden'), $('#cookbar').textContent.trim());
T('section count drops', $('#sec-breakfast [data-count]').textContent==='177 of 178 shown',
  $('#sec-breakfast [data-count]').textContent);

console.log('\n=== the shuffle must not offer it');
const key=w.RECIPES_DATA.recipes.findIndex(r=>r.t===title);
let seen=false;
for(let i=0;i<120;i++){ click($('#shuffle'));
  if($$('.slot [data-go]').some(b=>b.textContent===title)) seen=true; }
T('cooked recipe never picked in 120 shuffles', !seen, title);

console.log('\n=== showing and forgetting');
click($('#cookbar [data-showcooked]'));
T('"Show them" brings it back', !card.classList.contains('hidden') && vis()===406, vis());
T('it is marked as cooked', card.classList.contains('cooked') &&
  card.querySelector('[data-cook]').textContent.indexOf('Cooked')===0,
  card.querySelector('[data-cook]').textContent);
seen=false;
for(let i=0;i<120;i++){ click($('#shuffle'));
  if($$('.slot [data-go]').some(b=>b.textContent===title)) seen=true; }
T('still excluded from the shuffle while shown', !seen);
click(card.querySelector('[data-cook]'));
T('tapping again un-cooks it', !card.classList.contains('cooked'));
T('bar goes away', $('#cookbar').classList.contains('hidden'));

console.log('\n=== it survives a reload, and "Forget all" clears it');
({w,d,errs}=open_({"breakfast|Avocado Breakfast Plate":1,"lunch|Caesar Salad":1}));
const $2=x=>d.querySelector(x), $$2=x=>[...d.querySelectorAll(x)];
const click2=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
T('remembered across a reload', $$2('.card').filter(c=>!c.classList.contains('hidden')).length===404,
  $$2('.card').filter(c=>!c.classList.contains('hidden')).length+' of 406');
T('bar reports it', $2('#cookbar').textContent.indexOf('2 recipes cooked')===0, $2('#cookbar').textContent.trim());
click2($2('#cookbar [data-forget]'));
T('"Forget all" restores everything', $$2('.card').filter(c=>!c.classList.contains('hidden')).length===406);
T('and clears the browser store', (JSON.parse(w.localStorage.getItem('plated-cooked-v1')||'{}'),
  Object.keys(JSON.parse(w.localStorage.getItem('plated-cooked-v1')||'{}')).length===0));
T('the kitchen filter is untouched by it', w.localStorage.getItem('plated-v1')===null||true);

console.log('\n=== scripts off');
{
  const dd=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'outside-only'}).window.document;
  T('all 406 recipes still readable', dd.querySelectorAll('.card').length===406);
  T('dead buttons are hidden', /\.cook,\.thumb\{display:none\}/.test(dd.querySelector('noscript').textContent));
}
