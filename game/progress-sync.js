(() => {
  'use strict';
  function create({client,id,care,revision=0,hadLocal=false,onStatus=()=>{},onRevision=()=>{},storage=localStorage,delay=15000,retry=30000}){
    const key='sagasu-sync-v1:'+id;
    let record={revision:Number.isSafeInteger(revision)&&revision>=0?revision:0,pending:false,snapshot:null},ready=false,closed=false,suppressed=false,timer=null,flight=null,initializing=null,conflict=false,recordLoaded=false,lastStatus='';
    try{
      const saved=JSON.parse(storage.getItem(key));
      if(saved&&Number.isSafeInteger(saved.revision)&&saved.revision>=0&&typeof saved.pending==='boolean'&&(!saved.pending||saved.snapshot?.version===1)){record=saved;recordLoaded=true;}
    }catch{}
    let fingerprint='';
    const signature=state=>{const copy={...state};delete copy.lastAt;return JSON.stringify(copy);};
    const status=value=>{if(!closed&&value!==lastStatus){lastStatus=value;onStatus(value);}};
    function persist(){storage.setItem(key,JSON.stringify(record));}
    // Preserve saves from the manual-save version during the first autosave upgrade.
    if(hadLocal&&!recordLoaded){record.pending=true;record.snapshot=care.peek();try{persist();}catch{status('error');}}
    function schedule(wait=delay){if(!timer&&!closed&&ready&&!conflict)timer=setTimeout(()=>{timer=null;flush().catch(()=>{});},wait);}
    function mark(){
      if(closed||suppressed)return;
      if(!ready&&!record.pending&&initializing)return;
      const snapshot=care.peek(),next=signature(snapshot);
      if(next===fingerprint)return;
      fingerprint=next;record={...record,pending:true,snapshot};
      try{persist();}catch{status('error');return;}
      if(ready&&!conflict){status(navigator.onLine===false?'offline':'pending');schedule();}
    }
    function apply(row){
      if(!row||row.player_id!==id||!Number.isSafeInteger(row.revision)||row.revision<1||row.state?.version!==1)throw new Error('Invalid saved progress.');
      suppressed=true;
      try{care.restore(row.state);}finally{suppressed=false;}
      fingerprint=signature(care.peek());
      record={revision:row.revision,pending:false,snapshot:null};persist();onRevision(row.revision);
    }
    async function bounded(make){
      const controller=new AbortController();let timeout;
      try{
        const query=make();
        const request=typeof query.abortSignal==='function'?query.abortSignal(controller.signal):query;
        return await Promise.race([request,new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new Error('Save request timed out.'));},10000);})]);
      }finally{clearTimeout(timeout);}
    }
    const fetchRow=()=>bounded(()=>client.from('sagasu_care_saves').select('player_id,state,revision').eq('player_id',id).maybeSingle());
    async function initialize(){
      if(closed)return;
      if(initializing)return initializing;
      initializing=(async()=>{
        status('checking');
        try{
          const {data,error}=await fetchRow();if(error)throw error;if(closed)return;
          if(data&&(!Number.isSafeInteger(data.revision)||data.player_id!==id))throw new Error('Invalid saved progress.');
          if(record.pending){
            if(record.revision!==(data?.revision||0)){conflict=true;status('conflict');}
            else status('pending');
          }else if(data){apply(data);status('saved');}
          else{record.revision=0;fingerprint='';ready=true;mark();status('pending');}
          ready=true;if(!conflict&&record.pending)schedule(1000);
        }catch{if(!closed){status(navigator.onLine===false?'offline':'error');timer=setTimeout(()=>{timer=null;initialize();},retry);}}
        finally{initializing=null;}
      })();
      return initializing;
    }
    async function flush(){
      if(closed)return;
      if(flight)return flight;
      if(!ready){await initialize();if(!ready||closed)return;}
      if(conflict)throw Object.assign(new Error('Save conflict.'),{code:'40001'});
      if(!record.pending){status('saved');return;}
      if(navigator.onLine===false){status('offline');return;}
      clearTimeout(timer);timer=null;
      // Capture one payload and its baseline; changes during the request stay pending.
      const sent=JSON.stringify(record.snapshot),expected=record.revision;
      flight=(async()=>{
        status('saving');
        try{
          const {data,error}=await bounded(()=>client.rpc('sagasu_save_care',{p_state:JSON.parse(sent),p_expected_revision:expected}));
          if(error)throw error;if(closed)return;
          const row=Array.isArray(data)?data[0]:data;
          if(row?.player_id!==id||row.revision!==expected+1)throw new Error('Invalid save response.');
          const changed=JSON.stringify(record.snapshot)!==sent;
          record={revision:row.revision,pending:changed,snapshot:changed?record.snapshot:null};
          persist();onRevision(row.revision);status(changed?'pending':'saved');
        }catch(e){
          if(!closed){if(e.code==='40001'){conflict=true;status('conflict');}else{status(navigator.onLine===false?'offline':'error');schedule(retry);}}
          throw e;
        }finally{flight=null;if(!closed&&!conflict&&record.pending)schedule();}
      })();
      return flight;
    }
    async function restore(){
      clearTimeout(timer);timer=null;
      if(flight)await flight.catch(()=>{});
      if(closed)return false;
      const {data,error}=await fetchRow();if(error)throw error;if(closed)return false;
      if(!data)return false;
      if(record.pending)storage.setItem('sagasu-progress-backup:'+id,JSON.stringify(record));
      apply(data);conflict=false;ready=true;status('saved');return true;
    }
    function resume(){
      if(closed)return;
      if(!ready){clearTimeout(timer);timer=null;initialize();}
      else if(!conflict&&record.pending){clearTimeout(timer);timer=null;schedule(1000);}
    }
    function close(){closed=true;clearTimeout(timer);timer=null;}
    return Object.freeze({initialize,mark,flush,restore,resume,close});
  }
  window.SagasuProgressSync=Object.freeze({create});
})();
