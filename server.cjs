'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.env.PORT)||4173;
const origin=process.env.APP_ORIGIN||'http://localhost:'+port;
const config=path.join(root,'game/cloud-config.js');
if(!fs.existsSync(config))throw new Error('Copy game/cloud-config.example.js to cloud-config.js and configure your own backend first.');
const balance=require('./balance-backend.cjs').createBalanceHandler({root,rpcUrl:process.env.HELIUS_RPC_URL||'',allowedOrigin:origin});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wav':'audio/wav','.mp3':'audio/mpeg','.mp4':'video/mp4'};
http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,origin).pathname);}catch{res.writeHead(400).end();return;}
  if(pathname==='/api/sagasu-balance'){await balance(req,res);return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const home=pathname==='/',requested=home?'/game/index.html':pathname;
  if(!['/game/','/game art from illustrator/','/website sagasu/assets/gallery/'].some(prefix=>requested.startsWith(prefix))&&requested!=='/icon.png'){res.writeHead(404).end();return;}
  if(requested.replace(/\\/g,'/').split('/').some(p=>p.startsWith('.')||p.toLowerCase().includes('private'))){res.writeHead(403).end();return;}
  const file=path.resolve(root,'.'+requested),type=types[path.extname(file)];
  if(!type||!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}
  try{
    const real=await fs.promises.realpath(file);
    if(!real.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    let data=await fs.promises.readFile(real);
    if(home)data=Buffer.from(data.toString('utf8').replace('<head>','<head>\n  <base href="/game/">'));
    res.writeHead(200,{'Content-Type':type,'Content-Length':data.length,'Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log('SAGASU source: http://localhost:'+port+'/ (private media required)'));
