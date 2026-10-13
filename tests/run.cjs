'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
for(const file of ['game/token-balance-test.cjs','game/progress-sync-test.cjs','tests/balance-backend.cjs']){
  const result=spawnSync(process.execPath,[path.resolve(__dirname,'..',file)],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
