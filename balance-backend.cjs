const fs=require('node:fs/promises');
const path=require('node:path');
const {parseEnv}=require('node:util');
const vm=require('node:vm');
const token=require('./game/token-balance.js');

function createBalanceHandler({root,fetcher=fetch,readPrivate,publicConfig,rpcUrl,allowedOrigin}={}){
  const limits=new Map();
  async function config(){
    if(publicConfig)return publicConfig;
    const window={};
    vm.runInNewContext(await fs.readFile(path.join(root,'game/cloud-config.js'),'utf8'),{window});
    return window.SagasuCloudConfig;
  }
  async function rpcURL(){
    let value=rpcUrl;
    if(value===undefined){
      let text;
      try{text=readPrivate?await readPrivate():await fs.readFile(path.join(root,'.private/helius.env'),'utf8');}catch{return null;}
      value=parseEnv(text).HELIUS_RPC_URL;
    }
    if(!value)return null;
    try{
      const url=new URL(value);
      if(url.protocol!=='https:'||url.hostname!=='mainnet.helius-rpc.com'||url.port||url.username||url.password||url.hash||url.pathname!=='/'||!url.searchParams.get('api-key'))return null;
      return url.href;
    }catch{return null;}
  }
  function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
  return async(req,res)=>{
    if(req.method!=='GET'){send(res,405,{error:'Method not allowed.'});return;}
    const auth=req.headers.authorization;
    if(!auth?.startsWith('Bearer ')||auth.length>8192){send(res,401,{error:'Sign in to read your wallet balance.'});return;}
    if(req.headers.origin&&(allowedOrigin?req.headers.origin!==allowedOrigin:!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin))){send(res,403,{error:'Origin not allowed.'});return;}
    const now=Date.now(),ip=req.socket.remoteAddress;
    for(const [k,v] of limits)if(v.until<=now)limits.delete(k);
    const limit=limits.get(ip)||{count:0,until:now+60000};limit.count++;limits.set(ip,limit);
    if(limit.count>30){send(res,429,{error:'Too many balance requests. Try again shortly.'});return;}
    try{
      const cfg=await config();
      const response=await fetcher(cfg.supabaseUrl+'/auth/v1/user',{headers:{apikey:cfg.supabasePublishableKey,Authorization:auth},signal:AbortSignal.timeout(5000),redirect:'error'});
      if(response.status===401||response.status===403){send(res,401,{error:'Your session expired. Sign in again.'});return;}
      if(!response.ok){send(res,502,{error:'Authentication service unavailable.'});return;}
      const user=await response.json();
      let owner;try{owner=token.address(user);}catch{send(res,403,{error:'A verified Solana wallet identity is required.'});return;}
      const url=await rpcURL();
      if(!url){send(res,503,{error:'Helius is not configured. Add the Mainnet RPC URL to the private server settings.'});return;}
      const rpc=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(7000),
        body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',params:[owner,{mint:cfg.tokenMint},{encoding:'jsonParsed',commitment:'confirmed'}]})});
      if(!rpc.ok){send(res,rpc.status===429?429:502,{error:rpc.status===429?'Balance service is busy. Try again shortly.':'Helius could not read your balance. Check the private RPC settings.'});return;}
      const payload=await rpc.json();
      if(payload.error)throw new Error('RPC failed');
      token.total(payload.result,owner,cfg.tokenMint);
      send(res,200,{jsonrpc:'2.0',id:1,result:payload.result});
    }catch{send(res,502,{error:'Balance service unavailable. Please try again.'});}
  };
}
module.exports={createBalanceHandler};
