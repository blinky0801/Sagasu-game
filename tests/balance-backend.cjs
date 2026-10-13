const assert=require('node:assert/strict');
const http=require('node:http');
const {createBalanceHandler}=require('../balance-backend.cjs');
const owner='11111111111111111111111111111111',mint='6dPweBFhc13AjGQ5MBYJUs9EYDJ3zXfGPi61zDAVEwDb';
const publicConfig={supabaseUrl:'https://auth.example',supabasePublishableKey:'public',tokenMint:mint};
(async()=>{
  let setting='HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=FAKE_TEST_KEY',calls=0,authCalls=0,mode='ok';
  const handler=createBalanceHandler({publicConfig,readPrivate:async()=>setting,fetcher:async(url,options)=>{
    if(url.startsWith('https://auth.example')){
      authCalls++;
      if(options.headers.Authorization!=='Bearer valid')return {status:401,ok:false};
      return {status:200,ok:true,json:async()=>({id:'a',identities:mode==='identity'?[]:[{provider:'web3',id:'web3:solana:'+owner,identity_id:'internal-uuid'}],user_metadata:{address:'not-trusted'}})};
    }
    calls++;assert(url.includes('FAKE_TEST_KEY'));
    const req=JSON.parse(options.body);assert.equal(req.method,'getTokenAccountsByOwner');assert.equal(req.params[0],owner);assert.equal(req.params[1].mint,mint);
    if(mode==='upstream')return {ok:false,status:403};
    if(mode==='throw')throw new Error(url);
    return {ok:true,json:async()=>({result:{context:{slot:123},value:[]}})};
  }});
  const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port;
  const read=(token='valid',extra={})=>fetch(url,{headers:{Authorization:'Bearer '+token,...extra}});
  try{
    assert.equal((await fetch(url)).status,401);assert.equal(calls,0);assert.equal(authCalls,0);
    assert.equal((await read('forged')).status,401);assert.equal(calls,0);
    assert.equal((await read('valid',{Origin:'https://evil.example'})).status,403);
    assert.equal((await fetch(url,{method:'POST'})).status,405);
    let response=await read();assert.equal(response.status,200);assert(!(await response.text()).includes('FAKE_TEST_KEY'));
    setting='HELIUS_RPC_URL=';assert.equal((await read()).status,503);
    setting='HELIUS_RPC_URL=https://evil.example/?api-key=FAKE_TEST_KEY';assert.equal((await read()).status,503);
    setting='HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=FAKE_TEST_KEY';
    mode='identity';assert.equal((await read()).status,403);
    mode='upstream';assert.equal((await read()).status,502);
    mode='throw';response=await read();assert.equal(response.status,502);assert(!(await response.text()).includes('FAKE_TEST_KEY'));
    console.log('PASS: verified auth, fixed wallet/mint/method, no key leakage, origin/method rejection, private config validation and upstream failures.');
  }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
