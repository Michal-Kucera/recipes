const fs=require('fs'); const {JSDOM,VirtualConsole}=require('jsdom');
function boot(withShare){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message.split('\n')[0]));
  const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','Recipes.html'),'utf8'),{runScripts:'dangerously',
    pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/',
    beforeParse(w){ if(withShare) w.navigator.share=function(){return Promise.resolve();}; }});
  return {w:dom.window,d:dom.window.document,errs};
}
const T=(l,v,x)=>console.log((v?'PASS':'FAIL').padEnd(5),l,x===undefined?'':'  ['+x+']');

let {w,d,errs}=boot(false);
const $=x=>d.querySelector(x);
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
console.log('errors:', errs.length?errs:'none');
console.log('=== a phone that has never made the shortcut');
T('no "Send to Reminders" button at all', !$('#shop [data-remind]'));
T('Copy is the primary action', $('#shop [data-copy]').classList.contains('btn-main'),
  $('#shop [data-copy]').textContent);
T('paste instructions are visible', /tap a list and paste/.test($('#shop').textContent));
T('the Shortcuts route is offered, not forced', !!$('#shop [data-setupopen]'),
  $('#shop [data-setupopen]').textContent);
click($('#shop [data-setupopen]'));
T('it explains the exact error you saw',
  /Could not find the shortcut/.test($('#shop [data-setup]').textContent));
click($('#shop [data-setupdone]'));
T('after building it, the button appears', !!$('#shop [data-remind]'));
T('and the offer link is gone', !$('#shop [data-setupopen]'));

({w,d,errs}=boot(true));
const $2=x=>d.querySelector(x);
console.log('\n=== a phone with the native share sheet (iOS Safari)');
T('Share button offered', !!$2('#shop [data-share]'), $2('#shop [data-share]').textContent);
T('still no Reminders button by default', !$2('#shop [data-remind]'));
let shared=null;
w.navigator.share=function(o){shared=o;return Promise.resolve();};
$2('#shop [data-share]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
T('Share hands over the list text', !!shared && shared.text.split('\n').length>3,
  shared? shared.text.split('\n').length+' lines' : 'nothing');
console.log('   sample:', shared? shared.text.split('\n').slice(0,2).join(' | ') : '-');
