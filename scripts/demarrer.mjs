// Démarre TOUT le projet en une commande : npm run demarrer
//   1. vérifie les prérequis (dépendances installées, fichier .env, Docker démarré) ;
//   2. démarre PostgreSQL et Mailpit (Docker) ;
//   3. applique les migrations en attente (sans jamais effacer de données) ;
//   4. lance l'API (port 3100) et le site (port 5173), dans ce même terminal.
// Ctrl+C arrête l'API et le site (la base et Mailpit restent démarrés : « npm run db:down » dans backend/ pour les arrêter).
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const BACKEND = path.join(RACINE, 'backend')
const WINDOWS = process.platform === 'win32'

const vert = (t) => `\x1b[32m${t}\x1b[0m`
const rouge = (t) => `\x1b[31m${t}\x1b[0m`
const gras = (t) => `\x1b[1m${t}\x1b[0m`

function arreter(message, conseil) {
  console.error(`\n${rouge('✘')} ${message}`)
  if (conseil) console.error(`  → ${conseil}`)
  process.exit(1)
}

function executer(commande, dossier, libelle) {
  process.stdout.write(`• ${libelle}… `)
  const r = spawnSync(commande, { cwd: dossier, shell: true, encoding: 'utf8' })
  if (r.status !== 0) {
    console.log(rouge('échec'))
    console.error((r.stdout ?? '') + (r.stderr ?? ''))
    return false
  }
  console.log(vert('OK'))
  return true
}

console.log(gras('\nVanlife — démarrage\n'))

// 1. Prérequis
if (!fs.existsSync(path.join(RACINE, 'node_modules'))) arreter('Dépendances du site absentes.', 'npm install (à la racine du projet)')
if (!fs.existsSync(path.join(BACKEND, 'node_modules'))) arreter('Dépendances du serveur absentes.', 'cd backend puis npm install')
if (!fs.existsSync(path.join(BACKEND, '.env'))) {
  fs.copyFileSync(path.join(BACKEND, '.env.example'), path.join(BACKEND, '.env'))
  console.log(`• Fichier backend/.env créé à partir de .env.example ${vert('OK')}`)
}
if (spawnSync('docker info', { shell: true }).status !== 0) {
  arreter('Docker ne répond pas.', 'Ouvrez Docker Desktop, attendez « Engine running », puis relancez npm run demarrer')
}

// 2-3. Base de données, boîte mail de test, migrations
if (!executer('npm run db:up', BACKEND, 'Démarrage de PostgreSQL et Mailpit')) arreter('Impossible de démarrer les conteneurs Docker.')
if (!executer('npx prisma migrate deploy', BACKEND, 'Mise à jour de la base (migrations)')) arreter('Migrations impossibles.')
const compte = spawnSync('docker exec vanlife-postgres psql -U vanlife -d vanlife -tAc "select count(*) from sejours"', { shell: true, encoding: 'utf8' })
if (compte.stdout?.trim() === '0') executer('npm run db:seed', BACKEND, 'Base vide : remplissage (séjour, départs)')

// 4. API et site
const processus = []
function lancer(nom, couleur, commande, dossier, env = {}) {
  const p = spawn(commande, { cwd: dossier, shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } })
  const prefixe = `\x1b[${couleur}m[${nom}]\x1b[0m `
  const afficher = (flux) => (donnees) => {
    for (const ligne of donnees.toString().split(/\r?\n/)) if (ligne.trim()) flux.write(prefixe + ligne + '\n')
  }
  p.stdout.on('data', afficher(process.stdout))
  p.stderr.on('data', afficher(process.stderr))
  p.on('exit', (code) => {
    if (!fermeture) console.error(`${prefixe}${rouge(`s'est arrêté (code ${code}).`)} Ctrl+C pour tout arrêter.`)
  })
  processus.push(p)
}

let fermeture = false
function toutArreter() {
  if (fermeture) return
  fermeture = true
  console.log('\nArrêt de l’API et du site…')
  for (const p of processus) {
    if (WINDOWS) spawnSync(`taskkill /pid ${p.pid} /T /F`, { shell: true, stdio: 'ignore' })
    else p.kill('SIGTERM')
  }
  process.exit(0)
}
process.on('SIGINT', toutArreter)
process.on('SIGTERM', toutArreter)

// Journal de l'API limité aux avertissements et erreurs (sinon une ligne par requête).
lancer('API ', '36', 'npm run dev', BACKEND, { LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn' })
lancer('SITE', '35', 'npx vite', RACINE)

// Message final quand le site et l'API répondent.
const pret = async () => {
  for (let i = 0; i < 60; i++) {
    const site = await fetch('http://localhost:5173/').then((r) => r.ok).catch(() => false)
    const api = await fetch('http://localhost:5173/api/sante').then((r) => r.ok).catch(() => false)
    if (site && api) {
      console.log(`
${vert('✔ Tout est prêt.')}
  ${gras('Site')}                http://localhost:5173
  ${gras('Back-office')}         http://localhost:5173/#/admin
  ${gras('Suivre une demande')}  http://localhost:5173/#/suivi
  ${gras('E-mails (Mailpit)')}   http://localhost:8025   ← les e-mails envoyés arrivent ICI, pas dans une vraie boîte
  ${gras('Base de données')}     cd backend puis npm run db:studio

  Ctrl+C pour arrêter.
`)
      return
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  console.error(rouge('Le site ou l’API ne répond toujours pas après 60 s : lisez les messages ci-dessus.'))
}
void pret()
