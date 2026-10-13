(() => {
  'use strict';
  let context,master,noiseBuffer,enabled=true,volume=.55,unlocked=false,current=null;
  const voices=new Set();
  const musicMix=.35;
  const tracks=Object.fromEntries(Object.entries({opening:'opening backsound.mp3',menu:'beforegame.mp3',game:'backsound.mp3'}).map(([phase,file])=>{
    const track=new Audio('../game%20art%20from%20illustrator/'+encodeURIComponent(file));
    track.loop=phase!=='opening';track.preload='auto';return [phase,track];
  }));
  let music,musicPhase='silent',musicGain,musicSources=[],musicEnabled=true,musicVolume=.25,ducked=false,duckTimer,presentationPaused=window.SagasuDisplay?.isBlocked()||false;
  function setPresentationPaused(paused){presentationPaused=paused;if(paused)stopMusic();else startMusic();}
  function updateMusicGain(){
    if(musicGain)musicGain.gain.setTargetAtTime(enabled&&musicEnabled?musicVolume*musicMix*(ducked?.25:1):0,context.currentTime,ducked?.12:.28);
  }
  function duckMusic(duration=700){
    ducked=true;clearTimeout(duckTimer);updateMusicGain();
    duckTimer=setTimeout(()=>{ducked=false;updateMusicGain();},duration);
  }
  // Pausing preserves position; changing scenes selects a different, non-overlapping track.
  function stopMusic(){Object.values(tracks).forEach(track=>track.pause());}
  function setMusicPhase(phase){
    if((phase!=='silent'&&!tracks[phase])||phase===musicPhase)return;
    stopMusic();clearTimeout(duckTimer);ducked=false;updateMusicGain();
    musicPhase=phase;music=tracks[phase];
    if(music)music.currentTime=0;
    startMusic();
  }
  function startMusic(){
    if(!music||!music.paused||!enabled||!musicEnabled||musicVolume===0||!unlocked||presentationPaused||document.hidden||!init())return;
    music.play().catch(()=>{});
  }
  function init(){
    if(context)return true;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return false;
    try{
      context=new Audio();master=context.createGain();master.gain.value=enabled?volume:0;master.connect(context.destination);
      musicGain=context.createGain();musicGain.gain.value=enabled&&musicEnabled?musicVolume*musicMix:0;musicGain.connect(context.destination);
      musicSources=Object.values(tracks).map(track=>{const source=context.createMediaElementSource(track);source.connect(musicGain);return source;});
      noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
      const samples=noiseBuffer.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
      return true;
    }catch{return false;}
  }
  function stop(group){
    if(!group)stopMusic();
    for(const voice of [...voices])if(!group||voice.group===group){try{voice.source.stop();}catch{}voice.cleanup();}
  }
  function voice(source,duration,gain,delay,group,filter){
    const envelope=context.createGain(),at=context.currentTime+delay;
    envelope.gain.setValueAtTime(0,at);
    envelope.gain.linearRampToValueAtTime(gain,at+Math.min(.025,duration/4));
    envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
    if(filter){source.connect(filter);filter.connect(envelope);}else source.connect(envelope);
    envelope.connect(master);
    const entry={source,group,cleanup(){source.disconnect();filter?.disconnect();envelope.disconnect();voices.delete(entry);}};
    voices.add(entry);source.onended=entry.cleanup;source.start(at);source.stop(at+duration+.02);
  }
  function tone(from,to,duration,gain=.12,delay=0,group='ui',type='sine'){
    const source=context.createOscillator(),at=context.currentTime+delay;
    source.type=type;source.frequency.setValueAtTime(from,at);source.frequency.exponentialRampToValueAtTime(to,at+duration);
    voice(source,duration,gain,delay,group);
  }
  function noise(frequency,duration,gain=.12,delay=0,group='activity',type='bandpass'){
    const source=context.createBufferSource(),filter=context.createBiquadFilter();
    source.buffer=noiseBuffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.8;
    voice(source,duration,gain,delay,group,filter);
  }
  function available(){return enabled&&volume>0&&unlocked&&!document.hidden&&init();}
  function play(name){
    if(!available())return;
    if(name==='click')tone(620,320,.065,.08);
    if(name==='reward')[880,1175,1568].forEach((f,i)=>tone(f,f*1.1,.18,.10,i*.085));
  }
  function activity(name){
    current=name;stop('activity');if(!available())return;
    if(name==='apple'||name==='chips'){
      const count=name==='chips'?6:3;
      for(let i=0;i<count;i++){noise(name==='chips'?2800:1300,.12,.23,.25+i*.28);tone(160,65,.1,.05,.25+i*.28,'activity');}
    }
    if(name==='ramen')for(let i=0;i<3;i++){noise(750,.45,.19,.3+i*.8);tone(240,390,.35,.04,.3+i*.8,'activity');}
    if(name==='scrub')for(let i=0;i<4;i++)noise(1600,.18,.1,i*.2);
    if(name==='rinse'){
      noise(2200,2.65,.25,0,'activity','lowpass');
      for(let i=0;i<10;i++)tone(800+i%3*180,420,.07,.025,i*.24,'activity');
    }
    if(name==='shake')for(let i=0;i<6;i++)noise(2600,.12,.17,i*.22);
    if(name==='sleepEnter')tone(260,90,.85,.09,.1,'activity');
    if(name==='sleepLoop')tone(75,55,.7,.035,.1,'activity');
    if(name==='wake')tone(130,340,.65,.07,.15,'activity');
    if(name==='catch'){tone(220,80,.14,.18,0,'activity');tone(420,180,.1,.08,.18,'activity');}
    if(name==='pet')tone(310,460,.18,.065,.2,'activity');
    if(name==='happy')[440,554,659].forEach((f,i)=>tone(f,f,.15,.08,i*.12,'activity'));
    if(name==='annoyed')tone(160,85,.24,.07,0,'activity','triangle');
  }
  function configure(next){
    enabled=next.enabled;volume=Math.max(0,Math.min(1,next.volume));
    musicEnabled=next.musicEnabled??musicEnabled;musicVolume=next.musicVolume??musicVolume;
    musicVolume=Math.max(0,Math.min(1,musicVolume));
    if(master)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.015);
    updateMusicGain();
    if(!enabled)stop();
    else{if(volume===0){stop('ui');stop('activity');}if(!musicEnabled||musicVolume===0)stopMusic();else startMusic();}
  }
  function unlock(){
    if(!enabled||!init())return;
    const first=!unlocked;unlocked=true;context.resume().catch(()=>{});
    startMusic();
    if(first&&['scrub','sleepLoop'].includes(current))activity(current);
  }
  // Only quiet loop textures repeat; action sounds are not replayed after a mute or tab switch.
  setInterval(()=>{if(['scrub','sleepLoop'].includes(current)&&!document.hidden)activity(current);},4000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();context?.suspend().catch(()=>{});}else if(unlocked){context?.resume().catch(()=>{});startMusic();}});
  window.addEventListener('pagehide',()=>stop());
  window.addEventListener('sagasu-orientation-change',event=>setPresentationPaused(event.detail.blocked));
  window.SagasuAudio={configure,unlock,play,activity,stop,duckMusic,setMusicPhase};
})();
