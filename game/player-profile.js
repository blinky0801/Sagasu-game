(() => {
  'use strict';
  let client,user=null,epoch=0,username=null,draft='',edited=false,loading=false,saving=false,message='';
  const week=7*24*60*60*1000;
  let nextChangeAt=0,unlockTimer;
  function setDeadline(value){
    clearTimeout(unlockTimer);nextChangeAt=Number.isFinite(value)?value:0;
    const wait=nextChangeAt-Date.now();if(wait>0)unlockTimer=setTimeout(()=>{message='';paint();},Math.min(wait,week));
  }
  async function request(query){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try{const result=await (typeof query.abortSignal==='function'?query.abortSignal(controller.signal):query);if(result.error)throw result.error;return result.data;}finally{clearTimeout(timer);}
  }
  function paint(form=document.getElementById('username-form')){
    if(!form)return;
    const input=form.querySelector('input'),button=form.querySelector('button');
    const locked=nextChangeAt>Date.now();
    if(locked||document.activeElement!==input)input.value=draft;
    input.disabled=loading||saving;input.readOnly=locked;button.disabled=loading||saving||locked||!edited;
    const availability=locked?'You can change your username on '+new Date(nextChangeAt).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+'.':'';
    form.querySelector('[role="status"]').textContent=loading?'Loading profile...':saving?'Saving username...':[message,availability].filter(Boolean).join(' ');
  }
  async function load(){
    const stamp=epoch,id=user.id;loading=true;paint();
    try{
      const data=await request(client.from('sagasu_players').select('username,username_changed_at').eq('id',id).maybeSingle());
      if(stamp!==epoch)return;
      username=typeof data?.username==='string'?data.username:null;
      setDeadline(data?.username_changed_at?Date.parse(data.username_changed_at)+week:0);
      if(!edited||nextChangeAt>Date.now()){draft=username||'';edited=false;}
    }catch{if(stamp===epoch)message='Could not load your username. Please try again later.';}
    finally{if(stamp===epoch){loading=false;paint();}}
  }
  async function save(event){
    event.preventDefault();if(!user||saving||loading||nextChangeAt>Date.now())return;
    const name=draft.trim();
    if(!/^[A-Za-z0-9_]{3,20}$/.test(name)){message='Use 3-20 letters, numbers or underscores.';paint();return;}
    if(['admin','support','sagasu','moderator'].includes(name.toLowerCase())){message='Please choose another username.';paint();return;}
    const stamp=epoch;saving=true;message='';paint();
    try{
      const data=await request(client.rpc('sagasu_set_username',{p_username:name}));
      if(stamp!==epoch)return;
      if(typeof data!=='string'||data!==name)throw new Error('Invalid profile');
      username=data;draft=data;edited=false;message='Username saved.';
      setDeadline(Date.now()+week);await load();
    }catch(error){if(stamp===epoch){
      if(error?.code==='P0001'){
        let deadline=0;try{deadline=Date.parse(JSON.parse(error.details).nextChangeAt);}catch{}
        setDeadline(deadline);message='Username changes are limited to once every 7 days.';edited=false;draft=username||'';
        await load();
      }else message=error?.code==='23505'?'That username is taken. Try another.':error?.code==='22023'?'Please choose another username.':'Could not save your username. Please try again.';
    }}
    finally{if(stamp===epoch){saving=false;paint();}}
  }
  function mount(parent){
    const form=document.createElement('form');form.id='username-form';form.className='player-profile';
    form.innerHTML='<label for="player-username">Username</label><div class="username-edit"><input id="player-username" name="username" type="text" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Choose a username"><button type="submit" aria-label="Save username" title="Save username"><i data-lucide="check"></i></button></div><p role="status" aria-live="polite"></p>';
    form.noValidate=true;form.onsubmit=save;
    form.querySelector('input').oninput=event=>{draft=event.target.value;edited=draft!==username;message='';paint();};
    parent.insertBefore(form,parent.querySelector('.dialog-actions'));paint(form);
  }
  window.SagasuProfile=Object.freeze({configure:value=>client=value,setUser:next=>{epoch++;clearTimeout(unlockTimer);nextChangeAt=0;user=next;username=null;draft='';edited=false;loading=false;saving=false;message='';if(user)load();},mount});
})();
