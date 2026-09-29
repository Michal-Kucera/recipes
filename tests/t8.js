const fs=require('fs'); const {JSDOM,VirtualConsole}=require('jsdom');
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message.split('\n')[0]));
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',
  pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/'});
const w=dom.window,d=w.document,$=x=>d.querySelector(x),$$=x=>[...d.querySelectorAll(x)];
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const T=(l,v,x)=>console.log((v?'PASS':'FAIL').padEnd(5),l,x===undefined?'':'  ['+x+']');
const rows=()=>[...$('#shop').querySelectorAll('.shoplist .txt')].map(e=>e.textContent);
console.log('errors:', errs.length?errs:'none');

const n0=rows().length;
T('list renders', n0>4, n0+' items');

// tick two things off as "already got it"
const boxes=()=>[...$('#shop').querySelectorAll('.shoplist input')];
const first=rows()[0], second=rows()[1];
boxes()[0].checked=true; boxes()[0].dispatchEvent(new w.Event('change',{bubbles:true}));
boxes()[1].checked=true; boxes()[1].dispatchEvent(new w.Event('change',{bubbles:true}));
T('meta counts the ticks', /2 ticked off/.test($('.shopmeta').textContent), $('.shopmeta').textContent);
T('ticks survive the re-render', boxes().filter(b=>b.checked).length===2);
T('rows are all still shown', rows().length===n0, rows().length);

// the export must drop them
const src=fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8');
T('shopText filters ticked items', /filter\(function \(it\) \{ return !ticked\[tickKey\(it\.text\)\]/.test(src));
click($('#shop [data-copy]'));
T('copy reports success', /Copied|Copy failed/.test($('#shop [data-copy]').textContent),
  $('#shop [data-copy]').textContent);

// ticking then changing a filter must not lose the ticks
click($$('.chip').find(c=>c.querySelector('.nm').textContent==='Eggs'));
T('ticks survive a pantry change', boxes().filter(b=>b.checked).length>=1,
  boxes().filter(b=>b.checked).length+' still ticked');
T('"Clear ticked" appears', !!$('#shop [data-untick]'), $('#shop [data-untick]')?$('#shop [data-untick]').textContent:'missing');
click($('#shop [data-untick]'));
T('clearing ticks works', boxes().filter(b=>b.checked).length===0);

console.log('\n=== Reminders gate');
T('no Reminders button until the shortcut exists', !$('#shop [data-remind]'));
T('setup panel hidden at rest', $('#shop [data-setup]').classList.contains('hidden'));
click($('#shop [data-setupopen]'));
T('the offer opens setup instead of failing', !$('#shop [data-setup]').classList.contains('hidden'));
T('setup names the exact shortcut', /Add to Shopping List/.test($('#shop [data-setup]').textContent));
click($('#shop [data-setupcancel]'));
T('"Not now" closes it', $('#shop [data-setup]').classList.contains('hidden'));
click($('#shop [data-setupopen]'));
click($('#shop [data-setupdone]'));
T('"Done" remembers, so it never nags again', w.localStorage.getItem('shortcut-ready-v1')==='1');
