(() => {
  'use strict';
  const gate=document.getElementById('orientation-gate');
  const button=document.getElementById('orientation-fullscreen');
  const status=document.getElementById('orientation-status');
  const touch=matchMedia('(pointer: coarse)'),portrait=matchMedia('(orientation: portrait)');
  let blocked=false,busy=false,walletActive=false,walletReturn=false,walletAway=false,restoring=false;
  let returnCopy=false,suspendedModal=false;
  const modal=document.getElementById('modal');
  function limit(operation){
    let timer;
    return Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Orientation timeout')),4000);})]).finally(()=>clearTimeout(timer));
  }
  function mobile(){return touch.matches&&Math.min(innerWidth,innerHeight)<=1024;}
  function updateCopy(){
    if(returnCopy===walletReturn)return;returnCopy=walletReturn;
    document.getElementById('orientation-title').textContent=walletReturn?'Continue playing':'Rotate your phone';
    button.innerHTML=walletReturn?'<i data-lucide="play"></i> Continue':'<i data-lucide="maximize"></i> Fullscreen';
    button.ariaLabel=walletReturn?'Continue playing':'Fullscreen';
    status.textContent='';window.lucide?.createIcons({root:gate});
  }
  function sync(){
    const next=mobile()&&portrait.matches;
    if(!next&&!document.hidden){walletReturn=false;if(!walletActive)walletAway=false;}
    updateCopy();
    gate.hidden=!next;document.body.classList.toggle('mobile-portrait',next);
    // A hidden native modal still blocks taps outside its top-layer surface.
    if(next&&modal?.open){suspendedModal=true;modal.close();}
    else if(!next&&suspendedModal){suspendedModal=false;if(!modal.open)modal.showModal();}
    for(const selector of ['.header','main','#startup','#modal']){
      const node=document.querySelector(selector);if(node)node.inert=next;
    }
    if(next===blocked)return;
    blocked=next;
    window.dispatchEvent(new CustomEvent('sagasu-orientation-change',{detail:{blocked}}));
  }
  async function fullscreen(){
    if(!mobile()||busy)return;
    busy=true;button.disabled=true;status.textContent='';
    try{
      if(!document.fullscreenElement){
        if(!document.documentElement.requestFullscreen)throw new Error('Unsupported');
        await limit(document.documentElement.requestFullscreen());
      }
      if(!screen.orientation?.lock)throw new Error('Unsupported');
      await limit(screen.orientation.lock('landscape'));
    }catch{status.textContent='Turn on auto-rotate, then turn your phone sideways.';}
    finally{busy=false;button.disabled=false;sync();}
  }
  button.onclick=fullscreen;
  async function restoreOrientation(){
    if(!mobile()||!portrait.matches||document.hidden||(!walletReturn&&!walletActive)||restoring||busy)return;
    // An existing fullscreen session may allow restoration without another tap.
    if(!document.fullscreenElement||!screen.orientation?.lock)return;
    restoring=true;
    try{await limit(screen.orientation.lock('landscape'));}catch{}
    finally{restoring=false;sync();}
  }
  window.addEventListener('sagasu-wallet-flow',event=>{
    if(event.detail.phase==='start'){walletActive=true;walletAway=false;walletReturn=false;}
    else{walletActive=false;if(walletAway&&portrait.matches)walletReturn=true;}
    sync();void restoreOrientation();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&walletActive)walletAway=true;
    else if(!document.hidden&&walletAway){walletReturn=true;sync();void restoreOrientation();}
  });
  window.addEventListener('focus',()=>{if(walletAway){walletReturn=true;sync();void restoreOrientation();}});
  // Request while a user gesture is active; wallet login does not depend on it.
  document.getElementById('start-opening').addEventListener('click',()=>{void fullscreen();});
  touch.addEventListener('change',sync);portrait.addEventListener('change',sync);
  window.addEventListener('resize',sync);document.addEventListener('fullscreenchange',sync);
  if(modal)new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['open']});
  window.SagasuDisplay=Object.freeze({isBlocked:()=>blocked,isModalSuspended:()=>suspendedModal});sync();
})();
