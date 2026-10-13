(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let key='sagasu-care-v1';
  const saveListeners=new Set();
  let accountSwitching=false;
  let saveLabel='Saved on this device';
  const rooms=[{id:'living',name:'Living room',icon:'armchair',title:'Sofa time',copy:'A scratch behind the ears. A little chaos. His kind of afternoon.',line:'The couch called. I answered.'},{id:'kitchen',name:'Kitchen',icon:'cooking-pot',title:'Snack o’clock',copy:'Something crunchy. Something warm. Absolutely nothing green.',line:'Is that food, or are you just visiting?'},{id:'bathroom',name:'Bathroom',icon:'bath',title:'A fresh start',copy:'He calls it a spa day. You call it finally getting clean.',line:'My hoodie was perfectly fine, thanks.'},{id:'bedroom',name:'Bedroom',icon:'bed-double',title:'Do not disturb',copy:'The candles can wait. Even professional loungers need a nap.',line:'Wake me when the market recovers.'}];
  const foods={apple:{name:'Apple',icon:'apple',price:4,hunger:18,happiness:3,energy:2},chips:{name:'Chips',icon:'sandwich',price:6,hunger:23,happiness:8,energy:0},ramen:{name:'Ramen',icon:'soup',price:10,hunger:35,happiness:5,energy:5}};
  const taskDefs=[{id:'feed',name:'A proper snack',icon:'utensils'},{id:'bath',name:'Soap, then shower',icon:'droplets'},{id:'play',name:'A round of playtime',icon:'circle-dot'}];
  const day=()=>new Date().toLocaleDateString('en-CA');
  const fresh=()=>({version:1,room:'living',coins:50,water:10,xp:0,needs:{hunger:68,cleanliness:44,happiness:62,energy:55},food:{apple:3,chips:2,ramen:1},selected:'chips',sleeping:false,soaped:false,sleepEarned:0,plant:{readyAt:0,wateredAt:0,harvests:0},decor:{rug:false,poster:false},tasks:{day:day(),done:[],claimed:[]},sound:true,volume:.55,music:true,musicVolume:.25,lastAt:Date.now(),pets:0});
  let state=fresh();
  try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===1){state={...state,...s,needs:{...state.needs,...s.needs},food:{...state.food,...s.food},plant:{...state.plant,...s.plant},decor:{...state.decor,...s.decor}};}}catch{}
  if(!rooms.some(r=>r.id===state.room))state.room='living';
  if(!foods[state.selected])state.selected='chips';
  for(const k of Object.keys(state.needs))state.needs[k]=Number.isFinite(state.needs[k])?Math.max(0,Math.min(100,state.needs[k])):60;
  for(const k of Object.keys(foods))state.food[k]=Math.max(0,Math.floor(Number(state.food[k])||0));
  state.coins=Math.max(0,Math.floor(Number(state.coins)||0));state.water=Math.max(0,Math.floor(Number(state.water)||0));state.xp=Math.max(0,Math.floor(Number(state.xp)||0));
  if(!Array.isArray(state.tasks?.done)||!Array.isArray(state.tasks?.claimed))state.tasks=fresh().tasks;
  let playing=null,bubbleTimer,poseTimer,showerTimer,modalType=null,startingPlay=false,playRequest=0;
  const illustratedIcons={armchair:'living-room','cooking-pot':'kitchen',bath:'bathroom','bed-double':'bedroom',search:'hidden-hunt',apple:'apple',sandwich:'chips',soup:'ramen',hand:'pet','circle-dot':'play',bubbles:'soap','shower-head':'shower',utensils:'hunger',droplets:'cleanliness',heart:'happiness',zap:'energy'};
  const icon=name=>illustratedIcons[name]?'<img class="gameplay-icon" src="assets/ui/gameplay-v1/'+illustratedIcons[name]+'.png" alt="" aria-hidden="true" draggable="false">':'<i data-lucide="'+name+'"></i>';
  const icons=()=>window.lucide?.createIcons();
  const save=()=>{state.lastAt=Date.now();try{localStorage.setItem(key,JSON.stringify(state));$('saved').innerHTML=icon('check')+' '+saveLabel;}catch{$('saved').textContent='Could not save progress';}if(!accountSwitching)for(const fn of saveListeners)fn();};
  function adjust(k,n){state.needs[k]=Math.max(0,Math.min(100,state.needs[k]+n));}
  function xp(n){state.xp+=n;}
  function daily(){if(state.tasks.day!==day())state.tasks={day:day(),done:[],claimed:[]};}
  function complete(id){daily();if(!state.tasks.done.includes(id))state.tasks.done.push(id);}
  function claimTask(id){daily();if(!taskDefs.some(t=>t.id===id)||!state.tasks.done.includes(id)||state.tasks.claimed.includes(id))return false;state.tasks.claimed.push(id);state.coins+=6;beep();render();save();return true;}
  state.sound=typeof state.sound==='boolean'?state.sound:true;
  state.volume=Number.isFinite(state.volume)?Math.max(0,Math.min(1,state.volume)):.55;
  state.music=typeof state.music==='boolean'?state.music:true;
  state.musicVolume=Number.isFinite(state.musicVolume)?Math.max(0,Math.min(1,state.musicVolume)):.25;
  function soundSettings(){window.SagasuAudio.configure({enabled:state.sound,volume:state.volume,musicEnabled:state.music,musicVolume:state.musicVolume});}
  function soundButton(){const b=$('sound-button');b.innerHTML=icon(state.sound?'volume-2':'volume-x');b.title=b.ariaLabel=state.sound?'Mute sound':'Enable sound';b.setAttribute('aria-pressed',String(!state.sound));icons();}
  function beep(){window.SagasuAudio.play('reward');}
  soundSettings();
  function say(text,permanent=false){clearTimeout(bubbleTimer);$('speech').textContent=text;if(!permanent)bubbleTimer=setTimeout(()=>{$('speech').textContent=state.sleeping?'Five more minutes. Forever.':rooms.find(r=>r.id===state.room).line;},4300);}
  function float(text){const span=document.createElement('span');span.className='float';span.textContent=text;$('floating').append(span);setTimeout(()=>span.remove(),1600);}
  function animateOnce(name,onEnd){
    poseTimer=name;window.SagasuAnimator.set(name,{loop:false,restart:true,onEnd:()=>{poseTimer=null;if(onEnd)onEnd();else pose();}});
  }
  function react(kind,food){
    if(state.room==='bathroom')return;
    animateOnce(kind==='eating'?food:kind==='petted'?'pet':kind);
  }
  function pose(){if(!poseTimer)window.SagasuAnimator.set(state.sleeping?'sleepLoop':state.room==='bathroom'?(state.soaped?'scrub':'bath'):state.room==='living'&&!playing?'sofa':'idle');$('pet').classList.toggle('sleeping',state.sleeping);$('night').hidden=!state.sleeping;$('sleep-z').hidden=!state.sleeping;$('foam').hidden=!(state.soaped&&state.room==='bathroom');$('dirt').hidden=state.needs.cleanliness>=55;}
  function advance(){
    daily();const now=Date.now(),seconds=Math.max(0,Math.min(21600,(now-state.lastAt)/1000));state.lastAt=now;
    adjust('hunger',-seconds*.009);adjust('cleanliness',-seconds*.005);adjust('happiness',-seconds*.006);
    if(state.sleeping){const gain=Math.min(100-state.needs.energy,seconds*1.4),before=Math.floor(state.sleepEarned/12);adjust('energy',gain);state.sleepEarned+=gain;xp(Math.floor(state.sleepEarned/12)-before);if(state.needs.energy>=100){state.sleeping=false;animateOnce('wake');say('Fully rested. Still not doing anything.');}}else adjust('energy',-seconds*.007);
  }
  function renderNeeds(){
    const def=[['hunger','Hunger','utensils','#dc9270'],['cleanliness','Cleanliness','droplets','#4b9cb9'],['happiness','Happiness','heart','#d67291'],['energy','Energy','zap','#719a71']];
    $('needs').replaceChildren(...def.map(([id,name,glyph,color])=>{const el=document.createElement('div');el.className='need';el.style.setProperty('--meter',color);el.innerHTML='<div class="need-label">'+icon(glyph)+name+'<b>'+Math.round(state.needs[id])+'%</b></div><progress id="need-'+id+'" value="'+state.needs[id]+'" max="100" aria-label="'+name+'"></progress>';return el;}));
  }
  function renderTasks(){$('daily-count').textContent=state.tasks.done.length+' / 3';$('tasks').replaceChildren(...taskDefs.map(t=>{const done=state.tasks.done.includes(t.id),claimed=state.tasks.claimed.includes(t.id),el=document.createElement('div');el.className='task'+(done?' done':'');el.innerHTML=icon(done?'circle-check':t.icon)+'<span>'+t.name+'</span>';if(done&&!claimed){const b=document.createElement('button');b.dataset.claim=t.id;b.textContent='+6 coins';b.onclick=()=>{if(state.tasks.claimed.includes(t.id))return;state.tasks.claimed.push(t.id);state.coins+=6;beep();render();save();};el.append(b);}else{const small=document.createElement('small');small.textContent=claimed?'Collected':'+6 coins';el.append(small);}return el;}));}
  function ready(){return state.plant.readyAt>0&&Date.now()>=state.plant.readyAt;}
  function gardenStatus(){return ready()?'Ready to harvest':state.plant.readyAt?'Growing · '+Math.ceil((state.plant.readyAt-Date.now())/1000)+'s':'Ready for a drink';}
  function render(){
    $('coins').textContent=state.coins;$('water').textContent=state.water;$('level').textContent='LEVEL '+(1+Math.floor(state.xp/40));$('xp').value=state.xp%40;$('xp-text').textContent=state.xp%40+' / 40 XP';
    renderNeeds();renderTasks();$('garden-status').textContent=gardenStatus();$('plant-badge').textContent=ready()?'+18 coins':state.plant.readyAt?'Growing':'Water me';$('plant').classList.toggle('ready',ready());$('plant').classList.toggle('growing',!!state.plant.readyAt&&!ready());
    $('poster').hidden=!state.decor.poster;$('rug').hidden=!state.decor.rug;pose();
    const min=Math.min(...Object.values(state.needs));$('mood').textContent=state.sleeping?'Napping':min<20?'Needs some love':state.needs.happiness>80?'Suspiciously happy':'Feeling okay';renderActions();icons();
  }
  function action(id,name,glyph,detail,fn,disabled=false){const b=document.createElement('button');b.id=id;b.disabled=disabled;b.innerHTML=icon(glyph)+'<span>'+name+'</span>'+(detail?'<small>'+detail+'</small>':'');b.onclick=()=>{advance();if(state.sleeping&&id!=='sleep'){say('I am asleep. Take a hint.');return;}fn();};return b;}
  let actionSignature='';
  function renderActions(){
    const signature=JSON.stringify([state.room,state.selected,state.food,state.soaped,state.water<2,state.sleeping,!!playing,!!poseTimer,startingPlay]);
    if(signature===actionSignature)return;
    actionSignature=signature;
    const r=rooms.find(r=>r.id===state.room);$('care-title').textContent=r.title;$('care-copy').textContent=r.copy;$('pantry').hidden=state.room!=='kitchen';const actions=[];
    if(state.room==='living'){actions.push(action('pet-action','Pet Sagasu','hand','+ happiness',pet),action('play-action','Playtime','circle-dot','15 sec',startPlay,!!playing||startingPlay));}
    if(state.room==='kitchen'){
      $('pantry').replaceChildren(...Object.entries(foods).map(([id,f])=>{const b=document.createElement('button');b.className='food-choice'+(state.selected===id?' active':'');b.dataset.food=id;b.draggable=true;b.innerHTML=icon(f.icon)+'<span>'+f.name+'</span><small>×'+state.food[id]+'</small>';b.setAttribute('aria-pressed',state.selected===id);b.onclick=()=>{state.selected=id;render();save();};b.ondragstart=e=>e.dataTransfer.setData('text/plain',id);return b;}));
      actions.push(action('feed-action','Feed '+foods[state.selected].name,'utensils','+ hunger',()=>feed(state.selected),state.food[state.selected]<=0),action('pantry-shop','More snacks','shopping-bag','Shop',()=>shop('food')));
    }
    if(state.room==='bathroom')actions.push(action('soap-action','Soap','bubbles',state.soaped?'Lathered':'Lather up',soap,state.soaped||!!poseTimer),action('shower-action','Shower','shower-head','2 water',shower,state.water<2||!!poseTimer));
    if(state.room==='bedroom')actions.push(action('sleep',state.sleeping?'Wake up':'Lights out',state.sleeping?'sun':'moon',state.sleeping?'Feeling better':'+ energy',sleep),action('decor-shop','Room decor','frame','Shop',()=>shop('decor')));
    $('actions').replaceChildren(...actions);icons();
  }
  function setRoom(id){advance();poseTimer=null;window.SagasuAnimator.cancel();clearTimeout(showerTimer);$('shower').hidden=true;if(playing||startingPlay)finishPlay(false,true);if(state.sleeping){state.sleeping=false;say('Moving rooms? There goes my nap.');}state.room=id;const r=rooms.find(x=>x.id===id);$('stage').dataset.room=id;$('room-label').textContent=r.name;$('room-number').textContent=String(rooms.indexOf(r)+1).padStart(2,'0')+' / 04';document.querySelectorAll('[data-room-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.roomTab===id);b.setAttribute('aria-selected',b.dataset.roomTab===id);});$('plant').hidden=id!=='living';say(r.line);render();save();}
  function pet(){if(playing||poseTimer)return;if(state.sleeping){say('Petting a sleeping dog is still a meeting.');return;}if(state.needs.happiness>96){react('annoyed');say('Enough affection. I have a reputation.');return;}adjust('happiness',5);state.pets++;if(state.pets%3===0)xp(1);react('petted');say(['Okay. One scratch.','I suppose you can stay.','That is my good ear.','Do not tell anyone I liked that.'][state.pets%4]);float('+5');renderNeeds();icons();save();}
  function feed(id){if(state.room!=='kitchen'||state.sleeping||poseTimer)return;if(!foods[id]||state.food[id]<=0){say('Empty plate. Bold choice.');return;}if(state.needs.hunger>=98){say('Full. Emotionally available for dessert, though.');return;}const f=foods[id];state.food[id]--;adjust('hunger',f.hunger);adjust('happiness',f.happiness);adjust('energy',f.energy);xp(4);complete('feed');render();react('eating',id);say(id==='apple'?'Fruit? I was promised snacks.':id==='ramen'?'Finally. A bowl of good decisions.':'Crunchy. Unlike my portfolio.');float('+'+f.hunger);save();}
  function soap(){if(state.soaped||poseTimer)return;state.soaped=true;render();$('foam').hidden=false;say('I look like a cloud with responsibilities.');save();}
  function shower(){if(state.water<2||poseTimer)return;if(state.needs.cleanliness>=99&&!state.soaped){say('Clean enough. Save the water.');return;}const lathered=state.soaped;state.water-=2;adjust('cleanliness',lathered?40:12);adjust('happiness',lathered?4:-2);state.soaped=false;if(lathered){xp(5);complete('bath');}$('shower').hidden=false;animateOnce('rinse',()=>{$('shower').hidden=true;animateOnce('shake',()=>render());});render();say(lathered?'Fine. I smell excellent. Annoying.':'Water alone? We are skipping a step.');float(lathered?'+40':'+12');save();}
  function sleep(){if(poseTimer==='wake')return;state.sleeping=!state.sleeping;if(state.sleeping){if(state.needs.energy>=99){state.sleeping=false;react('annoyed');say('I am rested. A nap would just be a hobby.');return;}state.sleepEarned=0;animateOnce('sleepEnter');say('Five more minutes. Forever.',true);}else{animateOnce('wake');say('That was a very important nap.');}render();save();}
  async function startPlay(){if(playing||startingPlay)return;if(state.needs.energy<15){react('annoyed');say('Too tired. Book me a nap first.');return;}const request=++playRequest;startingPlay=true;render();const ranked=await window.SagasuCompetition?.start();if(request!==playRequest)return;startingPlay=false;if(state.room!=='living'||state.sleeping){window.SagasuCompetition?.cancel();return;}poseTimer=null;window.SagasuAnimator.cancel();const active=playing={hits:0,end:Date.now()+15000,waiting:false};$('play-score').textContent='0 / 6';$('play-time').textContent='15s';$('toy').disabled=false;$('toy').hidden=false;$('play-hud').hidden=false;say('Fine. Six catches. Then I sit down.',true);moveToy();render();if(ranked){$('toy').disabled=true;setTimeout(()=>{if(playing===active&&!active.waiting)$('toy').disabled=false;},650);}}
  function moveToy(){
    const stage=$('stage'),size=$('toy').offsetWidth||44,w=stage.clientWidth,h=stage.clientHeight,origin=stage.getBoundingClientRect();
    const blockers=['#play-hud','#rooms','.care-menu','#journal-panel','#plant'].map(s=>document.querySelector(s)).filter(e=>e&&e.getClientRects().length).map(e=>e.getBoundingClientRect());
    // Keep catches clear of the room controls and score overlay.
    for(let i=0;i<100;i++){const x=.22*w+Math.random()*Math.max(0,w*.56-size),y=.42*h+Math.random()*Math.max(0,h*.3-size),left=origin.left+x,top=origin.top+y;if(blockers.some(r=>left<r.right+8&&left+size>r.left-8&&top<r.bottom+8&&top+size>r.top-8))continue;$('toy').style.left=x+'px';$('toy').style.top=y+'px';return;}
    $('toy').style.left=(w/2-size/2)+'px';$('toy').style.top=(h*.45)+'px';
  }
  async function catchToy(){const active=playing;if(!active||active.waiting)return;if(Date.now()>=active.end){finishPlay(false);return;}active.waiting=true;$('toy').disabled=true;const result=await window.SagasuCompetition?.hit()||{accepted:true,ranked:false};if(playing!==active)return;active.waiting=false;if(Date.now()>=active.end){finishPlay(false);return;}if(result.accepted){playing.hits++;animateOnce('catch');$('play-score').textContent=playing.hits+' / 6';if(playing.hits>=6){finishPlay(true);return;}moveToy();}if(result.ranked)setTimeout(()=>{if(playing===active&&!active.waiting)$('toy').disabled=false;},650);else $('toy').disabled=false;}
  function finishPlay(won,silent=false){playRequest++;startingPlay=false;if(!playing){window.SagasuCompetition?.cancel();return;}playing=null;window.SagasuCompetition?.cancel();$('toy').hidden=true;$('play-hud').hidden=true;adjust('energy',-8);adjust('hunger',-3);adjust('happiness',won?18:3);if(won){state.coins+=12;xp(8);complete('play');}render();if(!silent){react(won?'happy':'annoyed');say(won?'Six catches. Twelve coins. Back to the couch.':'A respectable effort. For someone who stands up.');if(won){beep();float('+12 coins');}}save();}
  function modal(div,type){modalType=type;$('modal-content').replaceChildren(div);if(!$('modal').open)$('modal').showModal();icons();}
  function shop(tab='food'){
    const div=document.createElement('div');div.innerHTML='<p class="eyebrow">THE CORNER SHOP</p><h2>Little things. Big attitude.</h2><p id="shop-balance"></p><div class="shop-tabs"></div><div class="shop-grid"></div><div class="shop-note" role="status"></div>';
    [['food','Pantry'],['supplies','Supplies'],['decor','Decor']].forEach(([id,name])=>{const b=document.createElement('button');b.className=id===tab?'active':'';b.textContent=name;b.onclick=()=>shop(id);div.querySelector('.shop-tabs').append(b);});
    const list=tab==='food'?Object.entries(foods).map(([id,f])=>({id,name:f.name,glyph:f.icon,price:f.price,detail:'+1 snack',owned:false,buy:()=>state.food[id]++})):tab==='supplies'?[{id:'water',name:'Water refill',glyph:'droplets',price:5,detail:'+5 water',owned:false,buy:()=>state.water+=5}]:[{id:'rug',name:'Mint rug',glyph:'square',price:25,detail:'A softer landing',owned:state.decor.rug,buy:()=>state.decor.rug=true},{id:'poster',name:'Lucky poster',glyph:'frame',price:30,detail:'Day-off energy',owned:state.decor.poster,buy:()=>state.decor.poster=true}];
    div.querySelector('#shop-balance').textContent=state.coins+' coins to spend';
    list.forEach(item=>{const el=document.createElement('div');el.className='shop-item';el.innerHTML=icon(item.glyph)+'<b>'+item.name+'</b><small>'+item.detail+'</small>';const b=document.createElement('button');b.dataset.buy=item.id;b.disabled=item.owned||state.coins<item.price;b.textContent=item.owned?'Owned':item.price+' coins';b.onclick=()=>{if(state.coins<item.price)return;state.coins-=item.price;item.buy();beep();render();save();shop(tab);$('modal-content').querySelector('.shop-note').textContent=item.name+' added. Approved by the sofa.';};el.append(b);div.querySelector('.shop-grid').append(el);});modal(div,'shop');
  }
  function garden(){
    const div=document.createElement('div');div.innerHTML='<p class="eyebrow">WINDOW-SIDE GARDEN</p><h2>The little palm</h2><div class="garden-view"><div class="garden-preview"></div><div><b id="plant-status"></b><progress id="plant-progress" max="100" value="0" aria-label="Palm growth"></progress><p>Harvests: '+state.plant.harvests+'<br>Next harvest: 18 coins</p></div></div><div class="dialog-actions"></div><p class="dialog-message" id="garden-message" role="status"></p>';
    div.querySelector('.garden-preview').append($('plant').querySelector('svg').cloneNode(true));
    const b=document.createElement('button');b.id='water-plant';b.className='primary';b.disabled=!!state.plant.readyAt&&!ready()||!state.plant.readyAt&&state.water<2;b.innerHTML=icon(ready()?'coins':'droplets')+(ready()?'Harvest · +18 coins':'Water · 2 water');
    b.onclick=()=>{advance();if(ready()){state.coins+=18;state.plant.harvests++;state.plant.readyAt=0;state.plant.wateredAt=0;xp(5);beep();say('My plant has a better income than I do.');}else if(!state.plant.readyAt&&state.water>=2){state.water-=2;state.plant.wateredAt=Date.now();state.plant.readyAt=Date.now()+30000;beep();}render();save();garden();};
    div.querySelector('.dialog-actions').append(b);const refill=document.createElement('button');refill.textContent='Water refill';refill.onclick=()=>shop('supplies');div.querySelector('.dialog-actions').append(refill);modal(div,'garden');updateGarden();
  }
  function updateGarden(){if(modalType!=='garden'||!$('modal').open)return;$('plant-status').textContent=gardenStatus();$('plant-progress').value=state.plant.readyAt?Math.min(100,(Date.now()-state.plant.wateredAt)/30000*100):0;const b=$('water-plant');if(ready()){b.disabled=false;b.innerHTML=icon('coins')+'Harvest · +18 coins';icons();}}
  function settings(){const div=document.createElement('div');div.innerHTML='<p class="eyebrow">YOUR LITTLE WORLD</p><h2>Settings</h2><label class="setting-row">Audio<input id="sound-toggle" type="checkbox" '+(state.sound?'checked':'')+'></label><label class="setting-row">Sound effects <span class="volume-control"><input id="sound-volume" type="range" min="0" max="100" step="1" value="'+Math.round(state.volume*100)+'"><output id="sound-volume-value">'+Math.round(state.volume*100)+'%</output></span></label><label class="setting-row">Background music<input id="music-toggle" type="checkbox" '+(state.music?'checked':'')+'></label><label class="setting-row">Music volume <span class="volume-control"><input id="music-volume" type="range" min="0" max="100" step="1" value="'+Math.round(state.musicVolume*100)+'"><output id="music-volume-value">'+Math.round(state.musicVolume*100)+'%</output></span></label><div class="dialog-actions"><button id="export-save">'+icon('download')+'Download backup</button><button id="reset-save" class="danger">'+icon('rotate-ccw')+'Start fresh</button></div>';div.querySelector('#sound-toggle').onchange=e=>{state.sound=e.target.checked;soundSettings();if(state.sound){window.SagasuAudio.unlock();window.SagasuAudio.play('click');}soundButton();save();};div.querySelector('#sound-volume').oninput=e=>{state.volume=Number(e.target.value)/100;soundSettings();div.querySelector('#sound-volume-value').textContent=e.target.value+'%';save();};div.querySelector('#sound-volume').onchange=()=>{window.SagasuAudio.unlock();window.SagasuAudio.play('click');};div.querySelector('#music-toggle').onchange=e=>{state.music=e.target.checked;soundSettings();window.SagasuAudio.unlock();save();};div.querySelector('#music-volume').oninput=e=>{state.musicVolume=Number(e.target.value)/100;soundSettings();window.SagasuAudio.unlock();div.querySelector('#music-volume-value').textContent=e.target.value+'%';save();};div.querySelector('#export-save').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sagasu-care-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};div.querySelector('#reset-save').onclick=()=>{const confirm=document.createElement('div');confirm.innerHTML='<h2>A fresh little start?</h2><p>This resets your companion, coins, pantry, and garden on this device.</p><div class="dialog-actions"></div>';const yes=document.createElement('button');yes.className='primary';yes.textContent='Start fresh';yes.onclick=()=>{if(playing)finishPlay(false,true);state=fresh();soundSettings();soundButton();clearTimeout(poseTimer);clearTimeout(showerTimer);$('shower').hidden=true;$('modal').close();setRoom('living');};const no=document.createElement('button');no.textContent='Keep my progress';no.onclick=settings;confirm.querySelector('.dialog-actions').append(yes,no);modal(confirm,'reset');};modal(div,'settings');}
  const mute=document.createElement('button');mute.id='sound-button';mute.onclick=()=>{state.sound=!state.sound;soundSettings();if(state.sound){window.SagasuAudio.unlock();window.SagasuAudio.play('click');}soundButton();const toggle=$('sound-toggle');if(toggle)toggle.checked=state.sound;save();};$('settings').before(mute);soundButton();
  document.addEventListener('click',e=>{const button=e.target.closest('button');if(document.body.classList.contains('booting')||!button||button.disabled||button.id==='sound-button')return;window.SagasuAudio.unlock();window.SagasuAudio.play('click');},true);
  $('rooms').setAttribute('role','tablist');$('rooms').replaceChildren(...rooms.map(r=>{const b=document.createElement('button');b.dataset.roomTab=r.id;b.setAttribute('role','tab');b.innerHTML=icon(r.icon)+r.name;b.onclick=()=>setRoom(r.id);return b;}));
  const huntButton=document.createElement('button');huntButton.id='hidden-hunt';huntButton.innerHTML=icon('search')+'Hidden Hunt';huntButton.setAttribute('aria-haspopup','dialog');huntButton.onclick=()=>{const div=document.createElement('div');div.className='hunt-preview';div.innerHTML=icon('search')+'<p class="eyebrow">COMING SOON</p><h2>Hidden Hunt</h2><img src="../website%20sagasu/assets/gallery/expressions/expression8.png" alt="Sagasu"><p>Sagasu is still hiding your next adventure.</p>';modal(div,'hunt');};$('rooms').insertBefore(huntButton,document.querySelector('[data-room-tab="bedroom"]'));
  for(let i=0;i<17;i++){const b=document.createElement('b');b.style.left=(i*23%90)+'%';b.style.top=(i*17%85)+'%';b.style.animationDelay=(i%5)*.2+'s';$('foam').append(b);}
  $('pet').onclick=pet;$('pet').ondragover=e=>e.preventDefault();$('pet').ondrop=e=>{e.preventDefault();advance();feed(e.dataTransfer.getData('text/plain'));};
  $('plant').onclick=$('garden-button').onclick=garden;$('toy').onclick=catchToy;$('stop-play').onclick=()=>finishPlay(false);$('shop').onclick=()=>shop();$('settings').onclick=settings;$('close-modal').onclick=()=>$('modal').close();
  $('previous-room').onclick=()=>setRoom(rooms[(rooms.findIndex(r=>r.id===state.room)+3)%4].id);$('next-room').onclick=()=>setRoom(rooms[(rooms.findIndex(r=>r.id===state.room)+1)%4].id);
  $('journal').onclick=()=>{const open=$('journal-panel').hidden;$('journal-panel').hidden=!open;$('journal').setAttribute('aria-expanded',String(open));};
  $('modal').addEventListener('close',()=>modalType=null);
  function tick(){if(document.body.classList.contains('booting'))return;advance();if(playing){$('play-time').textContent=Math.max(0,Math.ceil((playing.end-Date.now())/1000))+'s';if(Date.now()>=playing.end)finishPlay(false);}render();updateGarden();save();}
  document.addEventListener('visibilitychange',()=>{advance();save();});window.addEventListener('pagehide',()=>{advance();save();});
  advance();const initialRoom=state.sleeping?'bedroom':state.room;const wasSleeping=state.sleeping;state.sleeping=false;setRoom(initialRoom);state.sleeping=wasSleeping;render();if(wasSleeping)say('Five more minutes. Forever.',true);save();setInterval(tick,1000);
  function restore(input){
    if(!input || input.version!==1)throw new Error('Unsupported save format.');
    const clean=(base,source)=>Object.fromEntries(Object.entries(base).map(([k,v])=>{
      const x=source?.[k];
      if(Array.isArray(v))return [k,Array.isArray(x)?x.filter(a=>typeof a==='string'&&taskDefs.some(t=>t.id===a)).slice(0,3):v];
      if(v&&typeof v==='object')return [k,clean(v,x)];
      if(typeof v==='number')return [k,Number.isFinite(x)?Math.max(0,Math.min(x,Number.MAX_SAFE_INTEGER)):v];
      return [k,typeof x===typeof v?(typeof x==='string'?x.slice(0,64):x):v];
    }));
    const next=clean(fresh(),input);
    if(!rooms.some(r=>r.id===next.room))next.room='living';
    if(!foods[next.selected])next.selected='chips';
    for(const k of Object.keys(next.needs))next.needs[k]=Math.min(100,next.needs[k]);
    for(const k of ['coins','water','xp','pets'])next[k]=Math.floor(next[k]);
    for(const k of Object.keys(next.food))next.food[k]=Math.floor(next.food[k]);
    next.volume=Math.min(1,next.volume);next.musicVolume=Math.min(1,next.musicVolume);
    if(playing)finishPlay(false,true);
    state=next;
    const asleep=state.sleeping;state.sleeping=false;
    setRoom(asleep?'bedroom':state.room);state.sleeping=asleep;
    soundSettings();soundButton();render();save();
  }
  window.SagasuCare=Object.freeze({
    beginSession:()=>{state.lastAt=Date.now();render();save();},
    peek:()=>JSON.parse(JSON.stringify(state)),
    lobbySummary:()=>{daily();return {xp:state.xp,coins:state.coins,tasks:taskDefs.map(t=>({id:t.id,name:t.name,done:state.tasks.done.includes(t.id),claimed:state.tasks.claimed.includes(t.id)}))};},
    claimDailyRewards:()=>{for(const task of taskDefs)claimTask(task.id);},
    prepareLobby:()=>{if(playing||startingPlay)finishPlay(false,true);window.SagasuAudio.activity('idle');save();},
    showLobbyPanel:div=>modal(div,'lobby'),
    hasAccountCache:id=>{try{return JSON.parse(localStorage.getItem('sagasu-care-v1:'+id))?.version===1;}catch{return false;}},
    onSave:fn=>{saveListeners.add(fn);return ()=>saveListeners.delete(fn);},
    setSaveStatus:label=>{saveLabel=label;$('saved').textContent=label;},
    setSyncLoading:loading=>{document.querySelector('main').inert=loading;for(const id of ['journal','shop','settings','sound-button'])$(id).disabled=loading;},
    snapshot:()=>{advance();save();return JSON.parse(JSON.stringify(state));},
    prepareExit:()=>{
      if(playing||startingPlay)finishPlay(false,true);
      advance();save();
      // Unlike background autosave, exit must report a failed local write.
      localStorage.setItem(key,JSON.stringify(state));
    },
    switchAccount:id=>{
      save();accountSwitching=true;key=id?'sagasu-care-v1:'+id:'sagasu-care-v1';
      let cached=null;try{cached=JSON.parse(localStorage.getItem(key));}catch{}
      try{try{restore(cached||fresh());}catch{restore(fresh());}}finally{accountSwitching=false;}
    },
    restore,
    showAccount:div=>modal(div,'account'),
    showLeaderboard:div=>modal(div,'leaderboard'),notify:float
  });
})();
