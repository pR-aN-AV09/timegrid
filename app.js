(function(){
'use strict';
const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SCALES=['Hours','Days','Months'];
const uid=()=>'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ================= storage ================= */
function ls(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}}
function ss(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
let tasks=ls('tg_tasks',[]);           // includes deleted tombstones (needed for sync)
let dirty=new Set(ls('tg_dirty',[]));  // ids waiting to upload
let fired=ls('tg_fired',{});
const prefs=ls('tg_prefs',{});
const S={scale:prefs.scale??1,minPri:prefs.minPri??1,dot:prefs.dotSize||null,defMonth:!!prefs.defMonth,defYear:!!prefs.defYear,line:prefs.line!==false,alarms:prefs.alarms!==false,theme:prefs.theme||'',anchor:new Date(),calM:new Date(new Date().getFullYear(),new Date().getMonth(),1),follow:true,calFollow:true};
const live=()=>tasks.filter(t=>!t.deleted);
const persist=()=>{ss('tg_tasks',tasks);ss('tg_dirty',[...dirty]);queueAlarms()};
const savePrefs=()=>ss('tg_prefs',{scale:S.scale,minPri:S.minPri,theme:S.theme,dotSize:S.dot,defMonth:S.defMonth,defYear:S.defYear,line:S.line,alarms:S.alarms});
function applyTheme(v){const r=document.documentElement;if(v)r.dataset.theme=v;else delete r.dataset.theme}
applyTheme(S.theme);

function putTask(t){
  t.updated=Date.now();
  const i=tasks.findIndex(x=>x.id===t.id);
  if(i>=0)tasks[i]=t;else tasks.push(t);
  dirty.add(t.id);persist();queueSync();
}
function removeTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  t.deleted=true;t.updated=Date.now();dirty.add(id);persist();queueSync();
}

/* ================= helpers ================= */
const hue=p=>210-((p-1)/9)*210;
const col=p=>`hsl(${hue(p)} 68% 44%)`;
const dotCol=p=>`hsl(${hue(p)} 72% 52%)`;
const taskDate=t=>new Date(t.date+'T'+(t.time||'00:00'));
const dim=(y,m)=>new Date(y,m+1,0).getDate();
const visible=()=>live().filter(t=>t.priority>=S.minPri);
const tasksOn=k=>visible().filter(t=>t.date===k).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||b.priority-a.priority);
const dayTasks=k=>live().filter(t=>t.date===k).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
const fmtDate=k=>new Date(k+'T00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});

/* ================= dashboard ================= */
let W=900,H=380,M={l:44,r:16,t:16,b:40},lastW=0;
function range(){
  const a=S.anchor,y=a.getFullYear(),m=a.getMonth();
  if(S.scale===0){const s=new Date(y,m,a.getDate()),e=new Date(y,m,a.getDate()+1);return{s,e,label:s.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}}
  if(S.scale===1)return{s:new Date(y,m,1),e:new Date(y,m+1,1),label:MONTHS[m]+' '+y};
  return{s:new Date(y,0,1),e:new Date(y+1,0,1),label:String(y)};
}
function drawPlot(){
  const r=range();$('#dLabel').textContent=r.label;
  // Draw at the real on-screen width so text and dots keep their true size on phones.
  const svg=$('#plot');
  W=Math.max(280,Math.round(svg.parentElement.clientWidth||900));lastW=W;
  const narrow=W<560;
  H=narrow?310:Math.max(400,Math.min(580,Math.round(W*0.42)));
  M=narrow?{l:30,r:10,t:12,b:34}:{l:52,r:18,t:18,b:50};
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const pw=W-M.l-M.r,ph=H-M.t-M.b;
  const X=f=>M.l+f*pw,Y=p=>M.t+ph-((p-.5)/10)*ph;
  let g='';
  for(let p=1;p<=10;p++)g+=`<line class="gl" x1="${M.l}" x2="${W-M.r}" y1="${Y(p)}" y2="${Y(p)}"/><text x="${M.l-8}" y="${Y(p)+4.5}" text-anchor="end">${p}</text>`;
  // x-axis ticks: [position, label, label position]
  const ticks=[];
  if(S.scale===0){
    const step=narrow?4:2;
    for(let h=0;h<=24;h+=step)ticks.push([h/24,narrow?pad(h%24):pad(h%24)+':00',h/24]);
  }else if(S.scale===1){
    const n=dim(r.s.getFullYear(),r.s.getMonth());
    const step=Math.max(1,Math.ceil((narrow?24:28)/(pw/n)));
    for(let d=1;d<=n;d+=step)ticks.push([(d-1)/n,String(d),(d-1)/n+.5/n]);
  }else{
    for(let m=0;m<12;m++){
      const f=(new Date(r.s.getFullYear(),m,1)-r.s)/(r.e-r.s),f2=(new Date(r.s.getFullYear(),m+1,1)-r.s)/(r.e-r.s);
      ticks.push([f,MONTHS[m].slice(0,narrow?1:3),(f+f2)/2]);
    }
  }
  ticks.forEach(([f,l,lf])=>{g+=`<line class="gl" x1="${X(f)}" x2="${X(f)}" y1="${M.t}" y2="${H-M.b}"/><text x="${X(lf)}" y="${H-M.b+(narrow?15:19)}" text-anchor="middle">${l}</text>`});
  g+=`<line class="gl" x1="${W-M.r}" x2="${W-M.r}" y1="${M.t}" y2="${H-M.b}"/>`;
  g+=`<line class="ax" x1="${M.l}" x2="${W-M.r}" y1="${H-M.b}" y2="${H-M.b}"/><line class="ax" x1="${M.l}" x2="${M.l}" y1="${M.t}" y2="${H-M.b}"/>`;
  g+=`<text x="${M.l+pw/2}" y="${H-5}" text-anchor="middle">${['Hour of day','Day of month','Month'][S.scale]}</text>`;
  g+=`<text transform="translate(${narrow?9:13} ${M.t+ph/2}) rotate(-90)" text-anchor="middle">Priority</text>`;
  const nf=(Date.now()-r.s)/(r.e-r.s);
  if(nf>=0&&nf<=1)g+=`<line class="nowline" x1="${X(nf)}" x2="${X(nf)}" y1="${M.t}" y2="${H-M.b}"/><text x="${X(nf)+4}" y="${M.t+10}" style="fill:var(--accent)">now</text>`;
  const inRange=visible().filter(t=>{const d=taskDate(t);return d>=r.s&&d<r.e});
  // Hour view always shows a task on its deadline day; month/year views obey each task's switches.
  const shown=t=>S.scale===0||(S.scale===1&&t.showMonth!==false)||(S.scale===2&&t.showYear!==false);
  const inR=inRange.filter(shown).sort((a,b)=>taskDate(a)-taskDate(b));
  const hidden=inRange.length-inR.length;
  // Dots get smaller as the time scale gets wider: hours > days > months.
  const base=S.dot||(narrow?10:11),rad=[base,Math.max(3,Math.round(base*0.72)),Math.max(3,Math.round(base*0.54))][S.scale],sw=S.scale===2?1.2:2,seen={};
  let hits='',dots='';const pts=[];
  inR.forEach(t=>{
    const x0=X((taskDate(t)-r.s)/(r.e-r.s)),y0=Y(t.priority),key=Math.round(x0/(rad*2))+'_'+t.priority;
    const n=seen[key]=(seen[key]||0)+1,x=x0+(n-1)*(rad*2-2),cx=Math.min(x,W-M.r-rad);
    pts.push([cx,y0]);
    // small dots get an invisible larger tap area so they stay easy to press
    if(rad<9)hits+=`<circle data-id="${t.id}" cx="${cx}" cy="${y0}" r="12" fill="transparent" style="cursor:pointer"/>`;
    dots+=`<circle class="dot ${t.done?'done':''}" data-id="${t.id}" cx="${cx}" cy="${y0}" r="${rad}" stroke-width="${sw}" fill="${dotCol(t.priority)}" tabindex="0" role="button"><title>${esc(t.title||'Untitled')} · priority ${t.priority} · ${t.date} ${t.time||''}</title></circle>`;
  });
  // thin dotted line joining the dots in order of deadline time
  const link=(S.line&&pts.length>1)?`<path class="link" d="${pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ')}"/>`:'';
  g+=link+hits+dots;
  if(!inR.length){
    g+=`<text x="${M.l+pw/2}" y="${M.t+ph/2-6}" text-anchor="middle" style="font-size:13px">Nothing due in this range${S.minPri>1?' at this priority':''}.</text>`;
    g+=`<text x="${M.l+pw/2}" y="${M.t+ph/2+14}" text-anchor="middle" style="font-size:13px">Tap a calendar day to add a task.</text>`;
  }
  svg.innerHTML=g;
  $('#tapnote').textContent='Tap a dot, or a task below, to edit it.'+(hidden?` ${hidden} task${hidden>1?'s are':' is'} hidden in this view (switched off in the task\'s settings).`:'');
  $('#dList').innerHTML=inR.map(t=>`<div class="titem ${t.done?'done':''}" data-id="${t.id}"><span class="pdot" style="background:${dotCol(t.priority)}"></span><span class="t">${esc(t.title||'Untitled')}</span><span class="m">P${t.priority} · ${t.date.slice(5)} ${t.time||''}</span></div>`).join('');
}
// Redraw when the window is resized or the phone is rotated.
let rsz=null;
window.addEventListener('resize',()=>{clearTimeout(rsz);rsz=setTimeout(()=>{const w=Math.round($('#plot').parentElement.clientWidth||900);if(Math.max(280,w)!==lastW)drawPlot()},150)});
$('#plot').addEventListener('click',e=>{const id=e.target.dataset&&e.target.dataset.id;if(id)openEditor(null,id)});
$('#plot').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.id)openEditor(null,e.target.dataset.id)});
$('#dList').addEventListener('click',e=>{const it=e.target.closest('.titem');if(it)openEditor(null,it.dataset.id)});
function shift(dir){S.follow=false;const a=S.anchor;
  if(S.scale===0)S.anchor=new Date(a.getFullYear(),a.getMonth(),a.getDate()+dir);
  else if(S.scale===1)S.anchor=new Date(a.getFullYear(),a.getMonth()+dir,1);
  else S.anchor=new Date(a.getFullYear()+dir,0,1);
  drawPlot()}
$('#dPrev').onclick=()=>shift(-1);$('#dNext').onclick=()=>shift(1);
$('#dToday').onclick=()=>{S.anchor=new Date();S.follow=true;drawPlot()};

/* ================= sliders ================= */
function buildRng(){document.querySelectorAll('.rng').forEach(r=>{const n=+r.dataset.n;r.querySelector('.stops').innerHTML=Array.from({length:n},(_,i)=>`<i style="left:calc(10px + (100% - 20px) * ${i/(n-1)})"></i>`).join('')})}
function fillRng(){document.querySelectorAll('.rng').forEach(r=>{const i=r.querySelector('input'),f=(i.value-i.min)/(i.max-i.min);r.querySelector('.fill').style.width=`calc(10px + (100% - 20px) * ${f})`})}
function syncSliders(){
  $('#scale').value=S.scale;$('#scaleOut').textContent=SCALES[S.scale];
  $('#minPri').value=S.minPri;$('#priOut').textContent=S.minPri+' and up';fillRng();
}
$('#scale').oninput=e=>{S.scale=+e.target.value;syncSliders();savePrefs();drawPlot()};
$('#minPri').oninput=e=>{S.minPri=+e.target.value;syncSliders();savePrefs();render()};

/* ================= calendar ================= */
function drawCal(){
  const y=S.calM.getFullYear(),m=S.calM.getMonth();
  $('#cLabel').textContent=MONTHS[m]+' '+y;
  const first=new Date(y,m,1),start=new Date(y,m,1-((first.getDay()+6)%7));
  let h=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="dow">${d}</div>`).join('');
  const todayK=dkey(new Date());
  for(let i=0;i<42;i++){
    const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),k=dkey(d);
    if(i>=35&&d.getMonth()!==m)break;
    const ts=tasksOn(k);
    h+=`<button class="cell ${d.getMonth()!==m?'out':''} ${k===todayK?'today':''}" data-k="${k}" aria-label="${fmtDate(k)}, ${ts.length} tasks"><span class="n">${d.getDate()}</span>${ts.slice(0,3).map(t=>`<span class="chip ${t.done?'done':''}" style="background:${col(t.priority)}">${esc(t.title||'Untitled')}</span>`).join('')}${ts.length>3?`<span class="more">+${ts.length-3} more</span>`:''}</button>`;
  }
  $('#cal').innerHTML=h;
}
$('#cal').addEventListener('click',e=>{const c=e.target.closest('.cell');if(c)openEditor(c.dataset.k,null,c)});
$('#cPrev').onclick=()=>{S.calFollow=false;S.calM=new Date(S.calM.getFullYear(),S.calM.getMonth()-1,1);drawCal()};
$('#cNext').onclick=()=>{S.calFollow=false;S.calM=new Date(S.calM.getFullYear(),S.calM.getMonth()+1,1);drawCal()};

/* ================= pop-ups and the phone's Back button ================= */
// Each pop-up adds one history entry, so Back closes the pop-up instead of leaving the app.
let layer=null;
function showLayer(el){
  if(layer===el)return;
  if(layer){layer.classList.remove('open');layer=el;el.classList.add('open');return}
  layer=el;el.classList.add('open');
  try{history.pushState({tgLayer:1},'')}catch(e){}
}
function hideLayer(){
  if(!layer)return;
  layer.classList.remove('open');layer=null;
  try{history.back()}catch(e){}
}
window.addEventListener('popstate',()=>{if(layer){layer.classList.remove('open');layer=null}});
// Touching a slider or switch while a text box still has the cursor would make a phone show the
// keyboard again; take the cursor out of the text box first.
const TEXTY='textarea,input[type=text],input[type=number]';
document.addEventListener('pointerdown',e=>{
  const a=document.activeElement;
  if(a&&a.matches&&a.matches(TEXTY)&&!(e.target.closest&&e.target.closest(TEXTY)))a.blur();
},true);
// Called by the Android app's Back button: close the open pop-up, or say there was none.
window.tgBack=()=>{if(!layer)return false;hideLayer();return true};

/* ================= task editor ================= */
let E={date:null,id:null};
const BEFORE=[0,5,10,15,30,60];
const fmtBefore=m=>!m?'Off':m<60?m+' min':'1 hr';
function blank(date){return{id:uid(),title:'',notes:'',date,time:'17:00',priority:5,remFreq:0,remStart:'09:00',remEnd:'20:00',remDays:0,remBefore:0,showMonth:S.defMonth,showYear:S.defYear,done:false}}
function openEditor(date,id,originEl){
  if(id){const t=tasks.find(x=>x.id===id);if(!t||t.deleted)return;E.date=t.date;E.id=id}
  else{E.date=date;E.id=null}
  const m=$('#modal');
  if(originEl){const r=originEl.getBoundingClientRect();m.style.transformOrigin=`${r.left+r.width/2}px ${r.top+r.height/2}px`}
  else m.style.transformOrigin='center';
  showLayer($('#scrim'));
  m.style.animation='none';void m.offsetWidth;m.style.animation='';
  fillEditor();
  // Only auto-focus the title with a mouse. On a phone this would pop up the keyboard
  // when you just want to look at a task.
  if(window.matchMedia&&matchMedia('(pointer:fine)').matches)setTimeout(()=>$('#fTitle').focus(),50);
}
function fillEditor(){
  $('#mTitle').textContent=fmtDate(E.date);
  $('#tabs').innerHTML=dayTasks(E.date).map(t=>`<button class="tab ${t.id===E.id?'on':''}" data-id="${t.id}"><span class="pdot" style="background:${dotCol(t.priority)};width:9px;height:9px"></span>${esc(t.title||'Untitled')}</button>`).join('')+`<button class="tab ${!E.id?'on':''}" data-id="">+ New</button>`;
  const t=E.id?tasks.find(x=>x.id===E.id):blank(E.date);
  $('#fPri').value=t.priority;$('#pOut').textContent=t.priority;
  $('#fTitle').value=t.title;$('#fNotes').value=t.notes;$('#fDate').value=t.date;$('#fTime').value=t.time||'17:00';
  $('#fFreq').value=t.remFreq;$('#fRS').value=t.remStart;$('#fRE').value=t.remEnd;$('#fRD').value=t.remDays;$('#fBefore').value=Math.max(0,BEFORE.indexOf(t.remBefore||0));$('#fMonth').checked=t.showMonth!==false;$('#fYear').checked=t.showYear!==false;
  $('#delBtn').style.display=E.id?'':'none';$('#doneBtn').style.display=E.id?'':'none';
  $('#doneBtn').textContent=t.done?'Mark not done':'Mark done';
  updateSummary();
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;E.id=b.dataset.id||null;fillEditor()});
function formTask(){
  return{id:E.id||uid(),title:$('#fTitle').value.trim(),notes:$('#fNotes').value,date:$('#fDate').value||E.date,time:$('#fTime').value||'17:00',
    priority:+$('#fPri').value,remFreq:Math.max(0,Math.min(30,+$('#fFreq').value||0)),remStart:$('#fRS').value||'09:00',remEnd:$('#fRE').value||'20:00',
    remDays:Math.max(0,Math.min(365,+$('#fRD').value||0)),remBefore:BEFORE[+$('#fBefore').value]||0,showMonth:$('#fMonth').checked,showYear:$('#fYear').checked,done:E.id?!!tasks.find(x=>x.id===E.id).done:false};
}
function updateSummary(){
  $('#pOut').textContent=$('#fPri').value;fillRng();
  const t=formTask();
  $('#bOut').textContent=fmtBefore(t.remBefore);
  const pre=t.remBefore?fmtBefore(t.remBefore)+' before the deadline':'';
  if(!t.remFreq){$('#remSummary').textContent=pre?`One reminder ${pre}.`:'Reminders are off. Set a frequency above 0 or pick a "remind me before" time to turn them on.';return}
  const days=t.remDays+1;
  $('#remSummary').textContent=`${t.remFreq} reminder${t.remFreq>1?'s':''} a day at random times between ${t.remStart} and ${t.remEnd}, for ${days} day${days>1?'s':''} up to the deadline (${t.remFreq*days} in total at most).`
    +(pre?` On the deadline day the last one rings ${pre}.`:'');
}
['fPri','fFreq','fRS','fRE','fRD','fBefore','fDate','fTime'].forEach(id=>$('#'+id).addEventListener('input',updateSummary));
const closeEditor=()=>{if(layer===$('#scrim'))hideLayer()};
$('#cancelBtn').onclick=closeEditor;
$('#scrim').addEventListener('mousedown',e=>{if(e.target.id==='scrim')closeEditor()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeEditor();closeAcc()}});
$('#saveBtn').onclick=()=>{
  const t=formTask();
  if(!t.title){$('#fTitle').focus();$('#fTitle').style.borderColor='#c0392b';return}
  $('#fTitle').style.borderColor='';
  putTask(t);closeEditor();render();toast('Saved',t.title);
};
$('#delBtn').onclick=()=>{if(!E.id)return;removeTask(E.id);closeEditor();render()};
$('#doneBtn').onclick=()=>{const t=tasks.find(x=>x.id===E.id);if(!t)return;t.done=!t.done;putTask(t);closeEditor();render()};
$('#newBtn').onclick=()=>openEditor(dkey(new Date()),null);

/* ================= reminders ================= */
function hash(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}return h>>>0}
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const toMin=s=>{const [h,m]=(s||'0:0').split(':').map(Number);return h*60+m};
function remindersFor(t){
  const before=t.remBefore||0;
  if((!t.remFreq&&!before)||t.done||t.deleted)return[];
  const out=[],dl=new Date(t.date+'T00:00'),dlMin=toMin(t.time);
  // "Remind me before": one reminder that many minutes before the deadline. On the deadline day it
  // counts as the last of the daily reminders, so the random ones fall before it.
  if(before){
    const min=dlMin-before,k=dkey(dl);
    out.push({key:t.id+'|'+k+'|'+min,at:new Date(dl.getFullYear(),dl.getMonth(),dl.getDate(),0,min),task:t});
  }
  for(let d=0;d<=t.remDays&&t.remFreq;d++){
    const day=new Date(dl.getFullYear(),dl.getMonth(),dl.getDate()-d),k=dkey(day);
    const a=toMin(t.remStart);let b=toMin(t.remEnd);
    if(d===0)b=Math.min(b,before?dlMin-before:dlMin);
    if(b<=a)continue;
    const span=b-a,want=Math.min(d===0&&before?t.remFreq-1:t.remFreq,span),r=rng(hash(t.id+'|'+k)),set=new Set();
    let guard=0;while(set.size<want&&guard++<500)set.add(a+Math.floor(r()*span));
    [...set].sort((x,y)=>x-y).forEach(min=>out.push({key:t.id+'|'+k+'|'+min,at:new Date(day.getFullYear(),day.getMonth(),day.getDate(),0,min),task:t}));
  }
  return out;
}
const allReminders=()=>tasks.flatMap(remindersFor);
function drawTodayRem(){
  const k=dkey(new Date()),now=Date.now();
  const list=allReminders().filter(r=>dkey(r.at)===k).sort((a,b)=>a.at-b.at);
  $('#todayRem').innerHTML=list.length?list.map(r=>`<span class="rtag ${r.at<now?'past':''}"><b>${pad(r.at.getHours())}:${pad(r.at.getMinutes())}</b> ${esc(r.task.title||'Untitled')}</span>`).join(''):'<span class="hint">No reminders scheduled for today.</span>';
}
function toast(title,body,persist){
  const el=document.createElement('div');el.className='toast';el.innerHTML=`<b>${esc(title)}</b>${esc(body||'')}`;
  el.onclick=()=>el.remove();$('#toasts').appendChild(el);
  setTimeout(()=>el.remove(),persist?15000:3000);
}
async function systemNotify(title,body){
  if(nativeAlarmsOn()&&!arguments[2])return; // phone alarms replace web notifications
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    // Service-worker notifications are required on Android and work on desktop too.
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification(title,{body,icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:title});
    }else new Notification(title,{body});
  }catch(e){}
}
function tick(){
  const now=Date.now();let changed=false;
  allReminders().forEach(r=>{
    if(r.at>now||fired[r.key])return;
    fired[r.key]=1;changed=true;
    if(now-r.at>2*3600e3)return;
    const msg=`Priority ${r.task.priority} · due ${r.task.date} ${r.task.time||''}`;
    const title='Reminder: '+(r.task.title||'Untitled');
    toast(title,msg,true);systemNotify(title,msg);
  });
  if(changed){
    const keys=Object.keys(fired);if(keys.length>1500)keys.slice(0,500).forEach(k=>delete fired[k]);
    ss('tg_fired',fired);drawTodayRem();
  }
}
/* ================= phone alarms (Android app only) ================= */
const ALARM_DAYS=14,ALARM_CAP=400;
const nativeAlarmsOn=()=>!!(window.TGNative&&TGNative.available&&S.alarms);
const alarmId=k=>(hash(k)%2000000000)+1;
function alarmList(){
  const now=Date.now(),end=now+ALARM_DAYS*864e5;
  return allReminders().filter(r=>r.at>now&&r.at<=end).sort((a,b)=>a.at-b.at).slice(0,ALARM_CAP).map(r=>({
    id:alarmId(r.key),at:r.at.getTime(),title:r.task.title||'Untitled',
    body:`Priority ${r.task.priority} · due ${r.task.date} ${r.task.time||''}`.trim(),priority:r.task.priority||5}));
}
let alarmTimer=null;
function queueAlarms(){
  if(!(window.TGNative&&TGNative.available))return;
  clearTimeout(alarmTimer);alarmTimer=setTimeout(pushAlarms,800);
}
async function pushAlarms(){
  if(!(window.TGNative&&TGNative.available))return;
  try{ if(S.alarms)await TGNative.schedule(alarmList()); else await TGNative.cancelAll(); }catch(e){console.warn('alarm sync failed',e)}
  refreshAlarmUI();
}
async function refreshAlarmUI(){
  const box=$('#alarmSec');if(!box)return;
  if(!(window.TGNative&&TGNative.available)){box.hidden=true;return}
  box.hidden=false;$('#sAlarms').checked=S.alarms;
  let st={};try{st=await TGNative.getStatus()}catch(e){}
  const bad=[];
  if(st.exactAlarmAllowed===false)bad.push(['exactAlarm','Allow exact alarms']);
  if(st.fullScreenAllowed===false)bad.push(['fullScreen','Allow full-screen alerts']);
  if(st.notificationsAllowed===false)bad.push(['notifications','Allow notifications']);
  if(st.soundName)$('#alarmSoundName').textContent=st.soundName;
  $('#sOverlay').checked=st.overlayAllowed!==false;
  $('#sBattery').checked=st.batteryOptimizationIgnored!==false;
  $('#alarmState').textContent=(st.scheduledCount!=null?st.scheduledCount+' alarm(s) scheduled in the next '+ALARM_DAYS+' days. ':'')+(bad.length?'Fix the items below so alarms always ring.':'All permissions look good.');
  $('#alarmFix').innerHTML=bad.map(b=>`<button class="btn sm" data-page="${b[0]}">${b[1]}</button>`).join('');
  $('#alarmFix').querySelectorAll('button').forEach(b=>b.onclick=()=>TGNative.openSettings(b.dataset.page).finally(refreshAlarmUI));
}
/* ================= settings window ================= */
function updateNotifBtn(){
  const st=$('#notifState'),en=$('#notifEnable'),te=$('#notifTest');
  if(!('Notification' in window)){st.textContent='This browser does not support notifications. In-app alerts still work.';en.style.display='none';te.style.display='none';return}
  const p=Notification.permission;
  en.style.display=p==='default'?'':'none';te.style.display=p==='granted'?'':'none';
  st.textContent=p==='granted'?'On. Reminders also appear as system notifications. To turn them off, change the site permission in your browser or phone settings.'
    :p==='denied'?'Blocked. To allow them, change the site permission in your browser or phone settings.'
    :'Off. Enable them to get reminders as system notifications.';
}
$('#notifEnable').onclick=()=>{
  Notification.requestPermission().then(p=>{
    if(p==='granted'){toast('Notifications on','You will get system alerts too.');systemNotify('Timegrid','Notifications are working.')}
    else toast('Notifications not enabled','You can allow them in your browser site settings.');
    updateNotifBtn();
  });
};
$('#notifTest').onclick=()=>{toast('Test reminder','This is how a reminder looks.',true);systemNotify('Timegrid','This is how a reminder looks.')};

function syncSettings(){
  refreshAlarmUI();
  const narrow=(document.querySelector('#plot').parentElement.clientWidth||900)<560,def=narrow?10:11;
  $('#sDot').value=S.dot||def;$('#sDotOut').textContent=S.dot?S.dot+' px':'Default ('+def+' px)';
  document.querySelectorAll('input[name=theme]').forEach(r=>r.checked=r.value===S.theme);
  $('#sDefMonth').checked=S.defMonth;$('#sDefYear').checked=S.defYear;$('#sLine').checked=S.line;fillRng();
}
$('#sDot').addEventListener('input',e=>{fillRng();S.dot=+e.target.value;$('#sDotOut').textContent=S.dot+' px';savePrefs();drawPlot()});
$('#sDotReset').onclick=()=>{S.dot=null;savePrefs();syncSettings();drawPlot()};
document.querySelectorAll('input[name=theme]').forEach(r=>r.addEventListener('change',e=>{S.theme=e.target.value;applyTheme(S.theme);savePrefs()}));
$('#sAlarms').addEventListener('change',e=>{S.alarms=e.target.checked;savePrefs();pushAlarms()});
// Android won't let an app flip these itself: show the real state and open the system page/pop-up instead.
$('#alarmSound').onclick=()=>TGNative.pickSound().then(r=>{if(r&&r.soundName)$('#alarmSoundName').textContent=r.soundName}).catch(()=>{});
$('#sOverlay').addEventListener('change',e=>{e.target.checked=!e.target.checked;TGNative.openSettings('overlay').finally(refreshAlarmUI)});
$('#sBattery').addEventListener('change',e=>{const on=e.target.checked;e.target.checked=!on;TGNative.openSettings(on?'batteryRequest':'battery').finally(refreshAlarmUI)});
$('#sLine').addEventListener('change',e=>{S.line=e.target.checked;savePrefs();drawPlot()});
$('#sDefMonth').addEventListener('change',e=>{S.defMonth=e.target.checked;savePrefs()});
$('#sDefYear').addEventListener('change',e=>{S.defYear=e.target.checked;savePrefs()});

/* ================= cloud sync (Supabase) ================= */
const CFG=window.TG_CONFIG||{};
const cloudConfigured=!!(CFG.url&&CFG.anonKey&&!/YOUR_/.test(CFG.url+CFG.anonKey)&&window.supabase);
let sb=null,session=null,channel=null,syncTimer=null,syncing=false,retryN=0,retryTimer=null;
if(cloudConfigured){sb=window.supabase.createClient(CFG.url,CFG.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}

function setStatus(kind,text){
  const el=$('#status');el.className='status '+(kind||'');$('#statusTxt').textContent=text;
}
function refreshStatus(){
  if(!cloudConfigured)return setStatus('','Local only');
  if(!session)return setStatus('','Signed out');
  if(!navigator.onLine)return setStatus('err','Offline · will sync later');
  if(dirty.size)return setStatus('busy','Syncing…');
  setStatus('ok','Synced');
}
function queueSync(){
  if(!sb||!session)return;
  clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,400);refreshStatus();
}
function mergeRow(row){
  const t=Object.assign({},row.data||{});
  t.id=row.id;t.updated=Number(row.updated_at);t.deleted=!!row.deleted;
  const local=tasks.find(x=>x.id===t.id);
  if(!local){tasks.push(t);return true}
  if((local.updated||0)<t.updated){tasks[tasks.indexOf(local)]=t;dirty.delete(t.id);return true}
  return false;
}
async function syncNow(){
  if(!sb||!session||syncing||!navigator.onLine){refreshStatus();return}
  syncing=true;setStatus('busy','Syncing…');
  try{
    // 1) pull everything (a personal task list is small)
    const {data:rows,error:e1}=await sb.from('tasks').select('id,data,updated_at,deleted');
    if(e1)throw e1;
    let changed=false;const remote=new Set();
    rows.forEach(r=>{remote.add(r.id);if(mergeRow(r))changed=true});
    // 2) anything we have that the server has never seen gets uploaded
    tasks.forEach(t=>{if(!remote.has(t.id))dirty.add(t.id)});
    // 3) push local changes
    const up=[...dirty].map(id=>tasks.find(t=>t.id===id)).filter(Boolean).map(t=>{
      const {deleted,updated,...data}=t;
      return{id:t.id,user_id:session.user.id,data,updated_at:t.updated||Date.now(),deleted:!!t.deleted};
    });
    if(up.length){
      const {error:e2}=await sb.from('tasks').upsert(up,{onConflict:'id'});
      if(e2)throw e2;
      up.forEach(r=>dirty.delete(r.id));
    }
    persist();
    if(changed)render();
    setStatus('ok','Synced');
    retryN=0;clearTimeout(retryTimer);
  }catch(err){
    console.error('sync failed',err);
    // Often the network is only half back (e.g. right after reconnecting): try again by itself.
    const wait=[5,15,30,60][Math.min(retryN++,3)];
    clearTimeout(retryTimer);retryTimer=setTimeout(syncNow,wait*1000);
    setStatus('err','Sync problem · retrying');
  }finally{syncing=false}
}
function subscribe(){
  if(!sb||channel)return;
  channel=sb.channel('tasks-live').on('postgres_changes',{event:'*',schema:'public',table:'tasks'},p=>{
    const row=p.new;if(!row||!row.id)return;
    if(mergeRow(row)){persist();render()}
  }).subscribe();
}
function unsubscribe(){if(sb&&channel){sb.removeChannel(channel);channel=null}}
window.addEventListener('online',()=>{refreshStatus();queueSync()});
window.addEventListener('offline',refreshStatus);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueSync();tick();refreshClock();queueAlarms()}});
window.addEventListener('focus',()=>{refreshClock();tick()});

/* account dialog */
function closeAcc(){if(layer===$('#accScrim'))hideLayer()}
function drawAcc(msg,isErr){
  const b=$('#accBody');
  if(!cloudConfigured){
    b.innerHTML=`<p>Sync is not set up yet, so tasks are saved only on this device.</p><p class="hint">To turn it on, add your Supabase URL and key to <b>config.js</b> (steps are in README.md), then reload.</p>`;
  }else if(session){
    b.innerHTML=`<p>Signed in as <b>${esc(session.user.email||'')}</b>.</p><p class="hint">Tasks sync automatically with every device signed in to this account.</p><div class="row"><button class="btn" id="syncBtn">Sync now</button><button class="btn danger" id="outBtn">Sign out</button></div><p class="msg ${isErr?'err':''}">${esc(msg||'')}</p>`;
    $('#syncBtn').onclick=()=>{syncNow().then(()=>drawAcc('Synced just now.'))};
    $('#outBtn').onclick=async()=>{await sb.auth.signOut()};
  }else{
    b.innerHTML=`<div class="field"><label for="aEmail">Email</label><input type="text" id="aEmail" autocomplete="email" inputmode="email"></div>
    <div class="field"><label for="aPass">Password</label><input type="password" id="aPass" autocomplete="current-password" placeholder="At least 6 characters"></div>
    <div class="row"><button class="btn primary" id="inBtn">Sign in</button><button class="btn" id="upBtn">Create account</button></div>
    <p class="msg ${isErr?'err':''}" id="aMsg">${esc(msg||'')}</p>`;
    const creds=()=>({email:$('#aEmail').value.trim(),password:$('#aPass').value});
    $('#inBtn').onclick=async()=>{
      const {error}=await sb.auth.signInWithPassword(creds());
      if(error)drawAcc(error.message,true);else drawAcc('Signed in.');
    };
    $('#upBtn').onclick=async()=>{
      const {data,error}=await sb.auth.signUp(creds());
      if(error)return drawAcc(error.message,true);
      if(!data.session)drawAcc('Account created. Check your email to confirm it, then sign in.');else drawAcc('Signed in.');
    };
  }
}
$('#accBtn').onclick=()=>{drawAcc();syncSettings();updateNotifBtn();showLayer($('#accScrim'))};
$('#accClose').onclick=closeAcc;
$('#accScrim').addEventListener('mousedown',e=>{if(e.target.id==='accScrim')closeAcc()});

if(sb){
  sb.auth.onAuthStateChange((ev,s)=>{
    session=s;
    if(s){subscribe();syncNow();if($('#accScrim').classList.contains('open'))drawAcc()}
    else{unsubscribe();if($('#accScrim').classList.contains('open'))drawAcc()}
    refreshStatus();
  });
  sb.auth.getSession().then(({data})=>{session=data.session;refreshStatus();if(session){subscribe();syncNow()}});
}

/* ================= init ================= */
function render(){drawPlot();drawCal();drawTodayRem()}
/* ================= live clock ================= */
// Keeps the "now" line, today's highlight and today's reminders current without a reload.
let lastDay=dkey(new Date());
function refreshClock(){
  const k=dkey(new Date());
  if(k!==lastDay){
    lastDay=k;const n=new Date();
    if(S.follow)S.anchor=n;                       // dashboard was showing "today": move to the new day
    if(S.calFollow)S.calM=new Date(n.getFullYear(),n.getMonth(),1);
    render();
  }else{drawPlot();drawTodayRem()}                // same day: just move the "now" line
}
let lastBeat=Date.now();
setInterval(()=>{const gap=Date.now()-lastBeat;lastBeat=Date.now();refreshClock();if(gap>90000){tick();queueSync()}},30000);  // a long gap means the PC slept
buildRng();syncSliders();render();updateNotifBtn();refreshStatus();tick();queueAlarms();
setInterval(tick,20000);
setInterval(drawTodayRem,60000);
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
})();
