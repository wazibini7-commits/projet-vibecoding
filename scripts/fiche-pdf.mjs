// Convertit une fiche Markdown de docs/ en PDF A4 (Chrome ou Edge, comme la fiche v1).
//   node scripts/fiche-pdf.mjs docs/FICHE_RESTITUTION_V2.md
// Gère le sous-ensemble de Markdown utilisé par les fiches : titres, paragraphes, listes (puces et numérotées),
// gras, italique, code, liens, citations.
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'

const source = process.argv[2]
if (!source?.endsWith('.md')) {
  console.error('Usage : node scripts/fiche-pdf.mjs docs/FICHE.md')
  process.exit(1)
}
const cible = source.replace(/\.md$/, '.pdf')
const NAVIGATEURS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)
const executablePath = NAVIGATEURS.find((p) => fs.existsSync(p))
if (!executablePath) {
  console.error('Aucun Chrome/Edge trouvé (variable CHROME_PATH).')
  process.exit(1)
}

const echapper = (t) => t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const enLigne = (t) =>
  echapper(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')

function versHtml(md) {
  const lignes = md.replace(/\r/g, '').split('\n')
  const blocs = []
  let liste = null
  let paragraphe = []
  const fermerParagraphe = () => { if (paragraphe.length) { blocs.push(`<p>${enLigne(paragraphe.join(' '))}</p>`); paragraphe = [] } }
  const fermerListe = () => { if (liste) { blocs.push(`<${liste.type}>${liste.items.map((i) => `<li>${enLigne(i)}</li>`).join('')}</${liste.type}>`); liste = null } }
  for (const brute of lignes) {
    const ligne = brute.trimEnd()
    let m
    if (!ligne.trim()) { fermerParagraphe(); fermerListe(); continue }
    if ((m = /^(#{1,3}) (.*)$/.exec(ligne))) { fermerParagraphe(); fermerListe(); blocs.push(`<h${m[1].length}>${enLigne(m[2])}</h${m[1].length}>`); continue }
    if ((m = /^> ?(.*)$/.exec(ligne))) { fermerParagraphe(); fermerListe(); blocs.push(`<blockquote>${enLigne(m[1])}</blockquote>`); continue }
    if ((m = /^- (.*)$/.exec(ligne)) || (m = /^\d+\. (.*)$/.exec(ligne))) {
      fermerParagraphe()
      const type = /^\d/.test(ligne) ? 'ol' : 'ul'
      if (liste?.type !== type) { fermerListe(); liste = { type, items: [] } }
      liste.items.push(m[1])
      continue
    }
    if (liste && /^\s+\S/.test(brute)) { liste.items[liste.items.length - 1] += ' ' + ligne.trim(); continue }
    fermerListe()
    paragraphe.push(ligne.trim())
  }
  fermerParagraphe(); fermerListe()
  return blocs.join('\n')
}

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche de restitution</title><style>
  @page { size: A4; margin: 10mm 13mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8.9pt; line-height: 1.34; color: #1f2d30; margin: 0; }
  h1 { font-size: 14pt; color: #173d45; margin: 0 0 6px; }
  h2 { break-after: avoid; font-size: 10.3pt; color: #173d45; margin: 8px 0 3px; padding-bottom: 2px; border-bottom: 1px solid #d8cfc2; }
  p { margin: 0 0 4px; }
  ul, ol { margin: 0 0 4px; padding-left: 16px; }
  li { margin: 0 0 2px; }
  code { font-family: Consolas, monospace; font-size: 8.6pt; background: #f0e9de; padding: 0 3px; border-radius: 3px; }
  strong { color: #10262c; }
  blockquote { margin: 0 0 6px; padding: 4px 8px; border-left: 3px solid #b85a2b; background: #faf6f0; }
</style></head><body>${versHtml(fs.readFileSync(source, 'utf8'))}</body></html>`

const navigateur = await puppeteer.launch({ executablePath })
const page = await navigateur.newPage()
await page.setContent(html, { waitUntil: 'load' })
await page.pdf({ path: cible, format: 'A4', printBackground: true, preferCSSPageSize: true })
const pages = (fs.readFileSync(cible, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
await navigateur.close()
console.log(`✔ ${cible} (${pages} page${pages > 1 ? 's' : ''})`)
