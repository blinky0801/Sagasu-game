(() => {
  'use strict';
  const modal=document.getElementById('modal'),content=document.getElementById('modal-content');
  let busy=false;
  function button(id,label){
    const node=document.createElement('button');node.id=id;node.type='button';node.title=node.ariaLabel=label;
    node.innerHTML='<i data-lucide="log-out"></i>';node.onclick=show;return node;
  }
  const header=button('quit-game','Quit Game');document.getElementById('settings').after(header);
  function mountSettings(){
    if(!content.querySelector('#export-save')||content.querySelector('#settings-quit'))return;
    const quit=button('settings-quit','Quit Game');quit.append(document.createTextNode('Quit Game'));
    content.querySelector('.dialog-actions').append(quit);window.lucide?.createIcons({root:content});
  }
  new MutationObserver(mountSettings).observe(content,{childList:true});
  function show(){
    if(busy)return;
    const native=typeof window.SagasuNative?.quit==='function';
    const panel=document.createElement('div');
    panel.innerHTML='<h2>Quit game?</h2><p>'+(native?'Your progress will be kept on this device.':'Return to the lobby and keep your progress.')+'</p><div class="dialog-actions"><button id="quit-confirm"><i data-lucide="log-out"></i>Quit Game</button><button id="quit-cancel">Keep Playing</button></div><p id="quit-status" role="status"></p>';
    const yes=panel.querySelector('#quit-confirm'),no=panel.querySelector('#quit-cancel'),status=panel.querySelector('#quit-status');
    no.onclick=()=>modal.close();
    yes.onclick=async()=>{
      if(busy)return;busy=true;yes.disabled=no.disabled=true;document.getElementById('close-modal').disabled=true;
      const booting=document.body.classList.contains('booting');document.body.classList.add('booting');
      status.textContent='Saving progress...';
      try{
        window.SagasuCare.prepareExit();
        await window.SagasuAccount.flushForExit();
        window.SagasuAudio.stop();modal.close();
        if(native){window.SagasuAudio.setMusicPhase('silent');window.SagasuNative.quit();}
        else if(!window.SagasuStartup.showLobby())throw new Error('Lobby unavailable');
      }catch{
        if(!booting)document.body.classList.remove('booting');
        status.textContent='Could not save progress. Please try again.';
        if(!modal.open)modal.showModal();
      }finally{busy=false;yes.disabled=no.disabled=false;document.getElementById('close-modal').disabled=false;}
    };
    window.SagasuCare.showLobbyPanel(panel);yes.focus();
  }
  window.SagasuQuit=Object.freeze({show});window.lucide?.createIcons({root:header});
})();
