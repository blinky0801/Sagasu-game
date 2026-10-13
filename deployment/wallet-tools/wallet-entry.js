import {getWallets} from '@wallet-standard/app';
import {registerMwa, createDefaultAuthorizationCache, createDefaultChainSelector} from '@solana-mobile/wallet-standard-mobile';

const cancelled=()=>Object.assign(new Error('Connection cancelled.'),{code:4001});
const fail=code=>Object.assign(new Error(code),{code});
const registry=getWallets();
const authorizationCache=createDefaultAuthorizationCache();
registerMwa({
  appIdentity:{name:'Sagasu',uri:location.origin,icon:'icon.png'},
  authorizationCache,
  chains:['solana:mainnet'],
  chainSelector:createDefaultChainSelector(),
  onWalletNotFound:async()=>{throw fail('NO_MOBILE_WALLET');}
});

function standardAdapter(wallet){
  let account;
  const adapter={
    connect:async()=>{
      const result=await wallet.features['standard:connect'].connect();
      account=result.accounts.find(a=>a.chains.includes('solana:mainnet'));
      if(!account)throw fail('WALLET_ACCOUNT');
      adapter.publicKey={toBase58:()=>account.address};
    }
  };
  if(wallet.features['solana:signIn'])adapter.signIn=async input=>{
    // A cached MWA authorization can omit SIWS or contain an old signed message.
    if(wallet.name==='Mobile Wallet Adapter')await authorizationCache.clear();
    // Supabase SIWS requires the namespaced network, not the wallet's short alias.
    const results=await wallet.features['solana:signIn'].signIn({...input,chainId:'solana:mainnet'});
    return results.map(result=>({...result,signedMessage:new Uint8Array(result.signedMessage),signature:new Uint8Array(result.signature)}));
  };
  else adapter.signMessage=async message=>{
    if(!account)throw fail('WALLET_ACCOUNT');
    const [output]=await wallet.features['solana:signMessage'].signMessage({account,message});
    if(!(output?.signature instanceof Uint8Array)||output.signature.length!==64||!(output.signedMessage instanceof Uint8Array)||output.signedMessage.length!==message.length||!message.every((v,i)=>v===output.signedMessage[i]))throw fail('WALLET_SIGNATURE');
    return output.signature;
  };
  return adapter;
}

function choices(){
  const list=registry.get().filter(w=>w.chains.includes('solana:mainnet')&&w.features['standard:connect']&&(w.features['solana:signIn']||w.features['solana:signMessage']))
    .map(w=>({name:w.name==='Mobile Wallet Adapter'?'Mobile Wallet':w.name,icon:w.icon,provider:()=>standardAdapter(w)}));
  const seen=new Set();
  for(const [name,provider] of [['Phantom',window.phantom?.solana],['Solflare',window.solflare],['Backpack',window.backpack?.solana],['Solana Wallet',window.solana]]){
    if(!provider?.connect||(!provider.signIn&&!provider.signMessage)||seen.has(provider))continue;
    seen.add(provider);
    if(name==='Solana Wallet'&&(provider===window.phantom?.solana||provider===window.solflare||provider===window.backpack?.solana))continue;
    // Preserve the previously working injected-provider connect/sign-in sequence.
    const choice={name,provider:()=>({connectBeforeSignIn:true,connect:()=>provider.connect(),get publicKey(){return provider.publicKey;},
      ...(provider.signIn?{signIn:input=>provider.signIn(input)}:{signMessage:async message=>{const value=await provider.signMessage(message,'utf8');return value.signature||value;}})})};
    const existing=list.findIndex(w=>w.name===name);
    if(existing>=0){choice.icon=list[existing].icon;list[existing]=choice;}else list.push(choice);
  }
  return list;
}

let pending=false;
function choose(){
  if(pending)return Promise.reject(fail('WALLET_BUSY'));
  pending=true;
  return new Promise((resolve,reject)=>{
    const dialog=document.createElement('dialog');dialog.className='wallet-picker';dialog.setAttribute('aria-labelledby','wallet-picker-title');
    const title=document.createElement('h2');title.id='wallet-picker-title';title.textContent='Connect Wallet';
    const close=document.createElement('button');close.className='wallet-picker-close';close.type='button';close.ariaLabel='Cancel wallet connection';close.title='Cancel wallet connection';close.innerHTML='<i data-lucide="x"></i>';
    const list=document.createElement('div');list.className='wallet-picker-list';
    const status=document.createElement('p');status.className='wallet-picker-status';status.setAttribute('role','status');
    dialog.append(close,title,list,status);document.body.append(dialog);
    let complete=false;
    const stop=(provider,error)=>{if(complete)return;complete=true;pending=false;offRegister();offUnregister();dialog.close();dialog.remove();error?reject(error):resolve(provider);};
    function render(){
      list.replaceChildren();const wallets=choices();
      for(const wallet of wallets){
        const button=document.createElement('button');button.type='button';
        if(wallet.icon?.startsWith('data:image/')){const img=document.createElement('img');img.src=wallet.icon;img.alt='';button.append(img);}
        else{const icon=document.createElement('i');icon.dataset.lucide=wallet.name==='Mobile Wallet'?'smartphone':'wallet';button.append(icon);}
        const name=document.createElement('span');name.textContent=wallet.name;button.append(name);
        button.onclick=()=>stop(wallet.provider());list.append(button);
      }
      status.textContent=wallets.length?'':/Android/i.test(navigator.userAgent)?'Open Sagasu in Chrome to connect your mobile wallet.':/iPhone|iPad/i.test(navigator.userAgent)?'Open Sagasu in your Solana wallet browser.':'No Solana wallet found.';
      window.lucide?.createIcons({root:dialog});
    }
    const offRegister=registry.on('register',render),offUnregister=registry.on('unregister',render);
    close.onclick=()=>stop(null,cancelled());dialog.addEventListener('cancel',event=>{event.preventDefault();stop(null,cancelled());});
    render();dialog.showModal();
  });
}

function errorMessage(error){
  const errors=[],seen=new Set();
  for(let current=error;current&&errors.length<8&&!seen.has(current);current=current.cause){seen.add(current);errors.push(current);}
  const detail=errors.map(e=>e.message||'').join(' '),codes=errors.map(e=>e.code);
  if(codes.includes('ERROR_LOOPBACK_ACCESS_BLOCKED')||/local network|permission/i.test(detail))return 'Allow local network access in Chrome site settings, then try again.';
  if(codes.includes('ERROR_BROWSER_NOT_SUPPORTED'))return 'Open Sagasu in Chrome on your phone to connect your wallet.';
  if(codes.includes('NO_MOBILE_WALLET')||codes.includes('ERROR_WALLET_NOT_FOUND')||/NO_MOBILE_WALLET/.test(detail))return 'No mobile wallet found. Set up your wallet, then try again.';
  if(codes.includes('ERROR_SESSION_TIMEOUT')||/timed out|websocket|session dropped|session was closed/i.test(detail))return 'The wallet connection was interrupted. Return to Chrome and try again.';
  if(/no sign in result/i.test(detail))return 'Your wallet could not complete sign-in. Please try again.';
  if(codes.includes(4001)||codes.includes(-1)||codes.includes(-3)||/reject|denied|cancel/i.test(detail))return 'Connection cancelled.';
  if(errors.some(e=>e.status===401||e.status===403)||/invalid.*signature|invalid.*message|expired|validation_failed/i.test(detail))return 'Sign-in could not be verified. Check your phone time, then try again.';
  return 'Could not connect your wallet. Please try again.';
}
let lastReport='';
function recordError(error,stage){
  const errors=[],seen=new Set();
  for(let current=error;current&&errors.length<8&&!seen.has(current);current=current.cause){
    seen.add(current);
    const message=String(current.message||'').replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/https?:\/\/\S+/gi,'[url]').replace(/[A-Za-z0-9_+/=-]{40,}/g,'[redacted]').slice(0,400);
    errors.push({name:current.name,code:current.code,status:current.status,message});
  }
  lastReport=JSON.stringify({version:'wallet-fix-3',stage,secure:isSecureContext,browser:navigator.userAgent,errors},null,2);
}
function mountReport(node){
  if(!node||!lastReport||node.querySelector('.wallet-error-copy'))return;
  const button=document.createElement('button');button.type='button';button.className='wallet-error-copy';button.title=button.ariaLabel='Copy error report';button.innerHTML='<i data-lucide="copy"></i>';
  button.onclick=async()=>{try{await navigator.clipboard.writeText(lastReport);button.title=button.ariaLabel='Report copied';}catch{button.title=button.ariaLabel='Could not copy report';}};
  node.append(button);window.lucide?.createIcons({root:node});
}
window.SagasuWallet=Object.freeze({choose,errorMessage,recordError,mountReport,clearError:()=>{lastReport='';},report:()=>lastReport});
