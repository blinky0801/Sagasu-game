(() => {
  'use strict';
  let context,loading;
  const buffers=new Map(),sources=new Set();
  async function prepare(){
    if(loading)return loading;
    loading=(async()=>{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      try{context=new Audio();}catch{return;}
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
      try{
        await Promise.all(['sa','ga','su'].map(async name=>{
          const response=await fetch('assets/opening-voice/'+name+'.wav',{signal:controller.signal});if(!response.ok)throw new Error('Voice unavailable');
          const decoded=await context.decodeAudioData(await response.arrayBuffer()),data=decoded.getChannelData(0);
          let start=0,end=data.length-1;while(start<end&&Math.abs(data[start])<.007)start++;while(end>start&&Math.abs(data[end])<.007)end--;
          start=Math.max(0,start-Math.round(decoded.sampleRate*.015));end=Math.min(data.length,end+Math.round(decoded.sampleRate*.02));
          if(end-start<decoded.sampleRate*.03)return;
          const buffer=context.createBuffer(1,end-start,decoded.sampleRate);buffer.copyToChannel(data.subarray(start,end),0);buffers.set(name,buffer);
        }));
      }catch{}finally{clearTimeout(timeout);}
    })();return loading;
  }
  function unlock(){if(context)context.resume().catch(()=>{});}
  function play(name){
    const settings=window.SagasuCare.peek();if(!settings.sound||settings.volume<=0||!context||context.state!=='running'||!buffers.has(name))return false;
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name);source.playbackRate.value=1.24;
    const now=context.currentTime,duration=source.buffer.duration/1.24,volume=Math.min(.9,settings.volume)*.82;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.025);gain.gain.setValueAtTime(volume,now+Math.max(.025,duration-.055));gain.gain.linearRampToValueAtTime(0,now+duration);
    source.connect(gain);gain.connect(context.destination);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();};source.start();return true;
  }
  function stop(){for(const source of sources)try{source.stop();}catch{}sources.clear();}
  window.SagasuOpeningVoice=Object.freeze({prepare,unlock,play,stop});prepare();
})();
