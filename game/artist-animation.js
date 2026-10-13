(() => {
  'use strict';
  const clips={
    idle:{folder:'idle/idle',prefix:'idle',count:40},
    sofa:{folder:'sofa_idle/sofa_idle',prefix:'sofa_idle',count:71},
    pet:{folder:'pet_reaction/pet_reaction',prefix:'pet_reaction',count:65},
    bath:{folder:'sagasu1/bath_idle_1',prefix:'bath_idle_1',count:40},
    scrub:{folder:'sagasu1/bath_scrub_1',prefix:'bath_scrub_1',count:40},
    apple:{folder:'eat/eat_apple',prefix:'eat_apple',count:80},
    chips:{folder:'eat/eat_potato',prefix:'eat_potato',count:40},
    ramen:{folder:'eat/eat_ramen',prefix:'eat_ramen',count:40},
    rinse:{folder:'sagasu1/bath_rinse_1',prefix:'bath_rinse_1',count:64},
    shake:{folder:'sagasu1/bath_shake_1',prefix:'bath_shake_1',count:60},
    sleepEnter:{folder:'sleep_enter/sleep_enter',prefix:'sleep_enter',count:30},
    sleepLoop:{folder:'sleep_loop/sleep_loop',prefix:'sleep_loop',count:50},
    wake:{folder:'wake_up/wake_up',prefix:'wake_up',count:100},
    annoyed:{folder:'annoyed',prefix:'annoyed',count:30},
    happy:{folder:'happy',prefix:'happy',count:36},
    catch:{folder:'play_catch',prefix:'play_catch',count:60}
  };
  const image=document.getElementById('pet-art'),pet=document.getElementById('pet');
  const cache=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=null,index=0,last=0,loop=true,done=null;
  function hitbox(){
    if(!['sofa','bed'].includes(pet.dataset.pose)){pet.style.clipPath='';return;}
    const art=image.getBoundingClientRect(),box=pet.getBoundingClientRect();
    const bounds=pet.dataset.pose==='bed'?[110,230,830,805]:[1040,275,1545,740];
    const left=art.left-box.left+bounds[0]/1920*art.width,top=art.top-box.top+bounds[1]/1080*art.height;
    const right=art.left-box.left+bounds[2]/1920*art.width,bottom=art.top-box.top+bounds[3]/1080*art.height;
    pet.style.clipPath=`inset(${Math.max(0,top)}px ${Math.max(0,box.width-right)}px ${Math.max(0,box.height-bottom)}px ${Math.max(0,left)}px)`;
  }
  new ResizeObserver(hitbox).observe(image);
  window.addEventListener('resize',hitbox);
  const url=(name,n)=>'../game%20art%20from%20illustrator/'+clips[name].folder+'/'+clips[name].prefix+String(n+1).padStart(4,'0')+'.png';
  function preload(name,n){
    const src=url(name,n);if(cache.has(src))return cache.get(src);
    const frame=new Image();frame.src=src;cache.set(src,frame);
    // Only retain a short look-ahead window of decoded frames, not whole 1080p clips.
    while(cache.size>8)cache.delete(cache.keys().next().value);
    return frame;
  }
  function set(name,options={}){
    if(active===name&&!options.restart)return;
    window.SagasuAudio?.activity(name);
    active=name;index=0;last=0;loop=options.loop!==false;done=options.onEnd||null;
    pet.dataset.animation=name;pet.dataset.frame='1';pet.dataset.pose=['sleepEnter','sleepLoop','wake'].includes(name)?'bed':name==='sofa'?'sofa':'standing';
    image.alt=['bath','scrub','rinse','shake'].includes(name)?'Sagasu taking a bath':pet.dataset.pose==='bed'?'Sagasu resting in bed':name==='sofa'?'Sagasu lounging on the sofa with his phone':'Sagasu in his black hoodie';
    image.src=url(name,0);hitbox();for(let i=0;i<4;i++)preload(name,i);
  }
  function tick(now){
    if(active&&!document.hidden){
      if(!last)last=now;
      if(now-last>=1000/24){
        if(!reduced.matches||!loop){
          let next=index+1;
          if(next>=clips[active].count){if(loop)next=0;else{const callback=done;done=null;active=null;callback?.();requestAnimationFrame(tick);return;}}
          const frame=preload(active,next);
          if(frame.complete&&frame.naturalWidth){index=next;image.src=frame.src;pet.dataset.frame=String(index+1);for(let i=1;i<=3;i++)preload(active,(index+i)%clips[active].count);}
        }
        last=now;
      }
    }else last=now;
    requestAnimationFrame(tick);
  }
  window.SagasuAnimator={set,cancel(){active=null;done=null;window.SagasuAudio?.stop('activity');}};
  requestAnimationFrame(tick);
})();
