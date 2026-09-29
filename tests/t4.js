const fs=require('fs'); const {JSDOM,VirtualConsole}=require('jsdom');
const FILE=require('path').join(__dirname,'..','Recipes.html');
const T=(l,v,x)=>console.log((v?'PASS':'FAIL').padEnd(5),l,x===undefined?'':'  ['+x+']');

// ---------- scripts OFF: what Quick Look / Files preview shows ----------
{
  const d=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'outside-only'}).window.document;
  const cards=d.querySelectorAll('.card');
  console.log('=== JavaScript OFF');
  T('all recipes present in the HTML', cards.length===406, cards.length);
  T('stats show real numbers, not 0', d.getElementById('s-total').textContent==='406',
    [...d.querySelectorAll('.stats b')].map(b=>b.textContent).join('/'));
  T('ingredients are readable', d.querySelectorAll('.card .body ul li').length>3000,
    d.querySelectorAll('.card .body ul li').length+' ingredient lines');
  T('methods are readable', d.querySelectorAll('.card .body ol li').length>2000,
    d.querySelectorAll('.card .body ol li').length+' steps');
  T('a note explains what needs scripts', !!d.querySelector('noscript'));
  const s=d.querySelector('#r0 .body').textContent;
  T('a specific recipe is complete', s.includes('Egg whites')&&s.includes('medium heat'));
}

// ---------- scripts ON ----------
{
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message.split('\n')[0]));
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,
    virtualConsole:vc,url:'https://example.org/'});
  const w=dom.window,d=w.document,$=x=>d.querySelector(x),$$=x=>[...d.querySelectorAll(x)];
  const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  const vis=()=>$$('.card').filter(c=>!c.classList.contains('hidden')).length;
  console.log('\n=== JavaScript ON');
  T('no script errors', errs.length===0, errs.join(' | ')||'clean');
  T('cards adopted, none duplicated', $$('.card').length===406, $$('.card').length);
  T('all visible', vis()===406);
  T('plates drawn', $$('.card .thumb svg').length===406, $$('.card .thumb svg').length);
  T('menu picks 3', $$('.slot [data-go]').every(b=>b.textContent&&b.textContent!=='No match'));
  T('chips built', $$('.chip').length===121);
  const q=$('#q'); q.value='shakshuka'; q.dispatchEvent(new w.Event('input'));
  T('search works', vis()===1, vis()+' hit');
  q.value='paprika'; q.dispatchEvent(new w.Event('input'));
  T('search reaches method text', vis()>5, vis()+' recipes mention paprika');
  q.value=''; q.dispatchEvent(new w.Event('input'));
  ['Eggs','Avocado','Bread','Tomatoes','Cucumber'].forEach(n=>
    click($$('.chip').find(c=>c.querySelector('.nm').textContent===n)));
  T('ranking kicks in', $$('[data-sort]').every(x=>x.value==='match'));
  const ready=$$('.card.ready')[0];
  const short=$$('.card').find(c=>/to buy/.test(c.textContent));
  [ready,short].forEach(c=>{ if(c){c.open=true; c.dispatchEvent(new w.Event('toggle'));} });
  T('opening a card adds the plate', !!short.querySelector('.bigart svg'));
  T('a recipe short of something lists it', short.querySelector('[data-miss]').textContent.startsWith('Still need'),
    short.querySelector('h3').textContent+' -> '+short.querySelector('[data-miss]').textContent.slice(0,52));
  T('a ready recipe shows no shopping note', ready.querySelector('[data-miss]').textContent==='',
    ready.querySelector('h3').textContent);
  click($('#only'));
  T('filter still filters', vis()<406 && vis()>0, vis()+' cookable');
  click($('#reset'));
  T('reset restores', vis()===406);
}

// assertions are synchronous; leave before jsdom's pending timers keep the process alive
process.exit(0);
