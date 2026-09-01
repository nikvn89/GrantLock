import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = resolve(root, 'dist')
rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

for (const name of ['index.html', 'public', 'src']) {
  const from = resolve(root, name)
  const to = name === 'public' ? dist : resolve(dist, name)
  cpSync(from, to, { recursive: true })
}

const index = readFileSync(resolve(dist, 'index.html'), 'utf8')
if (!index.includes('/src/app.js') || !index.includes('/src/styles.css')) throw new Error('Production build is missing app assets')
for (const asset of ['favicon.png', 'logo-64.png', 'logo-192.png', 'logo.png', 'og-image.png', 'manifest.json']) {
  if (!existsSync(resolve(dist, asset))) throw new Error(`Missing production asset: ${asset}`)
}
console.log('PRODUCTION BUILD PASS')
console.log(`Output: ${dist}`)
