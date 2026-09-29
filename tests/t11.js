const fs=require('fs'); const {JSDOM,VirtualConsole}=require('jsdom');
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message.split('\n')[0]));
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/',
  beforeParse(w){ w.navigator.share=function(){return Promise.resolve();}; }});
const w=dom.window,d=w.document,$=x=>d.querySelector(x),$$=x=>[...d.querySelectorAll(x)];
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const T=(l,v,x)=>console.log((v?'PASS':'FAIL').padEnd(5),l,x===undefined?'':'  ['+x+']');
// capture what gets "downloaded"
let files=[]; const RealBlob=w.Blob;
w.Blob=function(parts,opts){ const b=new RealBlob(parts,opts); files.push({text:parts.join(''),type:opts&&opts.type}); return b; };
w.URL.createObjectURL=()=>'blob:test'; w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){ files[files.length-1].name=this.download; };
console.log('errors:', errs.length?errs:'none');

console.log('=== day menu -> calendar');
click($('#cal'));
const ics=files[0].text;
T('an .ics file is produced', files.length===1 && /\.ics$/.test(files[0].name), files[0].name);
T('correct media type', /^text\/calendar/.test(files[0].type));
T('CRLF line endings', ics.indexOf('\r\n')>-1 && !/[^\r]\n/.test(ics));
T('valid envelope', ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0') && ics.trim().endsWith('END:VCALENDAR'));
const events=ics.split('BEGIN:VEVENT').length-1;
T('one event per meal', events===3, events);
T('no line over 75 chars', ics.split('\r\n').every(l=>l.length<=75), Math.max(...ics.split('\r\n').map(l=>l.length))+' max');
T('floating local times (no Z, no TZID)', /DTSTART:\d{8}T080000\r\n/.test(ics) && !/DTSTART[^\r]*Z/.test(ics));
T('breakfast 08:00, lunch 13:00, dinner 19:00', /T080000/.test(ics)&&/T130000/.test(ics)&&/T190000/.test(ics));
const unfolded=ics.replace(/\r\n /g,'');
T('each event links to its recipe', (unfolded.match(/URL:https:\/\/michal-kucera\.github\.io\/recipes\/#r\d+/g)||[]).length===3);
T('notes carry ingredients and method', /INGREDIENTS\\n/.test(unfolded) && /METHOD\\n/.test(unfolded));
T('commas are escaped in text', !/DESCRIPTION:[^\r]*[^\\],/.test(unfolded.split('\r\n').find(l=>l.startsWith('DESCRIPTION'))||''));
const data=w.RECIPES_DATA;
const twoDay=$$('.slot [data-go]').map(b=>data.recipes.find(r=>r.t===b.textContent)).find(r=>/\b2\b/.test(r.s||''));
T('a 2-serving recipe repeats for 2 days', !twoDay || /RRULE:FREQ=DAILY;COUNT=2/.test(unfolded), twoDay?twoDay.t+' ('+twoDay.s+')':'no 2-serving pick this shuffle');
T('a 1-serving recipe has no repeat', (unfolded.match(/RRULE/g)||[]).length <= events);

console.log('\n=== per-recipe actions');
const card=$$('.card').find(c=>/2 servings/.test(c.textContent)); card.open=true; card.dispatchEvent(new w.Event('toggle'));
T('every opened recipe has the row', !!card.querySelector('[data-cal]') && !!card.querySelector('[data-rcopy]') && !!card.querySelector('[data-rremind]'));
T('share offered when the browser has it', !!card.querySelector('[data-rshare]'));
T('the note explains the day count', /2 servings, so 2 days/.test(card.querySelector('.calrow small').textContent), card.querySelector('.calrow small').textContent);
files=[]; click(card.querySelector('[data-cal]'));
T('single recipe exports one event', files.length===1 && (files[0].text.split('BEGIN:VEVENT').length-1)===1, files[0]&&files[0].name);
T('and repeats for its servings', /COUNT=2/.test(files[0].text));
let shared=null; w.navigator.share=o=>{shared=o;return Promise.resolve();};
click(card.querySelector('[data-rshare]'));
T('share hands over that recipe\'s ingredients', !!shared && shared.title===card.querySelector('h3').textContent && shared.text.split('\n').length>2, shared&&shared.text.split('\n').length+' lines');
T('ingredients skip staples', !/^Salt/m.test(shared.text) && !/olive oil/i.test(shared.text.split('\n').filter(l=>/^olive oil$/i.test(l)).join('')));
click(card.querySelector('[data-rremind]'));
T('Reminders opens setup when the shortcut is missing', !!$('#shop [data-setup]') && !$('#shop [data-setup]').classList.contains('hidden'));

console.log('\n=== from the menu slot (cloned body)');
const slot=$$('.slot')[1]; slot.open=true; slot.dispatchEvent(new w.Event('toggle'));
files=[]; click(slot.querySelector('[data-slotbody] [data-cal]'));
T('slot buttons resolve to the picked recipe', files.length===1 && files[0].text.indexOf('SUMMARY:Lunch: ')>-1);

console.log('\n=== deep link');
const dom2=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.org/#r7'});
T('#r7 opens recipe 7 on arrival', dom2.window.document.getElementById('r7').open===true);
