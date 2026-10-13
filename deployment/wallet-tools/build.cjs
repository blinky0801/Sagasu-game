'use strict';
const path=require('node:path');
require('esbuild').build({entryPoints:[path.join(__dirname,'wallet-entry.js')],bundle:true,platform:'browser',format:'iife',target:['chrome110'],minify:true,legalComments:'eof',metafile:true,
  outfile:path.resolve(__dirname,'../../game/assets/wallet-connect.js')
}).then(result=>{
  const fs=require('node:fs'),inputs=Object.keys(result.metafile.inputs),packages=new Set(),licenses=[];
  fs.writeFileSync(path.join(__dirname,'bundle-manifest.json'),JSON.stringify(inputs,null,2));
  for(const input of inputs){
    let dir=path.dirname(path.resolve(input));
    while(dir!==path.dirname(dir)&&!fs.existsSync(path.join(dir,'package.json')))dir=path.dirname(dir);
    if(packages.has(dir)||!dir.includes('node_modules'))continue;packages.add(dir);
    const metadata=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
    const file=fs.readdirSync(dir).find(name=>/^licen[cs]e(?:[.-].*)?$/i.test(name));
    licenses.push(metadata.name+' '+metadata.version+' ('+metadata.license+')\n'+(file?fs.readFileSync(path.join(dir,file),'utf8'):'See package upstream for license text.'));
  }
  fs.writeFileSync(path.resolve(__dirname,'../../game/assets/wallet-connect-LICENSE'),licenses.join('\n\n-----\n\n'));
  console.log('Built local wallet bundle. No CDN runtime dependencies.');
}).catch(error=>{console.error(error);process.exitCode=1;});
