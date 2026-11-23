/**
 * Après `expo export --platform web` : Cloudflare Pages ignore tout dossier nommé « node_modules »
 * (les polices et icônes sont alors remplacées par index.html → app bloquée sur le spinner).
 * On renomme dist/assets/node_modules en dist/assets/vendor et on réécrit les références.
 */
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve(process.argv[2] || 'dist')
const from = path.join(dist, 'assets', 'node_modules')
const to = path.join(dist, 'assets', 'vendor')

if (!fs.existsSync(from)) {
  console.log('fix-web-assets : rien à renommer')
  process.exit(0)
}
fs.rmSync(to, { recursive: true, force: true })
fs.renameSync(from, to)

let files = 0
function rewrite(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      rewrite(full)
    } else if (/\.(js|html|json|css|map)$/i.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8')
      if (text.includes('assets/node_modules')) {
        fs.writeFileSync(full, text.split('assets/node_modules').join('assets/vendor'))
        files += 1
      }
    }
  }
}
rewrite(dist)
console.log(`fix-web-assets : assets/node_modules → assets/vendor (${files} fichier(s) réécrits)`)
