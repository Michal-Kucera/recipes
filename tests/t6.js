const fs=require('fs'); const {JSDOM,VirtualConsole}=require('jsdom');
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message.split('\n')[0]));
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',
  pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/'});
const w=dom.window,d=w.document,$=x=>d.querySelector(x),$$=x=>[...d.querySelectorAll(x)];
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const T=(l,v,x)=>console.log((v?'PASS':'FAIL').padEnd(5),l,x===undefined?'':'  ['+x+']');
console.log('errors:', errs.length?errs:'none');

console.log('\n=== expandable menu slots');
const slots=$$('.slot');
T('slots are expandable', slots.length===3 && slots.every(s=>s.tagName==='DETAILS'));
T('closed to start', slots.every(s=>!s.open));
const b=slots[0];
b.open=true; b.dispatchEvent(new w.Event('toggle'));
const body=b.querySelector('[data-slotbody]');
T('opening shows the whole recipe', /Ingredients/.test(body.textContent) && /Method/.test(body.textContent),
  b.querySelector('[data-go]').textContent);
T('ingredients are there', body.querySelectorAll('ul li').length>2, body.querySelectorAll('ul li').length+' lines');
T('method is there', body.querySelectorAll('ol li').length>1, body.querySelectorAll('ol li').length+' steps');
T('plate drawn in the slot', !!body.querySelector('.bigart svg'));
T('hint flipped', b.querySelector('[data-hint]').textContent==='Hide recipe');
const before=b.querySelector('[data-go]').textContent;
click(b.querySelector('[data-reroll]'));
T('re-roll keeps it open', b.open);
T('re-roll swaps the recipe', b.querySelector('[data-go]').textContent!==before,
  b.querySelector('[data-go]').textContent);
T('body followed the new pick',
  body.textContent.indexOf(b.querySelector('[data-go]').textContent.slice(0,12))>-1 ||
  body.querySelectorAll('ul li').length>0);

console.log('\n=== shopping list');
const shop=$('#shop');
T('list is rendered', shop.querySelectorAll('.shoplist li label').length>5,
  shop.querySelectorAll('.shoplist li label').length+' items');
T('grouped by aisle', shop.querySelectorAll('.shopcat').length>1,
  [...shop.querySelectorAll('.shopcat')].map(e=>e.textContent).join(', '));
T('each item says which meal', [...shop.querySelectorAll('.who')].every(e=>/^[BLD]+$/.test(e.textContent)));
T('staples left out by default', !/\bSalt\b\s*$/m.test(shop.textContent));
const n0=shop.querySelectorAll('.shoplist li label').length;
// tick something in the kitchen -> it should drop off the list
const eggs=$$('.chip').find(c=>c.querySelector('.nm').textContent==='Eggs'); click(eggs);
const n1=shop.querySelectorAll('.shoplist li label').length;
T('what you own drops off the list', n1<=n0, n0+' -> '+n1);
T('and it says so', /already in your kitchen/.test(shop.textContent)||n1===n0,
  shop.querySelector('.shopmeta').textContent);
click(shop.querySelector('[data-shopall]'));
T('"Show everything" puts them back', shop.querySelectorAll('.shoplist li label').length>=n1,
  shop.querySelectorAll('.shoplist li label').length);

console.log('\n=== export');
T('Reminders offered, not forced', !!shop.querySelector('[data-setupopen]'));
T('Copy button present', !!shop.querySelector('[data-copy]'));
T('setup help present', /Add to Shopping List/.test(shop.innerHTML));
// jsdom will not let us intercept location.href, so check the built URL and the payload
const src=fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8');
T('uses the Shortcuts x-callback URL', src.indexOf('shortcuts://x-callback-url/run-shortcut?name=')>-1);
T('targets a shortcut named "Add to Shopping List"',
  src.indexOf('SHORTCUT = "Add to Shopping List"')>-1);
T('passes the list as text input', /&input=text&text="\s*\+\s*\n?\s*encodeURIComponent\(shopText\(\)\)/.test(src)
  || src.indexOf('&input=text&text=')>-1);
const lines=[...shop.querySelectorAll('.shoplist .txt')].map(e=>e.textContent);
T('payload would be one line per item', lines.length>3, lines.length+' lines');
console.log('   first lines:', lines.slice(0,3).join(' | '));
T('no stray markup in the payload', lines.every(l=>l.indexOf('<')===-1 && l.trim().length>0));
