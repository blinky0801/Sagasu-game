(() => {
  'use strict';
  let client=null,user=null,epoch=0,round=null,request=0;
  const care=window.SagasuCare;
  const button=document.createElement('button');button.id='leaderboard-button';button.title=button.ariaLabel='Weekly leaderboard';button.innerHTML='<i data-lucide="medal"></i>';
  document.getElementById('journal').before(button);
  const notify=text=>care.notify(text);
  async function rpc(name,args){
    const query=client.rpc(name,args),controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
    try{const result=await (typeof query.abortSignal==='function'?query.abortSignal(controller.signal):query);if(result.error)throw result.error;return result.data;}finally{clearTimeout(timer);}
  }
  function shell(){
    const div=document.createElement('div');div.className='leaderboard';
    div.innerHTML='<p class="eyebrow">SAGASU WEEKLY</p><div class="leaderboard-heading"><h2>Weekly leaderboard</h2><button id="refresh-leaderboard" title="Refresh leaderboard" aria-label="Refresh leaderboard"><i data-lucide="refresh-cw"></i></button></div><p id="week-dates"></p><div id="weekly-summary"></div><p id="leaderboard-status" role="status"></p><table id="weekly-table" hidden><thead><tr><th>Rank</th><th>Player</th><th>Points</th></tr></thead><tbody></tbody></table>';
    care.showLeaderboard(div);div.querySelector('button').onclick=show;return div;
  }
  async function show(){
    const stamp=epoch,div=shell(),status=div.querySelector('#leaderboard-status');
    if(!user){status.textContent='Sign in to join the weekly leaderboard.';return;}
    div.querySelector('button').disabled=true;status.textContent='Loading standings...';
    try{
      const data=await rpc('sagasu_weekly_leaderboard');
      if(stamp!==epoch||!div.isConnected)return;
      if(!Array.isArray(data?.entries)||!data.you||!Number.isInteger(data.you.score))throw new Error('Invalid standings');
      const start=new Date(data.weekStart),end=new Date(data.weekEnd);
      if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime()))throw new Error('Invalid week');
      const date=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
      div.querySelector('#week-dates').textContent=date(start)+' - '+date(new Date(end-1))+' · Resets Monday, 00:00 UTC';
      div.querySelector('#weekly-summary').textContent='Your points: '+data.you.score+' · Rank: '+(data.you.position||'-')+' · Daily wins: '+data.dailyWins+'/3';
      const body=div.querySelector('tbody');
      for(const row of data.entries){
        if(!Number.isInteger(row.position)||!Number.isInteger(row.score)||typeof row.name!=='string')throw new Error('Invalid entry');
        const tr=document.createElement('tr');if(row.is_you)tr.className='is-you';
        for(const value of [row.position,row.name+(row.is_you?' (You)':''),row.score]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);
      }
      div.querySelector('table').hidden=!data.entries.length;
      status.textContent=data.entries.length?'':'No scores yet this week.';
    }catch{if(stamp===epoch&&div.isConnected)status.textContent='Standings are unavailable. Please try again later.';}
    finally{if(div.isConnected)div.querySelector('button').disabled=false;}
  }
  async function cancel(){request++;const active=round;round=null;if(active&&user)try{await rpc('sagasu_cancel_ranked_round',{p_round:active.id});}catch{}}
  async function start(){
    if(!user)return false;
    const stamp=epoch;
    const cancellation=cancel(),attempt=request;
    await cancellation;
    if(stamp!==epoch||attempt!==request)return false;
    try{
      const data=await rpc('sagasu_begin_ranked_round');
      if(stamp!==epoch||attempt!==request){if(stamp===epoch&&typeof data?.id==='string')await rpc('sagasu_cancel_ranked_round',{p_round:data.id}).catch(()=>{});return false;}
      if(typeof data?.id!=='string'||typeof data.nonce!=='string'||data.hits!==0)throw new Error('Invalid round');
      round={...data,nextAt:Date.now()+650};return true;
    }catch{if(stamp===epoch&&attempt===request)notify('Round not ranked');return false;}
  }
  async function hit(){
    if(!round)return {accepted:true,ranked:false};
    const active=round,stamp=epoch;
    if(Date.now()<active.nextAt)return {accepted:false,ranked:true};
    try{
      const data=await rpc('sagasu_ranked_hit',{p_round:active.id,p_nonce:active.nonce});
      if(stamp!==epoch||round!==active)return {accepted:false,ranked:false};
      if(data?.id!==active.id||data.hits!==active.hits+1||typeof data.nonce!=='string')throw new Error('Invalid hit');
      round={...active,...data,nextAt:Date.now()+650};
      if(data.complete){round=null;notify(data.points===10?'+10 weekly points':'Daily points complete');}
      return {accepted:true,ranked:true};
    }catch{
      if(stamp===epoch&&round===active){round=null;notify('Round not ranked');}
      return {accepted:true,ranked:false};
    }
  }
  async function preview(){if(!user)return null;const stamp=epoch,data=await rpc('sagasu_weekly_leaderboard');return stamp===epoch?data:null;}
  window.SagasuCompetition=Object.freeze({configure:c=>client=c,setUser:next=>{epoch++;request++;round=null;user=next;},start,hit,cancel,preview});
  button.onclick=show;window.lucide?.createIcons();
})();
