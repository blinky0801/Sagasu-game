(() => {
  'use strict';
  const root=document.getElementById('startup'),menu=document.getElementById('startup-menu'),video=document.getElementById('opening-video');
  const message=document.getElementById('startup-message'),label=document.getElementById('start-play-label');
  const opening=document.getElementById('start-opening'),voice=window.SagasuOpeningVoice;
  const cues=[{at:1.45,name:'sa'},{at:2.05,name:'ga'},{at:2.42,name:'su'}];
  const loadingAt=5.0667;
  let finished=false,busy=false,watchdog,started=false,frame,spoken=0,voiceDucked=false;
  const assets=['assets/livingroom.png','assets/kitchen-floor-v2.png','../game%20art%20from%20illustrator/bathroom_new/bathroom_new/bathroom_new.png','assets/bedroom.png','../game%20art%20from%20illustrator/background%20before%20game.jpg'];
  for(const src of assets){const img=new Image();img.src=src;}
  function updateLabel(){const signed=window.SagasuAccount.hasUser();label.textContent=signed?'Play Game':'Connect Wallet';root.dataset.hasAccount=String(signed);document.getElementById('start-play').ariaLabel=label.textContent;}
  function finish(){
    if(finished)return;finished=true;clearTimeout(watchdog);cancelAnimationFrame(frame);voice.stop();video.pause();video.hidden=true;opening.hidden=true;
    menu.hidden=false;root.dataset.phase='menu';updateLabel();document.getElementById('start-play').focus();
    window.SagasuAudio.setMusicPhase('menu');
  }
  async function enter(guest){
    if(busy)return;busy=true;message.textContent=guest?'Getting ready...':window.SagasuAccount.hasUser()?'Getting your game ready...':'Connecting wallet...';
    window.SagasuAudio.unlock();
    menu.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      await window.SagasuAccount.enter(guest);
      window.SagasuCare.beginSession();
      window.SagasuAudio.setMusicPhase('game');
      document.body.classList.remove('booting');root.classList.add('exiting');
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,300));root.hidden=true;
      document.getElementById('pet').focus();
      busy=false;
    }catch(error){message.textContent=error.message;window.SagasuWallet?.mountReport(message);busy=false;updateLabel();menu.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  video.onended=finish;video.onerror=finish;
  // Recover only from stalled playback, not from the time spent in a hidden tab.
  function watch(){clearTimeout(watchdog);if(started&&!finished&&!document.hidden&&!window.SagasuDisplay?.isBlocked())watchdog=setTimeout(finish,20000);}
  video.ontimeupdate=watch;
  function syncVoice(){
    if(finished)return;
    if(video.currentTime>=loadingAt)window.SagasuAudio.setMusicPhase('silent');
    if(!voiceDucked&&!video.paused&&video.currentTime>=cues[0].at-.18&&video.currentTime<3){
      voiceDucked=true;window.SagasuAudio.duckMusic(1700);
    }
    if(!video.paused&&!document.hidden)while(spoken<cues.length&&video.currentTime>=cues[spoken].at){
      const cue=cues[spoken++];
      if(video.currentTime-cue.at<.2&&voice.play(cue.name)){
        window.dispatchEvent(new CustomEvent('sagasu-opening-syllable',{detail:{syllable:cue.name,videoTime:video.currentTime}}));
      }
    }
    frame=requestAnimationFrame(syncVoice);
  }
  document.addEventListener('visibilitychange',()=>{
    watch();if(!started||finished)return;
    if(document.hidden||window.SagasuDisplay?.isBlocked()){video.pause();voice.stop();}else video.play().catch(finish);
  });
  window.addEventListener('sagasu-orientation-change',event=>{
    watch();if(!started||finished)return;
    if(event.detail.blocked){video.pause();voice.stop();}else if(!document.hidden)video.play().catch(finish);
  });
  video.addEventListener('pause',()=>voice.stop());
  opening.onclick=()=>{
    if(started||finished)return;started=true;opening.disabled=true;voice.unlock();window.SagasuAudio.setMusicPhase('opening');window.SagasuAudio.unlock();
    opening.hidden=true;root.dataset.phase='intro';watch();frame=requestAnimationFrame(syncVoice);video.play().catch(finish);
  };
  window.SagasuAccount.ready.then(updateLabel);
  document.getElementById('start-play').onclick=()=>enter(false);document.getElementById('start-guest').onclick=()=>enter(true);
  document.getElementById('start-guest').ariaLabel='Play as Guest';
  document.querySelector('.brand').title='Return to lobby';
  function showLobby(){
    if(!finished||busy)return false;
    window.SagasuCare.prepareLobby();window.SagasuAudio.stop('activity');
    root.hidden=false;root.classList.remove('exiting');document.body.classList.add('booting');
    menu.hidden=false;root.dataset.phase='menu';menu.querySelectorAll('button').forEach(b=>b.disabled=false);
    message.textContent='';updateLabel();window.SagasuAudio.setMusicPhase('menu');
    return true;
  }
  document.querySelector('.brand').onclick=event=>{event.preventDefault();showLobby();};
  window.SagasuStartup=Object.freeze({showLobby});
  window.addEventListener('sagasu-account-change',updateLabel);
  window.lucide?.createIcons();
  if(video.error)finish();
})();
