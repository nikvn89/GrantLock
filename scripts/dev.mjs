import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const port = Number(process.env.PORT || 4173)
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json' }

http.createServer((req,res)=>{
  const raw = decodeURIComponent((req.url || '/').split('?')[0])
  const requested = raw === '/' ? '/index.html' : raw
  let file = normalize(join(root, requested))
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden') }
  if (requested.startsWith('/logo') || requested === '/favicon.png' || requested === '/og-image.png' || requested === '/manifest.json') file = join(root,'public',requested)
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root,'index.html')
  res.writeHead(200,{'content-type':mime[extname(file)] || 'application/octet-stream','cache-control':'no-store'})
  createReadStream(file).pipe(res)
}).listen(port,()=>console.log(`GrantLock dev server http://127.0.0.1:${port}`))
