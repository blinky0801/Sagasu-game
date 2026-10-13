const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const window={},navigator={onLine:true};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'progress-sync.js'),'utf8'),{window,navigator,setTimeout,clearTimeout,AbortController});
const clone=v=>JSON.parse(JSON.stringify(v));
const id='player-a',storage=new Map();
const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const state={version:1,coins:50,lastAt:1};
let row=null,calls=0,fail=false,pause=null;
const statuses=[];
const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:clone(row)})})})}),rpc:async(_,args)=>{
  calls++;if(fail)throw new Error('Disconnected');if(pause)await pause;
  if(args.p_expected_revision!==(row?.revision||0))return {error:{code:'40001'}};
  row={player_id:id,revision:(row?.revision||0)+1,state:clone(args.p_state)};return {data:clone(row)};
}};
const care={peek:()=>clone(state),restore:s=>Object.assign(state,clone(s))};
const create=()=>window.SagasuProgressSync.create({client,id,care,storage:store,delay:60000,retry:60000,onStatus:s=>statuses.push(s)});
(async()=>{
  let sync=create();
  try{
    await sync.initialize();await sync.flush();assert.equal(row.revision,1);assert.equal(row.state.coins,50);
    navigator.onLine=false;state.coins=72;sync.mark();await sync.flush();assert.equal(row.state.coins,50);
    assert(JSON.parse(storage.get('sagasu-sync-v1:'+id)).pending);
    sync.close();sync=create();await sync.initialize();navigator.onLine=true;await sync.flush();assert.equal(row.state.coins,72);
    state.coins=80;sync.mark();fail=true;await assert.rejects(sync.flush());assert(JSON.parse(storage.get('sagasu-sync-v1:'+id)).pending);fail=false;
    await sync.flush();assert.equal(row.state.coins,80);
    let release;pause=new Promise(r=>release=r);state.coins=90;sync.mark();const saving=sync.flush();
    await new Promise(r=>setImmediate(r));state.coins=100;sync.mark();release();await saving;pause=null;
    assert.equal(row.state.coins,90);assert(JSON.parse(storage.get('sagasu-sync-v1:'+id)).pending);await sync.flush();assert.equal(row.state.coins,100);
    row.revision++;row.state.coins=150;state.coins=110;sync.mark();const before=calls;
    await assert.rejects(sync.flush());assert.equal(statuses.at(-1),'conflict');assert.equal(state.coins,110);
    await assert.rejects(sync.flush());assert.equal(calls,before+1);
    sync.close();sync=create();await sync.initialize();assert.equal(statuses.at(-1),'conflict');assert.equal(state.coins,110);
    assert(await sync.restore());assert.equal(state.coins,150);assert.equal(JSON.parse(storage.get('sagasu-progress-backup:'+id)).snapshot.coins,110);
    sync.close();state.coins=0;sync=create();await sync.initialize();assert.equal(state.coins,150);assert.equal(statuses.at(-1),'saved');
    sync.close();storage.delete('sagasu-sync-v1:'+id);state.coins=175;
    sync=window.SagasuProgressSync.create({client,id,care,hadLocal:true,revision:row.revision,storage:store,delay:60000});
    await sync.initialize();assert.equal(state.coins,175);await sync.flush();assert.equal(row.state.coins,175);
    // A timed-out/lost acknowledgement must not become permission to overwrite a newer row.
    state.coins=180;sync.mark();sync.close();row.revision++;row.state.coins=190;
    sync=create();await sync.initialize();assert.equal(statuses.at(-1),'conflict');assert.equal(state.coins,180);
    console.log('PASS: first save, offline queue across reload, retries, changes during upload, stale-device conflicts across reload, explicit restore backup, automatic load of clean progress.');
  }finally{sync.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
