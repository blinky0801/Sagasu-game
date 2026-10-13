(() => {
  'use strict';
  const cfg=window.SagasuCloudConfig,care=window.SagasuCare;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  window.SagasuCompetition.configure(client);
  window.SagasuProfile.configure(client);
  let user=null,busy=false,epoch=0,message='Playing as guest.';
  const revisions=new Map();
  let balance={status:'idle'},balanceRequest=null;
  let sync=null,syncState='guest';
  let syncReady=Promise.resolve();
  const syncLabels={checking:'Getting your progress...',saved:'Progress saved.',saving:'Saving progress...',pending:'Saving soon...',offline:'Offline. Progress saved on this device.',conflict:'Progress changed on another device. Restore the latest save to continue.',error:'Progress saved on this device. Retrying soon.'};
  care.onSave(()=>sync?.mark());
  const button=document.createElement('button');
  button.id='account-button';button.title=button.ariaLabel='Your account';
  button.innerHTML='<i data-lucide="wallet"></i>';
  document.getElementById('sound-button').before(button);
  button.onclick=show;
  function revision(id){
    if(!revisions.has(id)){
      let n=0;try{n=Number(localStorage.getItem('sagasu-cloud-revision:'+id))||0;}catch{}
      revisions.set(id,Math.max(0,n));
    }
    return revisions.get(id);
  }
  function remember(id,n){revisions.set(id,n);try{localStorage.setItem('sagasu-cloud-revision:'+id,String(n));}catch{}}
  function activate(next){
    if(user?.id===next?.id)return;
    sync?.close();sync=null;syncState='guest';care.setSyncLoading(false);care.setSaveStatus('Saved on this device');
    epoch++;balanceRequest?.abort();balanceRequest=null;balance={status:'idle'};
    const hadLocal=next?care.hasAccountCache(next.id):false;
    user=next;care.switchAccount(user?.id);
    window.SagasuCompetition.setUser(user);
    window.SagasuProfile.setUser(user);
    message=user?'Wallet connected.':'Playing as guest.';
    button.setAttribute('aria-pressed',String(!!user));
    if(user){
      const stamp=epoch;
      sync=window.SagasuProgressSync.create({client,id:user.id,care,hadLocal,revision:revision(user.id),onRevision:n=>{if(stamp===epoch)remember(user.id,n);},onStatus:value=>{
        if(stamp!==epoch)return;
        syncState=value;care.setSyncLoading(value==='checking');care.setSaveStatus(value==='conflict'?'Progress needs attention':value==='error'||value==='offline'?'Saved on this device':syncLabels[value]);
        const el=document.getElementById('progress-status');if(el)el.textContent=syncLabels[value];
        for(const id of ['cloud-save','cloud-load']){const b=document.getElementById(id);if(b)b.disabled=busy||value==='checking';}
      }});
      syncReady=sync.initialize();refreshBalance();
    }
    window.dispatchEvent(new Event('sagasu-account-change'));
  }
  function show(){
    const div=document.createElement('div');
    div.className='account-panel';div.dataset.signedIn=String(!!user);
    div.innerHTML='<p class="eyebrow">SAGASU ACCOUNT</p><h2>Your account</h2><p class="account-identity"></p><div class="dialog-actions"></div><p class="dialog-message" role="status"></p>';
    div.querySelector('.account-identity').textContent=user?'Signed in with Solana':'Playing as guest';
    div.querySelector('.dialog-message').textContent=message;
    window.SagasuWallet?.mountReport(div.querySelector('.dialog-message'));
    function action(id,label,fn){const b=document.createElement('button');b.id=id;b.textContent=label;b.disabled=busy||(syncState==='checking'&&id!=='account-signout');b.onclick=()=>run(fn);div.querySelector('.dialog-actions').append(b);}
    if(user){
      window.SagasuProfile.mount(div);
      const section=document.createElement('section');section.className='wallet-balance';
      section.innerHTML='<div class="wallet-balance-heading"><b>$SAGASU</b><span>Solana</span><button id="refresh-balance" aria-label="Refresh token balance" title="Refresh token balance"><i data-lucide="refresh-cw"></i></button></div><output id="token-balance" aria-live="polite"></output><p class="wallet-address"></p><small class="balance-time"></small>';
      section.querySelector('output').textContent=balance.status==='ready'?balance.display:balance.status==='loading'?'Loading...':balance.status==='error'?'Unavailable':'Not checked';
      try{section.querySelector('.wallet-address').textContent=window.SagasuTokenBalance.address(user);}catch{}
      section.querySelector('.balance-time').textContent=balance.status==='ready'?'Updated '+new Date(balance.checkedAt).toLocaleTimeString('en-US')+' · Coins are separate.':balance.status==='error'?balance.error:'';
      const refresh=section.querySelector('button');refresh.disabled=balance.status==='loading';refresh.onclick=refreshBalance;
      div.querySelector('.dialog-actions').before(section);
      const progress=document.createElement('p');progress.id='progress-status';progress.setAttribute('role','status');progress.textContent=syncLabels[syncState]||'Autosave on';section.after(progress);
      action('cloud-save','Save progress',save);action('cloud-load','Restore progress',load);action('account-signout','Sign out',logout);
    }
    else action('wallet-signin','Sign in with Solana',login);
    if(location.hostname==='127.0.0.1'&&!user){
      const link=document.createElement('a'),url=new URL(location.href);
      url.hostname='localhost';url.hash='';
      link.href=url.href;link.textContent='Open sign-in page';
      div.querySelector('.dialog-actions').append(link);
    }
    care.showAccount(div);
  }
  async function run(fn){
    if(busy)return;busy=true;message=fn===save?'Saving progress...':fn===load?'Restoring progress...':'Connecting...';show();
    try{await fn();}catch(e){
      if(e?.code==='40001')message='Progress changed on another device. Restore the latest save before saving again.';
      else if(e?.code==='LOCAL_SIGNIN')message='Open the sign-in page to connect your wallet.';
      else if(e?.code==='SECURE_SIGNIN')message='Sign-in is unavailable at this address.';
      else if(e?.code==='NO_WALLET')message='No wallet found. Open Sagasu in a browser with your Solana wallet.';
      else if(e?.code===4001||/rejected|denied|cancelled/i.test(e?.message||''))message='Connection cancelled.';
      else if(e?.status===401||e?.status===403)message='Please sign in again.';
      else message=fn===save?'Could not save progress. Please try again.':fn===load?'Could not restore progress. Please try again.':fn===logout?'Could not sign out. Please try again.':window.SagasuWallet.errorMessage(e);
    }
    finally{busy=false;sync?.resume();if((document.getElementById('modal').open||window.SagasuDisplay?.isModalSuspended())&&document.querySelector('.account-identity'))show();}
  }
  async function login(){
    // Supabase only permits localhost as the HTTP exception for signed Web3 messages.
    if(location.protocol!=='https:'&&location.hostname!=='localhost')throw Object.assign(new Error('Unsupported sign-in origin.'),{code:location.hostname==='127.0.0.1'?'LOCAL_SIGNIN':'SECURE_SIGNIN'});
    window.SagasuWallet.clearError();
    let wallet;
    try{wallet=await window.SagasuWallet.choose();}catch(e){window.SagasuWallet.recordError(e,'wallet selection');throw e;}
    const modal=document.getElementById('modal'),restorePanel=modal.open&&!!document.querySelector('.account-identity');
    // SDK permission dialogs must not sit behind the native account dialog.
    if(restorePanel)modal.close();
    window.dispatchEvent(new CustomEvent('sagasu-wallet-flow',{detail:{phase:'start'}}));
    let stage='wallet connection';
    try{
      // SIWS opens and authorizes mobile wallets in one session; do not launch twice.
      if(!wallet.signIn||wallet.connectBeforeSignIn)await wallet.connect();
      stage='wallet signature / authentication';
      const {data,error}=await client.auth.signInWithWeb3({chain:'solana',wallet,statement:'Sign in to Sagasu to save your game progress. This does not authorize a token transfer.'});
      if(error)throw error;
      if(!data.user)throw new Error('Wallet authentication did not complete.');
      window.SagasuWallet.clearError();
      activate(data.user);
    }catch(e){window.SagasuWallet.recordError(e,stage);throw e;}
    finally{
      window.dispatchEvent(new CustomEvent('sagasu-wallet-flow',{detail:{phase:'end'}}));
      if(restorePanel)show();
    }
  }
  async function verified(){
    const stamp=epoch,id=user?.id;
    const {data,error}=await client.auth.getUser();
    if(error)throw error;
    if(!id||stamp!==epoch||data.user?.id!==id)throw new Error('Account changed. Please try again.');
    return {stamp,id,authUser:data.user};
  }
  function repaintAccount(){if(document.getElementById('modal').open&&document.querySelector('.account-identity'))show();window.dispatchEvent(new Event('sagasu-account-change'));}
  async function refreshBalance(){
    if(!user||balance.status==='loading')return;
    const stamp=epoch,controller=new AbortController();balanceRequest=controller;
    balance={status:'loading'};repaintAccount();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const {authUser}=await verified();
      if(stamp!==epoch)return;
      const {data,error}=await client.auth.getSession();
      if(error)throw error;
      if(stamp!==epoch)return;
      const result=await window.SagasuTokenBalance.read(authUser,cfg,controller.signal,data.session?.access_token);
      if(stamp===epoch)balance={status:'ready',...result};
    }catch(e){if(stamp===epoch)balance={status:'error',error:e.status===401?'Please sign in again.':e.status===429?'Please wait a moment, then refresh.':'Could not update your balance. Please try again.'};}
    finally{clearTimeout(timeout);if(stamp===epoch){balanceRequest=null;repaintAccount();}}
  }
  async function save(){
    const {stamp}=await verified(),current=sync;
    care.snapshot();await current.flush();
    if(stamp===epoch)message=syncState==='saved'?'Progress saved.':syncLabels[syncState];
  }
  async function load(){
    if(!window.confirm('Restore your last saved progress? This replaces your current progress on this device.')){message='Restore cancelled.';return;}
    const {stamp}=await verified(),current=sync;
    const restored=await current.restore();
    if(stamp===epoch)message=restored?'Progress restored.':'No saved progress yet.';
  }
  async function logout(){
    await sync?.flush().catch(()=>{});
    const {error}=await client.auth.signOut();if(error)throw error;activate(null);
  }
  window.addEventListener('online',()=>sync?.resume());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)sync?.flush().catch(()=>{});else sync?.resume();});
  window.addEventListener('pagehide',()=>sync?.flush().catch(()=>{}));
  // Defer work so storage and rendering do not run inside Auth's callback lock.
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT')setTimeout(()=>activate(null),0);
    else if(event==='SIGNED_IN')setTimeout(()=>activate(session?.user||null),0);
  });
  async function bounded(promise,ms=10000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timed out')),ms);})]);}finally{clearTimeout(timer);}}
  const initialEpoch=epoch;
  const ready=bounded(client.auth.getUser(),8000).then(async({data,error})=>{if(epoch===initialEpoch&&!error&&data.user){activate(data.user);await bounded(syncReady,12000).catch(()=>{});}}).catch(()=>{});
  window.SagasuAccount=Object.freeze({ready,hasUser:()=>!!user,
    flushForExit:async()=>{try{await bounded(sync?.flush(),4000);}catch{}},
    summary:()=>{let address='';try{if(user)address=window.SagasuTokenBalance.address(user);}catch{}return {signedIn:!!user,address,balance:balance.status==='ready'?balance.display:null};},
    enter:async guest=>{
      await ready;
      try{
        if(guest){if(user)await logout();else epoch++;}
        else{if(!user)await login();await bounded(syncReady,12000).catch(()=>{});}
      }catch(e){
        const text=e?.code==='LOCAL_SIGNIN'?'Open the game at localhost to connect your wallet.':e?.code==='SECURE_SIGNIN'?'Sign-in is unavailable at this address.':guest?'Could not switch to guest. Please try again.':window.SagasuWallet.errorMessage(e);
        throw new Error(text);
      }
    }
  });
  window.lucide?.createIcons();
})();
