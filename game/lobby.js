(() => {
  'use strict';
  const root=document.getElementById('startup'),care=window.SagasuCare;
  const widgets=document.createElement('div');widgets.className='lobby-widgets';
  widgets.innerHTML=`
    <section class="lobby-panel lobby-reward" aria-labelledby="lobby-reward-title"><img class="lobby-gift" src="assets/ui/gift.png" alt=""><div><h2 id="lobby-reward-title">Daily Reward</h2><p id="lobby-reward-note"></p><button id="lobby-claim"><i data-lucide="gift"></i><span>Claim Reward</span></button></div><span class="lobby-today">Today</span></section>
    <button class="lobby-panel lobby-missions" id="lobby-missions"><span class="lobby-panel-heading"><img src="assets/ui/missions.png" alt=""><b>Daily Missions</b><i data-lucide="chevron-right"></i></span><span id="lobby-mission-name"></span><span class="lobby-progress-row"><progress id="lobby-mission-progress" max="3" value="0" aria-label="Daily missions completed"></progress><b id="lobby-mission-count"></b></span></button>
    <section class="lobby-panel lobby-players" aria-labelledby="lobby-players-title"><button id="lobby-standings" class="lobby-panel-heading"><img src="assets/ui/trophy.png" alt=""><h2 id="lobby-players-title">Top Players</h2><i data-lucide="chevron-right"></i></button><p id="lobby-players-status" role="status"></p><ol id="lobby-top-three"></ol><small>Weekly leaderboard</small></section>
    <button class="lobby-panel lobby-wallet" id="lobby-wallet"><span class="lobby-panel-heading"><img src="assets/ui/wallet.png" alt=""><b>Wallet Status</b><i data-lucide="chevron-right"></i></span><span class="lobby-wallet-body"><img src="../icon.png" alt=""><span><b id="lobby-wallet-state"></b><small id="lobby-wallet-address"></small><small id="lobby-wallet-balance"></small></span><span class="lobby-wallet-dot" aria-hidden="true"></span></span></button>
    <section class="lobby-xp" aria-label="Player level"><img src="assets/ui/star.png" alt=""><b id="lobby-level"></b><progress id="lobby-xp-progress" max="40" value="0" aria-label="XP toward next level"></progress><span id="lobby-xp-value"></span><span class="lobby-coins"><img src="assets/ui/coin.png" alt="Coins"><b id="lobby-coins"></b></span></section>`;
  root.append(widgets);
  const $=id=>document.getElementById(id);
  let accountKey='',request=0;
  function render(){
    const state=care.lobbySummary(),account=window.SagasuAccount.summary();
    const ready=state.tasks.filter(t=>t.done&&!t.claimed).length,done=state.tasks.filter(t=>t.done).length;
    $('lobby-reward-note').textContent=ready?ready*6+' coins ready':state.tasks.every(t=>t.claimed)?'All rewards collected':'Today\'s care rewards';
    $('lobby-claim').disabled=!ready;$('lobby-claim').querySelector('span').textContent=ready?'Claim Reward':state.tasks.every(t=>t.claimed)?'Collected':'Not ready';
    $('lobby-mission-name').textContent=state.tasks.find(t=>!t.done)?.name||'All missions complete';
    $('lobby-mission-progress').value=done;$('lobby-mission-count').textContent=done+'/3';
    $('lobby-level').textContent='Lv. '+(1+Math.floor(state.xp/40));$('lobby-xp-progress').value=state.xp%40;
    $('lobby-xp-value').textContent=state.xp%40+' / 40 XP';$('lobby-coins').textContent=state.coins;
    $('lobby-wallet-state').textContent=account.signedIn?'Connected':'Guest';
    $('lobby-wallet-address').textContent=account.address?account.address.slice(0,5)+'...'+account.address.slice(-4):'Not connected';
    $('lobby-wallet-balance').textContent=account.balance!==null?account.balance+' $SAGASU':'';
    $('lobby-wallet').dataset.connected=String(account.signedIn);
    const key=account.signedIn?(account.address||'signed-in'):'guest';
    if(key!==accountKey){
      accountKey=key;request++;$('lobby-top-three').replaceChildren();
      $('lobby-players-status').textContent=account.signedIn?'Loading standings...':'Connect wallet to view standings';
      if(root.dataset.phase==='menu'&&!root.hidden)refreshStandings();
    }
  }
  async function refreshStandings(){
    const stamp=++request,list=$('lobby-top-three'),status=$('lobby-players-status');list.replaceChildren();
    if(!window.SagasuAccount.hasUser()){status.textContent='Connect wallet to view standings';return;}
    status.textContent='Loading standings...';
    try{
      const data=await window.SagasuCompetition.preview();if(stamp!==request)return;
      if(!data||!Array.isArray(data.entries))throw new Error('Unavailable');
      for(const row of data.entries.slice(0,3)){
        if(!Number.isInteger(row.position)||typeof row.name!=='string'||!Number.isInteger(row.score))throw new Error('Invalid entry');
        const li=document.createElement('li'),rank=document.createElement('b'),name=document.createElement('span'),score=document.createElement('strong');
        rank.textContent=row.position;name.textContent=row.name;name.title=row.name;score.textContent=row.score;li.append(rank,name,score);list.append(li);
      }
      status.textContent=data.entries.length?'':'No scores yet this week';
    }catch{if(stamp===request){list.replaceChildren();status.textContent='Standings unavailable';}}
  }
  function click(fn){return ()=>{window.SagasuAudio.unlock();window.SagasuAudio.play('click');fn();};}
  $('lobby-claim').onclick=click(()=>{care.claimDailyRewards();render();});
  $('lobby-standings').onclick=click(()=>$('leaderboard-button').click());
  $('lobby-wallet').onclick=click(()=>$('account-button').click());
  $('lobby-missions').onclick=click(()=>{
    const panel=document.createElement('div');panel.className='lobby-mission-dialog';
    const title=document.createElement('h2');title.textContent='Daily Missions';panel.append(title);
    for(const task of care.lobbySummary().tasks){const row=document.createElement('p'),name=document.createElement('b'),state=document.createElement('span');name.textContent=task.name;state.textContent=task.claimed?'Collected':task.done?'Reward ready':'+6 coins';row.append(name,state);panel.append(row);}
    care.showLobbyPanel(panel);
  });
  care.onSave(render);window.addEventListener('sagasu-account-change',render);
  new MutationObserver(()=>{if(root.dataset.phase==='menu'&&!root.hidden){render();refreshStandings();}}).observe(root,{attributes:true,attributeFilter:['data-phase','hidden']});
  window.SagasuAccount.ready.then(render);render();window.lucide?.createIcons();
})();
