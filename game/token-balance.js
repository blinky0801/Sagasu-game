(() => {
  'use strict';
  const token2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
  function address(user){
    // Auth serializes the database provider_id as identity.id, not provider_id.
    const identities=(user?.identities||[]).filter(i=>i.provider==='web3'&&typeof i.id==='string'&&i.id.startsWith('web3:solana:'));
    if(identities.length!==1)throw new Error('A verified Solana wallet identity is required.');
    const value=identities[0].id.slice('web3:solana:'.length);
    if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value))throw new Error('Invalid wallet identity.');
    return value;
  }
  function total(result,owner,mint){
    if(!Array.isArray(result?.value)||!Number.isSafeInteger(result?.context?.slot))throw new Error('Invalid balance response.');
    let amount=0n,decimals=null;
    const seen=new Set();
    for(const row of result.value){
      const parsed=row.account?.data?.parsed,info=parsed?.info,t=info?.tokenAmount;
      if(!row.pubkey||seen.has(row.pubkey)||row.account?.owner!==token2022||parsed.type!=='account'||info.owner!==owner||info.mint!==mint||!/^\d+$/.test(t?.amount)||!Number.isInteger(t.decimals)||t.decimals<0||t.decimals>18)throw new Error('Invalid token account response.');
      if(decimals!==null&&decimals!==t.decimals)throw new Error('Inconsistent token decimals.');
      seen.add(row.pubkey);decimals=t.decimals;amount+=BigInt(t.amount);
    }
    // Empty account lists indicate zero holdings, not a failed RPC request.
    const d=decimals??6,scale=10n**BigInt(d);
    const whole=(amount/scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
    const fraction=d?(amount%scale).toString().padStart(d,'0').replace(/0+$/,''):'';
    return {display:whole+(fraction?'.'+fraction:''),slot:result.context.slot};
  }
  async function read(user,config,signal,accessToken){
    const owner=address(user);
    if(!accessToken)throw new Error('Sign in to read your wallet balance.');
    const response=await fetch(config.balanceApiUrl,{method:'GET',headers:{Authorization:'Bearer '+accessToken},signal,cache:'no-store'});
    const json=await response.json();
    if(!response.ok)throw Object.assign(new Error('Balance request failed.'),{status:response.status});
    if(json.error)throw new Error('Balance service could not complete the request.');
    return {...total(json.result,owner,config.tokenMint),address:owner,checkedAt:Date.now()};
  }
  const api=Object.freeze({address,total,read});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.SagasuTokenBalance=api;
})();
