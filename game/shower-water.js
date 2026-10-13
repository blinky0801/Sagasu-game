(() => {
  'use strict';
  const water=document.getElementById('shower'),pet=document.getElementById('pet');
  const image=new Image();image.className='shower-art';image.alt='';image.draggable=false;
  const frames=Array.from({length:8},(_,i)=>{
    const frame=new Image();frame.src='../game%20art%20from%20illustrator/bathroom_new/bathroom_new/bathroom_shower'+String(i+1).padStart(4,'0')+'.png';return frame;
  });
  water.replaceChildren(image);
  const fixture=document.createElement('div'),rest=new Image();
  fixture.className='shower-fixture';fixture.setAttribute('aria-hidden','true');
  rest.className='shower-art';rest.alt='';rest.draggable=false;rest.src=frames[0].src;
  fixture.append(rest);document.getElementById('stage').append(fixture);
  // The shower shares the character canvas and follows displayed rinse frames, including stalls.
  function sync(){
    fixture.hidden=!water.hidden;
    const index=water.hidden?0:((Number(pet.dataset.frame)||1)-1)%frames.length;
    if(image.src!==frames[index].src)image.src=frames[index].src;
    water.dataset.frame=String(index+1);
  }
  new MutationObserver(sync).observe(pet,{attributes:true,attributeFilter:['data-frame']});
  new MutationObserver(sync).observe(water,{attributes:true,attributeFilter:['hidden']});
  sync();
})();
