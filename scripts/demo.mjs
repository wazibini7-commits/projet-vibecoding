// Démonstration automatisée du parcours complet dans un vrai navigateur (Chrome ou Edge),
// sur smartphone (390 px) et ordinateur (1366 px). Génère des captures dans docs/captures/.
//
// Prérequis : Chrome ou Edge installé, et deux terminaux ouverts :
//   - cd backend && npm run dev   (API + base de données, Docker Desktop démarré)
//   - npm run dev                 (site)
// Attention : la démonstration ENREGISTRE de vraies demandes dans la base de développement
// (adresses camille.demo+…@exemple.fr), qui occupent des places sur le premier départ disponible.
// Lancement : npm run demo
// Variables facultatives : APP_URL (défaut http://localhost:5173/), CHROME_PATH.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const URL = process.env.APP_URL ?? 'http://localhost:5173/'
const CAPTURES = path.resolve('docs/captures')
const NAVIGATEURS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const executablePath = NAVIGATEURS.find((p) => fs.existsSync(p))
if (!executablePath) {
  console.error('Aucun Chrome/Edge trouvé. Indiquez son chemin : CHROME_PATH="..." npm run demo')
  process.exit(1)
}
try {
  await fetch(URL)
} catch {
  console.error(`L'application ne répond pas sur ${URL}. Lancez d'abord « npm run dev » dans un autre terminal.`)
  process.exit(1)
}
const sante = await fetch(new globalThis.URL('api/sante', URL)).then((r) => r.ok).catch(() => false)
if (!sante) {
  console.error("L'API ne répond pas. Lancez « npm run dev » dans le dossier backend (Docker Desktop démarré).")
  process.exit(1)
}
fs.mkdirSync(CAPTURES, { recursive: true })

let echecs = 0
const verifier = (ok, libelle) => {
  console.log(`  ${ok ? '✔' : '✘'} ${libelle}`)
  if (!ok) echecs++
}

/** Choisit le premier départ disponible dans la liste ; renvoie sa date. */
async function choisirDepart(page) {
  const date = await page.$eval('#champ-date-depart', (s) => [...s.options].find((o) => o.value && !o.disabled)?.value)
  await page.select('#champ-date-depart', date)
  return date
}

async function sansDebordement(page, ecran) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  verifier(sw <= cw, `${ecran} : aucun défilement horizontal`)
}

async function parcours(navigateur, largeur, hauteur, nom) {
  console.log(`\n▶ Parcours ${nom} (${largeur} × ${hauteur})`)
  const page = await navigateur.newPage()
  const erreursConsole = []
  page.on('pageerror', (e) => erreursConsole.push(e.message))
  page.on('console', (m) => m.type() === 'error' && erreursConsole.push(m.text()))
  await page.setViewport({ width: largeur, height: hauteur, isMobile: largeur < 700, hasTouch: largeur < 700 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.waitForSelector('#sejour-titre') // séjour chargé depuis l'API
  const email = `camille.demo+${nom}-${Date.now()}@exemple.fr`
  const capture = (etape, pleinePage = false) =>
    page.screenshot({ path: path.join(CAPTURES, `${nom}-${etape}.png`), fullPage: pleinePage })

  // 1. Découvrir le séjour et comprendre l'offre
  const texte = await page.evaluate(() => document.body.innerText)
  verifier(texte.includes('Version de démonstration — offre et disponibilités à confirmer'), 'mention de démonstration visible')
  verifier(texte.includes('Bretagne Sauvage') && texte.includes('5 jours / 4 nuits') && texte.includes('Rennes'), 'destination, durée, départ affichés')
  verifier((await page.$$('.programme .jour')).length === 5, 'programme des 5 journées')
  verifier(/1\s390\s€/.test(texte), 'prix indicatif 1 390 €')
  verifier(texte.includes('Inclus dans le prix') && texte.includes('À prévoir en plus'), 'prestations incluses / à prévoir')
  verifier(texte.includes('VANLIFE.BZH') && texte.includes('Voyagez autrement. Vivez la route.'), 'identité Vanlife visible')
  // Photos : on force le chargement (normalement différé) puis on vérifie qu'aucune n'est cassée.
  const photosEnEchec = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')]
    imgs.forEach((i) => { i.loading = 'eager' })
    const r = await Promise.all(imgs.map((i) => i.decode().then(() => null).catch(() => i.src)))
    return { total: imgs.length, echecs: r.filter(Boolean) }
  })
  verifier(photosEnEchec.total >= 19 && photosEnEchec.echecs.length === 0, `${photosEnEchec.total} photos chargées sans erreur`)
  await sansDebordement(page, 'page principale')
  await capture('1-page-principale', true)

  // 1 bis. Ouverture de la page « Demande de réservation »
  verifier(!(await page.$('#champ-prenom')), 'le formulaire n’est pas sur la page d’accueil')
  await page.click('.hero a[href="#/demande"]')
  await page.waitForSelector('#demande-titre')
  await page.waitForSelector('#champ-prenom')
  verifier((await page.evaluate(() => location.hash)) === '#/demande', 'clic sur « Faire une demande » → page #/demande')
  verifier(await page.evaluate(() => window.scrollY === 0), 'page de demande affichée en haut')
  verifier((await page.$eval('.resume-sejour', (e) => e.innerText)).includes('Bretagne Sauvage'), 'rappel du séjour sur la page de demande')
  const nbDeparts = await page.$$eval('#champ-date-depart option:not([value=""])', (o) => o.length)
  verifier(nbDeparts > 0, `${nbDeparts} départs proposés par le serveur`)
  await sansDebordement(page, 'page de demande')
  await new Promise((r) => setTimeout(r, 500)) // fin du fondu d'arrivée (0,3 s)
  await capture('1b-page-demande')

  // 2. Demande vide
  await page.click('#demande button[type=submit]')
  await page.waitForSelector('.msg-erreur')
  verifier((await page.$$('.msg-erreur')).length === 3, 'demande vide : 3 messages explicites')
  await page.$eval('#demande', (e) => e.scrollIntoView())
  await capture('2-demande-vide')

  // 3. E-mail mal formé (les autres champs sont corrects)
  await page.type('#champ-prenom', 'Camille')
  await page.type('#champ-email', 'camille@exemple')
  await choisirDepart(page)
  await page.click('#demande button[type=submit]')
  verifier((await page.$$('.msg-erreur')).length === 1 && !!(await page.$('#champ-email-erreur')), 'e-mail mal formé : seul ce champ est signalé')
  verifier((await page.$eval('#champ-prenom', (e) => e.value)) === 'Camille', 'valeurs saisies conservées')
  await page.$eval('#champ-email', (e) => e.scrollIntoView({ block: 'center' }))
  await capture('3-email-mal-forme')

  // 4. Saisie complète → récapitulatif
  await page.click('#champ-email', { clickCount: 3 })
  await page.type('#champ-email', email)
  await page.click('#demande button[type=submit]')
  await page.waitForSelector('.recap')
  const recap = await page.$eval('.recap', (e) => e.innerText)
  verifier(recap.includes('Bretagne Sauvage') && recap.includes('Camille') && recap.includes(email), 'récapitulatif cohérent avec la saisie')
  verifier(/transmise à Vanlife/.test(recap) && /reste à confirmer/.test(recap), 'récapitulatif : transmission et réservation à confirmer annoncées')
  await sansDebordement(page, 'récapitulatif')
  await page.$eval('.recap', (e) => e.scrollIntoView())
  await capture('4-recapitulatif')

  // 5. Envoi au serveur → confirmation
  await page.click('.actions .btn-principal')
  await page.waitForSelector('#confirmation-titre')
  await new Promise((r) => setTimeout(r, 300))
  const conf = await page.evaluate(() => document.body.innerText)
  const reference = conf.match(/VL-\d{4}-\d{4}/)?.[0]
  verifier(conf.includes('Bretagne Sauvage') && !!reference, `confirmation : circuit et référence ${reference ?? '(absente)'}`)
  verifier(/réservation à confirmer/.test(conf) && /pas encore une réservation/.test(conf), 'confirmation : demande reçue, réservation à confirmer')
  const lienSuivi = await page.$eval('.confirmation a.btn-principal', (a) => a.getAttribute('href'))
  verifier(/^#\/suivi\/VL-\d{4}-\d{4}\/[\w-]{43}$/.test(lienSuivi ?? ''), 'confirmation : lien personnel « Suivre ma demande »')
  verifier(conf.includes('Version de démonstration'), 'confirmation : statut provisoire visible')
  verifier(await page.evaluate(() => window.scrollY === 0), 'confirmation affichée en haut de page')
  await sansDebordement(page, 'confirmation')
  await capture('5-confirmation', true)

  // 6. Retour à l'accueil, puis nouvelle demande : formulaire vierge
  await page.click('.confirmation .btn-secondaire') // « Retour au circuit »
  await page.waitForSelector('#hero-titre')
  verifier(await page.evaluate(() => window.scrollY === 0), 'retour au circuit : accueil, en haut de page')
  await page.click('.hero a[href="#/demande"]')
  await page.waitForSelector('#champ-prenom')
  verifier((await page.$eval('#champ-prenom', (e) => e.value)) === '', 'nouvelle demande : formulaire réinitialisé')

  // 7. Navigation : lien de section depuis la page de demande, puis bouton « Précédent » du navigateur
  await page.click('.lien-retour')
  await page.waitForSelector('#hero-titre')
  const haut = await page.$eval('#sejour', (e) => Math.round(e.getBoundingClientRect().top))
  verifier(haut >= 0 && haut < 200, '« Retour au séjour » : accueil, section du séjour à l’écran')
  await page.goBack()
  await page.waitForSelector('#demande-titre')
  verifier(true, 'bouton « Précédent » du navigateur : retour à la page de demande')
  // 8. Espace client : le lien personnel ouvre la demande, enregistrée en base avec le statut « reçue ».
  await page.goto(new globalThis.URL(lienSuivi, URL).toString(), { waitUntil: 'networkidle0' })
  await page.waitForSelector('.suivi-etapes')
  const espace = await page.evaluate(() => document.body.innerText)
  verifier(espace.includes('Bonjour Camille') && espace.includes(reference), `espace client : demande ${reference} affichée`)
  verifier(await page.$eval('.suivi-etape-en-cours', (e) => e.innerText.includes('Demande reçue')), 'espace client : étape « Demande reçue » en cours')
  await sansDebordement(page, 'espace client')
  await capture('6-espace-client', true)

  verifier(erreursConsole.length === 0, 'aucune erreur dans la console' + (erreursConsole.length ? ' : ' + erreursConsole.join(' | ') : ''))
  await page.close()
}

const navigateur = await puppeteer.launch({ executablePath, headless: true, args: ['--lang=fr-FR'] })
try {
  await parcours(navigateur, 390, 844, 'mobile-390')
  await parcours(navigateur, 1366, 900, 'ordinateur')
} finally {
  await navigateur.close()
}
console.log(`\n${echecs === 0 ? '✔ Démonstration réussie' : `✘ ${echecs} vérification(s) en échec`} — captures : ${CAPTURES}`)
process.exit(echecs ? 1 : 0)
